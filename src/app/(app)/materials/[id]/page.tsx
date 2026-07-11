import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  LEVEL_LABEL,
  STATUS_LABEL,
  TONE_LABEL,
  type MaterialLevel,
  type MaterialStatus,
  type MaterialTone,
} from "@/lib/types";
import { ChapterBoard } from "./chapter-board";
import { DeleteMaterialButton } from "./delete-material-button";

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: material } = await supabase
    .from("materials")
    .select("id, theme, duration_minutes, level, tone, status")
    .eq("id", id)
    .single();

  if (!material) {
    notFound();
  }

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, order_index, title, summary, estimated_minutes, script, char_count, status")
    .eq("material_id", id)
    .order("order_index");

  const chapterIds = (chapters ?? []).map((c) => c.id);
  const { data: slides } = chapterIds.length
    ? await supabase
        .from("slides")
        .select("chapter_id, image_url, status")
        .in("chapter_id", chapterIds)
    : { data: [] };

  const slideByChapter = new Map((slides ?? []).map((s) => [s.chapter_id, s]));
  const chaptersWithSlides = (chapters ?? []).map((c) => ({
    ...c,
    slideUrl: slideByChapter.get(c.id)?.image_url ?? null,
    slideStatus: slideByChapter.get(c.id)?.status ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">{material.theme}</h1>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{material.duration_minutes}分</Badge>
            <Badge variant="outline">{LEVEL_LABEL[material.level as MaterialLevel]}</Badge>
            <Badge variant="outline">{TONE_LABEL[material.tone as MaterialTone]}</Badge>
            <Badge variant="secondary">{STATUS_LABEL[material.status as MaterialStatus]}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/materials/${id}/preview`} />}>
            全体プレビュー
          </Button>
          <Button variant="outline" size="sm" render={<a href={`/api/materials/${id}/export`} />}>
            ZIPでダウンロード
          </Button>
          <DeleteMaterialButton materialId={id} />
        </div>
      </div>

      <ChapterBoard materialId={material.id} chapters={chaptersWithSlides} />
    </div>
  );
}
