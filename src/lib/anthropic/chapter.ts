import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createAnthropicClient, OUTLINE_MODEL } from "./client";
import { LEVEL_LABEL, type MaterialLevel } from "@/lib/types";

const ChapterSchema = z.object({
  title: z.string(),
  summary: z.string(),
  estimated_minutes: z.number().int().min(1),
});

export type RegeneratedChapter = z.infer<typeof ChapterSchema>;

export async function regenerateChapter(params: {
  theme: string;
  level: MaterialLevel;
  allChapterTitles: string[];
  targetIndex: number;
  currentTitle: string;
  currentSummary: string;
}): Promise<RegeneratedChapter> {
  const client = createAnthropicClient();

  const otherChapters = params.allChapterTitles
    .map((title, i) => `${i + 1}. ${title}${i === params.targetIndex ? "（← この章を再生成）" : ""}`)
    .join("\n");

  const prompt = `あなたはAI研修教材の構成作家です。以下の教材の中の1章を改善してください。

テーマ: ${params.theme}
対象レベル: ${LEVEL_LABEL[params.level]}

教材全体の章構成:
${otherChapters}

再生成する章の現在の内容:
タイトル: ${params.currentTitle}
概要: ${params.currentSummary}

制約:
- 現在の内容をそのまま繰り返さず、表現・切り口・具体例のいずれかを変えて改善してください
- 他の章と内容が重複しないようにしてください
- title は簡潔に(20字程度)、summary は章の内容を100字程度で説明してください
- estimated_minutes はこの章単体の想定所要時間（分）です`;

  const response = await client.messages.parse({
    model: OUTLINE_MODEL,
    max_tokens: 2048,
    thinking: { type: "disabled" },
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(ChapterSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("章の再生成に失敗しました。");
  }

  return response.parsed_output;
}
