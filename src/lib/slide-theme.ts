import type { MaterialTone } from "@/lib/types";

// pptx出力（src/app/api/materials/[id]/export/route.ts）と
// Webプレビュー（chapter-card.tsx / preview/page.tsx）で同じ配色を使うための共通定義。
export const TONE_BG: Record<MaterialTone, string> = {
  business: "F5F7FA",
  casual: "FFF7E8",
  minimal: "FFFFFF",
};

export const TONE_ACCENT: Record<MaterialTone, string> = {
  business: "1F3A5F",
  casual: "C2571E",
  minimal: "222222",
};
