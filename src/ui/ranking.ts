// Tela do ranking (Top 100 da temporada), a busca de adversário e o VS antes da partida ranqueada.
import { ARTE } from '../data/arte';
import { IDIOMA } from '../data/idioma';
import { RACES } from '../data/signos';
import { T } from '../data/textos';
import type { DeckMontado } from '../engine';
import { LIGAS, ligaDe, type Classificacao, type Linha, type Rival } from '../meta/ranking';
import type { PremioTemporada, SituacaoRanking } from '../services/ranking';
import { figuraJogador } from './desafio';
import { sg as sgImg } from './icones';
import { criatura, nomeDeckMontado } from './menu';
import { avatarHtml, campeaoCid } from './visual';

const num = (n: number) => n.toLocaleString(IDIOMA === 'en' ? 'en-US' : 'pt-BR');
const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

export const nomeLiga = (i: number) => T.rank.ligas[LIGAS[i].id];
/** Ícone + nome da liga ("🌙 Lua"). */
export const ligaNome = (i: number) => `${LIGAS[i].i} ${nomeLiga(i)}`;
export const ligaHtml = (i: number) => `<span class="rk-liga l-${LIGAS[i].id}" title="${T.rank.liga(nomeLiga(i))}">${LIGAS[i].i}</span>`;

function linhaHtml(l: Linha, pos: number): string {
  return `<li class="rk-l${l.eu ? ' eu' : ''}${pos <= 3 ? ` p${pos}` : ''}" style="--rc:${RACES[l.signo].c}">`
    + `<b class="rk-pos">${num(pos)}</b><i class="rk-sg">${avatarHtml(l.avatar, l.signo)}</i>`
    + `<span class="rk-nome">${l.eu ? `${esc(l.nome)} <small>(${T.rank.voce})</small>` : esc(l.nome)}${l.trofeus ? ` <small class="rk-trofeu">🏆${l.trofeus > 1 ? l.trofeus : ''}</small>` : ''}</span>`
    + `${ligaHtml(ligaDe(l.pontos))}<b class="rk-pts">${num(l.pontos)}</b></li>`;
}

export type AcessoRanking = 'sim' | 'conta' | 'indisponivel';

export function rankingHtml(sit: SituacaoRanking, cls: Classificacao | null, acesso: AcessoRanking): string {
  const t = sit.temporada, r = RACES[t.signo];
  const dias = Math.max(1, Math.ceil((t.fim - Date.now()) / 86400_000));
  const topo = `<div class="gtop rk-topo"><div><h2>🏆 ${T.rank.titulo}</h2><small class="rk-temp">${sgImg(t.signo)} ${T.rank.temporada(r.n)} · ${T.rank.termina(dias)}</small></div>`
    + `<button class="m-fecha" data-act="fechar" aria-label="${T.sair}">✕</button></div>`;
  let eu: string;
  if (acesso === 'indisponivel') eu = `<p class="rk-aviso">${T.rank.indisponivel}</p>`;
  else if (acesso === 'conta') eu = `<p class="rk-aviso">${T.rank.precisaConta}</p><button class="btn go" data-act="config">${T.rank.entrar}</button>`;
  else if (sit.estado === 'erro') eu = `<p class="rk-aviso">${T.rank.erro}</p><button class="btn rc" data-act="rk-recarregar">${T.rank.tentar}</button>`;
  else if (!sit.meu || !cls) eu = `<p class="rk-aviso rk-carregando">${T.rank.carregando}</p>`;
  else {
    const m = sit.meu, li = ligaDe(m.pontos), prox = LIGAS[li + 1];
    const pct = prox ? Math.round(100 * (m.pontos - LIGAS[li].min) / (prox.min - LIGAS[li].min)) : 100;
    eu = `<div class="rk-emblema l-${LIGAS[li].id}"><span>${LIGAS[li].i}</span></div>`
      + `<b class="rk-ligaNome">${T.rank.liga(nomeLiga(li))}</b>`
      + `<div class="rk-meus"><span><small>${T.rank.posicao}</small><b>#${num(cls.posicao)}</b></span><span><small>${T.rank.pontos}</small><b>${num(m.pontos)}</b></span></div>`
      + `<div class="rk-barra"><i style="width:${pct}%"></i></div>`
      + `<small class="rk-falta">${prox ? T.rank.proxima(prox.min - m.pontos, nomeLiga(li + 1)) : T.rank.topo}</small>`
      + `<small class="rk-vd">${T.rank.vd(m.vitorias, m.derrotas)}${m.seguidas >= 2 ? ` · ${T.rank.sequencia(m.seguidas)}` : ''}</small>`
      + `<button class="btn go rk-jogar" data-act="rk-jogar">${T.rank.jogar}</button>`;
  }
  const lista = cls ? cls.top.map((l, i) => linhaHtml(l, i + 1)).join('') : '';
  const fixo = cls?.eu && cls.posicao > cls.top.length
    ? `<ol class="rk-lista rk-fixo">${linhaHtml(cls.eu!, cls.posicao)}</ol>`
    : '';
  return `<div class="ov ranking"><div class="panel wide rk-painel" style="--rc:${r.c}">${topo}`
    + `<div class="rk-corpo"><div class="rk-eu">${eu}<p class="rk-regras">${T.rank.regras}</p></div>`
    + `<div class="rk-direita"><ol class="rk-lista">${lista}</ol>${fixo}</div></div></div></div>`;
}

