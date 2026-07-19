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
import { SlidePreview } from "@/components/slide-preview";
import type { MaterialTone } from "@/lib/types";
import {
  deleteChapterAction,
  generateScriptAction,
  generateSlideAction,
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
  slideSubtitle: string;
  slideDetails: string[];
  slideImageUrl: string | null;
  slideStatus: string | null;
};

export function ChapterCard({
  materialId,
  chapter,
  tone,
  issue,
  onIssueResolved,
  isFirst,
  isLast,
}: {
  materialId: string;
  chapter: Chapter;
  tone: MaterialTone;
  issue: string | null;
  onIssueResolved: (orderIndex: number) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingSlide, setIsGeneratingSlide] = useState(false);
  const [title, setTitle] = useState(chapter.title);
  const [summary, setSummary] = useState(chapter.summary);
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    String(chapter.estimated_minutes ?? ""),
  );
  const [script, setScript] = useState(chapter.script);

  // useState only seeds from `chapter` on first mount, so after a regenerate
  // action calls router.refresh() the textareas would keep showing stale
  // content forever without this resync (render-time adjustment per React docs,
  // not an effect, so it doesn't cause an extra flicker render).
  const [syncedChapter, setSyncedChapter] = useState(chapter);
  if (
    syncedChapter.title !== chapter.title ||
    syncedChapter.summary !== chapter.summary ||
    syncedChapter.estimated_minutes !== chapter.estimated_minutes ||
    syncedChapter.script !== chapter.script
  ) {
    setSyncedChapter(chapter);
    setTitle(chapter.title);
    setSummary(chapter.summary);
    setEstimatedMinutes(String(chapter.estimated_minutes ?? ""));
    setScript(chapter.script);
  }

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
        await regenerateChapterAction(materialId, chapter.id, issue ?? undefined);
        if (issue) {
          onIssueResolved(chapter.order_index);
          toast.success("指摘を踏まえて章を再生成しました。");
        } else {
          toast.success("章を再生成しました。");
        }
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

  function handleGenerateSlide() {
    setIsGeneratingSlide(true);
    generateSlideAction(materialId, chapter.id)
      .then(() => {
        toast.success("スライド背景画像を生成しました。");
        router.refresh();
      })
      .catch(() => toast.error("スライド背景画像の生成に失敗しました。"))
      .finally(() => setIsGeneratingSlide(false));
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
            {issue ? "指摘を踏まえて再生成" : "AIで再生成"}
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

        <Separator />

        <div className="space-y-1.5">
          <Label>スライド（PowerPoint出力のプレビュー）</Label>
          <div className="aspect-video w-full overflow-hidden rounded-md border border-border">
            <SlidePreview
              tone={tone}
              chapterNo={chapter.order_index + 1}
              title={chapter.title}
              subtitle={chapter.slideSubtitle}
              details={chapter.slideDetails}
              imageUrl={chapter.slideImageUrl}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            サブタイトル・詳細情報は台本の生成時に自動抽出されます。
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateSlide}
            disabled={isGeneratingSlide || chapter.slideDetails.length === 0}
          >
            {isGeneratingSlide
              ? "背景画像を生成中…"
              : chapter.slideStatus === "ready"
                ? "背景画像をAIで再生成"
                : "背景画像をAIで生成"}
          </Button>
          {chapter.slideStatus === "failed" ? (
            <p className="text-xs text-destructive">背景画像の生成に失敗しました。もう一度お試しください。</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
