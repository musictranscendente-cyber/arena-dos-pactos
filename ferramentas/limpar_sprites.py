"""
Limpa sujeira das tiras de animação: pontinhos soltos e restos quase transparentes do fundo.
Com o contorno preto que o jogo desenha em volta das criaturas, essa sujeira virava manchinhas pretas.

Uso:
    python3 ferramentas/limpar_sprites.py            (todas as tiras de criaturas)
    python3 ferramentas/limpar_sprites.py aries01 ...  (só essas)

Em cada quadro: zera o que tem alfa muito baixo e apaga pedacinhos isolados bem menores que o personagem.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALFA_MIN = 40      # abaixo disso vira transparente
PEDACO_MIN = 0.004  # pedaço com menos que essa fração da área do quadro some


def rotular(mask):
    """Rótulos de componentes conectados (4-vizinhos) sem scipy: união-busca por linhas."""
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    pai = [0]

    def raiz(a):
        while pai[a] != a:
            pai[a] = pai[pai[a]]
            a = pai[a]
        return a

    for y in range(h):
        row = mask[y]
        for x in np.nonzero(row)[0]:
            up = lab[y - 1, x] if y else 0
            left = lab[y, x - 1] if x and row[x - 1] else 0
            if up and left:
                ru, rl = raiz(up), raiz(left)
                lab[y, x] = min(ru, rl)
                pai[max(ru, rl)] = min(ru, rl)
            elif up or left:
                lab[y, x] = up or left
            else:
                pai.append(len(pai))
                lab[y, x] = len(pai) - 1
    tab = np.array([raiz(i) for i in range(len(pai))], np.int32)
    return tab[lab]


def limpar_quadro(a):
    alfa = a[:, :, 3]
    alfa[alfa < ALFA_MIN] = 0
    mask = alfa > 0
    if not mask.any():
        return a
    lab = rotular(mask)
    ids, cont = np.unique(lab[mask], return_counts=True)
    pequenos = ids[cont < PEDACO_MIN * mask.size]
    if len(pequenos):
        alfa[np.isin(lab, pequenos)] = 0
    a[:, :, 3] = alfa
    return a


def main():
    anim = json.load(open(os.path.join(RAIZ, 'src/data/anim.json'), encoding='utf-8'))
    cartas = json.load(open(os.path.join(RAIZ, 'src/data/cartas.json'), encoding='utf-8'))
    alvo = sys.argv[1:] or sorted(anim)
    for cid in alvo:
        for pose, nome in (('idle', 'idle'), ('ataque', 'ataque')):
            t = anim[cid][pose]
            arq = os.path.join(RAIZ, 'public/art', cartas[cid]['race'], f'{cid}-{nome}-anim.webp')
            if not os.path.exists(arq):
                continue
            st = np.array(Image.open(arq).convert('RGBA'))
            w = t['w']
            for i in range(t['n']):
                st[:, i * w:(i + 1) * w] = limpar_quadro(st[:, i * w:(i + 1) * w].copy())
            Image.fromarray(st, 'RGBA').save(arq, quality=75 if pose == 'idle' else 75, method=6)
        print(cid, flush=True)


if __name__ == '__main__':
    main()
