import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createAnthropicClient, OUTLINE_MODEL } from "./client";
import { LEVEL_LABEL, LEVEL_PROMPT_HINT, type MaterialLevel } from "@/lib/types";

const OutlineSchema = z.object({
  chapters: z
    .array(
      z.object({
        title: z.string(),
        summary: z.string(),
        estimated_minutes: z.number().int().min(1),
      }),
    )
    .min(3)
    .max(10),
});

export type OutlineChapter = z.infer<typeof OutlineSchema>["chapters"][number];

// 60分教材なら5〜8章、というdocs/requirements.md 04章の基準に合わせたガードレール。
export function targetChapterCount(durationMinutes: number) {
  return Math.min(10, Math.max(3, Math.round(durationMinutes / 10)));
}

function buildPrompt(params: {
  theme: string;
  durationMinutes: number;
  level: MaterialLevel;
  target: number;
  correction?: string;
}) {
  return `あなたはAI研修教材の構成作家です。以下の条件で研修教材の章構成を作成してください。

テーマ: ${params.theme}
対象レベル: ${LEVEL_LABEL[params.level]}（${LEVEL_PROMPT_HINT[params.level]}）
教材全体の所要時間: ${params.durationMinutes}分

制約:
- 章数はちょうど${params.target}章にしてください
- 各章の estimated_minutes の合計が${params.durationMinutes}分に近くなるようにしてください
- 章は学習の流れとして自然な順序にし、前後の章と内容が重複しないようにしてください
- title は簡潔に(20字程度)、summary は章の内容を100字程度で説明してください
${params.correction ? `\n${params.correction}` : ""}`;
}

export async function generateOutline(params: {
  theme: string;
  durationMinutes: number;
  level: MaterialLevel;
}): Promise<OutlineChapter[]> {
  const client = createAnthropicClient();
  const target = targetChapterCount(params.durationMinutes);

  async function call(correction?: string) {
    const response = await client.messages.parse({
      model: OUTLINE_MODEL,
      max_tokens: 4096,
      thinking: { type: "disabled" },
      messages: [
        {
          role: "user",
          content: buildPrompt({ ...params, target, correction }),
        },
      ],
      output_config: { format: zodOutputFormat(OutlineSchema) },
    });
    return response.parsed_output?.chapters ?? [];
  }

  let chapters = await call();

  // 章数がガードレールから外れている場合は、明示的な訂正指示を添えて一度だけ再試行する。
  if (chapters.length < target - 1 || chapters.length > target + 1) {
    chapters = await call(
      `前回の生成では章数が${chapters.length}章になってしまいました。必ず${target}章ちょうどにしてください。`,
    );
  }

  return chapters;
}
