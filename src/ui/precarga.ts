// Carrega as imagens das cartas antes de aparecerem: sem isso, na primeira vez que uma criatura ataca a
// imagem do golpe ainda está chegando e o personagem "some" por um instante. Para aguentar muitas cartas,
// só pede o que está na mão ou em campo (cada carta é pedida uma vez só).
import { card } from '../data/cards';
import { ANIM, animUrl, ARTE, artUrl } from '../data/arte';

const prontas = new Set<string>();
const pedidas = new Set<string>();

export function precarregar(cids: Iterable<string>): void {
  for (const cid of cids) {
    const race = card(cid).race;
    const urls: string[] = [];
    if (ANIM[cid]) urls.push(animUrl(cid, race, 'idle'), animUrl(cid, race, 'ataque'));
    if (ARTE[cid]) urls.push(artUrl(cid, race, 'parado'));
    if (ARTE[cid] && !ANIM[cid] && card(cid).type === 'unit') urls.push(artUrl(cid, race, 'ataque'));
    for (const u of urls) {
      if (pedidas.has(u)) continue;
      pedidas.add(u);
      const img = new Image();
      img.onload = () => prontas.add(u);
      img.src = u;
    }
  }
}

/** A imagem já está carregada (pode ser mostrada sem piscar)? */
export const pronta = (url: string): boolean => prontas.has(url);

/** Cartas visíveis para quem joga: a própria mão e tudo que está em campo (dos dois lados). */
export function precarregarVisiveis(s: { p: { hand: { cid: string }[]; board: ({ cid: string } | null)[][] }; e: { board: ({ cid: string } | null)[][] } }): void {
  const cids = s.p.hand.map(h => h.cid);
  for (const side of [s.p, s.e]) for (const row of side.board) for (const u of row) if (u) cids.push(u.cid);
  precarregar(cids);
}
