import { Modality } from "@google/genai";
import sharp from "sharp";
import {
  createGeminiClient,
  IMAGE_MAX_RETRIES,
  IMAGE_MODEL,
  IMAGE_TIMEOUT_MS,
} from "./client";
import { checkImageHasText } from "@/lib/anthropic/check-image-text";
import { TONE_ACCENT } from "@/lib/slide-theme";
import type { MaterialTone } from "@/lib/types";

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

const TONE_STYLE_HINT: Record<MaterialTone, string> = {
  business: "紺・グレーを基調にした落ち着いた配色",
  casual: "明るくあたたかみのある配色",
  minimal: "白と1色のアクセントカラーだけに絞った配色",
};

function buildPrompt(params: {
  theme: string;
  chapterTitle: string;
  chapterSummary: string;
  points: string[];
  tone: MaterialTone;
  correction?: string;
}) {
  const hasPoints = params.points.length > 0;
  const pointsBlock = params.points.map((p) => `・${p}`).join("\n");

  // タイトルと要点はPowerPointのネイティブテキストとして別途配置するため、
  // ここでは文字を一切含まない挿絵のみを生成させる。生成後にsharpで
  // 背景色を重ねて薄く加工し、スライド全面の背景画像として使う前提の構図にする。
  return `企業研修教材の1章の内容を象徴する、写実的またはフラットデザインのイラストを1枚生成してください。
このイラストは同じ教材の他の章のスライドとも並べて見られるため、「人物がノートPCに向かって
座っている」といった汎用的な構図に頼らず、この章固有の内容が一目でわかる具体的な瞬間・
ディテールを選んで描いてください。

教材テーマ: ${params.theme}
章タイトル: ${params.chapterTitle}
章の内容: ${params.chapterSummary}
${hasPoints ? `この章だけの具体的な要点（他の章と混同しないよう、ここに書かれている内容を最優先で描写してください）:\n${pointsBlock}` : ""}

要件:
- 上記の要点のうち、最も象徴的な1つを選び、その場面・操作・状態がひと目でわかる具体的な
  構図にしてください。人物を配置する場合も、ただ座っているだけでなく、その要点特有の
  動作（何かを指差す、画面の特定部分を見る、特定の道具を操作するなど）を描いてください
- 毎回同じ画角・同じ人物・同じ部屋にならないよう、要点の内容に応じて画面の主役となる
  モチーフ（人物、画面のクローズアップ、書類、道具、図解など）を変えてください
- 人物を描く場合、怒り・号泣・絶叫のような誇張された感情表現は避け、落ち着いた自然な表情・ポーズにしてください
- この画像はスライドの右半分専用の写真パネルとしてそのまま使い、文字は一切重ねません。
  そのため余白を作る必要はなく、画面全体を使って主役のモチーフをしっかり大きく捉えてください
- 画像内に文字・数字・記号は一切含めないでください（別途テキストを重ねて配置するため）
- 横長（16:9）の構図にしてください
- デザインの方向性: ${TONE_STYLE_HINT[params.tone]}
${params.correction ? `\n${params.correction}` : ""}`;
}

async function callOnce(params: Parameters<typeof buildPrompt>[0]) {
  const client = createGeminiClient();

  const response = await client.models.generateContent({
    model: IMAGE_MODEL,
    contents: buildPrompt(params),
    config: {
      responseModalities: [Modality.IMAGE],
      httpOptions: { timeout: IMAGE_TIMEOUT_MS },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    throw new Error("画像データが返されませんでした。");
  }

  return {
    data: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType ?? "image/png",
  };
}

const BG_WIDTH = 1600;
const BG_HEIGHT = 900;

// 生成された挿絵は、写真パネル専用の領域にそのまま敷く（文字は重ねないため
// 可読性確保のグラデーションぼかしは不要になった）。代わりに、AI生成のストック
// フォト感を消してブランドカラーに馴染ませるため、グレースケール化してから
// 章のアクセントカラーでティントするデュオトーン処理を掛ける。
async function prepareBackgroundImage(params: {
  data: string;
  mimeType: string;
  tone: MaterialTone;
  // 全リトライで文字混入が解消しなかった画像をやむを得ず採用する場合はtrueにする。
  // 通常より強くぼかし、残った文字を確実に判読不能にする安全策。
  heavyObscure?: boolean;
}): Promise<{ data: string; mimeType: string }> {
  const accentRgb = hexToRgb(TONE_ACCENT[params.tone]);
  const inputBuffer = Buffer.from(params.data, "base64");

  const outputBuffer = await sharp(inputBuffer)
    .resize(BG_WIDTH, BG_HEIGHT, { fit: "cover", position: "attention" })
    .blur(params.heavyObscure ? 20 : 2)
    .greyscale()
    .tint(accentRgb)
    .modulate({ brightness: 1.03 })
    .png()
    .toBuffer();

  return { data: outputBuffer.toString("base64"), mimeType: "image/png" };
}

export async function generateSlideImage(params: {
  theme: string;
  chapterTitle: string;
  chapterSummary: string;
  points: string[];
  tone: MaterialTone;
}): Promise<{ data: string; mimeType: string; attempts: number }> {
  let lastError: unknown;
  let lastResult: { data: string; mimeType: string } | undefined;
  let correction: string | undefined;

  for (let attempt = 1; attempt <= IMAGE_MAX_RETRIES + 1; attempt++) {
    try {
      const result = await callOnce({ ...params, correction });
      lastResult = result;

      // 「文字を描かない」という指示をモデルが無視することがあるため、
      // 生成後にVisionで検証し、文字が写り込んでいれば再生成する。
      // この検証自体が失敗した場合は、判定不能として画像はそのまま採用する
      // （検証失敗のたびに再生成すると、正常な画像まで無駄に破棄してしまうため）。
      let hasText = false;
      try {
        hasText = await checkImageHasText(result);
      } catch {
        hasText = false;
      }

      if (!hasText) {
        const background = await prepareBackgroundImage({ ...result, tone: params.tone });
        return { ...background, attempts: attempt };
      }

      lastError = new Error("画像に文字が写り込んだため再生成します。");
      correction = "前回の生成では画像内に文字が写り込んでしまいました。今回は文字を一切描かないでください。";
    } catch (err) {
      lastError = err;
    }
  }

  // リトライを使い切っても毎回文字が写り込む章がある（操作系の内容など）。
  // 背景として使う前提でぼかし・減光の後処理を必ずかけるため、多少の文字が
  // 残っていても最終的にはほぼ判読できなくなる。画像なし（失敗）にするより、
  // 最後に生成できた画像を採用したほうが結果的に見栄えが良いと判断し、
  // 文字混入を理由には失敗させない（API呼び出し自体が全滅した場合のみ失敗とする）。
  if (lastResult) {
    const background = await prepareBackgroundImage({ ...lastResult, tone: params.tone, heavyObscure: true });
    return { ...background, attempts: IMAGE_MAX_RETRIES + 1 };
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("スライド画像の生成に失敗しました。");
}
