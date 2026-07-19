import type { BackgroundStyle } from "./types";

// 参考画像①（線画のワイヤーフレーム球体・放射状サンバースト・薄い枠線ボーダー）
// の視覚言語を、画像を使わずベクター図形（円のアウトライン・線のみ）で
// 再現したスタイル。元のテンプレートの緻密なメッシュ描画をそのまま
// 複製することはできないため、以下の3要素に翻訳している。
//   1. 対角の大きな円 + 同心円アウトライン → ワイヤーフレーム球体の印象
//   2. 放射状の細線バースト → ①の輪状装飾モチーフ
//   3. スライド全体を囲む薄い枠線 → ①のフレームボーダー
// 「地味」というフィードバックを受け、円の塗りは93/95%透明から大きく下げて
// 色をしっかり効かせている。
export const softCircles: BackgroundStyle = ({ pres, slide, accent, slideW, slideH }) => {
  // 右上: 大きな円 + 同心円アウトライン（ワイヤーフレーム球体）。
  // 外側ほど薄く・線も細くすることで、均一な機械的リングではなく
  // 奥行きのあるグラデーションのように見せる。
  const topCx = slideW - 0.1;
  const topCy = 0.1;
  const topR = 3.15;
  slide.addShape(pres.ShapeType.ellipse, {
    x: topCx - topR, y: topCy - topR, w: topR * 2, h: topR * 2,
    fill: { color: accent, transparency: 81 }, line: { type: "none" },
  });
  [
    { ratio: 0.42, transparency: 42, width: 0.75 },
    { ratio: 0.63, transparency: 52, width: 0.6 },
    { ratio: 0.81, transparency: 62, width: 0.5 },
    { ratio: 0.96, transparency: 72, width: 0.5 },
  ].forEach(({ ratio, transparency, width }) => {
    const r = topR * ratio;
    slide.addShape(pres.ShapeType.ellipse, {
      x: topCx - r, y: topCy - r, w: r * 2, h: r * 2,
      fill: { type: "none" }, line: { color: accent, width, transparency },
    });
  });

  // 左下: 中くらいの円（対角のバランス）
  slide.addShape(pres.ShapeType.ellipse, {
    x: -2.2, y: slideH - 2.0, w: 4.4, h: 4.4,
    fill: { color: accent, transparency: 85 }, line: { type: "none" },
  });

  // 右下: 放射状サンバースト（①の輪状モチーフ）。光線の長さを3段階でずらし、
  // 均一な機械的な星形ではなく、コーラルやウニのような有機的な密度を出す。
  const burstCx = slideW - 1.15;
  const burstCy = slideH - 0.78;
  const rayCount = 36;
  const tiers = [
    { outer: 0.64, transparency: 32, width: 0.6 },
    { outer: 0.52, transparency: 45, width: 0.5 },
    { outer: 0.4, transparency: 58, width: 0.45 },
  ];
  const inner = 0.13;
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2;
    const tier = tiers[i % tiers.length];
    const x1 = burstCx + inner * Math.cos(angle);
    const y1 = burstCy + inner * Math.sin(angle);
    const x2 = burstCx + tier.outer * Math.cos(angle);
    const y2 = burstCy + tier.outer * Math.sin(angle);
    slide.addShape(pres.ShapeType.line, {
      x: Math.min(x1, x2), y: Math.min(y1, y2),
      w: Math.max(Math.abs(x2 - x1), 0.01), h: Math.max(Math.abs(y2 - y1), 0.01),
      flipH: x2 < x1, flipV: y2 < y1,
      line: { color: accent, width: tier.width, transparency: tier.transparency },
    });
  }
  // 中心に小さな縁取り円を重ね、①のような輪の中心の抜けを強調する。
  slide.addShape(pres.ShapeType.ellipse, {
    x: burstCx - inner, y: burstCy - inner, w: inner * 2, h: inner * 2,
    fill: { type: "none" }, line: { color: accent, width: 0.5, transparency: 45 },
  });

  // スライド全体を細い二重線で縁取る（①のフレームボーダー）。
  // 1本だけより、外側をごく薄く・内側をやや濃くした二重線にすることで
  // 印刷物のフレームのような仕上がりの精度を出す。
  slide.addShape(pres.ShapeType.rect, {
    x: 0.12, y: 0.12, w: slideW - 0.24, h: slideH - 0.24,
    fill: { type: "none" }, line: { color: accent, width: 0.4, transparency: 75 },
  });
  slide.addShape(pres.ShapeType.rect, {
    x: 0.17, y: 0.17, w: slideW - 0.34, h: slideH - 0.34,
    fill: { type: "none" }, line: { color: accent, width: 0.5, transparency: 58 },
  });
};
