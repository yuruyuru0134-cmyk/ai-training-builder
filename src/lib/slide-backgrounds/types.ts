import type PptxGenJS from "pptxgenjs";

export type BackgroundParams = {
  pres: PptxGenJS;
  slide: PptxGenJS.Slide;
  accent: string;
  slideW: number;
  slideH: number;
};

export type BackgroundStyle = (params: BackgroundParams) => void;
