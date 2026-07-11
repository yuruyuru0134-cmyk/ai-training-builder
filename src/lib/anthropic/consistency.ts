import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createAnthropicClient, OUTLINE_MODEL } from "./client";

const ConsistencySchema = z.object({
  issues: z.array(
    z.object({
      order_index: z.number().int(),
      issue: z.string(),
    }),
  ),
});

export type ConsistencyIssue = z.infer<typeof ConsistencySchema>["issues"][number];

export async function checkConsistency(
  chapters: { order_index: number; title: string; summary: string }[],
): Promise<ConsistencyIssue[]> {
  const client = createAnthropicClient();

  const chapterList = chapters
    .map((c) => `${c.order_index + 1}. ${c.title}\n   概要: ${c.summary}`)
    .join("\n");

  const prompt = `以下はAI研修教材の章構成案です。章同士の重複・矛盾・粒度のばらつきをチェックしてください。

${chapterList}

問題が見つかった章について、order_index（1章目なら0、2章目なら1...）と具体的な問題点をissuesに列挙してください。
問題がなければ issues は空配列にしてください。`;

  const response = await client.messages.parse({
    model: OUTLINE_MODEL,
    max_tokens: 2048,
    thinking: { type: "disabled" },
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(ConsistencySchema) },
  });

  return response.parsed_output?.issues ?? [];
}
