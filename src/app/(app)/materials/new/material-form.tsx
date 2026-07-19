"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createMaterial } from "../actions";
import { initialCreateMaterialState } from "../types";

export function MaterialForm() {
  const [state, formAction, pending] = useActionState(
    createMaterial,
    initialCreateMaterialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="theme">テーマ</Label>
        <Input
          id="theme"
          name="theme"
          placeholder="例: 生成AIを業務で安全に使うための基礎"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration_minutes">所要時間（分）</Label>
        <Input
          id="duration_minutes"
          name="duration_minutes"
          type="number"
          min={10}
          max={480}
          defaultValue={60}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="level">対象レベル</Label>
          <Select name="level" defaultValue="beginner">
            <SelectTrigger id="level" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">初級</SelectItem>
              <SelectItem value="intermediate">中級</SelectItem>
              <SelectItem value="advanced">上級</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tone">スライドのトーン</Label>
          <Select name="tone" defaultValue="business">
            <SelectTrigger id="tone" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="business">ビジネス</SelectItem>
              <SelectItem value="casual">カジュアル</SelectItem>
              <SelectItem value="minimal">ミニマル</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="slide_image_mode">スライド背景画像</Label>
        <Select name="slide_image_mode" defaultValue="gemini">
          <SelectTrigger id="slide_image_mode" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gemini">AIで生成（Gemini・章ごとに生成ボタンが必要）</SelectItem>
            <SelectItem value="template">内蔵テンプレート（生成不要、すぐ使える）</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          章ごとに後から個別に上書きできます。
        </p>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending
          ? "章構成・台本・スライドを生成中…（数分かかります）"
          : "教材を作成する"}
      </Button>
    </form>
  );
}
