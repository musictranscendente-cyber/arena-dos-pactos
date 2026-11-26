// Visuais: a loja/personalização (tabuleiros, avatares e campeões do duelo), o avatar desenhado em qualquer lugar,
// as cores do tabuleiro escolhido e a criatura que representa o jogador na tela de VS.
import { CARDS } from '../data/cards';
import { ARTE, artUrl } from '../data/arte';
import { EN } from '../data/idioma';
import { RARITY } from '../data/raridades';
import { RACES } from '../data/signos';
import type { Signo } from '../data/schema';
import { T } from '../data/textos';
import { AVATARES, CAMPEOES, itemVisual, podeComprar, TABULEIROS, temVisual, type ItemVisual, type TipoVisual } from '../meta/cosmeticos';
import type { Progresso } from '../meta/progresso';
import { moedasHtml } from './colecao';
import { ic, sg as sgImg } from './icones';

export interface TelaVisual { modo: 'loja' | 'meus'; aba: TipoVisual; sel: string | null; confirmar: boolean; msg: string }

const esc = (x: string) => x.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

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

/* ---------- campeão do duelo ---------- */

/** Criatura que aparece como você na tela de VS: a do campeão escolhido (ou null = automático, a mais forte do deck). */
export function campeaoCid(id: string): string | null {
  const c = itemVisual(id)?.cid;
  return c && ARTE[c] ? c : null;
}

/* ---------- prévias ---------- */

function previaTabuleiro(i: ItemVisual, grande = false): string {
  const casas = Array.from({ length: 9 }, () => '<i></i>').join('');
  return `<span class="pv-tab${grande ? ' grande' : ''}${i.tab ? ' tab-skin' : ''}" style="${varsTabuleiro(i.id)}"><span class="pv-plat">${casas}</span><span class="pv-plat">${casas}</span></span>`;
}

function previaCampeao(i: ItemVisual, grande = false): string {
  const c = i.cid ? CARDS[i.cid] : undefined;
  const fig = c && i.cid ? `<img src="${artUrl(i.cid, c.race, 'parado')}" alt="" draggable="false" loading="lazy">` : '<b class="pv-auto">✨</b>';
  return `<span class="pv-camp${grande ? ' grande' : ''}" style="--avc:${c ? RACES[c.race].c : '#7a5ad6'}">${fig}</span>`;
}

function previa(i: ItemVisual, grande = false): string {
  if (i.tipo === 'tabuleiro') return previaTabuleiro(i, grande);
  if (i.tipo === 'duelo') return previaCampeao(i, grande);
  return `<span class="pv-av${grande ? ' grande' : ''}">${avatarHtml(i.id, i.signo ?? 'aries')}</span>`;
}

const precoHtml = (i: ItemVisual) => !i.preco ? T.vis.gratis
  : `${ic(i.preco.m === 'gemas' ? 'gema' : 'poeira')}<b>${i.preco.v}</b>`;

/* ---------- a tela ---------- */

/**
 * Loja (modo 'loja'): os itens à venda; os que já são seus aparecem como "Comprado".
 * Personalizar (modo 'meus'): só o que é seu (inclusive os grátis), para trocar o visual, e o nome de invocador.
 * `signo` = signo do jogador (o avatar padrão é o medalhão dele); `nome` = nome de invocador.
 */
