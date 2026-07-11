"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteChapterAction,
  moveChapterAction,
  regenerateChapterAction,
  updateChapterAction,
} from "../actions";

export type Chapter = {
  id: string;
  order_index: number;
  title: string;
  summary: string;
  estimated_minutes: number | null;
  script: string;
  char_count: number;
  status: string;
};

export function ChapterCard({
  materialId,
  chapter,
  issue,
  isFirst,
  isLast,
}: {
  materialId: string;
  chapter: Chapter;
  issue: string | null;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(chapter.title);
  const [summary, setSummary] = useState(chapter.summary);
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    String(chapter.estimated_minutes ?? ""),
  );

  const dirty =
    title !== chapter.title ||
    summary !== chapter.summary ||
    estimatedMinutes !== String(chapter.estimated_minutes ?? "");

  function handleSave() {
    startTransition(async () => {
      try {
        await updateChapterAction(materialId, chapter.id, {
          title,
          summary,
          estimated_minutes: Number(estimatedMinutes) || 0,
        });
        toast.success("保存しました。");
        router.refresh();
      } catch {
        toast.error("保存に失敗しました。");
      }
    });
  }

  function handleRegenerate() {
    startTransition(async () => {
      try {
        await regenerateChapterAction(materialId, chapter.id);
        toast.success("章を再生成しました。");
        router.refresh();
      } catch {
        toast.error("再生成に失敗しました。");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteChapterAction(materialId, chapter.id);
        router.refresh();
      } catch {
        toast.error("削除に失敗しました。");
      }
    });
  }

  function handleMove(direction: "up" | "down") {
    startTransition(async () => {
      try {
        await moveChapterAction(materialId, chapter.id, direction);
        router.refresh();
      } catch {
        toast.error("並び替えに失敗しました。");
      }
    });
  }

  return (
    <Card className={issue ? "border-amber-400" : undefined}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <span className="text-xs font-medium text-muted-foreground">
          第{chapter.order_index + 1}章
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={isFirst || isPending}
            onClick={() => handleMove("up")}
            aria-label="上へ移動"
          >
            ↑
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={isLast || isPending}
            onClick={() => handleMove("down")}
            aria-label="下へ移動"
          >
            ↓
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {issue ? (
          <p className="rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            ⚠ {issue}
          </p>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor={`title-${chapter.id}`}>タイトル</Label>
          <Input
            id={`title-${chapter.id}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`summary-${chapter.id}`}>概要</Label>
          <Textarea
            id={`summary-${chapter.id}`}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
          />
        </div>

        <div className="w-32 space-y-1.5">
          <Label htmlFor={`minutes-${chapter.id}`}>想定時間（分）</Label>
          <Input
            id={`minutes-${chapter.id}`}
            type="number"
            min={1}
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" onClick={handleSave} disabled={!dirty || isPending}>
            保存
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRegenerate}
            disabled={isPending}
          >
            AIで再生成
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            削除
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
