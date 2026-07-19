export type MaterialLevel = "beginner" | "intermediate" | "advanced";
export type MaterialTone = "business" | "casual" | "minimal";
export type MaterialStatus =
  | "draft"
  | "outline_ready"
  | "scripts_ready"
  | "slides_ready"
  | "completed";
export type SlideImageMode = "gemini" | "template";

export const LEVEL_LABEL: Record<MaterialLevel, string> = {
  beginner: "初級",
  intermediate: "中級",
  advanced: "上級",
};

export const TONE_LABEL: Record<MaterialTone, string> = {
  business: "ビジネス",
  casual: "カジュアル",
  minimal: "ミニマル",
};

export const STATUS_LABEL: Record<MaterialStatus, string> = {
  draft: "下書き",
  outline_ready: "構成案作成済み",
  scripts_ready: "台本作成済み",
  slides_ready: "スライド作成済み",
  completed: "完成",
};

export const SLIDE_IMAGE_MODE_LABEL: Record<SlideImageMode, string> = {
  gemini: "AIで生成（Gemini）",
  template: "内蔵テンプレート",
};
