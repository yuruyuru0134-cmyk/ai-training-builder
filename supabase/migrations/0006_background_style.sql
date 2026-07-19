-- 背景スタイルのキー（src/lib/slide-backgrounds/index.tsのBACKGROUND_STYLESのキーと対応）。
-- 今後スタイルを追加するたびにマイグレーションを増やさずに済むよう、enumではなく
-- テキストで保持し、有効なキーかどうかはアプリケーション層で検証する。
alter table public.materials
  add column background_style text not null default 'soft-circles';
