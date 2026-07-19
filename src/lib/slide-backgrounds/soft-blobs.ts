import type PptxGenJS from "pptxgenjs";
import type { BackgroundStyle } from "./types";

// 参考画像⑤（パステルブルー・ピンク・パープルの有機的なブロブ形状が
// ふんわり重なり合う配色）の視覚言語を、ベクター図形で近い印象に翻訳したスタイル。
// pptxgenjsは図形にぼかしフィルタをかけられないため、同心円を外側ほど
// 薄く・大きくする多重リングでソフトフォーカスの質感を近似している。
// フローチャートは常にパネル下部に来るため、装飾は上半分に収める。
const PALETTE = ["9FD1F5", "F5B8DA", "CDB6F2"];

function blob(
  pres: PptxGenJS,
  slide: PptxGenJS.Slide,
  cx: number,
  cy: number,
  r: number,
  color: string,
) {
  [1, 0.78, 0.56, 0.36].forEach((ratio, i) => {
    const rr = r * ratio;
    slide.addShape(pres.ShapeType.ellipse, {
      x: cx - rr, y: cy - rr, w: rr * 2, h: rr * 2,
      fill: { color, transparency: 78 - i * 6 }, line: { type: "none" },
    });
  });
}

export const softBlobs: BackgroundStyle = ({ pres, slide, slideW, offsetX = 0 }) => {
  blob(pres, slide, offsetX + slideW * 0.28, 0.35, 1.55, PALETTE[0]);
  blob(pres, slide, offsetX + slideW * 0.82, 0.15, 1.3, PALETTE[1]);
  blob(pres, slide, offsetX + slideW * 0.62, 1.7, 1.1, PALETTE[2]);
};
