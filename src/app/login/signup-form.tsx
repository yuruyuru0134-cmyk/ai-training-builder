"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signup } from "./actions";
import { initialAuthState } from "./types";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialAuthState);

  if (state.message) {
    return (
      <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
        <p className="font-medium text-foreground">確認メールを送信しました</p>
        <p className="text-muted-foreground">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-email">メールアドレス</Label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">パスワード</Label>
        <Input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="text-xs text-muted-foreground">8文字以上で入力してください。</p>
      </div>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "登録中…" : "アカウントを作成"}
      </Button>
    </form>
  );
}
