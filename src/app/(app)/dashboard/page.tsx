import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL, type MaterialStatus } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: materials } = await supabase
    .from("materials")
    .select("id, theme, duration_minutes, status, created_at")
    .order("created_at", { ascending: false });

  const materialIds = (materials ?? []).map((m) => m.id);
  const { data: firstChapters } = materialIds.length
    ? await supabase
        .from("chapters")
        .select("id, material_id, order_index")
        .in("material_id", materialIds)
        .order("order_index")
    : { data: [] };

  const firstChapterByMaterial = new Map<string, string>();
  for (const c of firstChapters ?? []) {
    if (!firstChapterByMaterial.has(c.material_id)) {
      firstChapterByMaterial.set(c.material_id, c.id);
    }
  }

  const firstChapterIds = [...firstChapterByMaterial.values()];
  const { data: thumbSlides } = firstChapterIds.length
    ? await supabase.from("slides").select("chapter_id, image_url").in("chapter_id", firstChapterIds)
    : { data: [] };
  const thumbByChapter = new Map((thumbSlides ?? []).map((s) => [s.chapter_id, s.image_url]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">教材一覧</h1>
          <p className="text-sm text-muted-foreground">
            テーマと所要時間を入力して、新しい研修教材の下書きを作成できます。
          </p>
        </div>
        <Button render={<Link href="/materials/new" />}>新規教材を作成</Button>
      </div>

      {materials && materials.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {materials.map((material) => {
            const firstChapterId = firstChapterByMaterial.get(material.id);
            const thumbnailUrl = firstChapterId ? thumbByChapter.get(firstChapterId) : null;

            return (
              <Link key={material.id} href={`/materials/${material.id}`}>
                <Card className="h-full overflow-hidden transition-colors hover:border-primary/40 py-0">
                  {thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnailUrl}
                      alt=""
                      className="aspect-video w-full border-b border-border object-cover"
                    />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center border-b border-border bg-muted/40 text-xs text-muted-foreground">
                      画像未生成
                    </div>
                  )}
                  <CardHeader className="pt-4">
                    <CardTitle className="text-base">{material.theme}</CardTitle>
                    <CardDescription>{material.duration_minutes}分想定</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <Badge variant="secondary">
                      {STATUS_LABEL[material.status as MaterialStatus]}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm font-medium text-foreground">まだ教材がありません</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              「新規教材を作成」からテーマと所要時間を入力すると、AIが章構成案を生成します。
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
