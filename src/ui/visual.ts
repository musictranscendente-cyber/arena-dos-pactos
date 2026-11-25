// Visuais: a loja/personalização (tabuleiros, avatares e cenários de duelo), o avatar desenhado em qualquer lugar
// e as cores que o tabuleiro e a tela de VS ganham com o visual escolhido.
import { CARDS } from '../data/cards';
import { artUrl } from '../data/arte';
import { EN } from '../data/idioma';
import { RARITY } from '../data/raridades';
import { RACES } from '../data/signos';
import type { Signo } from '../data/schema';
import { T } from '../data/textos';
import { AVATARES, DUELOS, itemVisual, podeComprar, TABULEIROS, temVisual, type ItemVisual, type TipoVisual } from '../meta/cosmeticos';
import type { Progresso } from '../meta/progresso';
import { moedasHtml } from './colecao';
import { ic, sg as sgImg } from './icones';

export interface TelaVisual { aba: TipoVisual; sel: string | null; confirmar: boolean; msg: string }

/** Nome do item no idioma do jogo (avatar de criatura usa o nome da carta). */
export function nomeVisual(i: ItemVisual): string {
  if (i.cid) return CARDS[i.cid]?.name ?? i.cid;
  if (i.tipo === 'avatar' && i.signo) return `${T.vis.medalhao} · ${RACES[i.signo].n}`;
  return i.n[EN ? 1 : 0];
}

/**
 * Avatar (foto do perfil). `id` vazio ou desconhecido = medalhão do `signo`.
 * Criatura: a arte dela num círculo com a cor do signo.
 */
export function avatarHtml(id: string | undefined, signo: Signo, cls = ''): string {
  const i = id ? itemVisual(id) : undefined;
  if (i?.cid && CARDS[i.cid]) {
    const c = CARDS[i.cid];
    return `<span class="av av-cri ${cls}" style="--avc:${RACES[c.race].c}"><img src="${artUrl(i.cid, c.race, 'parado')}" alt="" draggable="false" loading="lazy"></span>`;
  }
  return sgImg(i?.signo ?? signo, cls);
}

/* ---------- tabuleiro ---------- */

/** Variáveis de cor do tabuleiro escolhido (vazio = o clássico). */
export function varsTabuleiro(id: string): string {
  const t = itemVisual(id)?.tab;
  if (!t) return '';
  return `--tab-tinta:${t.tinta};--tab-modo:${t.modo};--tab-p1:${t.plat[0]};--tab-p2:${t.plat[1]};--tab-p3:${t.plat[2]};`
    + `--tab-borda:${t.borda};--tab-brilho:${t.brilho};--tab-cena:${t.cena};--tab-friso:${t.friso}`;
}

/** Põe o tabuleiro escolhido no <body> (as regras do CSS só valem durante a partida). */
export function aplicarTabuleiro(id: string): void {
  const vars = varsTabuleiro(id);
  document.body.classList.toggle('tab-skin', !!vars);
  // tira as variáveis antigas e põe as novas (o resto do style do body fica)
  const st = document.body.style;
  for (const k of [...st]) if (k.startsWith('--tab-')) st.removeProperty(k);
  for (const par of vars.split(';')) { const [k, v] = par.split(':'); if (k && v) st.setProperty(k, v); }
}

/* ---------- cenário de duelo ---------- */

/** Classe e variáveis para a tela de VS (vazio = a clássica). */
export function dueloAttrs(id: string): { cls: string; vars: string } {
  const d = itemVisual(id)?.duelo;
  if (!d) return { cls: '', vars: '' };
  return {
    cls: ` df-skin${d.estrelas ? ' df-estrelas' : ''}`,
    vars: `;--df1:${d.fundo[0]};--df2:${d.fundo[1]};--df3:${d.fundo[2]};--dfr:${d.raios};--dff:${d.faixa};--dfb:${d.brilho}`,
  };
}

/* ---------- prévias ---------- */

function previaTabuleiro(i: ItemVisual, grande = false): string {
  const casas = Array.from({ length: 9 }, () => '<i></i>').join('');
  return `<span class="pv-tab${grande ? ' grande' : ''}${i.tab ? ' tab-skin' : ''}" style="${varsTabuleiro(i.id)}"><span class="pv-plat">${casas}</span><span class="pv-plat">${casas}</span></span>`;
}

