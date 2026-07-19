import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createAnthropicClient, SCRIPT_MODEL } from "./client";

const SlideFlowSchema = z.object({
  steps: z.array(z.string()),
});

// プロンプト側で18字以内を指示しているため、これは想定外に長い出力に対する
// 安全策としてのみ働く。ユーザーからのフィードバックで「…」表記が読みにくいと
// 指摘されたため、省略記号は付けずに素直に切り詰める（フローの箱は
// fit:"shrink"で自動縮小されるため、多少の超過は見た目上も吸収される）。
const MAX_LEN = 22;
function clip(text: string): string {
  return text.length <= MAX_LEN ? text : text.slice(0, MAX_LEN);
}

// ナレーション台本から、スライド右側に表示するフローチャート用の手順・流れを
// 3〜5ステップで抽出する。手順を説明する章はそのステップを、手順ではない章
// （事例紹介など）は話の展開（問題→原因→結果など）を短い矢印つなぎで表す。
export async function extractSlideFlow(params: {
  chapterTitle: string;
  chapterSummary: string;
  script: string;
}): Promise<string[]> {
  const client = createAnthropicClient();

  const prompt = `以下は研修教材の1章の台本です。この章の内容を、矢印でつなぐフローチャート
（例: ①ログイン→②入力→③確認）として図解するとしたら、どのようなステップになるかを
台本の内容に基づいて抽出してください。

章タイトル: ${params.chapterTitle}
章概要: ${params.chapterSummary}
台本:
${params.script || "（未生成）"}

抽出するもの:
- steps: 3〜5個のステップ。台本が具体的な操作手順を説明している場合はその手順の順序通りに、
  手順ではなく事例や考え方を説明している場合はその話の展開・論理の流れ（例:「問題発生」
  「原因」「対策」）を順番に抽出してください
- 各ステップは日本語で18字以内の短い体言止めにしてください（例:「アカウント登録」「認証設定」）
- 記号・番号・句読点は付けないでください（番号は表示側で自動的に付けます）
- 専門用語やカタカナ略語は避け、誰が読んでも意味がわかる平易な言葉にしてください`;

  const response = await client.messages.parse({
    model: SCRIPT_MODEL,
    max_tokens: 512,
    thinking: { type: "disabled" },
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(SlideFlowSchema) },
  });

  const steps = response.parsed_output?.steps ?? [];
  return steps.slice(0, 5).map(clip);
}
