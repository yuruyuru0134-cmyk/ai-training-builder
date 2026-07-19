import { createAnthropicClient, SCRIPT_MODEL } from "./client";
import { LEVEL_LABEL, LEVEL_PROMPT_HINT, TONE_LABEL, type MaterialLevel, type MaterialTone } from "@/lib/types";

const MAX_CHARS = 800;

function buildPrompt(params: {
  theme: string;
  level: MaterialLevel;
  tone: MaterialTone;
  chapterTitle: string;
  chapterSummary: string;
  estimatedMinutes: number | null;
  correction?: string;
}) {
  return `あなたはAI研修教材のナレーターです。以下の章の読み上げ用台本を作成してください。

教材テーマ: ${params.theme}
対象レベル: ${LEVEL_LABEL[params.level]}（${LEVEL_PROMPT_HINT[params.level]}）
トーン: ${TONE_LABEL[params.tone]}
章タイトル: ${params.chapterTitle}
章概要: ${params.chapterSummary}
想定時間: ${params.estimatedMinutes ?? "不明"}分

制約:
- 文体は必ず「です・ます調」で統一してください
- 800字以内で書いてください（厳守。句読点・記号も文字数に含みます）
- 見出しや箇条書き記号は使わず、そのまま読み上げられる地の文で書いてください
- 台本本文のみを出力し、前置きや説明文は付けないでください
${params.correction ? `\n${params.correction}` : ""}`;
}

async function callOnce(params: Parameters<typeof buildPrompt>[0]): Promise<string> {
  const client = createAnthropicClient();
  const response = await client.messages.create({
    model: SCRIPT_MODEL,
    max_tokens: 1536,
    messages: [{ role: "user", content: buildPrompt(params) }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text.trim() ?? "";
}

// 台本の末尾を句点で切り、不完全な文で終わらないようにする。
function truncateAtSentence(text: string, maxChars: number): string {
  const clipped = text.slice(0, maxChars);
  const lastPeriod = clipped.lastIndexOf("。");
  if (lastPeriod > 0) {
    return clipped.slice(0, lastPeriod + 1);
  }
  return clipped;
}

export async function generateScript(params: {
  theme: string;
  level: MaterialLevel;
  tone: MaterialTone;
  chapterTitle: string;
  chapterSummary: string;
  estimatedMinutes: number | null;
}): Promise<{ script: string; truncated: boolean }> {
  let script = await callOnce(params);

  if (script.length > MAX_CHARS) {
    script = await callOnce({
      ...params,
      correction: `前回の台本は${script.length}字でした。内容を絞り込み、必ず800字以内に収めてください。`,
    });
  }

  if (script.length > MAX_CHARS) {
    return { script: truncateAtSentence(script, MAX_CHARS), truncated: true };
  }

  return { script, truncated: false };
}

export { MAX_CHARS as SCRIPT_MAX_CHARS };
