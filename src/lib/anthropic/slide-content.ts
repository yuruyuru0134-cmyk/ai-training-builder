import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createAnthropicClient, SCRIPT_MODEL } from "./client";

const SlideContentSchema = z.object({
  subtitle: z.string(),
  details: z.array(z.string()),
});

export type SlideContent = z.infer<typeof SlideContentSchema>;

// Zodのmax()はClaudeの生成自体を制約せず、超過時に例外を投げるだけで扱いにくいため、
// 文字数はプロンプトで指示しつつ、最終的にはここで確実に切り詰める。
// 単語の途中で不自然に切れるのを避けるため、上限内で最後の読点・句点・空白まで戻って切る。
const MAX_LEN = 32;
function clip(text: string): string {
  if (text.length <= MAX_LEN) return text;
  const truncated = text.slice(0, MAX_LEN - 1);
  const lastBreak = Math.max(
    truncated.lastIndexOf("、"),
    truncated.lastIndexOf("。"),
    truncated.lastIndexOf("　"),
    truncated.lastIndexOf(" "),
  );
  const cut = lastBreak > MAX_LEN * 0.5 ? truncated.slice(0, lastBreak) : truncated;
  return `${cut}…`;
}

// ナレーション台本から、スライド表示用の文章コンテンツをH1(タイトル)/H2(サブタイトル)/
// H3(詳細情報)の階層で抽出する。台本の実際の文章に基づいた読み応えのある内容にする
// （slide_detailsはスライド背景画像の生成プロンプトにもそのまま使われる）。
export async function extractSlideContent(params: {
  chapterTitle: string;
  chapterSummary: string;
  script: string;
}): Promise<SlideContent> {
  const client = createAnthropicClient();

  const prompt = `以下は研修教材の1章の台本です。この台本の内容から、スライド表示用のテキストを抽出してください。

章タイトル: ${params.chapterTitle}
章概要: ${params.chapterSummary}
台本:
${params.script || "（未生成）"}

抽出するもの:
- subtitle: この章の核心を一文で表す、サブタイトル。タイトルの繰り返しではなく、台本の内容を踏まえた具体的な一文にしてください。必ず24字以内に収めてください
- details: 台本の中から重要なポイントを2〜4個抽出した詳細情報。各項目は台本の実際の内容に基づく具体的な文にしてください。必ず各24字以内に収めてください。1項目につき論点は1つだけにし、「〜、〜、〜」のように複数の論点を読点でつないで詰め込むことは絶対にしないでください。文末は「です・ます」を省いた体言止めまたは短い言い切りで簡潔にしてください`;

  const response = await client.messages.parse({
    model: SCRIPT_MODEL,
    max_tokens: 768,
    thinking: { type: "disabled" },
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(SlideContentSchema) },
  });

  const result = response.parsed_output ?? { subtitle: "", details: [] };
  return {
    subtitle: clip(result.subtitle),
    details: result.details.map(clip),
  };
}
