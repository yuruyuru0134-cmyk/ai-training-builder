-- AI研修教材オートビルダー: スライド要点の永続化
-- extractSlidePoints() の抽出結果をchaptersに保存し、Webプレビューやpptx出力が
-- 再計算なしに、実際に画像生成へ使われた要点をそのまま表示できるようにする。

alter table public.chapters
  add column slide_points text[] not null default '{}';
