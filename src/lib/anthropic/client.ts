import Anthropic from "@anthropic-ai/sdk";

export function createAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// 章構成・整合性チェックは精度重視でSonnet 5、
// 台本のような分量が多く定型的な生成はHaiku 4.5を使う想定（docs/requirements.md 08章）。
export const OUTLINE_MODEL = "claude-sonnet-5";
export const SCRIPT_MODEL = "claude-haiku-4-5";
