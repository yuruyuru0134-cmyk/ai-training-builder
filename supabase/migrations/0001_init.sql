-- AI研修教材オートビルダー: 初期スキーマ
-- docs/requirements.md 06章に対応

-- ============================================================
-- profiles: Supabase Auth ユーザーの拡張情報
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: select own row"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: update own row"
  on public.profiles for update
  using (auth.uid() = id);

-- auth.users に行が追加されたら自動で profiles を作成する
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- materials: 教材（プロジェクト）単位のメタ情報
-- ============================================================
create type public.material_level as enum ('beginner', 'intermediate', 'advanced');
create type public.material_tone as enum ('business', 'casual', 'minimal');
create type public.material_status as enum ('draft', 'outline_ready', 'scripts_ready', 'slides_ready', 'completed');

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  theme text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  level public.material_level not null default 'beginner',
  tone public.material_tone not null default 'business',
  status public.material_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index materials_user_id_idx on public.materials (user_id);

alter table public.materials enable row level security;

create policy "materials: owner full access"
  on public.materials for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- chapters: 章構成・台本本体
-- ============================================================
create type public.chapter_status as enum ('draft', 'needs_review', 'ok');

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials (id) on delete cascade,
  order_index integer not null,
  title text not null,
  summary text not null default '',
  estimated_minutes integer,
  script text not null default '',
  char_count integer not null default 0,
  status public.chapter_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (material_id, order_index)
);

create index chapters_material_id_idx on public.chapters (material_id);

alter table public.chapters enable row level security;

create policy "chapters: owner full access via material"
  on public.chapters for all
  using (
    exists (
      select 1 from public.materials m
      where m.id = chapters.material_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.materials m
      where m.id = chapters.material_id and m.user_id = auth.uid()
    )
  );

-- ============================================================
-- slides: 章ごとのスライド画像
-- ============================================================
create type public.slide_status as enum ('pending', 'generating', 'ready', 'failed');

create table public.slides (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  image_url text,
  prompt text not null default '',
  status public.slide_status not null default 'pending',
  retry_count integer not null default 0,
  generated_at timestamptz
);

create index slides_chapter_id_idx on public.slides (chapter_id);

alter table public.slides enable row level security;

create policy "slides: owner full access via chapter/material"
  on public.slides for all
  using (
    exists (
      select 1 from public.chapters c
      join public.materials m on m.id = c.material_id
      where c.id = slides.chapter_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.chapters c
      join public.materials m on m.id = c.material_id
      where c.id = slides.chapter_id and m.user_id = auth.uid()
    )
  );

-- ============================================================
-- generation_logs: AI呼び出しの成否ログ（コスト・障害の追跡用）
-- ============================================================
create type public.generation_type as enum ('outline', 'consistency_check', 'script', 'slide');
create type public.generation_status as enum ('success', 'error');

create table public.generation_logs (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials (id) on delete cascade,
  type public.generation_type not null,
  status public.generation_status not null,
  error_message text,
  created_at timestamptz not null default now()
);

create index generation_logs_material_id_idx on public.generation_logs (material_id);

alter table public.generation_logs enable row level security;

create policy "generation_logs: owner full access via material"
  on public.generation_logs for all
  using (
    exists (
      select 1 from public.materials m
      where m.id = generation_logs.material_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.materials m
      where m.id = generation_logs.material_id and m.user_id = auth.uid()
    )
  );

-- ============================================================
-- updated_at 自動更新
-- ============================================================
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger materials_set_updated_at
  before update on public.materials
  for each row execute function public.set_updated_at();

create trigger chapters_set_updated_at
  before update on public.chapters
  for each row execute function public.set_updated_at();

-- ============================================================
-- Storage: スライド画像用バケット
-- ============================================================
insert into storage.buckets (id, name, public)
values ('slides', 'slides', true)
on conflict (id) do nothing;

create policy "slides bucket: owner can read own files"
  on storage.objects for select
  using (bucket_id = 'slides' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "slides bucket: owner can upload own files"
  on storage.objects for insert
  with check (bucket_id = 'slides' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "slides bucket: owner can update own files"
  on storage.objects for update
  using (bucket_id = 'slides' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "slides bucket: owner can delete own files"
  on storage.objects for delete
  using (bucket_id = 'slides' and (storage.foldername(name))[1] = auth.uid()::text);
