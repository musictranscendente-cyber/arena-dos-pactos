-- Cosmic Citadel: tabela do progresso na nuvem.
-- Cole tudo isto no Supabase em: SQL Editor > New query > Run.
-- Cada jogador só consegue ler e gravar a própria linha (Row Level Security).

create table if not exists public.jogadores (
  id uuid primary key references auth.users (id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  atualizado timestamptz not null default now()
);

alter table public.jogadores enable row level security;

drop policy if exists "ler o proprio progresso" on public.jogadores;
create policy "ler o proprio progresso" on public.jogadores
  for select using (auth.uid() = id);

drop policy if exists "criar o proprio progresso" on public.jogadores;
create policy "criar o proprio progresso" on public.jogadores
  for insert with check (auth.uid() = id);

drop policy if exists "atualizar o proprio progresso" on public.jogadores;
create policy "atualizar o proprio progresso" on public.jogadores
  for update using (auth.uid() = id) with check (auth.uid() = id);
