"""
Transforma o vídeo de uma magia na animação que aparece na Batalha quando a magia acontece,
e na imagem da carta.

Dois tipos de vídeo (descobre sozinho pelos cantos do primeiro quadro):
- efeito sobre fundo verde ou magenta: o fundo é recortado e só o efeito aparece sobre a arena;
- ilustração com cenário (decks antigos): vira um "clarão" redondo com a borda sumindo.

Uso:
    python3 ferramentas/magia_para_sprite.py <video.mp4> <id-da-magia> [--carta SEGUNDO] [--trecho INICIO FIM]

Gera em public/art/<signo>/:
    <id>-parado.webp        imagem da carta (quadro do segundo --carta, padrão 3,0)
    <id>-magia-anim.webp    tira de quadros do efeito (sobre o alvo)
e registra a magia em src/data/magia.json.
"""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from video_para_sprite import chave, recorta  # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUADROS = 16
LADO = 160  # px de cada quadro da animação
LADO_CARTA = 320
LADO_LIVRE = 192  # efeito recortado: sem máscara, um pouco mais nítido


def main():
    args = sys.argv[1:]
    video, cid = args[0], args[1]
    t_carta = float(args[args.index('--carta') + 1]) if '--carta' in args else 3.0
    t0, t1 = (float(args[args.index('--trecho') + 1]), float(args[args.index('--trecho') + 2])) if '--trecho' in args else (0.3, 5.5)
    cartas = json.load(open(os.path.join(RAIZ, 'src/data/cartas.json'), encoding='utf-8'))
    pasta = os.path.join(RAIZ, 'public/art', cartas[cid]['race'])
    os.makedirs(pasta, exist_ok=True)
    tmp = tempfile.mkdtemp()
    fps = QUADROS / (t1 - t0)
    # quadrado central do vídeo (que é 16:9)
    crop = "crop='min(iw,ih)':'min(iw,ih)'"
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t0), '-to', str(t1), '-i', video,
                    '-vf', f'{crop},fps={fps:.4f},scale={LADO}:{LADO}', f'{tmp}/%03d.png'], check=True)
    nomes = sorted(os.listdir(tmp))[:QUADROS]
    primeiro = np.array(Image.open(os.path.join(tmp, nomes[0])).convert('RGB')).astype(float)
    cantos = np.concatenate([primeiro[:8, :8].reshape(-1, 3), primeiro[:8, -8:].reshape(-1, 3), primeiro[-8:, -8:].reshape(-1, 3)])
    bg = np.median(cantos, 0)
    cor = 'verde' if bg[1] > bg[0] + 60 and bg[1] > bg[2] + 60 else 'magenta' if min(bg[0], bg[2]) > bg[1] + 60 else None
    if cor:
        # efeito sobre fundo liso: recorta o fundo em todos os quadros, no tamanho do vídeo
        quadros_v = os.path.join(tmp, 'v')
        os.makedirs(quadros_v)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t0), '-to', str(t1), '-i', video,
                        '-vf', f'{crop},fps={fps:.4f},scale={LADO_LIVRE * 2}:{LADO_LIVRE * 2}', f'{quadros_v}/%03d.png'], check=True)
        lim = float(np.median(chave(np.array(Image.open(os.path.join(quadros_v, '001.png')).convert('RGB')).astype(float), cor)[0][:8].ravel()))
        st = Image.new('RGBA', (LADO_LIVRE * len(nomes), LADO_LIVRE))
        for i, n in enumerate(sorted(os.listdir(quadros_v))[:QUADROS]):
            fr = np.array(Image.open(os.path.join(quadros_v, n)).convert('RGB')).astype(float)
            st.paste(recorta(fr, cor, lim).resize((LADO_LIVRE, LADO_LIVRE), Image.LANCZOS), (i * LADO_LIVRE, 0))
        st.save(os.path.join(pasta, f'{cid}-magia-anim.webp'), quality=78, method=6)
        # carta: o quadro do auge, recortado e centralizado
        carta = os.path.join(tmp, 'carta.png')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t_carta), '-i', video, '-frames:v', '1',
                        '-vf', f'{crop},scale=640:640', carta], check=True)
        im = recorta(np.array(Image.open(carta).convert('RGB')).astype(float), cor, lim)
        caixa = im.getbbox() or (0, 0, 640, 640)
        im = im.crop(caixa)
        lado = max(im.size)
        quad = Image.new('RGBA', (lado, lado))
        quad.paste(im, ((lado - im.width) // 2, (lado - im.height) // 2))
        quad.resize((LADO_CARTA, LADO_CARTA), Image.LANCZOS).save(os.path.join(pasta, f'{cid}-parado.webp'), quality=82, method=6)
        registro = {'n': len(nomes), 'livre': True}
    else:
        # máscara redonda: o efeito aparece como um "clarão" sobre o alvo, sem bordas quadradas
        y, x = np.mgrid[0:LADO, 0:LADO]
        r = np.hypot(x - (LADO - 1) / 2, y - (LADO - 1) / 2) / (LADO / 2)
        alfa = (np.clip((1.0 - r) / 0.35, 0, 1) ** 1.4 * 255).astype(np.uint8)
        st = Image.new('RGBA', (LADO * len(nomes), LADO))
        for i, n in enumerate(nomes):
            im = Image.open(os.path.join(tmp, n)).convert('RGB')
            rgba = np.dstack([np.array(im), alfa])
            st.paste(Image.fromarray(rgba, 'RGBA'), (i * LADO, 0))
        st.save(os.path.join(pasta, f'{cid}-magia-anim.webp'), quality=72, method=6)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t_carta), '-i', video, '-frames:v', '1',
                        '-vf', f'{crop},scale={LADO_CARTA}:{LADO_CARTA}', '-c:v', 'libwebp', '-quality', '82',
                        os.path.join(pasta, f'{cid}-parado.webp')], check=True)
        registro = len(nomes)
    for arq, valor in (('src/data/magia.json', registro), ('src/data/arte.json', [1, 1, 1])):
        caminho = os.path.join(RAIZ, arq)
        dados = json.load(open(caminho, encoding='utf-8')) if os.path.exists(caminho) else {}
        dados[cid] = valor
        with open(caminho, 'w', encoding='utf-8') as fh:
            json.dump(dict(sorted(dados.items())), fh, ensure_ascii=False, indent=1)
            fh.write('\n')
    print(f'{cid}: {len(nomes)} quadros, {"fundo " + cor + " recortado" if cor else "clarão redondo"}')


if __name__ == '__main__':
    main()
