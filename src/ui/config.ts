// Janela de Configurações (abre tocando no medalhão do perfil): conta/nuvem, nome, som, tela e ajuda.
import { T } from '../data/textos';
import { emailConta, logado, nuvemAtiva, situacaoNuvem } from '../services/nuvem';
import type { Perfil } from '../services/perfil';
import { giroLigado } from './orientacao';
import { prefsSom } from './som';

const esc = (t: string) => t.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
const chave = (on: boolean) => `<b class="cfg-chave${on ? ' on' : ''}">${on ? T.ligado : T.desligado}</b>`;

export function configHtml(perfil: Perfil, aviso: string): string {
  const s = prefsSom();
  let conta: string;
  if (!nuvemAtiva()) conta = `<p class="cfg-dica">${T.cfgNuvemOff}</p>`;
  else if (logado()) {
    conta = `<p>${T.cfgConectado(esc(emailConta() ?? ''))}</p><p class="cfg-sit">${T.cfgSituacao[situacaoNuvem()] ?? ''}</p>`
      + `<button class="btn rc" data-act="cfg-sair">${T.cfgSair}</button>`;
  } else {
    conta = `<p class="cfg-dica">${T.cfgEntreTexto}</p>`
      + `<button class="btn go cfg-google" data-act="cfg-google"><span class="cfg-g" aria-hidden="true">G</span>${T.cfgGoogle}</button>`
      + `<div class="cfg-email"><input id="cfg-email" type="email" inputmode="email" autocomplete="email" placeholder="${T.cfgEmailDica}">`
      + `<button class="btn rc" data-act="cfg-email">${T.cfgEmailBt}</button></div>`
      + `<p class="cfg-sit">${T.cfgSituacao[situacaoNuvem()] ?? ''}</p>`;
  }
  return `<div class="ov config"><div class="panel wide"><div class="gtop"><h2>${T.config}</h2><button class="m-fecha" data-act="fechar" aria-label="${T.fechar}">✕</button></div>`
    + (aviso ? `<p class="cfg-aviso">${aviso}</p>` : '')
    + '<div class="cfg-grade">'
    + `<section class="cfg-bloco"><h4>${T.cfgConta}</h4>${conta}</section>`
    + `<section class="cfg-bloco"><h4>${T.cfgPerfil}</h4><label class="cfg-campo"><small>${T.cfgNome}</small>`
    + `<input id="cfg-nome" type="text" maxlength="16" autocomplete="off" spellcheck="false" value="${esc(perfil.nome)}" placeholder="${T.invocador}"></label><small class="cfg-dica">${T.cfgNomeDica}</small></section>`
    + `<section class="cfg-bloco"><h4>${T.cfgSom}</h4><button class="cfg-op" data-act="som-musica"><span>🎵 Música</span>${chave(s.musica)}</button>`
    + `<button class="cfg-op" data-act="som-efeitos"><span>💥 Efeitos</span>${chave(s.efeitos)}</button></section>`
    + `<section class="cfg-bloco"><h4>${T.cfgTela}</h4><button class="cfg-op" data-act="cfg-giro"><span>${T.cfgGiro}</span>${chave(giroLigado())}</button></section>`
    + `<section class="cfg-bloco"><h4>${T.cfgAjuda}</h4><button class="btn rc" data-act="regras">${T.comoJogar}</button> <button class="btn rc" data-act="rever-tut">${T.reverTutorial}</button>`
    + `<p class="cfg-dica">${T.cfgVersao} ${__VERSAO__}</p></section>`
    + '</div></div></div>';
}
