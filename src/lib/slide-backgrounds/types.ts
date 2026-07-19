import type PptxGenJS from "pptxgenjs";

export type BackgroundParams = {
  pres: PptxGenJS;
  slide: PptxGenJS.Slide;
  accent: string;
  slideW: number;
  slideH: number;
  // 背景を描画する矩形の左上X座標（スライド全面ではなく、右側の写真パネルなど
  // 部分領域だけに描く場合に指定する）。省略時は0（スライド左端から）。
  offsetX?: number;
};

export type BackgroundStyle = (params: BackgroundParams) => void;
