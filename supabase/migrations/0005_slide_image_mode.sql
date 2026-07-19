create type public.slide_image_mode as enum ('gemini', 'template');

-- 教材全体のデフォルト設定。既存教材は全てこれまで通りGemini画像を使う挙動を維持するため
-- デフォルトは'gemini'にする。
alter table public.materials
  add column slide_image_mode public.slide_image_mode not null default 'gemini';

-- 章ごとの上書き設定。nullは「教材のslide_image_modeに従う」ことを意味する。
alter table public.chapters
  add column slide_image_mode public.slide_image_mode;
