import type { BackgroundStyle } from "./types";
import { softCircles } from "./soft-circles";
import { none } from "./none";

export type { BackgroundParams, BackgroundStyle } from "./types";

// 背景スタイルは1ファイル1種類で管理する（このディレクトリ内）。
// 新しいスタイルを追加する場合は新規ファイルを作成し（例: soft-waves.ts）、
// そのファイルの内容・トーンに合った参考画像を1つ選んでアレンジしたうえで、
// 下のレジストリにキーを追加する。既存ファイルに別スタイルを追記しない。
export const BACKGROUND_STYLES = {
  "soft-circles": softCircles,
  none,
} satisfies Record<string, BackgroundStyle>;

export type BackgroundStyleKey = keyof typeof BACKGROUND_STYLES;

export const DEFAULT_BACKGROUND_STYLE: BackgroundStyleKey = "soft-circles";
