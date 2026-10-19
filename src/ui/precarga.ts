// Carrega as imagens das cartas antes de aparecerem: sem isso, na primeira vez que uma criatura ataca a
// imagem do golpe ainda está chegando e o personagem "some" por um instante. Para aguentar muitas cartas,
// só pede o que está na mão ou em campo (cada carta é pedida uma vez só).
import { card } from '../data/cards';
import { escalaPalco } from './orientacao';
import { ANIM, animUrl, ARTE, artUrl, MAGIA, magiaUrl } from '../data/arte';

const prontas = new Set<string>();
const pedidas = new Set<string>();
const guardadas: HTMLImageElement[] = [];

export function precarregar(cids: Iterable<string>): void {
  for (const cid of cids) {
    const race = card(cid).race;
    const urls: string[] = [];
    const tira = ANIM[cid] && !(escalaPalco() > 1.25 && ARTE[cid]);
    if (tira) urls.push(animUrl(cid, race, 'idle'), animUrl(cid, race, 'ataque'));
    if (ARTE[cid]) urls.push(artUrl(cid, race, 'parado'));
    if (MAGIA[cid]) urls.push(magiaUrl(cid, race));
    if (ARTE[cid] && !tira && card(cid).type === 'unit') urls.push(artUrl(cid, race, 'ataque'));
    for (const u of urls) {
      if (pedidas.has(u)) continue;
      pedidas.add(u);
      const img = new Image();
      img.src = u;
      // só conta como pronta depois de decodificada; a imagem fica guardada para o navegador não descartar
      img.decode().then(() => { prontas.add(u); guardadas.push(img); }, () => { /* imagem com erro: a criatura só respira */ });
    }
  }
}

/** A imagem já está carregada (pode ser mostrada sem piscar)? */
export function pronta(url: string): boolean {
  if (prontas.has(url)) return true;
  // a tira do golpe também fica na figura desde que a criatura entra: se ela já carregou ali, serve
  for (const im of document.images) {
    if (im.complete && im.naturalWidth > 0 && im.getAttribute('src') === url) { prontas.add(url); return true; }
  }
  return false;
}

/** Cartas visíveis para quem joga: a própria mão e tudo que está em campo (dos dois lados). */
export function precarregarVisiveis(s: { p: { hand: { cid: string }[]; board: ({ cid: string } | null)[][] }; e: { hand: { cid: string }[]; board: ({ cid: string } | null)[][] } }): void {
  const cids = s.p.hand.map(h => h.cid);
  // magias do rival só aparecem na Batalha: pede as da mão dele também (são leves)
  for (const h of s.e.hand) cids.push(h.cid);
  for (const side of [s.p, s.e]) for (const row of side.board) for (const u of row) if (u) cids.push(u.cid);
  precarregar(cids);
}
