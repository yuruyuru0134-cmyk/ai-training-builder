import type PptxGenJS from "pptxgenjs";
import { BACKGROUND_STYLES, DEFAULT_BACKGROUND_STYLE, type BackgroundStyleKey } from "./slide-backgrounds";

// レイアウトはpres.layout = "LAYOUT_16x9"（10in × 5.63in）を前提にした固定値。
export const SLIDE_W = 10;
export const SLIDE_H = 5.63;

export type SlideCtx = {
  pres: PptxGenJS;
  materialTheme: string;
  chapter: {
    order_index: number;
    title: string;
    slide_subtitle: string | null;
    slide_details: string[] | null;
  };
  accent: string;
  // 背景スタイルを差し替えたい場合に指定する（src/lib/slide-backgrounds.ts参照）。
  // 省略時はDEFAULT_BACKGROUND_STYLEを使用する。
  backgroundStyle?: BackgroundStyleKey;
  // 章の内容（H3詳細）にちなんでAI生成した背景画像。src/lib/gemini/slide.tsで
  // 既にトーンの背景色を重ねて薄く加工済みのものを渡す想定。指定時はベクター
  // 背景（backgroundStyle）の代わりにこちらを使う。
  backgroundImage?: { data: string; mimeType: string } | null;
};

type TextTheme = {
  bgColor: string;
  h1Color: string;
  h3Color: string;
  footerColor: string;
};

const BADGE_W = 0.85;
const BADGE_X = SLIDE_W - 1.5;
const BADGE_Y = 0.45;
const TITLE_W = BADGE_X - 0.3 - 0.8;

// pptxgenjsは図形の塗りにグラデーションを指定できないため、文字の右端より
// 少し先で終わる細い帯を並べて透明度を段階的に上げ、グラデーションで
// 消えていくように見せる（H3ピルの「文字が終わってからフェード」用）。
const H3_FONT_SIZE = 14;
const H3_FADE_STEPS = 14;

function estimateTextWidthIn(text: string, fontSizePt: number): number {
  let widthPt = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    // 全角文字（CJK・全角記号など）の実測グリフ幅はfontSize全角より狭いため、
    // 0.7倍程度で近似する（実際のレンダリング結果から逆算した係数）。
    const isFullWidth = code > 0x2e7f;
    widthPt += isFullWidth ? fontSizePt * 0.7 : fontSizePt * 0.4;
  }
  return widthPt / 72;
}

