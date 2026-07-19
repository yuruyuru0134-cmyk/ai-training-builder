import type { BackgroundStyle } from "./types";
import { softCircles } from "./soft-circles";
import { softBlobs } from "./soft-blobs";
import { lineArtDark } from "./line-art-dark";
import { gradientCards } from "./gradient-cards";
import { colorGrid } from "./color-grid";
import { vintageFrame } from "./vintage-frame";
import { none } from "./none";

export type { BackgroundParams, BackgroundStyle } from "./types";

// 背景スタイルは1ファイル1種類で管理する（このディレクトリ内）。sample/配下の
// 参考画像①〜⑥それぞれの視覚言語をベクター図形に翻訳したもの。新しいスタイルを
// 追加する場合は新規ファイルを作成し、下のレジストリにキーを追加する
// （既存ファイルに別スタイルを追記しない）。
export const BACKGROUND_STYLES = {
  "soft-circles": softCircles, // sample①: 線画ワイヤーフレーム球体・放射状サンバースト
  "gradient-cards": gradientCards, // sample②: ブルー→パープルの斜めグラデーション＋浮遊カード
  "color-grid": colorGrid, // sample③: 写真グリッドを単色ブロックに置き換えたグリッド
  "vintage-frame": vintageFrame, // sample④: クリーム地に焦げ茶罫線の古書調フレーム
  "soft-blobs": softBlobs, // sample⑤: パステルカラーの有機的なブロブ形状
  "line-art-dark": lineArtDark, // sample⑥: 黒背景に白い細線スケッチのミニマルダーク
  none,
} satisfies Record<string, BackgroundStyle>;

export type BackgroundStyleKey = keyof typeof BACKGROUND_STYLES;

export const DEFAULT_BACKGROUND_STYLE: BackgroundStyleKey = "soft-circles";

export const BACKGROUND_STYLE_LABEL: Record<BackgroundStyleKey, string> = {
  "soft-circles": "① 線画サンバースト",
  "gradient-cards": "② グラデーション＋カード",
  "color-grid": "③ カラーブロックグリッド",
  "vintage-frame": "④ 古書調フレーム",
  "soft-blobs": "⑤ パステルブロブ",
  "line-art-dark": "⑥ ダーク線画",
  none: "装飾なし",
};
