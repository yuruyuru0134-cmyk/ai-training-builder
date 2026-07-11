import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Supabase Freeプランは7日間無操作でプロジェクトが一時停止するため、
// Vercel Cronから定期的に軽量クエリを実行して稼働を維持する。
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pinged_at: new Date().toISOString() });
}
