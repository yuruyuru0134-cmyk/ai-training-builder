"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AuthFormState } from "./types";

function getBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// オープンリダイレクト防止: 自サイト内の絶対パスのみ許可する。
// "//evil.com" のようなプロトコル相対URLや外部URLは弾く。
function safeNext(next: string): string {
  if (next.startsWith("/") && !next.startsWith("//")) return next;
  return "/dashboard";
}

export async function login(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      error: "メールアドレスまたはパスワードが正しくありません。",
      message: null,
    };
  }

  redirect(safeNext(next));
}

export async function signup(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return { error: "パスワードは8文字以上で入力してください。", message: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getBaseUrl()}/auth/confirm?next=/dashboard`,
    },
  });

  if (error) {
    if (error.message.includes("already registered") || error.code === "user_already_exists") {
      return {
        error: "このメールアドレスは既に登録されています。ログインをお試しください。",
        message: null,
      };
    }
    return { error: error.message, message: null };
  }

  return {
    error: null,
    message: "確認メールを送信しました。メール内のリンクを開いて登録を完了してください。",
  };
}
