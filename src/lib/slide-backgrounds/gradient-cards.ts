import type { BackgroundStyle } from "./types";

// 参考画像②（ブルーからパープルへの斜めグラデーションを背景に、
// 浮遊するカード状のUIパーツやアイソメトリックなイラストを配置した構成）の
// 視覚言語を翻訳したスタイル。人物イラストの再現は行わず、グラデーション地に
// 「浮いているカード」を思わせる角丸矩形のアウトラインだけを残して抽象化している。
// pptxgenjsは図形にグラデーション塗りを指定できないため、帯を重ねて疑似的に
// 色相を遷移させる。
const BLUE = "3E6FF0";
const PURPLE = "8A4FE0";

export const gradientCards: BackgroundStyle = ({ pres, slide, slideW, slideH, offsetX = 0 }) => {
  const bands = 10;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const color = t < 0.5 ? BLUE : PURPLE;
    const bandTransparency = 55 + t * 30;
    slide.addShape(pres.ShapeType.rect, {
      x: offsetX + (slideW / bands) * i, y: 0, w: slideW / bands + 0.02, h: slideH,
      fill: { color, transparency: bandTransparency }, line: { type: "none" },
    });
  }

  // 浮遊するカードのアウトライン3枚（サイズと角度に見立てた位置をずらし、
  // 積み重なったUIパネルのような奥行きを出す）。フローチャートと衝突しないよう
  // 上半分だけに配置する。
  const cards: { x: number; y: number; w: number; h: number; alpha: number }[] = [
    { x: 0.5, y: 0.35, w: 1.7, h: 1.05, alpha: 30 },
    { x: 2.6, y: 0.15, w: 1.4, h: 0.9, alpha: 22 },
    { x: 1.5, y: 1.55, w: 1.9, h: 0.75, alpha: 18 },
  ];
  cards.forEach((c) => {
    slide.addShape(pres.ShapeType.roundRect, {
      x: offsetX + c.x, y: c.y, w: c.w, h: c.h, rectRadius: 0.1,
      fill: { color: "FFFFFF", transparency: 88 },
      line: { color: "FFFFFF", width: 1, transparency: 100 - c.alpha },
    });
  });
};
