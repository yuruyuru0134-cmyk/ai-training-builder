"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateOutline } from "@/lib/anthropic/outline";
import { regenerateChapter } from "@/lib/anthropic/chapter";
import { checkConsistency, type ConsistencyIssue } from "@/lib/anthropic/consistency";
import { generateScript, SCRIPT_MAX_CHARS } from "@/lib/anthropic/script";
import { extractSlideContent } from "@/lib/anthropic/slide-content";
import { extractSlideFlow } from "@/lib/anthropic/slide-flow";
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

  let insertedChapters: { id: string; title: string; summary: string; estimated_minutes: number | null }[] = [];

  try {
    const chapters = await generateOutline({ theme, durationMinutes, level });

    if (chapters.length === 0) {
      throw new Error("章構成の生成結果が空でした。");
    }

    const { data: chapterRows, error: chaptersError } = await supabase
      .from("chapters")
      .insert(
        chapters.map((c, i) => ({
          material_id: material.id,
          order_index: i,
          title: c.title,
          summary: c.summary,
          estimated_minutes: c.estimated_minutes,
          status: "draft",
        })),
      )
      .select("id, title, summary, estimated_minutes");

    if (chaptersError) throw chaptersError;
    insertedChapters = chapterRows ?? [];

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

  // 章構成だけではタイトルの羅列にしかならず教材として使えないため、
  // 台本（とスライド表示用のH2/H3テキスト）も作成時に自動生成する。
  // 章同士は並列に走らせることで全体の待ち時間を抑える。
  const materialContext = { id: material.id, theme, level, tone };
  const contentResults = await Promise.all(
    insertedChapters.map(async (chapter) => {
      try {
        await generateAndSaveScript(supabase, materialContext, chapter);
        return true;
      } catch {
        return false;
      }
    }),
  );
  const allContentOk = contentResults.every(Boolean);

  await supabase
    .from("materials")
    .update({ status: allContentOk ? "completed" : "scripts_ready" })
    .eq("id", material.id);

  redirect(`/materials/${material.id}${allContentOk ? "" : "?error=content_partial"}`);
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

async function regenerateChapterCore(
  supabase: Awaited<ReturnType<typeof requireOwnedMaterial>>["supabase"],
  material: Awaited<ReturnType<typeof requireOwnedMaterial>>["material"],
  materialId: string,
  chapterId: string,
  issue?: string,
) {
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
      allChapters: chapters.map((c) => ({ title: c.title, summary: c.summary })),
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
}

export async function regenerateChapterAction(
  materialId: string,
  chapterId: string,
  issue?: string,
) {
  const { supabase, material } = await requireOwnedMaterial(materialId);
  await regenerateChapterCore(supabase, material, materialId, chapterId, issue);
  revalidatePath(`/materials/${materialId}`);
}

const BULK_REGENERATE_MAX_ROUNDS = 3;

export async function regenerateFlaggedChaptersAction(
  materialId: string,
  issues: ConsistencyIssue[],
): Promise<{ remainingIssues: ConsistencyIssue[] }> {
  const { supabase, material } = await requireOwnedMaterial(materialId);

  let pending = issues;

  for (let round = 0; round < BULK_REGENERATE_MAX_ROUNDS && pending.length > 0; round++) {
    const { data: chapters } = await supabase
      .from("chapters")
      .select("id, order_index")
      .eq("material_id", materialId)
      .order("order_index");

    for (const { order_index, issue } of pending) {
      const chapterId = chapters?.find((c) => c.order_index === order_index)?.id;
      if (!chapterId) continue;
      // 1章の失敗で残りを止めない。失敗はregenerateChapterCore内でgeneration_logsに記録済み。
      try {
        await regenerateChapterCore(supabase, material, materialId, chapterId, issue);
      } catch {
        // このissueは今回のラウンドでは解消されなかった扱いのまま、次の再チェックに委ねる
      }
    }

    // 一部の章を直しても他章との新たな矛盾が生まれ得るため、全章を対象に再チェックする
    const { data: allChapters } = await supabase
      .from("chapters")
      .select("order_index, title, summary")
      .eq("material_id", materialId)
      .order("order_index");
    pending = allChapters ? await checkConsistency(allChapters) : [];
  }

  revalidatePath(`/materials/${materialId}`);

  return { remainingIssues: pending };
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
): Promise<string> {
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

    // スライド表示用のサブタイトル・詳細情報も台本から抽出して保存する。
    // 抽出に失敗しても台本自体の保存は既に成功しているため、ここは失敗を握りつぶす。
    try {
      const content = await extractSlideContent({
        chapterTitle: chapter.title,
        chapterSummary: chapter.summary,
        script,
      });
      await supabase
        .from("chapters")
        .update({ slide_subtitle: content.subtitle, slide_details: content.details })
        .eq("id", chapter.id);
    } catch {
      // スライド用テキストが未生成のままでも、台本自体は利用できるので続行する
    }

    // スライド右側に表示する手順フローチャートも台本から抽出して保存する。
    try {
      const flowSteps = await extractSlideFlow({
        chapterTitle: chapter.title,
        chapterSummary: chapter.summary,
        script,
      });
      await supabase
        .from("chapters")
        .update({ slide_flow_steps: flowSteps })
        .eq("id", chapter.id);
    } catch {
      // フローチャートが未生成のままでも、台本自体は利用できるので続行する
    }

    await supabase.from("generation_logs").insert({
      material_id: material.id,
      type: "script",
      status: "success",
      error_message: truncated
        ? `${SCRIPT_MAX_CHARS}字を超えたため末尾を切り詰めました`
        : null,
    });

    return script;
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
  chapter: { id: string; title: string; summary: string; script?: string; slide_details?: string[] | null },
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

    // 台本生成時に抽出済みのH3詳細（chapters.slide_details）をそのまま
    // 画像生成の要点としても使う。テキスト表示と画像の内容を一致させるため、
    // 別途要点を再抽出することはしない。
    const points = chapter.slide_details ?? [];

    const { data, mimeType, attempts } = await generateSlideImage({
      theme: material.theme,
      chapterTitle: chapter.title,
      chapterSummary: chapter.summary,
      points,
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
    .select("id, title, summary, script, slide_details")
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
    .select("id, title, summary, script, slide_details")
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
