-- Cosmic Citadel: ranking (Ranqueada).
-- Cole tudo isto no Supabase em: SQL Editor > New query > Run.
-- Todos podem LER a lista (nome, signo e pontos). Cada jogador só GRAVA a própria linha,
-- e o banco recusa pontos que não poderiam vir de uma partida de verdade.

create table if not exists public.ranking (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 16),
  signo text not null check (char_length(signo) <= 12),
  temporada text not null check (char_length(temporada) <= 20),
  pontos int not null default 0 check (pontos between 0 and 100000),
  liga_max int not null default 0 check (liga_max between 0 and 5),
  seguidas int not null default 0 check (seguidas >= 0),
  vitorias int not null default 0 check (vitorias >= 0),
  derrotas int not null default 0 check (derrotas >= 0),
  trofeus int not null default 0 check (trofeus >= 0),
  -- como terminou a temporada anterior (para calcular o Top 10 de quem vira a temporada depois)
  ant_temporada text,
  ant_pontos int,
  atualizado timestamptz not null default now()
);
create index if not exists ranking_temporada_pontos on public.ranking (temporada, pontos desc);
create index if not exists ranking_ant on public.ranking (ant_temporada, ant_pontos desc);

alter table public.ranking enable row level security;

drop policy if exists "todos leem o ranking" on public.ranking;
create policy "todos leem o ranking" on public.ranking for select to anon, authenticated using (true);

drop policy if exists "criar a propria linha" on public.ranking;
create policy "criar a propria linha" on public.ranking for insert to authenticated with check (auth.uid() = id);

drop policy if exists "atualizar a propria linha" on public.ranking;
create policy "atualizar a propria linha" on public.ranking for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Proteção contra pontos inventados:
-- - linha nova começa com no máximo 40 pontos;
-- - na mesma temporada, cada gravação sobe no máximo 40 (a maior vitória dá 35) e desce no máximo 20,
--   e só pode subir se a última gravação foi há pelo menos 40 segundos (uma partida dura mais que isso);
-- - na virada de temporada, os pontos novos são no máximo a metade dos antigos (+40) e o troféu sobe no máximo 1.
create or replace function public.ranking_protege() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.pontos > 40 or new.trofeus > 0 then raise exception 'ranking: pontos iniciais invalidos'; end if;
  else
    if new.temporada = old.temporada then
      if new.pontos - old.pontos > 40 or old.pontos - new.pontos > 20 then raise exception 'ranking: variacao invalida'; end if;
      if new.pontos > old.pontos and now() - old.atualizado < interval '40 seconds' then raise exception 'ranking: rapido demais'; end if;
      if new.trofeus <> old.trofeus then raise exception 'ranking: trofeu invalido'; end if;
    else
      if new.pontos > ceil(old.pontos / 2.0) + 40 then raise exception 'ranking: virada invalida'; end if;
      if new.trofeus - old.trofeus not in (0, 1) then raise exception 'ranking: trofeu invalido'; end if;
    end if;
  end if;
  new.atualizado := now();
  return new;
end $$;

drop trigger if exists ranking_protege on public.ranking;
create trigger ranking_protege before insert or update on public.ranking
  for each row execute function public.ranking_protege();

-- Para você acompanhar (Table Editor > ranking_painel): jogadores reais por pontos na temporada.
create or replace view public.ranking_painel with (security_invoker = true) as
select temporada, nome, signo, pontos, vitorias, derrotas, trofeus, atualizado
from public.ranking order by temporada desc, pontos desc;
