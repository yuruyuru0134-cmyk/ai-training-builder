"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateOutline } from "@/lib/anthropic/outline";
import { regenerateChapter } from "@/lib/anthropic/chapter";
import { checkConsistency, type ConsistencyIssue } from "@/lib/anthropic/consistency";
import { generateScript, SCRIPT_MAX_CHARS } from "@/lib/anthropic/script";
import { generateSlideImage } from "@/lib/gemini/slide";
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
    .select("id, theme, level, tone")
    .eq("id", materialId)
    .single();

  if (!material) {
    throw new Error("教材が見つかりません。");
  }
  return { supabase, material };
}

export async function regenerateChapterAction(
  materialId: string,
  chapterId: string,
  issue?: string,
) {
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
      issue,
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
  data: { title: string; summary: string; estimated_minutes: number; script: string },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("chapters")
    .update({
      title: data.title,
      summary: data.summary,
      estimated_minutes: data.estimated_minutes,
      script: data.script,
      char_count: data.script.length,
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

async function generateAndSaveScript(
  supabase: Awaited<ReturnType<typeof createClient>>,
  material: { id: string; theme: string; level: MaterialLevel; tone: MaterialTone },
  chapter: { id: string; title: string; summary: string; estimated_minutes: number | null },
) {
  try {
    const { script, truncated } = await generateScript({
      theme: material.theme,
      level: material.level,
      tone: material.tone,
      chapterTitle: chapter.title,
      chapterSummary: chapter.summary,
      estimatedMinutes: chapter.estimated_minutes,
    });

    const { error } = await supabase
      .from("chapters")
      .update({ script, char_count: script.length, status: "ok" })
      .eq("id", chapter.id);
    if (error) throw error;

    await supabase.from("generation_logs").insert({
      material_id: material.id,
      type: "script",
      status: "success",
      error_message: truncated
        ? `${SCRIPT_MAX_CHARS}字を超えたため末尾を切り詰めました`
        : null,
    });
  } catch (err) {
    await supabase.from("generation_logs").insert({
      material_id: material.id,
      type: "script",
      status: "error",
      error_message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function generateScriptAction(materialId: string, chapterId: string) {
  const { supabase, material } = await requireOwnedMaterial(materialId);

  const { data: chapter } = await supabase
    .from("chapters")
    .select("id, title, summary, estimated_minutes")
    .eq("id", chapterId)
    .single();

  if (!chapter) throw new Error("章が見つかりません。");

  await generateAndSaveScript(supabase, material, chapter);

  revalidatePath(`/materials/${materialId}`);
}

export async function generateAllScriptsAction(materialId: string) {
  const { supabase, material } = await requireOwnedMaterial(materialId);

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, title, summary, estimated_minutes")
    .eq("material_id", materialId)
    .order("order_index");

  if (!chapters || chapters.length === 0) return;

  for (const chapter of chapters) {
    await generateAndSaveScript(supabase, material, chapter);
  }

  await supabase.from("materials").update({ status: "scripts_ready" }).eq("id", materialId);

  revalidatePath(`/materials/${materialId}`);
}

async function generateAndSaveSlide(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  material: { id: string; theme: string; tone: MaterialTone },
  chapter: { id: string; title: string; summary: string },
) {
  const { data: existingSlide } = await supabase
    .from("slides")
    .select("id, retry_count")
    .eq("chapter_id", chapter.id)
    .maybeSingle();

  try {
    if (existingSlide) {
      await supabase.from("slides").update({ status: "generating" }).eq("id", existingSlide.id);
    } else {
      await supabase
        .from("slides")
        .insert({ chapter_id: chapter.id, status: "generating" });
    }

    const { data, mimeType, attempts } = await generateSlideImage({
      theme: material.theme,
      chapterTitle: chapter.title,
      chapterSummary: chapter.summary,
      tone: material.tone,
    });

    const extension = mimeType.includes("png") ? "png" : "jpg";
    const path = `${userId}/${chapter.id}.${extension}`;
    const buffer = Buffer.from(data, "base64");

    const { error: uploadError } = await supabase.storage
      .from("slides")
      .upload(path, buffer, { contentType: mimeType, upsert: true });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("slides").getPublicUrl(path);
    // 画像を上書きしてもURLが変わらないため、ブラウザキャッシュを避けるバスターを付与する
    const imageUrl = `${publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("slides")
      .update({
        image_url: imageUrl,
        status: "ready",
        retry_count: attempts - 1,
        generated_at: new Date().toISOString(),
      })
      .eq("chapter_id", chapter.id);
    if (updateError) throw updateError;

    await supabase.from("generation_logs").insert({
      material_id: material.id,
      type: "slide",
      status: "success",
    });
  } catch (err) {
    await supabase
      .from("slides")
      .update({ status: "failed" })
      .eq("chapter_id", chapter.id);
    await supabase.from("generation_logs").insert({
      material_id: material.id,
      type: "slide",
      status: "error",
      error_message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function generateSlideAction(materialId: string, chapterId: string) {
  const { supabase, material } = await requireOwnedMaterial(materialId);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です。");

  const { data: chapter } = await supabase
    .from("chapters")
    .select("id, title, summary")
    .eq("id", chapterId)
    .single();
  if (!chapter) throw new Error("章が見つかりません。");

  await generateAndSaveSlide(supabase, user.id, material, chapter);

  revalidatePath(`/materials/${materialId}`);
}

export async function generateAllSlidesAction(materialId: string) {
  const { supabase, material } = await requireOwnedMaterial(materialId);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です。");

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, title, summary, script")
    .eq("material_id", materialId)
    .order("order_index");

  if (!chapters || chapters.length === 0) return;

  for (const chapter of chapters) {
    await generateAndSaveSlide(supabase, user.id, material, chapter);
  }

  const allScriptsReady = chapters.every((c) => c.script && c.script.length > 0);
  await supabase
    .from("materials")
    .update({ status: allScriptsReady ? "completed" : "slides_ready" })
    .eq("id", materialId);

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

export async function deleteMaterialAction(materialId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です。");

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id")
    .eq("material_id", materialId);

  const storagePaths = (chapters ?? []).flatMap((c) => [
    `${user.id}/${c.id}.png`,
    `${user.id}/${c.id}.jpg`,
  ]);
  if (storagePaths.length > 0) {
    await supabase.storage.from("slides").remove(storagePaths);
  }

  // chapters / slides / generation_logs は ON DELETE CASCADE で連動して削除される
  const { error } = await supabase.from("materials").delete().eq("id", materialId);
  if (error) throw new Error("教材の削除に失敗しました。");

  redirect("/dashboard");
}