function previaDuelo(i: ItemVisual, grande = false): string {
  const a = dueloAttrs(i.id);
  return `<span class="pv-duelo${grande ? ' grande' : ''}${a.cls}" style="--rc:#7a5ad6${a.vars}"><span class="df-raios"></span><span class="df-faixa"></span><b class="df-vs">VS</b></span>`;
}

function previa(i: ItemVisual, grande = false): string {
  if (i.tipo === 'tabuleiro') return previaTabuleiro(i, grande);
  if (i.tipo === 'duelo') return previaDuelo(i, grande);
  return `<span class="pv-av${grande ? ' grande' : ''}">${avatarHtml(i.id, i.signo ?? 'aries')}</span>`;
}

const precoHtml = (i: ItemVisual) => !i.preco ? T.vis.gratis
  : `${ic(i.preco.m === 'gemas' ? 'gema' : 'poeira')}<b>${i.preco.v}</b>`;

/* ---------- a tela ---------- */

/** `signo` = signo do jogador (o avatar padrão é o medalhão dele). */
export function visualHtml(p: Progresso, t: TelaVisual, signo: Signo): string {
  const lista = t.aba === 'tabuleiro' ? TABULEIROS : t.aba === 'duelo' ? DUELOS : AVATARES;
  const usando = p.visual[t.aba] || (t.aba === 'avatar' ? `av-sg-${signo}` : '');
  const sel = (t.sel && itemVisual(t.sel)?.tipo === t.aba ? itemVisual(t.sel) : undefined) ?? itemVisual(usando) ?? lista[0];
  const abas = (['tabuleiro', 'avatar', 'duelo'] as TipoVisual[]).map(a =>
    `<button class="vs-aba${a === t.aba ? ' on' : ''}" data-act="vis-aba" data-a="${a}" aria-pressed="${a === t.aba}">${T.vis.abas[a]}</button>`).join('');
  const itens = lista.map(i => {
    const tem = temVisual(p, i.id), uso = usando === i.id;
    return `<button class="vs-item r-${i.r}${i.id === sel.id ? ' sel' : ''}${uso ? ' usando' : ''}" data-act="vis-item" data-id="${i.id}" style="--rr:${RARITY[i.r].col}">`
      + previa(i) + `<small class="vs-nome">${nomeVisual(i)}</small>`
      + `<span class="vs-preco">${uso ? `✓ ${T.vis.usando}` : tem ? T.vis.seu : precoHtml(i)}</span></button>`;
  }).join('');
  // detalhes do item escolhido
  const tem = temVisual(p, sel.id), uso = usando === sel.id;
  const falta = podeComprar(p, sel.id);
  let botao: string;
  if (uso) botao = `<button class="btn rc" disabled>✓ ${T.vis.usando}</button>`;
  else if (tem) botao = `<button class="btn go" data-act="vis-usar" data-id="${sel.id}">${T.vis.usar}</button>`;
  else if (t.confirmar) botao = `<p class="vs-conf">${T.vis.confirmar(nomeVisual(sel))}</p><div class="vs-bts"><button class="btn go" data-act="vis-comprar-ok" data-id="${sel.id}">${T.vis.sim} · ${precoHtml(sel)}</button><button class="btn rc" data-act="vis-comprar-nao">${T.vis.nao}</button></div>`;
  else botao = `<button class="btn go${falta ? ' sem' : ''}" data-act="vis-comprar" data-id="${sel.id}">${T.vis.comprar} · ${precoHtml(sel)}</button>`;
  const det = `<div class="vs-det" style="--rr:${RARITY[sel.r].col}">${previa(sel, true)}`
    + `<b class="vs-det-nome">${nomeVisual(sel)}</b><small class="vs-rar">${RARITY[sel.r].n} · ${T.vis.tipo[sel.tipo]}</small>`
    + `${botao}${t.msg ? `<p class="vs-msg">${t.msg}</p>` : ''}<p class="vs-dica">${T.vis.dica}</p></div>`;
  return `<div class="ov visual"><div class="panel wide vs-painel">`
    + `<div class="gtop vs-topo"><h2>🎨 ${T.vis.titulo}</h2>${moedasHtml(p)}<button class="m-fecha" data-act="fechar" aria-label="${T.sair}">✕</button></div>`
    + `<div class="vs-abas">${abas}</div>`
    + `<div class="vs-corpo">${det}<div class="vs-grade">${itens}</div></div></div></div>`;
}
