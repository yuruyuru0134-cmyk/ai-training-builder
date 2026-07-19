-- AI研修教材オートビルダー: スライド用テキストコンテンツ（H2/H3）の永続化
-- ナレーション台本から抽出したサブタイトル・詳細情報を保存し、
-- pptx出力・プレビューが再計算なしに参照できるようにする。

alter table public.chapters
  add column slide_subtitle text not null default '',
  add column slide_details text[] not null default '{}';
