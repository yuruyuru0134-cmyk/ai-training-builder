"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateOutline } from "@/lib/anthropic/outline";
import { regenerateChapter } from "@/lib/anthropic/chapter";
import { checkConsistency, type ConsistencyIssue } from "@/lib/anthropic/consistency";
import type { MaterialLevel, MaterialTone } from "@/lib/types";
import type { CreateMaterialState } from "./types";

export async function createMaterial(
  _prevState: CreateMaterialState,
  formData: FormData,
): Promise<CreateMaterialState> {
  const theme = String(formData.get("theme") ?? "").trim();
  const durationMinutes = Number(formData.get("duration_minutes"));
  const level = String(formData.get("level") ?? "beginner") as MaterialLevel;
  const tone = String(formData.get("tone") ?? "business") as MaterialTone;

  if (!theme) {
    return { error: "テーマを入力してください。" };
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return { error: "所要時間は正しい数値で入力してください。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "ログインが必要です。" };
  }

  const { data: material, error: insertError } = await supabase
    .from("materials")
    .insert({
      user_id: user.id,
      theme,
      duration_minutes: durationMinutes,
      level,
      tone,
      status: "draft",
    })
    .select("id")
    .single();

  if (insertError || !material) {
    return { error: "教材の作成に失敗しました。時間をおいて再度お試しください。" };
  }

  try {
    const chapters = await generateOutline({ theme, durationMinutes, level });

    if (chapters.length === 0) {
      throw new Error("章構成の生成結果が空でした。");
    }

    const { error: chaptersError } = await supabase.from("chapters").insert(
      chapters.map((c, i) => ({
        material_id: material.id,
        order_index: i,
        title: c.title,
        summary: c.summary,
        estimated_minutes: c.estimated_minutes,
        status: "draft",
      })),
    );

    if (chaptersError) throw chaptersError;

    await supabase
      .from("materials")
      .update({ status: "outline_ready" })
      .eq("id", material.id);

    await supabase.from("generation_logs").insert({
      material_id: material.id,
      type: "outline",
      status: "success",
    });
  } catch (err) {
    await supabase.from("generation_logs").insert({
      material_id: material.id,
      type: "outline",
      status: "error",
      error_message: err instanceof Error ? err.message : String(err),
    });
    redirect(`/materials/${material.id}?error=outline_failed`);
  }

  redirect(`/materials/${material.id}`);
}

async function requireOwnedMaterial(materialId: string) {
  const supabase = await createClient();
  const { data: material } = await supabase
    .from("materials")
    .select("id, theme, level")
    .eq("id", materialId)
    .single();

  if (!material) {
    throw new Error("教材が見つかりません。");
  }
  return { supabase, material };
}

export async function regenerateChapterAction(materialId: string, chapterId: string) {
  const { supabase, material } = await requireOwnedMaterial(materialId);

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, order_index, title, summary")
    .eq("material_id", materialId)
    .order("order_index");

  const target = chapters?.find((c) => c.id === chapterId);
  if (!chapters || !target) {
    throw new Error("章が見つかりません。");
  }

  try {
    const result = await regenerateChapter({
      theme: material.theme,
      level: material.level,
      allChapterTitles: chapters.map((c) => c.title),
      targetIndex: target.order_index,
      currentTitle: target.title,
      currentSummary: target.summary,
    });

    const { error } = await supabase
      .from("chapters")
      .update({
        title: result.title,
        summary: result.summary,
        estimated_minutes: result.estimated_minutes,
        status: "draft",
      })
      .eq("id", chapterId);
    if (error) throw error;

    await supabase.from("generation_logs").insert({
      material_id: materialId,
      type: "outline",
      status: "success",
    });
  } catch (err) {
    await supabase.from("generation_logs").insert({
      material_id: materialId,
      type: "outline",
      status: "error",
      error_message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  revalidatePath(`/materials/${materialId}`);
}

export async function updateChapterAction(
  materialId: string,
  chapterId: string,
  data: { title: string; summary: string; estimated_minutes: number },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("chapters")
    .update({
      title: data.title,
      summary: data.summary,
      estimated_minutes: data.estimated_minutes,
      status: "ok",
    })
    .eq("id", chapterId);

  if (error) throw new Error("章の保存に失敗しました。");

  revalidatePath(`/materials/${materialId}`);
}

export async function deleteChapterAction(materialId: string, chapterId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("chapters").delete().eq("id", chapterId);
  if (error) throw new Error("章の削除に失敗しました。");

  revalidatePath(`/materials/${materialId}`);
}

export async function addChapterAction(materialId: string) {
  const supabase = await createClient();
  const { data: chapters } = await supabase
    .from("chapters")
    .select("order_index")
    .eq("material_id", materialId)
    .order("order_index", { ascending: false })
    .limit(1);

  const nextIndex = chapters && chapters.length > 0 ? chapters[0].order_index + 1 : 0;

  const { error } = await supabase.from("chapters").insert({
    material_id: materialId,
    order_index: nextIndex,
    title: "新しい章",
    summary: "",
    estimated_minutes: 10,
    status: "draft",
  });
  if (error) throw new Error("章の追加に失敗しました。");

  revalidatePath(`/materials/${materialId}`);
}

export async function moveChapterAction(
  materialId: string,
  chapterId: string,
  direction: "up" | "down",
) {
  const supabase = await createClient();
  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, order_index")
    .eq("material_id", materialId)
    .order("order_index");

  if (!chapters) return;

  const index = chapters.findIndex((c) => c.id === chapterId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= chapters.length) return;

  const current = chapters[index];
  const target = chapters[swapWith];

  // 一意制約 (material_id, order_index) に一時的に抵触しないよう、
  // 未使用の値を経由してから入れ替える。
  await supabase.from("chapters").update({ order_index: -1 }).eq("id", current.id);
  await supabase
    .from("chapters")
    .update({ order_index: current.order_index })
    .eq("id", target.id);
  await supabase
    .from("chapters")
    .update({ order_index: target.order_index })
    .eq("id", current.id);

  revalidatePath(`/materials/${materialId}`);
}

export async function runConsistencyCheckAction(
  materialId: string,
): Promise<ConsistencyIssue[]> {
  const supabase = await createClient();
  const { data: chapters } = await supabase
    .from("chapters")
    .select("order_index, title, summary")
    .eq("material_id", materialId)
    .order("order_index");

  if (!chapters || chapters.length === 0) return [];

  try {
    const issues = await checkConsistency(chapters);
    await supabase.from("generation_logs").insert({
      material_id: materialId,
      type: "consistency_check",
      status: "success",
    });
    return issues;
  } catch (err) {
    await supabase.from("generation_logs").insert({
      material_id: materialId,
      type: "consistency_check",
      status: "error",
      error_message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
