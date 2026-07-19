-- AI研修教材オートビルダー: スライド右側に表示するフローチャート用の手順を永続化
-- ナレーション台本から抽出した手順・流れ（3〜5ステップ）を保存し、
-- pptx出力・プレビューが再計算なしに参照できるようにする。

alter table public.chapters
  add column slide_flow_steps text[] not null default '{}';
