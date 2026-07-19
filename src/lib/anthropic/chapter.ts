import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createAnthropicClient, OUTLINE_MODEL } from "./client";
import { LEVEL_LABEL, LEVEL_PROMPT_HINT, type MaterialLevel } from "@/lib/types";

const ChapterSchema = z.object({
  title: z.string(),
  summary: z.string(),
  estimated_minutes: z.number().int().min(1),
});

export type RegeneratedChapter = z.infer<typeof ChapterSchema>;

export async function regenerateChapter(params: {
  theme: string;
  level: MaterialLevel;
  allChapters: { title: string; summary: string }[];
  targetIndex: number;
  currentTitle: string;
  currentSummary: string;
  issue?: string;
}): Promise<RegeneratedChapter> {
  const client = createAnthropicClient();

  const otherChapters = params.allChapters
    .map((c, i) =>
      i === params.targetIndex
        ? `${i + 1}. ${c.title}（← この章を再生成）`
        : `${i + 1}. ${c.title}\n   概要: ${c.summary}`,
    )
    .join("\n");

  const prompt = `あなたはAI研修教材の構成作家です。以下の教材の中の1章を改善してください。

テーマ: ${params.theme}
対象レベル: ${LEVEL_LABEL[params.level]}（${LEVEL_PROMPT_HINT[params.level]}）

教材全体の章構成:
${otherChapters}

再生成する章の現在の内容:
タイトル: ${params.currentTitle}
概要: ${params.currentSummary}
${params.issue ? `\n整合性チェックでの指摘:\n${params.issue}\nこの指摘を解消することを最優先で改善してください。` : ""}
制約:
- 現在の内容をそのまま繰り返さず、表現・切り口・具体例のいずれかを変えて改善してください
- 上記の他章の概要と読み比べ、扱う論点・具体例が重ならないようにしてください（タイトルを変えるだけで概要の中身が実質同じにならないよう注意）
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
