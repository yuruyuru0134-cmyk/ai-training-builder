"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  addChapterAction,
  generateAllScriptsAction,
  generateAllSlidesAction,
  runConsistencyCheckAction,
} from "../actions";
import type { ConsistencyIssue } from "@/lib/anthropic/consistency";
import { ChapterCard, type Chapter } from "./chapter-card";

export function ChapterBoard({
  materialId,
  chapters,
}: {
  materialId: string;
  chapters: Chapter[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [checking, setChecking] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingAllSlides, setGeneratingAllSlides] = useState(false);
  const [issues, setIssues] = useState<ConsistencyIssue[] | null>(null);

  function handleAddChapter() {
    startTransition(async () => {
      try {
        await addChapterAction(materialId);
        router.refresh();
      } catch {
        toast.error("章の追加に失敗しました。");
      }
    });
  }

  function handleConsistencyCheck() {
    setChecking(true);
    setIssues(null);
    runConsistencyCheckAction(materialId)
      .then((result) => {
        setIssues(result);
        if (result.length === 0) {
          toast.success("重複・矛盾は見つかりませんでした。");
        } else {
          toast.warning(`${result.length}件の指摘があります。`);
        }
      })
      .catch(() => toast.error("整合性チェックに失敗しました。"))
      .finally(() => setChecking(false));
  }

  function handleGenerateAllScripts() {
    setGeneratingAll(true);
    generateAllScriptsAction(materialId)
      .then(() => {
        toast.success("全章の台本を生成しました。");
        router.refresh();
      })
      .catch(() => toast.error("台本の一括生成に失敗しました。"))
      .finally(() => setGeneratingAll(false));
  }

  function handleGenerateAllSlides() {
    setGeneratingAllSlides(true);
    generateAllSlidesAction(materialId)
      .then(() => {
        toast.success("全章のスライド画像を生成しました。");
        router.refresh();
      })
      .catch(() => toast.error("スライド画像の一括生成に失敗しました。"))
      .finally(() => setGeneratingAllSlides(false));
  }

  const issueMap = new Map((issues ?? []).map((i) => [i.order_index, i.issue]));
  const totalMinutes = chapters.reduce((sum, c) => sum + (c.estimated_minutes ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          全{chapters.length}章 ・ 合計 約{totalMinutes}分
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleConsistencyCheck} disabled={checking}>
            {checking ? "チェック中…" : "整合性チェック"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateAllScripts}
            disabled={generatingAll || chapters.length === 0}
          >
            {generatingAll ? "台本を一括生成中…" : "全章の台本を生成"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateAllSlides}
            disabled={generatingAllSlides || chapters.length === 0}
          >
            {generatingAllSlides ? "スライドを一括生成中…" : "全章のスライドを生成"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleAddChapter} disabled={isPending}>
            章を追加
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {chapters.map((chapter, i) => (
          <ChapterCard
            key={chapter.id}
            materialId={materialId}
            chapter={chapter}
            issue={issueMap.get(chapter.order_index) ?? null}
            isFirst={i === 0}
            isLast={i === chapters.length - 1}
          />
        ))}
        {chapters.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            章がまだありません。「章を追加」から作成してください。
          </p>
        ) : null}
      </div>
    </div>
  );
}
