// Carrega as imagens das cartas da partida antes de aparecerem: sem isso, na primeira vez que uma
// criatura ataca a imagem do golpe ainda está chegando e o personagem "some" por um instante.
import { card } from '../data/cards';
import { ANIM, animUrl, ARTE, artUrl } from '../data/arte';

const prontas = new Set<string>();
const pedidas = new Set<string>();

export function precarregar(cids: Iterable<string>): void {
  for (const cid of cids) {
    const race = card(cid).race;
    const urls: string[] = [];
    if (ANIM[cid]) urls.push(animUrl(cid, race, 'idle'), animUrl(cid, race, 'ataque'));
    if (ARTE[cid]) urls.push(artUrl(cid, race, 'parado'), artUrl(cid, race, 'ataque'));
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
