import type { BackgroundStyle } from "./types";

// 参考画像③（写真と単色カラーブロックを格子状に組み合わせたグリッドレイアウト）の
// 視覚言語を翻訳したスタイル。写真は使わず、複数の単色ブロックだけで
// 「情報が整理された格子」の印象を再現する。フローチャートと衝突しないよう
// グリッドは右上のコーナーに寄せる。
const BLOCK_COLORS = ["1F6F78", "2E9E8F", "F2B23E", "1F3A5F"];

export const colorGrid: BackgroundStyle = ({ pres, slide, accent, slideW, offsetX = 0 }) => {
  slide.addShape(pres.ShapeType.rect, {
    x: offsetX, y: 0, w: slideW, h: 2.6,
    fill: { color: "F4F1EA" }, line: { type: "none" },
  });

  const cols = 3;
  const rows = 2;
  const gap = 0.06;
  const gridW = slideW * 0.62;
  const gridH = 2.0;
  const gridX = offsetX + slideW - gridW - 0.4;
  const gridY = 0.35;
  const cellW = (gridW - gap * (cols - 1)) / cols;
  const cellH = (gridH - gap * (rows - 1)) / rows;

  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isAccentCell = i === 4;
      slide.addShape(pres.ShapeType.rect, {
        x: gridX + c * (cellW + gap), y: gridY + r * (cellH + gap), w: cellW, h: cellH,
        fill: { color: isAccentCell ? accent : BLOCK_COLORS[i % BLOCK_COLORS.length], transparency: 8 },
        line: { type: "none" },
      });
      i++;
    }
  }
};
