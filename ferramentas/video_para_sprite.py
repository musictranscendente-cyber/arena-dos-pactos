"""
Transforma um vídeo do Grok (dois personagens iguais em fundo verde ou magenta:
à esquerda respirando, à direita atacando) nas animações do jogo.

Uso:
    python3 ferramentas/video_para_sprite.py <video.mp4> <id-da-carta> [--idle INICIO FIM] [--ataque INICIO FIM]

Exemplo:
    python3 ferramentas/video_para_sprite.py touro25.mp4 touro25

Gera em public/art/<signo>/:
    <id>-parado.webp e <id>-ataque.webp   (imagens paradas: mão, galeria e reserva)
    <id>-idle-anim.webp e <id>-ataque-anim.webp   (tiras de quadros)
e registra a carta em src/data/arte.json e src/data/anim.json.

Precisa de ffmpeg, Pillow e numpy. Tempos opcionais em segundos; sem eles o trecho é escolhido sozinho.
"""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 12
ALTURA_PARADO = 150  # px da tira parada; as outras usam a mesma escala
ALTURA_IMAGEM = 480  # px da imagem parada (mão/galeria)


def quadros(video):
    pasta = tempfile.mkdtemp()
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-vf', f'fps={FPS}', f'{pasta}/%03d.png'], check=True)
    nomes = sorted(os.listdir(pasta))
    return [np.array(Image.open(os.path.join(pasta, n)).convert('RGB')).astype(float) for n in nomes]


def chave(fr, cor):
    """Força do fundo em cada pixel (alto = fundo) e a imagem com o vazamento de cor removido."""
    r, g, b = fr[..., 0], fr[..., 1], fr[..., 2]
    if cor == 'verde':
        k = g - np.maximum(r, b)
        # tira o verde que vaza nas bordas (chama amarela sobre verde vira laranja, não verde-limão)
        g = np.where(k > -20, np.minimum(g, np.maximum(r, b) * 0.85), g)
    else:
        k = np.minimum(r, b) - g
        r = np.where(k > 0, np.minimum(r, np.maximum(g, r - k)), r)
        b = np.where(k > 0, np.minimum(b, np.maximum(g, b - k)), b)
    return k, np.dstack([r, g, b])


def recorta(fr, cor, lim):
    k, rgb = chave(fr, cor)
    lo, hi = lim * 0.35, lim * 0.75
    a = np.clip((hi - k) / (hi - lo), 0, 1)
    a[k < lo] = 1
    # efeito que encosta na borda do vídeo some suave, em vez de terminar num corte reto
    h, w = a.shape
    m, mb = 40, 90  # a borda de baixo some mais devagar: explosões no chão costumam encostar nela
    rampa = np.minimum(np.arange(w) / m, 1) * np.minimum((w - 1 - np.arange(w)) / m, 1)
    a *= rampa[None, :]
    rampa_v = np.minimum(np.arange(h) / m, 1) * np.minimum((h - 1 - np.arange(h)) / mb, 1) ** 1.5
    a *= rampa_v[:, None]
    return Image.fromarray(np.dstack([np.clip(rgb, 0, 255), a * 255]).astype(np.uint8), 'RGBA')


def caixa(imgs):
    bb = None
    for im in imgs:
        b = im.getbbox()
        if b is None:
            continue
        bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
    return bb


def ancoras(im):
    """ax: centro do corpo (faixa da cintura) de 0 a 1; by: quanto sobra abaixo dos pés, de 0 a 1."""
    a = np.array(im)[..., 3].astype(float)
    h, w = a.shape
    linhas = np.where(a.sum(1) > 2 * 255)[0]
    base = linhas.max() + 1 if len(linhas) else h
    topo = linhas.min() if len(linhas) else 0
    faixa = a[int(topo + (base - topo) * 0.55):int(topo + (base - topo) * 0.8)]
    pesos = faixa.sum(0)
    ax = float(np.average(np.arange(w), weights=pesos)) / w if pesos.sum() else 0.5
    return round(ax, 3), round((h - base) / h, 3)


TAMANHO_REF = 0.64  # "tamanho visual" de um personagem médio (ver tamanho())


def tamanho(im, altura_quadro):
    """Fator de escala para o personagem ter tamanho parecido com os outros no tabuleiro.
    Mede a raiz da área ocupada (relativa à altura do quadro) e aproxima da referência, sem igualar
    totalmente: um colosso continua um pouco maior que um anão."""
    a = np.array(im)[..., 3] > 128
    if not a.any():
        return 1.0
    ys = np.where(a.any(1))[0]
    usado = (ys.max() - ys.min() + 1) / altura_quadro
    v = usado * np.sqrt(a.sum() / (ys.max() - ys.min() + 1) ** 2)
    return round(float(np.clip((TAMANHO_REF / v) ** 0.7, 0.75, 1.3)), 3)


def tira(imgs, escala, destino):
    bb = caixa(imgs)
    imgs = [im.crop(bb) for im in imgs]
    w, h = imgs[0].size
    W, H = max(1, round(w * escala)), max(1, round(h * escala))
    st = Image.new('RGBA', (W * len(imgs), H))
    for i, im in enumerate(imgs):
        st.paste(im.resize((W, H), Image.LANCZOS), (i * W, 0))
    st.save(destino, quality=80, method=6)
    ax, by = ancoras(imgs[0].resize((W, H)))
    return {'n': len(imgs), 'w': W, 'h': H, 'ax': ax, 'by': by}, bb


