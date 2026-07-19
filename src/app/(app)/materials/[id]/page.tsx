import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  LEVEL_LABEL,
  SLIDE_IMAGE_MODE_LABEL,
  STATUS_LABEL,
  TONE_LABEL,
  type MaterialLevel,
  type MaterialStatus,
  type MaterialTone,
  type SlideImageMode,
} from "@/lib/types";
import { ChapterBoard } from "./chapter-board";
import { DeleteMaterialButton } from "./delete-material-button";

export default async function MaterialDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorParam } = await searchParams;
  const supabase = await createClient();

  const { data: material } = await supabase
    .from("materials")
    .select("id, theme, duration_minutes, level, tone, status, slide_image_mode")
    .eq("id", id)
    .single();

  if (!material) {
    notFound();
  }

  const materialImageMode = material.slide_image_mode as SlideImageMode;

  const { data: chapters } = await supabase
    .from("chapters")
    .select(
      "id, order_index, title, summary, estimated_minutes, script, char_count, status, slide_subtitle, slide_details, slide_flow_steps, slide_image_mode, slides(image_url, status)",
    )
    .eq("material_id", id)
    .order("order_index");

  const chaptersWithSlides = (chapters ?? []).map((c) => {
    const slideRow = c.slides?.[0];
    const effectiveImageMode = (c.slide_image_mode as SlideImageMode | null) ?? materialImageMode;
    return {
      ...c,
      slideSubtitle: c.slide_subtitle ?? "",
      slideDetails: c.slide_details ?? [],
      slideFlowSteps: c.slide_flow_steps ?? [],
      slideImageUrl:
        effectiveImageMode === "gemini" && slideRow?.status === "ready" ? (slideRow.image_url ?? null) : null,
      slideStatus: slideRow?.status ?? null,
      slideImageMode: c.slide_image_mode as SlideImageMode | null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">{material.theme}</h1>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{material.duration_minutes}分</Badge>
            <Badge variant="outline">{LEVEL_LABEL[material.level as MaterialLevel]}</Badge>
            <Badge variant="outline">{TONE_LABEL[material.tone as MaterialTone]}</Badge>
            <Badge variant="outline">{SLIDE_IMAGE_MODE_LABEL[materialImageMode]}</Badge>
            <Badge variant="secondary">{STATUS_LABEL[material.status as MaterialStatus]}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/materials/${id}/preview`} />}>
            全体プレビュー
          </Button>
          <Button variant="outline" size="sm" render={<a href={`/api/materials/${id}/export`} />}>
            PowerPointでダウンロード
          </Button>
          <DeleteMaterialButton materialId={id} />
        </div>
      </div>

      {errorParam === "outline_failed" ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          章構成の自動生成に失敗しました。各章の「AIで再生成」や「章を追加」から手動で作成するか、時間をおいて教材を作り直してください。
        </p>
      ) : null}

      {errorParam === "content_partial" ? (
        <p className="rounded-md border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          一部の章で台本の自動生成に失敗しました。台本が空の章がないか確認し、該当する章から個別に「台本を生成」をお試しください。
        </p>
      ) : null}

      <ChapterBoard
        materialId={material.id}
        chapters={chaptersWithSlides}
        tone={material.tone as MaterialTone}
        materialImageMode={materialImageMode}
      />
    </div>
  );
}