// 参考画像①（水色パステル・丸いフォトプレースホルダー・ソフトなグラデーション）の
// 視覚言語を一貫して踏襲する: 淡くぼかした円で背景に奥行きを出し、
// 章番号は丸いバッジとして見せ、詳細情報も角丸のソフトなカードに収める。
// 画像は使わず、H1(タイトル)→H2(サブタイトル)→H3(詳細情報)の文字の強弱で
// 情報の重要度を伝える。ナレーション台本から抽出した内容
// （chapters.slide_subtitle / slide_details）を表示する。
function buildTextOnlySlide(
  { pres, chapter, accent, backgroundStyle, backgroundImage }: SlideCtx,
  theme: TextTheme,
) {
  const slide = pres.addSlide();
  slide.background = { color: theme.bgColor };

  // 背景画像がある場合はそれをスライド全面に敷き、無い場合はベクター背景
  // スタイルにフォールバックする。3トーンとも同じ考え方で一貫性を保つ。
  // 新しいベクタースタイルを追加したい場合はsrc/lib/slide-backgrounds/に
  // 新規ファイルを作成する（1ファイル1種類）。
  if (backgroundImage) {
    slide.addImage({
      data: `data:${backgroundImage.mimeType};base64,${backgroundImage.data}`,
      x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
      sizing: { type: "cover", w: SLIDE_W, h: SLIDE_H },
    });
    // タイトル・サブタイトルは画像の上に直接乗るため、その領域だけ背景色の
    // スクリムを重ねて、どんな画像内容でも文字が確実に読めるようにする。
    // 画像自体の減光を控えめにした分（画像をはっきり見せるため）、
    // このスクリムをやや濃くして文字の可読性を確保している。
    slide.addShape(pres.ShapeType.rect, {
      x: 0, y: 0, w: SLIDE_W, h: 2.85,
      fill: { color: theme.bgColor, transparency: 15 }, line: { type: "none" },
    });
  } else {
    BACKGROUND_STYLES[backgroundStyle ?? DEFAULT_BACKGROUND_STYLE]({
      pres, slide, accent, slideW: SLIDE_W, slideH: SLIDE_H,
    });
  }

  const no = String(chapter.order_index + 1).padStart(2, "0");
  const x = 0.8;
  const w = SLIDE_W - x * 2;

  // 章番号は丸いバッジとして表示（①の「丸いフォトプレースホルダー」を
  // 画像を使わないこの構成向けに置き換えたモチーフ）。
  slide.addShape(pres.ShapeType.ellipse, {
    x: BADGE_X, y: BADGE_Y, w: BADGE_W, h: BADGE_W, fill: { color: accent }, line: { type: "none" },
    shadow: { type: "outer", color: "000000", opacity: 0.15, blur: 6, offset: 2, angle: 90 },
  });
  slide.addText(no, {
    x: BADGE_X, y: BADGE_Y, w: BADGE_W, h: BADGE_W, fontSize: 22, bold: true, color: "FFFFFF",
    align: "center", valign: "middle",
  });

  // H1: タイトル。最も大きく太いウェイトで主役として見せる。
  // 2行に折り返っても後続要素と衝突しないよう、常に2行分の高さを確保する。
  slide.addText(chapter.title, {
    x, y: 0.5, w: TITLE_W, h: 1.4, fontSize: 36, bold: true, color: theme.h1Color, valign: "top", fit: "shrink",
  });

  slide.addShape(pres.ShapeType.line, {
    x, y: 1.95, w: 0.7, h: 0, line: { color: accent, width: 2.5 },
  });

  // H2: サブタイトル。H1より小さく、アクセントカラーで中間の重みを出す。
  const subtitle = chapter.slide_subtitle;
  if (subtitle) {
    slide.addText(subtitle, {
      x, y: 2.1, w, h: 0.6, fontSize: 20, bold: true, color: accent, valign: "top", fit: "shrink",
    });
  }

  // H3: 詳細情報。①の「ソフトな角丸カード」を踏襲し、各項目を淡い色の
  // ハイライトに収めて並べる。最も軽いウェイト・小さいサイズで補足情報として見せる。
  // 背景画像がある場合、アクセント色のまま不透明度だけ上げると濃い色の
  // カードになり暗いテキストが読めなくなるため、背景色ベースの明るいカード
  // （すりガラス風）に切り替えて、どんな画像の上でも読める組み合わせにする。
  // ハイライトは行全体を均一に塗らず、文字の右端あたりまでは不透明、
  // そこから先はグラデーションで透明に消えていくようにする。
  const details = chapter.slide_details ?? [];
  const pillColor = backgroundImage ? theme.bgColor : accent;
  const pillBaseTransparency = backgroundImage ? 8 : 85;
  const textX = x + 0.38;
  const textMaxW = w - 0.55;
  details.forEach((item, i) => {
    const rowY = 2.9 + i * 0.52;
    const estTextW = Math.min(estimateTextWidthIn(item, H3_FONT_SIZE) + 0.2, textMaxW);
    const solidW = Math.max(textX + estTextW - x, 0.6);

    slide.addShape(pres.ShapeType.roundRect, {
      x, y: rowY, w: Math.min(solidW, w), h: 0.42, rectRadius: 0.1,
      fill: { color: pillColor, transparency: pillBaseTransparency }, line: { type: "none" },
    });

    const fadeStartX = x + solidW;
    const fadeW = x + w - fadeStartX;
    if (fadeW > 0.05) {
      const stepW = fadeW / H3_FADE_STEPS;
      for (let s = 0; s < H3_FADE_STEPS; s++) {
        const t = s / (H3_FADE_STEPS - 1);
        const stripTransparency = Math.min(pillBaseTransparency + t * (99 - pillBaseTransparency), 99);
        slide.addShape(pres.ShapeType.rect, {
          x: fadeStartX + s * stepW, y: rowY, w: stepW + 0.01, h: 0.42,
          fill: { color: pillColor, transparency: stripTransparency }, line: { type: "none" },
        });
      }
    }

    slide.addShape(pres.ShapeType.ellipse, {
      x: x + 0.18, y: rowY + 0.17, w: 0.08, h: 0.08, fill: { color: accent }, line: { type: "none" },
    });
    slide.addText(item, {
      x: textX, y: rowY, w: textMaxW, h: 0.42, fontSize: H3_FONT_SIZE, color: theme.h3Color, valign: "middle", fit: "shrink",
    });
  });

  return slide;
}

export function buildBusinessSlide(ctx: SlideCtx) {
  return buildTextOnlySlide(ctx, {
    bgColor: "F7F9FC",
    h1Color: "1A1A1A",
    h3Color: "444444",
    footerColor: "999999",
  });
}

export function buildCasualSlide(ctx: SlideCtx) {
  return buildTextOnlySlide(ctx, {
    bgColor: "FFF7E8",
    h1Color: "3A2C14",
    h3Color: "6B5A3C",
    footerColor: "9C8563",
  });
}

export function buildMinimalSlide(ctx: SlideCtx) {
  return buildTextOnlySlide(ctx, {
    bgColor: "FFFFFF",
    h1Color: "1A1A1A",
    h3Color: "555555",
    footerColor: "AAAAAA",
  });
}
