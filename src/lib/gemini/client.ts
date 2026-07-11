import { GoogleGenAI } from "@google/genai";

export function createGeminiClient() {
  // process.env.GEMINI_API_KEY から自動的に読み込まれる
  return new GoogleGenAI({});
}

export const IMAGE_MODEL = "gemini-3.1-flash-image";

// docs/requirements.md 04章: スライド画像は1枚あたり30秒以内に生成する
export const IMAGE_TIMEOUT_MS = 30_000;
export const IMAGE_MAX_RETRIES = 2;
