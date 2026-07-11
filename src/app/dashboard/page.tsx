import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

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
        <Button disabled title="次のマイルストーンで実装予定です">
          新規教材を作成
        </Button>
      </div>

      {materials && materials.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {materials.map((material) => (
            <Card key={material.id}>
              <CardHeader>
                <CardTitle className="text-base">{material.theme}</CardTitle>
                <CardDescription>{material.duration_minutes}分想定</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {material.status}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm font-medium text-foreground">
              まだ教材がありません
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              章構成の自動生成機能は準備中です。完成までもうしばらくお待ちください。
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
