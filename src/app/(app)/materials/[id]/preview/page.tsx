import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { SlidePreview } from "@/components/slide-preview";
import {
  BACKGROUND_STYLE_LABEL,
  DEFAULT_BACKGROUND_STYLE,
  type BackgroundStyleKey,
} from "@/lib/slide-backgrounds";
import { LEVEL_LABEL, type MaterialLevel, type MaterialTone, type SlideImageMode } from "@/lib/types";

export default async function MaterialPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: material } = await supabase
    .from("materials")
    .select("id, theme, duration_minutes, level, tone, slide_image_mode, background_style")
    .eq("id", id)
    .single();

  if (!material) {
    notFound();
  }

  const tone = material.tone as MaterialTone;
  const materialImageMode = material.slide_image_mode as SlideImageMode;
  const materialBackgroundStyle: BackgroundStyleKey =
    material.background_style in BACKGROUND_STYLE_LABEL
      ? (material.background_style as BackgroundStyleKey)
      : DEFAULT_BACKGROUND_STYLE;

  const { data: chapters } = await supabase
    .from("chapters")
    .select(
      "id, order_index, title, script, slide_subtitle, slide_details, slide_flow_steps, slide_image_mode, slides(image_url, status)",
    )
    .eq("material_id", id)
    .order("order_index");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{material.theme}</h1>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{material.duration_minutes}分</Badge>
            <Badge variant="outline">{LEVEL_LABEL[material.level as MaterialLevel]}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/materials/${id}`} />}>
            編集画面に戻る
          </Button>
          <Button size="sm" render={<a href={`/api/materials/${id}/export`} />}>
            PowerPointでダウンロード
          </Button>
        </div>
      </div>

      <div className="space-y-10">
        {(chapters ?? []).map((chapter) => {
          const details: string[] = chapter.slide_details ?? [];
          const slideRow = chapter.slides?.[0];
          const effectiveImageMode = (chapter.slide_image_mode as SlideImageMode | null) ?? materialImageMode;
          const imageUrl =
            effectiveImageMode === "gemini" && slideRow?.status === "ready" ? (slideRow.image_url ?? null) : null;
          return (
            <section key={chapter.id} className="space-y-3">
              <div className="aspect-video w-full overflow-hidden rounded-md border border-border">
                <SlidePreview
                  tone={tone}
                  chapterNo={chapter.order_index + 1}
                  title={chapter.title}
                  subtitle={chapter.slide_subtitle ?? ""}
                  details={details}
                  flowSteps={chapter.slide_flow_steps ?? []}
                  imageUrl={imageUrl}
                  backgroundStyle={materialBackgroundStyle}
                />
              </div>
              <p className="whitespace-pre-wrap rounded-md border border-border bg-background p-4 text-sm leading-relaxed">
                {chapter.script || "台本が未生成です。"}
              </p>
            </section>
          );
        })}
        {(chapters ?? []).length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">章がありません。</p>
        ) : null}
      </div>
    </div>
  );
}
