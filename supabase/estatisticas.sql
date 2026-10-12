-- Cosmic Citadel: estatísticas anônimas (sem nome nem e-mail; só um código aleatório do aparelho).
-- Cole tudo no Supabase em: SQL Editor > New query > Run.

create table if not exists public.eventos (
  id bigint generated always as identity primary key,
  criado timestamptz not null default now(),
  aparelho text not null check (char_length(aparelho) <= 64),
  tipo text not null check (tipo in ('abriu', 'partida')),
  dados jsonb not null default '{}'::jsonb check (pg_column_size(dados) < 2000)
);
create index if not exists eventos_criado on public.eventos (criado);

-- O jogo só pode ANOTAR (inserir). Ninguém lê pelo jogo; você vê tudo pelo painel do Supabase.
alter table public.eventos enable row level security;
drop policy if exists "jogo anota eventos" on public.eventos;
create policy "jogo anota eventos" on public.eventos for insert to anon, authenticated with check (true);

-- ===== Consultas prontas (aparecem no Table Editor como "views") =====
-- Os números são só para o dono do projeto (o jogo não consegue ler).

-- 1) Jogadores por dia (quantos aparelhos abriram o jogo) e partidas por dia
create or replace view public.painel_por_dia with (security_invoker = true) as
select (criado at time zone 'America/Sao_Paulo')::date as dia,
       count(distinct aparelho) filter (where tipo = 'abriu') as jogadores,
       count(*) filter (where tipo = 'partida') as partidas,
       round(avg((dados->>'segundos')::numeric) filter (where tipo = 'partida') / 60, 1) as minutos_por_partida
from public.eventos group by 1 order by 1 desc;

-- 2) Retenção: dos que jogaram pela primeira vez num dia, quantos voltaram no dia seguinte (D1) e uma semana depois (D7)
create or replace view public.painel_retencao with (security_invoker = true) as
with dias as (
  select distinct aparelho, (criado at time zone 'America/Sao_Paulo')::date as dia from public.eventos
), primeiro as (
  select aparelho, min(dia) as d0 from dias group by aparelho
)
select p.d0 as dia_que_entrou,
       count(*) as novos,
       count(*) filter (where exists (select 1 from dias d where d.aparelho = p.aparelho and d.dia = p.d0 + 1)) as voltaram_d1,
       round(100.0 * count(*) filter (where exists (select 1 from dias d where d.aparelho = p.aparelho and d.dia = p.d0 + 1)) / count(*), 1) as d1_pct,
       round(100.0 * count(*) filter (where exists (select 1 from dias d where d.aparelho = p.aparelho and d.dia = p.d0 + 7)) / count(*), 1) as d7_pct
from primeiro p group by p.d0 order by p.d0 desc;

-- 3) Vitória por signo (partidas reais, sem desistências), últimos 30 dias
create or replace view public.painel_signos with (security_invoker = true) as
select dados->>'signo' as signo,
       count(*) as partidas,
       round(100.0 * count(*) filter (where dados->>'resultado' = 'venceu') / count(*), 1) as vitoria_pct
from public.eventos
where tipo = 'partida' and dados->>'resultado' <> 'desistiu' and criado > now() - interval '30 days'
group by 1 order by vitoria_pct desc;

-- 4) Onde jogam (app instalado, celular no navegador, computador) e por qual modo
create or replace view public.painel_modos with (security_invoker = true) as
select dados->>'modo' as modo, dados->>'plataforma' as plataforma, count(*) as partidas,
       round(avg((dados->>'rodadas')::numeric), 1) as rodadas_media
from public.eventos where tipo = 'partida' group by 1, 2 order by partidas desc;
