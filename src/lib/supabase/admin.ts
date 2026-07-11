import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * RLSを迂回する管理者クライアント。Cronジョブ等、認証済みユーザーの
 * コンテキストを持たないサーバー処理でのみ使用する。
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}
