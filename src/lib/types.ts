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

// 「対象レベル: 初級」だけではAIが用語の平易さを自己判断してしまい、
// 実際には専門用語が混じりやすいため、レベルごとに明示的な執筆方針を渡す。
// 台本・章構成・スライド抽出など、テキスト生成系プロンプト全てに含める。
export const LEVEL_PROMPT_HINT: Record<MaterialLevel, string> = {
  beginner:
    "受講者は本当に何も知らない初心者です。専門用語・カタカナ略語・英語表記は極力使わないでください。" +
    "どうしても使う場合は、必ずその場で「〜とは、簡単に言うと〜のことです」のように平易な言葉で説明を添えてください。" +
    "難しい概念は日常生活の身近な例えに置き換えて説明してください。",
  intermediate:
    "受講者は基本的な用語は知っている前提で構いません。専門用語を使う場合は一言だけ簡潔に補足してください。",
  advanced:
    "受講者は実務経験があります。専門用語を積極的に使い、実務で使えるレベルの深さで具体的に説明してください。",
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
