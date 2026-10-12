// Tela de entrada: o jogo só começa depois de entrar com uma conta (Google, ou link por e-mail).
import { T } from '../data/textos';
import { situacaoNuvem, verificandoConta } from '../services/nuvem';

export function entrarHtml(comEmail: boolean, aviso: string): string {
  const ocupado = verificandoConta() || situacaoNuvem() === 'entrando';
  const email = comEmail
    ? `<div class="en-email"><input id="cfg-email" type="email" inputmode="email" autocomplete="email" placeholder="${T.cfgEmailDica}">`
      + `<button class="btn rc" data-act="cfg-email">${T.cfgEmailBt}</button></div>`
    : `<button class="en-outro" data-act="en-email">${T.entrarOutro}</button>`;
  return `<div class="entrar" role="dialog" aria-label="${T.entrarTitulo}"><div class="en-ceu"></div>`
    + '<div class="en-caixa"><div class="en-logo" role="img" aria-label="Cosmic Citadel"></div>'
    + `<h2>${T.entrarTitulo}</h2><p>${T.entrarTexto}</p>`
    + (ocupado ? `<p class="en-sit">${T.entrarConectando}</p>`
      : `<button class="btn go en-google" data-act="cfg-google"><span class="cfg-g" aria-hidden="true">G</span>${T.cfgGoogle}</button>${email}`)
    + (ocupado ? '' : `<button class="en-convidado" data-act="en-convidado" title="${T.semContaAviso}">${T.jogarSemConta}</button><p class="en-dica">${T.semContaAviso}</p>`)
    + (aviso ? `<p class="en-aviso">${aviso}</p>` : situacaoNuvem() === 'erro' ? `<p class="en-aviso">${T.cfgSituacao.erro}</p>` : '')
    + `<p class="en-legal">${T.entrarAviso} <a href="./termos.html" target="_blank" rel="noopener">${T.termosLink}</a> ${T.eLigacao} <a href="./privacidade.html" target="_blank" rel="noopener">${T.privacidadeLink}</a>.</p>`
    + '</div></div>';
}
