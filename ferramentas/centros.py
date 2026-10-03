"""
Mede o centro visível de cada personagem animado, para ele ficar exatamente no meio da casa do tabuleiro.

Uso (rode depois de processar vídeos com video_para_sprite.py):
    python3 ferramentas/centros.py

Lê o primeiro quadro de public/art/<signo>/<id>-idle-anim.webp, acha a caixa do que é bem visível
(ignora brilhos e rastros fracos) e grava em src/data/centro.json:
    { id: [ox, oy] }
ox = distância horizontal do centro da caixa até a âncora do corpo (ax), em alturas do quadro;
oy = altura do centro da caixa acima dos pés, em alturas do quadro.
"""
import json
import os

import numpy as np
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    anim = json.load(open(os.path.join(RAIZ, 'src/data/anim.json'), encoding='utf-8'))
    cartas = json.load(open(os.path.join(RAIZ, 'src/data/cartas.json'), encoding='utf-8'))
    out = {}
    for cid, a in sorted(anim.items()):
        t = a['idle']
        arq = os.path.join(RAIZ, 'public/art', cartas[cid]['race'], f'{cid}-idle-anim.webp')
        if not os.path.exists(arq):
            continue
        st = Image.open(arq).convert('RGBA')
        alfa = np.array(st)[:, :, 3]
        h, w = t['h'], t['w']
        # todos os quadros juntos (a respiração mexe um pouco), só o que é bem opaco
        uniao = np.zeros((h, w), bool)
        for i in range(t['n']):
            uniao |= alfa[:h, i * w:(i + 1) * w] > 140
        if not uniao.any():
            continue
        ys, xs = np.where(uniao.any(1))[0], np.where(uniao.any(0))[0]
        cx = (xs.min() + xs.max() + 1) / 2 / w
        cy = (ys.min() + ys.max() + 1) / 2 / h
        ox = (cx - t['ax']) * w / h
        oy = (1 - cy) - t['by']
        out[cid] = [round(float(ox), 3), round(float(oy), 3)]
    with open(os.path.join(RAIZ, 'src/data/centro.json'), 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
        fh.write('\n')
    print(f'{len(out)} personagens medidos')


if __name__ == '__main__':
    main()
