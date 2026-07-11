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
          {materials.map((material) => (
            <Link key={material.id} href={`/materials/${material.id}`}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardHeader>
                  <CardTitle className="text-base">{material.theme}</CardTitle>
                  <CardDescription>{material.duration_minutes}分想定</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary">
                    {STATUS_LABEL[material.status as MaterialStatus]}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
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
