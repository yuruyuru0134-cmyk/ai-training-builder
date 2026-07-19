import type PptxGenJS from "pptxgenjs";
import { BACKGROUND_STYLES, DEFAULT_BACKGROUND_STYLE, type BackgroundStyleKey } from "./slide-backgrounds";
import { FLOW_ICONS, pickFlowIcon } from "./slide-flow-icons";

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
    slide_flow_steps?: string[] | null;
  };
  accent: string;
  // 背景スタイルを差し替えたい場合に指定する（src/lib/slide-backgrounds.ts参照）。
  // 省略時はDEFAULT_BACKGROUND_STYLEを使用する。画像がない章のフォールバックにのみ使う。
  backgroundStyle?: BackgroundStyleKey;
  // 章の内容（H3詳細）にちなんでAI生成した背景画像。src/lib/gemini/slide.tsで
  // 既にトーンの背景色を重ねて薄く加工済みのものを渡す想定。
  backgroundImage?: { data: string; mimeType: string } | null;
};

type TextTheme = {
  bgColor: string;
  footerColor: string;
};

// 単純な「左：ソリッドパネル／右：写真」の垂直2分割は既存のよくあるテンプレートの
// 模倣に留まり平凡だったため、以下の要素で独自性を持たせている（Canvaの複数デザイン
// 候補を参考にしつつ、そのまま模倣はしていない）:
//   1. 左パネルは上部だけ階段状に右へ張り出し、写真パネルへ食い込む
//      （まっすぐな縦の境界線を避け、動きのあるシルエットにする）
//   2. 章番号を左パネル左上に大きく薄く配置するポスター的なタイポグラフィ
//   3. 手順フローチャートは個別の枠付きカードではなく、1本の縦ラインに
//      マーカーが並ぶ「ステップレール」表現にする
// 文字は画像の上に直接重ねないため、可読性確保のぼかし・減光は不要。
const LEFT_PANEL_W = 4.3;
const RIGHT_X = LEFT_PANEL_W;
const RIGHT_W = SLIDE_W - LEFT_PANEL_W;
const PAD = 0.5;
const CONTENT_W = LEFT_PANEL_W - PAD * 2;

// 左パネル上部の張り出し（写真パネルへ食い込む段差）。大きな章番号の
// 背景を兼ねるノッチなので、番号が収まる高さに合わせた1段のみにする。
const STEP_TIER = { w: LEFT_PANEL_W + 0.7, h: 1.35 };

// 右下に重ねる手順フローチャート。写真の上半分は遮らず、下側だけに収める。
const FLOW_W = RIGHT_W - 0.8;
const FLOW_X = RIGHT_X + (RIGHT_W - FLOW_W) / 2;
const FLOW_ROW_H = 0.42;
const FLOW_MARKER = 0.32;

function flowLayout(stepCount: number) {
  const pitch = FLOW_ROW_H;
  const totalH = stepCount > 0 ? (stepCount - 1) * pitch + FLOW_MARKER : 0;
  const yStart = SLIDE_H - 0.35 - totalH;
  return { pitch, yStart };
}

