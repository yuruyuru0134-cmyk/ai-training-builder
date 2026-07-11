"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "./actions";
import { initialAuthState } from "./types";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(login, initialAuthState);

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="space-y-2">
        <Label htmlFor="login-email">メールアドレス</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">パスワード</Label>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          required
        />
      </div>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "ログイン中…" : "ログイン"}
      </Button>
    </form>
  );
}
