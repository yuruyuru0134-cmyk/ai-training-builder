import type { BackgroundStyle } from "./types";

// 参考画像④（クリーム地に焦げ茶の細い罫線、写真集・古書のような落ち着いた
// 配色とタイポグラフィ）の視覚言語を翻訳したスタイル。写真は使わず、
// 罫線と小さな図形だけで「余白の多い上質な紙面」の印象を作る。
const SEPIA = "6B4A34";

export const vintageFrame: BackgroundStyle = ({ pres, slide, slideW, slideH, offsetX = 0 }) => {
  slide.addShape(pres.ShapeType.rect, {
    x: offsetX, y: 0, w: slideW, h: slideH,
    fill: { color: "F3ECE0" }, line: { type: "none" },
  });

  // 外周の二重罫線（古書のフレームのような、太さの異なる2本線）。
  slide.addShape(pres.ShapeType.rect, {
    x: offsetX + 0.22, y: 0.22, w: slideW - 0.44, h: slideH - 0.44,
    fill: { type: "none" }, line: { color: SEPIA, width: 0.5, transparency: 55 },
  });
  slide.addShape(pres.ShapeType.rect, {
    x: offsetX + 0.3, y: 0.3, w: slideW - 0.6, h: slideH - 0.6,
    fill: { type: "none" }, line: { color: SEPIA, width: 1, transparency: 72 },
  });

  // 左上のコーナー飾り: 短い水平罫線＋小さな菱形（章タイトルの飾り罫を思わせる）。
  slide.addShape(pres.ShapeType.line, {
    x: offsetX + 0.7, y: 0.75, w: 0.9, h: 0, line: { color: SEPIA, width: 1, transparency: 35 },
  });
  slide.addShape(pres.ShapeType.line, {
    x: offsetX + 0.7, y: 1.0, w: 0.55, h: 0, line: { color: SEPIA, width: 0.5, transparency: 55 },
  });
  const diamondSize = 0.09;
  slide.addShape(pres.ShapeType.diamond, {
    x: offsetX + 1.75, y: 0.75 - diamondSize / 2, w: diamondSize, h: diamondSize,
    fill: { color: SEPIA, transparency: 35 }, line: { type: "none" },
  });
};