// ナレーション台本から抽出したH1(タイトル)/H2(サブタイトル)/H3(詳細情報)/
// 手順フローチャートを、左の色付きパネルと右の写真パネルに分けて表示する。
function buildTextOnlySlide(
  { pres, chapter, accent, backgroundStyle, backgroundImage }: SlideCtx,
  theme: TextTheme,
) {
  const slide = pres.addSlide();
  slide.background = { color: theme.bgColor };

  // 右パネル: 背景画像があればそのまま鮮明に敷く（文字が乗らないため、ぼかしや
  // 減光は不要）。無い場合のみベクター背景スタイルにフォールバックする。
  // 左パネルの階段状の張り出しが写真パネルへ食い込むため、必ず右パネルを
  // 先に描画し、左パネルを後から重ねる。
  if (backgroundImage) {
    slide.addImage({
      data: `data:${backgroundImage.mimeType};base64,${backgroundImage.data}`,
      x: RIGHT_X, y: 0, w: RIGHT_W, h: SLIDE_H,
      sizing: { type: "cover", w: RIGHT_W, h: SLIDE_H },
    });
  } else {
    slide.addShape(pres.ShapeType.rect, {
      x: RIGHT_X, y: 0, w: RIGHT_W, h: SLIDE_H,
      fill: { color: theme.bgColor }, line: { type: "none" },
    });
    BACKGROUND_STYLES[backgroundStyle ?? DEFAULT_BACKGROUND_STYLE]({
      pres, slide, accent, slideW: RIGHT_W, slideH: SLIDE_H, offsetX: RIGHT_X,
    });
  }

  // 左パネル: アクセントカラーのソリッド塗り。上部だけ階段状に右へ張り出して
  // 写真パネルへ食い込ませることで、まっすぐな縦の境界線を避ける。
  // 以降の文字は全て白系にして、どんな写真が右側に来ても左側の可読性には
  // 一切影響しないようにする。
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: STEP_TIER.w, h: STEP_TIER.h,
    fill: { color: accent }, line: { type: "none" },
  });
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: STEP_TIER.h, w: LEFT_PANEL_W, h: SLIDE_H - STEP_TIER.h,
    fill: { color: accent }, line: { type: "none" },
  });

  const no = String(chapter.order_index + 1).padStart(2, "0");
  const x = PAD;

  // 章番号を右寄せで大きく薄く配置するポスター的なタイポグラフィ要素。張り出し
  // ノッチの右側に収め、左の「CHAPTER」ラベルや後続のタイトル文字と衝突しないようにする。
  slide.addText(no, {
    x: 1.9, y: -0.25, w: STEP_TIER.w - 1.9, h: 1.55, fontSize: 100, bold: true,
    color: "FFFFFF", transparency: 87, align: "right", valign: "top",
  });

  slide.addText("CHAPTER", {
    x, y: 0.4, w: CONTENT_W, h: 0.3, fontSize: 11, bold: true, color: "FFFFFF",
    charSpacing: 2, valign: "top",
  });

  // H1: タイトル。左パネルの主役。2行に折り返っても後続要素と衝突しないよう、
  // 常に2行分の高さを確保する。
  slide.addText(chapter.title, {
    x, y: 0.75, w: CONTENT_W, h: 1.5, fontSize: 30, bold: true, color: "FFFFFF",
    valign: "top", fit: "shrink",
  });

  slide.addShape(pres.ShapeType.line, {
    x, y: 2.35, w: 0.6, h: 0, line: { color: "FFFFFF", width: 2, transparency: 30 },
  });

  // H2: サブタイトル。白の半透明でH1より軽い重みを出す。
  const subtitle = chapter.slide_subtitle;
  if (subtitle) {
    slide.addText(subtitle, {
      x, y: 2.5, w: CONTENT_W, h: 0.55, fontSize: 15, bold: true, color: "FFFFFF", transparency: 10,
      valign: "top", fit: "shrink",
    });
  }

  // H3: 詳細情報。左パネルが単色なので、①のようなカード処理は不要になり、
  // 白文字＋ドットのシンプルな箇条書きで十分な視認性が出る。
  const details = chapter.slide_details ?? [];
  details.forEach((item, i) => {
    const rowY = 3.15 + i * 0.42;
    slide.addShape(pres.ShapeType.ellipse, {
      x, y: rowY + 0.09, w: 0.06, h: 0.06, fill: { color: "FFFFFF", transparency: 20 }, line: { type: "none" },
    });
    slide.addText(item, {
      x: x + 0.2, y: rowY, w: CONTENT_W - 0.2, h: 0.38, fontSize: 12.5, color: "FFFFFF", transparency: 5,
      valign: "top", fit: "shrink",
    });
  });

  // 右パネル下部: 台本から抽出した手順を「ステップレール」として重ねる。
  // 個別の枠線付きカードではなく、1枚の半透明フロストパネルの上に縦の
  // アクセントラインを通し、マーカー（アイコン or 番号）を並べる構成にすることで、
  // ありきたりな箱＋矢印のフローチャートより連続性のある見せ方にする。
  const flowSteps = chapter.slide_flow_steps ?? [];
  if (flowSteps.length > 0) {
    const { pitch: flowPitch, yStart: flowYStart } = flowLayout(flowSteps.length);
    const panelPad = 0.16;
    const panelH = (flowSteps.length - 1) * flowPitch + FLOW_MARKER + panelPad * 2;
    slide.addShape(pres.ShapeType.roundRect, {
      x: FLOW_X - panelPad, y: flowYStart - panelPad, w: FLOW_W + panelPad * 2, h: panelH, rectRadius: 0.08,
      fill: { color: "FFFFFF", transparency: 14 }, line: { type: "none" },
      shadow: { type: "outer", color: "000000", opacity: 0.16, blur: 6, offset: 1, angle: 90 },
    });

    const railX = FLOW_X + FLOW_MARKER / 2;
    const railTopY = flowYStart + FLOW_MARKER / 2;
    const railBottomY = flowYStart + (flowSteps.length - 1) * flowPitch + FLOW_MARKER / 2;
    if (flowSteps.length > 1) {
      slide.addShape(pres.ShapeType.line, {
        x: railX, y: railTopY, w: 0, h: railBottomY - railTopY,
        line: { color: accent, width: 2, transparency: 15 },
      });
    }

    flowSteps.forEach((step, i) => {
      const markerY = flowYStart + i * flowPitch;

      // ステップ文言のキーワードに応じて、事前生成済みのアイコン（1度だけGeminiで
      // 作成し src/lib/slide-flow-icons.ts に埋め込み済み）をレール上のマーカーにする。
      // キーワードに一致しない場合は番号バッジで代替し、常に円形マーカー＋左寄せ文字で揃える。
      const iconKey = pickFlowIcon(step);
      if (iconKey) {
        slide.addShape(pres.ShapeType.ellipse, {
          x: FLOW_X, y: markerY, w: FLOW_MARKER, h: FLOW_MARKER,
          fill: { color: "FFFFFF" }, line: { color: accent, width: 1.5 },
        });
        const iconPad = 0.07;
        slide.addImage({
          data: `data:image/png;base64,${FLOW_ICONS[iconKey]}`,
          x: FLOW_X + iconPad, y: markerY + iconPad, w: FLOW_MARKER - iconPad * 2, h: FLOW_MARKER - iconPad * 2,
        });
      } else {
        slide.addShape(pres.ShapeType.ellipse, {
          x: FLOW_X, y: markerY, w: FLOW_MARKER, h: FLOW_MARKER,
          fill: { color: accent }, line: { type: "none" },
        });
        slide.addText(String(i + 1), {
          x: FLOW_X, y: markerY, w: FLOW_MARKER, h: FLOW_MARKER, fontSize: 11, bold: true,
          color: "FFFFFF", align: "center", valign: "middle",
        });
      }

      const textX = FLOW_X + FLOW_MARKER + 0.14;
      const textW = FLOW_W - FLOW_MARKER - 0.14;
      slide.addText(step, {
        x: textX, y: markerY - 0.02, w: textW, h: FLOW_MARKER + 0.04, fontSize: 12, bold: true,
        color: "333333", align: "left", valign: "middle", fit: "shrink",
      });
    });
  }

  return slide;
}

export function buildBusinessSlide(ctx: SlideCtx) {
  return buildTextOnlySlide(ctx, { bgColor: "F7F9FC", footerColor: "999999" });
}

export function buildCasualSlide(ctx: SlideCtx) {
  return buildTextOnlySlide(ctx, { bgColor: "FFF7E8", footerColor: "9C8563" });
}

export function buildMinimalSlide(ctx: SlideCtx) {
  return buildTextOnlySlide(ctx, { bgColor: "FFFFFF", footerColor: "AAAAAA" });
}
