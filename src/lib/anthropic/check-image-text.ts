import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createAnthropicClient, SCRIPT_MODEL } from "./client";

const CheckSchema = z.object({
  hasText: z.boolean(),
});

// Gemini生成の挿絵は、組織図・フローチャート風の構図になると
// 「文字は描かないで」という指示を無視してラベルを描き込むことがある。
// スライド側で別途テキストを重ねる設計のため、画像内の文字混入は
// 二重表示や可読性低下に直結する。生成後にVisionで検証し、再生成の要否を判定する。
export async function checkImageHasText(params: {
  data: string;
  mimeType: string;
}): Promise<boolean> {
  const client = createAnthropicClient();

  const response = await client.messages.parse({
    model: SCRIPT_MODEL,
    max_tokens: 256,
    thinking: { type: "disabled" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: params.mimeType as "image/jpeg" | "image/png", data: params.data },
          },
          {
            type: "text",
            text: "この画像の中に、読み取れる文字・単語・ラベル・数字が写り込んでいますか（言語不問）。装飾的な模様やアイコンの形状は文字に含めません。",
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(CheckSchema) },
  });

  return response.parsed_output?.hasText ?? false;
}
