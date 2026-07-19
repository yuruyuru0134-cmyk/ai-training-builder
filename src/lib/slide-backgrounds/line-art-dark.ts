import type { BackgroundStyle } from "./types";

// 参考画像⑥（黒背景に白い細線のスケッチ画が数本だけ配置された、
// ミニマルで洗練されたダークトーン）の視覚言語を翻訳したスタイル。
// 他スタイルと異なり背景そのものを黒で塗りつぶし、装飾は極端に少なくして
// 余白の多さで高級感・静けさを出す。フローチャートは下部に重なるため、
// 線画は上半分だけに収める。
export const lineArtDark: BackgroundStyle = ({ pres, slide, accent, slideW, slideH, offsetX = 0 }) => {
  slide.addShape(pres.ShapeType.rect, {
    x: offsetX, y: 0, w: slideW, h: slideH,
    fill: { color: "141414" }, line: { type: "none" },
  });

  // 右上: 折れ線のスケッチ（1本の細い白線が数点を結ぶ、山なりの筆致）。
  const points: [number, number][] = [
    [offsetX + slideW - 2.5, 1.9],
    [offsetX + slideW - 1.9, 0.6],
    [offsetX + slideW - 1.3, 1.4],
    [offsetX + slideW - 0.5, 0.3],
  ];
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    slide.addShape(pres.ShapeType.line, {
      x: Math.min(x1, x2), y: Math.min(y1, y2),
      w: Math.max(Math.abs(x2 - x1), 0.01), h: Math.max(Math.abs(y2 - y1), 0.01),
      flipH: x2 < x1, flipV: y2 < y1,
      line: { color: "FFFFFF", width: 0.75, transparency: 15 },
    });
  }

  // 左上: 極細の円弧アウトライン一つだけ（余白の中の孤立したモチーフ）。
  const r = 0.5;
  slide.addShape(pres.ShapeType.ellipse, {
    x: offsetX + 0.6, y: 1.7, w: r * 2, h: r * 2,
    fill: { type: "none" }, line: { color: accent, width: 1, transparency: 25 },
  });

  // 点のアクセント（線の終点に小さな塗りつぶし円）。
  const [lastX, lastY] = points[points.length - 1];
  slide.addShape(pres.ShapeType.ellipse, {
    x: lastX - 0.03, y: lastY - 0.03, w: 0.06, h: 0.06,
    fill: { color: "FFFFFF", transparency: 10 }, line: { type: "none" },
  });
};
