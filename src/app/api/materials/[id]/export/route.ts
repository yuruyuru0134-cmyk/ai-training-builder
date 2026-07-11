import JSZip from "jszip";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function sanitizeFilename(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "").trim() || "untitled";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: material } = await supabase
    .from("materials")
    .select("id, theme")
    .eq("id", id)
    .single();

  if (!material) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, order_index, title, script")
    .eq("material_id", id)
    .order("order_index");

  const chapterIds = (chapters ?? []).map((c) => c.id);
  const { data: slides } = chapterIds.length
    ? await supabase.from("slides").select("chapter_id, image_url").in("chapter_id", chapterIds)
    : { data: [] };
  const slideByChapter = new Map((slides ?? []).map((s) => [s.chapter_id, s.image_url]));

  const zip = new JSZip();
  const scriptsFolder = zip.folder("scripts");
  const slidesFolder = zip.folder("slides");

  for (const chapter of chapters ?? []) {
    const n = String(chapter.order_index + 1).padStart(2, "0");
    const safeTitle = sanitizeFilename(chapter.title);

    scriptsFolder?.file(`${n}_${safeTitle}.txt`, chapter.script || "（台本未生成）");

    const imageUrl = slideByChapter.get(chapter.id);
    if (imageUrl) {
      try {
        const res = await fetch(imageUrl);
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          const extension = imageUrl.includes(".png") ? "png" : "jpg";
          slidesFolder?.file(`${n}_${safeTitle}.${extension}`, buffer);
        }
      } catch {
        // 画像の取得に失敗した場合はスキップし、台本のエクスポートは継続する
      }
    }
  }

  const content = await zip.generateAsync({ type: "arraybuffer" });
  const blob = new Blob([content], { type: "application/zip" });
  const filename = `${sanitizeFilename(material.theme)}.zip`;

  return new NextResponse(blob, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="material.zip"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
