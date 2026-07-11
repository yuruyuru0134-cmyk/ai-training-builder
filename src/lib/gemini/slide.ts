import { Modality } from "@google/genai";
import {
  createGeminiClient,
  IMAGE_MAX_RETRIES,
  IMAGE_MODEL,
  IMAGE_TIMEOUT_MS,
} from "./client";
import type { MaterialTone } from "@/lib/types";

const TONE_STYLE_HINT: Record<MaterialTone, string> = {
  business:
    "落ち着いた配色のコーポレート向けデザイン。フラットなアイコンや図形を使い、信頼感のあるプロフェッショナルな印象。",
  casual:
    "明るく親しみやすい配色。手描き風のイラストや柔らかい形のアイコンを使った、カジュアルで親近感のある印象。",
  minimal:
    "余白を活かした落ち着いた配色。装飾を最小限に抑えたミニマルでクリーンなデザイン。",
};

function buildPrompt(params: {
  theme: string;
  chapterTitle: string;
  chapterSummary: string;
  tone: MaterialTone;
}) {
  return `企業のAI研修で実際に使うプレゼンテーションスライドを1枚生成してください。

教材テーマ: ${params.theme}
この章の内容: ${params.chapterSummary}

スライドに大きく読みやすく配置する見出し文字（必ずこの日本語をそのまま使用すること）:
「${params.chapterTitle}」

要件:
- 横長（16:9）のプレゼンテーションスライドの構図にしてください
- 画面内の文字は上記の日本語タイトルのみとし、他の文章・英語表記・架空のロゴ・ページ番号・ボタンなどのUI装飾は一切入れないでください
- タイトルを引き立てる、章の内容を象徴するシンプルなイラストや図形・アイコンを背景や余白に配置してください
- デザインの方向性: ${TONE_STYLE_HINT[params.tone]}`;
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

export async function generateSlideImage(params: {
  theme: string;
  chapterTitle: string;
  chapterSummary: string;
  tone: MaterialTone;
}): Promise<{ data: string; mimeType: string; attempts: number }> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= IMAGE_MAX_RETRIES + 1; attempt++) {
    try {
      const result = await callOnce(params);
      return { ...result, attempts: attempt };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("スライド画像の生成に失敗しました。");
}
