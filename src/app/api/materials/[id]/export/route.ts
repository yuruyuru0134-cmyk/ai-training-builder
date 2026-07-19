import { createRequire } from "node:module";
import type PptxGenJSType from "pptxgenjs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { MaterialTone, SlideImageMode } from "@/lib/types";
import { TONE_ACCENT } from "@/lib/slide-theme";
import { buildBusinessSlide, buildCasualSlide, buildMinimalSlide } from "@/lib/slide-templates";
import { BACKGROUND_STYLES, DEFAULT_BACKGROUND_STYLE, type BackgroundStyleKey } from "@/lib/slide-backgrounds";

// pptxgenjsはESM/CJSの両ビルドを"exports"条件で出し分けているが、
// serverExternalPackages経由でESM側(dist/pptxgen.es.js)がNode標準の
// import()で読み込まれると、当該ファイルに"type":"module"が無いために
// 「Cannot use import statement outside a module」で落ちる（Vercel実行環境で確認済み）。
// createRequireで明示的にrequireすることで確実にCJSビルドを読み込ませる。
const require = createRequire(import.meta.url);
const PptxGenJS = require("pptxgenjs") as unknown as typeof PptxGenJSType;

function sanitizeFilename(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "").trim() || "untitled";
}

async function fetchBackgroundImage(
  imageUrl: string | null,
): Promise<{ data: string; mimeType: string } | null> {
  if (!imageUrl) return null;
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const mimeType = res.headers.get("content-type") || "image/png";
    return { data: buffer.toString("base64"), mimeType };
  } catch {
    // 背景画像の取得に失敗しても、pptx全体の生成は継続する（フォールバック背景を使う）
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: material } = await supabase
    .from("materials")
    .select("id, theme, tone, slide_image_mode, background_style")
    .eq("id", id)
    .single();

  if (!material) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const materialImageMode = material.slide_image_mode as SlideImageMode;
  const backgroundStyle: BackgroundStyleKey =
    material.background_style in BACKGROUND_STYLES
      ? (material.background_style as BackgroundStyleKey)
      : DEFAULT_BACKGROUND_STYLE;

  const { data: chapters } = await supabase
    .from("chapters")
    .select(
      "id, order_index, title, script, slide_subtitle, slide_details, slide_flow_steps, slide_image_mode, slides(image_url, status)",
    )
    .eq("material_id", id)
    .order("order_index");

  const tone = material.tone as MaterialTone;
  const accent = TONE_ACCENT[tone];
  // 教材のトーン設定に応じて、構造から異なるテンプレートを使い分ける。
  const buildSlide =
    tone === "minimal" ? buildMinimalSlide : tone === "casual" ? buildCasualSlide : buildBusinessSlide;

  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_16x9";

  for (const chapter of chapters ?? []) {
    const slideRow = chapter.slides?.[0];
    const effectiveImageMode = (chapter.slide_image_mode as SlideImageMode | null) ?? materialImageMode;
    const backgroundImage =
      effectiveImageMode === "gemini" && slideRow?.status === "ready"
        ? await fetchBackgroundImage(slideRow.image_url)
        : null;

    const slide = buildSlide({
      pres,
      materialTheme: material.theme,
      chapter,
      accent,
      backgroundStyle,
      backgroundImage,
    });
    slide.addNotes(chapter.script || "（台本未生成）");
  }

  const buffer = (await pres.write({ outputType: "nodebuffer" })) as Buffer;
  const filename = `${sanitizeFilename(material.theme)}.pptx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="material.pptx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
