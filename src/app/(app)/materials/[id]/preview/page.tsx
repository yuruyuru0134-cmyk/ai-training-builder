import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { LEVEL_LABEL, type MaterialLevel } from "@/lib/types";

export default async function MaterialPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: material } = await supabase
    .from("materials")
    .select("id, theme, duration_minutes, level")
    .eq("id", id)
    .single();

  if (!material) {
    notFound();
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
            ZIPでダウンロード
          </Button>
        </div>
      </div>

      <div className="space-y-10">
        {(chapters ?? []).map((chapter) => {
          const slideUrl = slideByChapter.get(chapter.id);
          return (
            <section key={chapter.id} className="space-y-3">
              <h2 className="text-base font-semibold">
                第{chapter.order_index + 1}章　{chapter.title}
              </h2>
              {slideUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slideUrl}
                  alt={`第${chapter.order_index + 1}章のスライド画像`}
                  className="aspect-video w-full rounded-md border border-border object-cover"
                />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed border-border bg-muted/40 text-xs text-muted-foreground">
                  スライド画像未生成
                </div>
              )}
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