export function buscaHtml(achou: Rival | null): string {
  return `<div class="ov rk-busca"><div class="rk-radar${achou ? ' achou' : ''}"><i></i><i></i><i></i>`
    + (achou ? `<span class="rk-radar-sg" style="--rc:${RACES[achou.signo].c}">${avatarHtml(achou.avatar, achou.signo)}</span>` : '<span class="rk-radar-sg">🔍</span>')
    + `</div><p>${achou ? `${T.rank.achou}<br><b>${esc(achou.nome)}</b>` : T.rank.procurando}</p></div>`;
}

/** Criatura que representa o rival: a lendária do signo dele (ou outra forte com arte). */
function figuraRival(r: Rival): string {
  // o mesmo jogador da arena aparece sempre com o mesmo campeão: a criatura do avatar dele, se tiver
  const doAvatar = r.avatar.startsWith('av-') && !r.avatar.startsWith('av-sg-') ? r.avatar.slice(3) : '';
  if (doAvatar && ARTE[doAvatar]) return doAvatar;
  for (const n of ['25', '24', '23', '22']) if (ARTE[r.signo + n]) return r.signo + n;
  return '';
}

export function vsRankHtml(deck: DeckMontado, rival: Rival, meus: number, tempo: number, saindo = false, campeao = ''): string {
  const [a, b] = deck.signos;
  const sg = (s: typeof a) => `<i style="--rc:${RACES[s].c}">${sgImg(s)}</i>`;
  const fr = figuraRival(rival), fj = campeaoCid(campeao) ?? figuraJogador(deck, fr);
  const li = ligaDe(rival.pontos), lm = ligaDe(meus);
  return `<div class="desafio t-rank${saindo ? ' sai' : ''}" data-act="desafio-ir" style="--rc:${RACES[rival.signo].c};--tempo:${tempo}ms" role="dialog" aria-label="${T.rank.titulo}">`
    + '<div class="df-raios"></div><div class="df-faixa"></div>'
    + `<div class="df-topo"><small>🏆 ${T.rank.titulo}</small><b>${T.rank.achou}</b></div>`
    + `<div class="df-lado df-voce"><div class="df-fig">${fj ? criatura(fj, 'df-img') : ''}</div>`
    + `<span class="df-sg">${sg(a)}${b !== a ? sg(b) : ''}</span><b>${T.voce}</b><small><span>${LIGAS[lm].i} ${num(meus)}</span> ${nomeDeckMontado(deck)}</small></div>`
    + '<div class="df-vs">VS</div>'
    + `<div class="df-lado df-rival"><div class="df-fig">${fr ? criatura(fr, 'df-img', true) : sgImg(rival.signo, 'df-emoji')}</div>`
    + `<span class="df-sg">${sg(rival.signo)}${rival.signo2 !== rival.signo ? sg(rival.signo2) : ''}</span><b>${esc(rival.nome)}</b>`
    + `<small><span>${LIGAS[li].i} ${T.rank.liga(nomeLiga(li))}</span> <span>${num(rival.pontos)} ${T.rank.pontos}</span></small></div>`
    + `<div class="df-dica">${T.toqueParaLutar}</div><div class="df-barra"><i></i></div></div>`;
}

/** Janela do prêmio de fim de temporada. */
export function premioTemporadaHtml(p: PremioTemporada): string {
  return `<div class="ov rk-premio"><div class="panel"><h2>${T.rank.premioTemporada(RACES[p.signo].n)}</h2>`
    + `<div class="rk-emblema l-${LIGAS[p.liga].id}"><span>${p.top10 ? '🏆' : LIGAS[p.liga].i}</span></div>`
    + `<p>${T.rank.premioLiga(ligaNome(p.liga))}</p>${p.top10 ? `<p class="rk-top10">${T.rank.premioTop10}</p>` : ''}`
    + `<p class="fim-premio"><b>+${num(p.poeira)} ✨${p.gemas ? ` · +${p.gemas} 💎` : ''}</b></p>`
    + `<button class="btn go" data-act="rk-premio-ok">OK</button></div></div>`;
}
