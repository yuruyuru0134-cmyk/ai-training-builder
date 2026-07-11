"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { SCRIPT_MAX_CHARS } from "@/lib/anthropic/script";
import {
  deleteChapterAction,
  generateScriptAction,
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
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [title, setTitle] = useState(chapter.title);
  const [summary, setSummary] = useState(chapter.summary);
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    String(chapter.estimated_minutes ?? ""),
  );
  const [script, setScript] = useState(chapter.script);

  const dirty =
    title !== chapter.title ||
    summary !== chapter.summary ||
    estimatedMinutes !== String(chapter.estimated_minutes ?? "") ||
    script !== chapter.script;

  const scriptOverLimit = script.length > SCRIPT_MAX_CHARS;

  function handleSave() {
    startTransition(async () => {
      try {
        await updateChapterAction(materialId, chapter.id, {
          title,
          summary,
          estimated_minutes: Number(estimatedMinutes) || 0,
          script,
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

  function handleGenerateScript() {
    setIsGeneratingScript(true);
    generateScriptAction(materialId, chapter.id)
      .then(() => {
        toast.success("台本を生成しました。");
        router.refresh();
      })
      .catch(() => toast.error("台本の生成に失敗しました。"))
      .finally(() => setIsGeneratingScript(false));
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
          <Button size="sm" variant="outline" onClick={handleRegenerate} disabled={isPending}>
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

        <Separator />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor={`script-${chapter.id}`}>台本（読み上げ用・です・ます調）</Label>
            <span
              className={
                scriptOverLimit
                  ? "text-xs font-medium text-destructive"
                  : "text-xs text-muted-foreground"
              }
            >
              {script.length} / {SCRIPT_MAX_CHARS}字
            </span>
          </div>
          <Textarea
            id={`script-${chapter.id}`}
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={6}
            placeholder="「台本を生成」をクリックすると、AIがこの章の読み上げ用台本を作成します。"
            className={scriptOverLimit ? "border-destructive" : undefined}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateScript}
            disabled={isGeneratingScript}
          >
            {isGeneratingScript
              ? "台本を生成中…"
              : script
                ? "台本をAIで再生成"
                : "台本を生成"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