def main():
    args = sys.argv[1:]
    video, cid = args[0], args[1]
    sel = {}
    for nome in ('--idle', '--ataque'):
        if nome in args:
            i = args.index(nome)
            sel[nome] = (float(args[i + 1]), float(args[i + 2]))
    cartas = json.load(open(os.path.join(RAIZ, 'src/data/cartas.json'), encoding='utf-8'))
    signo = cartas[cid]['race']
    fr = quadros(video)
    H, W, _ = fr[0].shape

    # fundo: verde ou magenta, pelos cantos
    cantos = np.concatenate([fr[0][:20, :20].reshape(-1, 3), fr[0][:20, -20:].reshape(-1, 3), fr[0][-20:, -20:].reshape(-1, 3)])
    bg = np.median(cantos, 0)
    cor = 'verde' if bg[1] > bg[0] and bg[1] > bg[2] else 'magenta'
    lim = float(np.median(chave(fr[0], cor)[0][:20].ravel()))

    # coluna que separa os dois personagens: o maior vão vazio perto do meio, somando todos os quadros
    ocup = np.zeros(W, bool)
    for f in fr:
        ocup |= (chave(f, cor)[0] < lim * 0.5).sum(0) > 0
    livres = [x for x in range(int(W * 0.25), int(W * 0.75)) if not ocup[x]]
    if livres:
        runs, s, p = [], livres[0], livres[0]
        for x in livres[1:]:
            if x != p + 1:
                runs.append((s, p))
                s = x
            p = x
        runs.append((s, p))
        s, e = max(runs, key=lambda t: t[1] - t[0])
        corte = (s + e) // 2
    else:
        soma = np.zeros(W)
        for f in fr:
            soma += (chave(f, cor)[0] < lim * 0.5).sum(0)
        corte = int(np.argmin(soma[int(W * 0.3):int(W * 0.7)])) + int(W * 0.3)

    esq = [f[:, :corte] for f in fr]
    dir_ = [f[:, corte:] for f in fr]

    # ataque: quadros em que o personagem da direita sai da pose inicial
    if '--ataque' in sel:
        a0, a1 = (int(t * FPS) for t in sel['--ataque'])
    else:
        ref = np.array(Image.fromarray(dir_[0].astype(np.uint8)).resize((96, 54))).astype(float)
        dif = [np.abs(np.array(Image.fromarray(d.astype(np.uint8)).resize((96, 54))).astype(float) - ref).mean() for d in dir_]
        lim_d = max(4.0, max(dif) * 0.3)
        mov = [i for i, d in enumerate(dif) if d > lim_d]
        a0, a1 = (max(0, mov[0] - 3), min(len(fr), mov[-1] + 4)) if mov else (0, len(fr))
    ids_atk = list(range(a0, a1))
    if len(ids_atk) > 36:  # limita o peso
        passo = len(ids_atk) / 36
        ids_atk = [ids_atk[int(i * passo)] for i in range(36)]

    # respiração: 2 s da esquerda, um quadro sim outro não, indo e voltando (loop sem pulo)
    if '--idle' in sel:
        i0, i1 = (int(t * FPS) for t in sel['--idle'])
    else:
        i0, i1 = 6, min(len(fr), 30)
    ids_idle = list(range(i0, i1, 2))
    ids_idle = ids_idle + ids_idle[-2:0:-1]

    idle = [recorta(esq[i], cor, lim) for i in ids_idle]
    atk = [recorta(dir_[i], cor, lim) for i in ids_atk]
    bb_idle = caixa(idle)
    escala = ALTURA_PARADO / (bb_idle[3] - bb_idle[1])

    pasta = os.path.join(RAIZ, 'public/art', signo)
    os.makedirs(pasta, exist_ok=True)
    t_idle, _ = tira(idle, escala, os.path.join(pasta, f'{cid}-idle-anim.webp'))
    t_atk, _ = tira(atk, escala, os.path.join(pasta, f'{cid}-ataque-anim.webp'))

    # imagens paradas (mão/galeria): 1º quadro da respiração e o quadro de ataque mais aberto
    def parada(im, nome):
        im = im.crop(im.getbbox())
        f = ALTURA_IMAGEM / im.size[1]
        im = im.resize((max(1, round(im.size[0] * f)), ALTURA_IMAGEM), Image.LANCZOS)
        im.save(os.path.join(pasta, f'{cid}-{nome}.webp'), quality=88, method=6)
        return round(im.size[0] / im.size[1], 3)
    pico = max(atk, key=lambda im: (lambda b: (b[2] - b[0]) if b else 0)(im.getbbox()))
    r_par = parada(idle[0], 'parado')
    r_atk = parada(pico, 'ataque')

    primeiro = Image.open(os.path.join(pasta, f'{cid}-idle-anim.webp')).crop((0, 0, t_idle['w'], t_idle['h']))
    fator = tamanho(primeiro, t_idle['h'])
    for arq, valor in (('src/data/arte.json', [r_par, r_atk, fator]), ('src/data/anim.json', {'idle': t_idle, 'ataque': t_atk, 's': fator})):
        caminho = os.path.join(RAIZ, arq)
        dados = json.load(open(caminho, encoding='utf-8')) if os.path.exists(caminho) else {}
        dados[cid] = valor
        with open(caminho, 'w', encoding='utf-8') as fh:
            json.dump(dict(sorted(dados.items())), fh, ensure_ascii=False, indent=1)
            fh.write('\n')
    print(f'{cid}: fundo {cor}, corte x={corte}, respiração {len(ids_idle)} quadros, ataque {len(ids_atk)} quadros ({a0 / FPS:.1f}s a {a1 / FPS:.1f}s)')


if __name__ == '__main__':
    main()
