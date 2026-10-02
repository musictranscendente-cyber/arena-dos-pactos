"""
Deixa as animações já prontas mais leves, sem precisar dos vídeos de novo:
tira quadros do ataque (até 20) e da respiração (12), reduz a escala e as imagens paradas.
Pode rodar mais de uma vez (o que já está leve fica como está).

Uso: python3 ferramentas/otimizar_arte.py
"""
import json
import os

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAX = {'ataque': 20, 'idle': 12}
ALTURA_PARADO = 120
ALTURA_IMAGEM = 240


def escolhe(n, alvo):
    if n <= alvo:
        return list(range(n))
    return [round(i * (n - 1) / (alvo - 1)) for i in range(alvo)]


def main():
    cartas = json.load(open(os.path.join(RAIZ, 'src/data/cartas.json'), encoding='utf-8'))
    pa = os.path.join(RAIZ, 'src/data/anim.json')
    anim = json.load(open(pa, encoding='utf-8'))
    for cid, a in anim.items():
        pasta = os.path.join(RAIZ, 'public/art', cartas[cid]['race'])
        f = min(1.0, ALTURA_PARADO / a['idle']['h'])
        for kind in ('idle', 'ataque'):
            t = a[kind]
            ids = escolhe(t['n'], MAX[kind])
            if len(ids) == t['n'] and f == 1.0:
                continue
            arq = os.path.join(pasta, f'{cid}-{kind}-anim.webp')
            st = Image.open(arq)
            W, H = max(1, round(t['w'] * f)), max(1, round(t['h'] * f))
            out = Image.new('RGBA', (W * len(ids), H))
            for j, i in enumerate(ids):
                out.paste(st.crop((i * t['w'], 0, (i + 1) * t['w'], t['h'])).resize((W, H), Image.LANCZOS), (j * W, 0))
            out.save(arq, quality=75, method=6)
            t.update(n=len(ids), w=W, h=H)
    with open(pa, 'w', encoding='utf-8') as fh:
        json.dump(dict(sorted(anim.items())), fh, ensure_ascii=False, indent=1)
        fh.write('\n')
    # imagens paradas da mão/galeria
    arte = json.load(open(os.path.join(RAIZ, 'src/data/arte.json'), encoding='utf-8'))
    for cid in arte:
        pasta = os.path.join(RAIZ, 'public/art', cartas[cid]['race'])
        for nome in ('parado', 'ataque'):
            arq = os.path.join(pasta, f'{cid}-{nome}.webp')
            if not os.path.exists(arq):
                continue
            im = Image.open(arq)
            if im.size[1] <= ALTURA_IMAGEM:
                continue
            im = im.resize((max(1, round(im.size[0] * ALTURA_IMAGEM / im.size[1])), ALTURA_IMAGEM), Image.LANCZOS)
            im.save(arq, quality=82, method=6)


if __name__ == '__main__':
    main()
