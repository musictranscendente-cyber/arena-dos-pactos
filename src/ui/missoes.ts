// Janela de missões: calendário de 7 dias, missões do dia (com a de compartilhar) e o Baú Diário.
import { T } from '../data/textos';
import {
  bauPronto, BAU_CARTAS, BAU_POEIRA, CALENDARIO, COMPARTILHAR, loginDisponivel, missao, pronta, type PremioLogin,
} from '../meta/missoes';
import type { Progresso } from '../meta/progresso';
import { moedasHtml } from './colecao';

function premioTexto(pr: PremioLogin): string {
  const partes: string[] = [];
  if (pr.poeira) partes.push(`${pr.poeira} ✨`);
  if (pr.cartas) partes.push(pr.cartas.r === 'qualquer' ? T.nCartas(pr.cartas.n) : pr.cartas.r === 'c' ? T.cartaComum : pr.cartas.r === 'r' ? T.cartaRara : T.cartaEpica);
  if (pr.gemas) partes.push(`${pr.gemas} 💎`);
  return partes.join(' + ');
}

const icone = (pr: PremioLogin) => (pr.cartas ? (pr.cartas.r === 'e' ? '🟣' : pr.cartas.r === 'r' ? '🔷' : '🃏') : '✨');

/** Há algo para coletar (para o aviso no botão de Missões). */
export function temColeta(p: Progresso, dia: string): boolean {
  return loginDisponivel(p, dia) || p.missoes.lista.some(pronta) || bauPronto(p);
}

export function missoesHtml(p: Progresso, dia: string): string {
  const hoje = loginDisponivel(p, dia);
  const dias = CALENDARIO.map((pr, i) => {
    const feito = i < p.login.passo || (!hoje && p.login.passo === 0);
    const atual = i === p.login.passo && hoje;
    return `<div class="ms-dia${atual ? ' atual' : ''}${feito && !atual ? ' feito' : ''}"><small>${T.diaN(i + 1)}</small><span>${icone(pr)}</span><b>${premioTexto(pr)}</b>`
      + (atual ? `<button class="btn go mini" data-act="login">${T.coletar}</button>` : feito ? `<i>${T.coletado}</i>` : '') + '</div>';
  }).join('');
  const lista = p.missoes.lista.map(md => {
    const m = missao(md.id);
    if (!m) return '';
    const pct = Math.round((Math.min(md.prog, m.alvo) / m.alvo) * 100);
    const comp = m.id === COMPARTILHAR.id;
    const acao = md.coletada ? `<i class="ms-ok">${T.coletado}</i>`
      : pronta(md) ? `<button class="btn go mini" data-act="mcoletar" data-id="${m.id}">${T.coletar}</button>`
      : comp ? `<button class="btn go mini" data-act="compartilhar">${T.compartilharBt}</button>`
      : !p.missoes.trocou ? `<button class="btn rc mini" data-act="mtrocar" data-id="${m.id}">${T.trocarMissao}</button>` : '';
    return `<div class="ms-m${md.coletada ? ' ok' : ''}${comp ? ' comp' : ''}"><div class="ms-txt"><b>${T.missaoTexto[m.id]?.(m.alvo) ?? m.id}</b>`
      + `<span class="ms-barra"><i style="width:${pct}%"></i><em>${Math.min(md.prog, m.alvo)}/${m.alvo}</em></span></div>`
      + `<span class="ms-premio">+${m.poeira} ✨</span>${acao}</div>`;
  }).join('');
  const bau = `<div class="ms-bau${bauPronto(p) ? ' pronto' : p.missoes.bau ? ' ok' : ''}"><span class="ms-bau-ic">🎁</span><div><b>${T.bauDiario}</b><small>${T.bauDesc(BAU_CARTAS, BAU_POEIRA)}</small></div>`
    + (bauPronto(p) ? `<button class="btn go mini" data-act="bau">${T.abrirBau}</button>` : p.missoes.bau ? `<i class="ms-ok">${T.coletado}</i>` : '') + '</div>';
  return `<div class="ov missoes"><div class="panel wide"><div class="gtop"><h2>${T.missoes}</h2><span class="m-topo-bts">${moedasHtml(p)}`
    + `<button class="m-fecha" data-act="fechar" aria-label="${T.sair}">✕</button></span></div>`
    + `<h3 class="ms-h">${T.calendario}</h3><div class="ms-dias">${dias}</div>`
    + `<h3 class="ms-h">${T.missoesDiarias}</h3><div class="ms-lista">${lista}</div>${bau}<p class="ms-rodape">${T.novasAmanha}</p></div></div>`;
}