export function visualHtml(p: Progresso, t: TelaVisual, signo: Signo, nome = ''): string {
  const loja = t.modo === 'loja';
  const todos = t.aba === 'tabuleiro' ? TABULEIROS : t.aba === 'duelo' ? CAMPEOES : AVATARES;
  const lista = todos.filter(i => (loja ? !!i.preco : temVisual(p, i.id)));
  const usando = p.visual[t.aba] || (t.aba === 'avatar' ? `av-sg-${signo}` : '');
  const sel = (t.sel && lista.some(i => i.id === t.sel) ? itemVisual(t.sel) : undefined)
    ?? (lista.some(i => i.id === usando) ? itemVisual(usando) : undefined) ?? lista[0];
  const abas = (['avatar', 'duelo', 'tabuleiro'] as TipoVisual[]).map(a =>
    `<button class="vs-aba${a === t.aba ? ' on' : ''}" data-act="vis-aba" data-a="${a}" aria-pressed="${a === t.aba}">${T.vis.abas[a]}</button>`).join('');
  const itens = lista.map(i => {
    const tem = temVisual(p, i.id), uso = usando === i.id;
    const etiqueta = uso ? `✓ ${T.vis.usando}` : tem ? (loja ? `✓ ${T.vis.comprado}` : T.vis.usar) : precoHtml(i);
    return `<button class="vs-item r-${i.r}${sel && i.id === sel.id ? ' sel' : ''}${uso ? ' usando' : ''}${tem && loja ? ' comprado' : ''}" data-act="vis-item" data-id="${i.id}" style="--rr:${RARITY[i.r].col}">`
      + previa(i) + `<small class="vs-nome">${nomeVisual(i)}</small><span class="vs-preco">${etiqueta}</span></button>`;
  }).join('');
  // detalhes do item escolhido
  let det = '';
  if (sel) {
    const tem = temVisual(p, sel.id), uso = usando === sel.id;
    const falta = podeComprar(p, sel.id);
    let botao: string;
    if (uso) botao = `<button class="btn rc" disabled>✓ ${T.vis.usando}</button>`;
    else if (tem) botao = `<button class="btn go" data-act="vis-usar" data-id="${sel.id}">${loja ? T.vis.usarAgora : T.vis.usar}</button>`;
    else if (t.confirmar) botao = `<p class="vs-conf">${T.vis.confirmar(nomeVisual(sel))}</p><div class="vs-bts"><button class="btn go" data-act="vis-comprar-ok" data-id="${sel.id}">${T.vis.sim} · ${precoHtml(sel)}</button><button class="btn rc" data-act="vis-comprar-nao">${T.vis.nao}</button></div>`;
    else botao = `<button class="btn go${falta ? ' sem' : ''}" data-act="vis-comprar" data-id="${sel.id}">${T.vis.comprar} · ${precoHtml(sel)}</button>`;
    det = `<div class="vs-det" style="--rr:${RARITY[sel.r].col}">${previa(sel, true)}`
      + `<b class="vs-det-nome">${nomeVisual(sel)}</b><small class="vs-rar">${RARITY[sel.r].n} · ${T.vis.tipo[sel.tipo]}</small>`
      + `${botao}${t.msg ? `<p class="vs-msg">${t.msg}</p>` : ''}`
      + (loja ? `<p class="vs-dica">${T.vis.dica}</p>` : '') + '</div>';
  }
  // personalizar: nome de invocador no alto (o mesmo campo das Configurações)
  const campoNome = loja ? '' : `<label class="vs-nome-campo">${T.cfgNome}<input id="cfg-nome" type="text" maxlength="16" autocomplete="off" spellcheck="false" value="${esc(nome)}" placeholder="${T.invocador}"></label>`;
  const vazio = `<p class="vs-vazio">${loja ? T.vis.tudoComprado : T.vis.nadaAinda}</p>`;
  const atalho = loja
    ? `<button class="btn rc vs-atalho" data-act="personalizar">✏️ ${T.vis.personalizar}</button>`
    : `<button class="btn rc vs-atalho" data-act="loja">🛒 ${T.vis.irLoja}</button>`;
  return `<div class="ov visual ${loja ? 'modo-loja' : 'modo-meus'}"><div class="panel wide vs-painel">`
    + `<div class="gtop vs-topo"><h2>${loja ? `🛒 ${T.vis.titulo}` : `✏️ ${T.vis.personalizar}`}</h2>${moedasHtml(p)}<button class="m-fecha" data-act="fechar" aria-label="${T.sair}">✕</button></div>`
    + `<div class="vs-abas">${abas}${atalho}</div>${campoNome}`
    + `<div class="vs-corpo">${det || '<div class="vs-det"></div>'}<div class="vs-grade">${itens || vazio}</div></div></div></div>`;
}
