"""Gera um vídeo curto e ilustrativo da experiência da mesa digital.

Requer Pillow e ffmpeg instalados localmente. O MP4 gerado é servido pelo site;
este script não roda no navegador nem usa dados reais de clientes.
"""

from pathlib import Path
import math
import subprocess

from PIL import Image, ImageDraw, ImageFont


RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "public" / "mesa-digital-demo.mp4"
LARGURA, ALTURA, FPS, DURACAO = 720, 406, 10, 8
FONTE = Path("C:/Windows/Fonts/arial.ttf")
FONTE_NEGRITO = Path("C:/Windows/Fonts/arialbd.ttf")


def fonte(tamanho, negrito=False):
    caminho = FONTE_NEGRITO if negrito else FONTE
    return ImageFont.truetype(str(caminho), tamanho)


def texto_central(draw, y, texto, font, cor):
    caixa = draw.textbbox((0, 0), texto, font=font)
    draw.text(((LARGURA - caixa[2]) / 2, y), texto, fill=cor, font=font)


faces = []
for numero in (17, 6, 1):
    imagem = Image.open(RAIZ / "public" / "baralhos" / "rider-waite" / f"maior-{numero}.webp")
    faces.append(imagem.convert("RGB").resize((92, 142), Image.Resampling.LANCZOS))

fundo = Image.new("RGB", (LARGURA, ALTURA), "#090612")
base = ImageDraw.Draw(fundo)
for y in range(ALTURA):
    peso = y / ALTURA
    base.line((0, y, LARGURA, y), fill=(int(9 + 11 * peso), int(6 + 5 * peso), int(18 + 19 * peso)))
for x, y, r in ((66, 68, 2), (590, 50, 1), (641, 122, 2), (105, 253, 1), (515, 292, 2), (295, 40, 1)):
    base.ellipse((x-r, y-r, x+r, y+r), fill="#dfcda6")

comando = [
    "ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
    "-s", f"{LARGURA}x{ALTURA}", "-r", str(FPS), "-i", "-", "-an",
    "-c:v", "libx264", "-preset", "medium", "-crf", "24", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", str(SAIDA),
]

processo = subprocess.Popen(comando, stdin=subprocess.PIPE)
assert processo.stdin is not None

for indice in range(FPS * DURACAO):
    tempo = indice / FPS
    quadro = fundo.copy()
    draw = ImageDraw.Draw(quadro)

    draw.rounded_rectangle((18, 16, 702, 389), radius=23, outline="#544270", width=2)
    draw.ellipse((118, 106, 602, 352), fill="#211635", outline="#a38253", width=3)
    draw.ellipse((148, 125, 572, 326), outline="#70486b", width=2)
    draw.arc((196, 148, 524, 305), 4, 176, fill="#a98a62", width=1)
    draw.arc((196, 148, 524, 305), 184, 356, fill="#a98a62", width=1)
    draw.text((34, 28), "DIGITAROT  /  MESA DIGITAL", font=fonte(15, True), fill="#f2d492")
    draw.text((34, 52), "Exemplo ilustrativo da tiragem", font=fonte(12), fill="#cbbde8")

    for j, x in enumerate((232, 314, 396)):
        progresso = max(0.0, min(1.0, (tempo - 0.7 - j * 1.05) / 0.65))
        if progresso <= 0:
            continue
        largura = max(4, int(92 * abs(1 - 2 * progresso))) if progresso < 1 else 92
        esquerda = x + (92 - largura) // 2
        topo = 153 + int(3 * math.sin(tempo * 2 + j))
        draw.rounded_rectangle((esquerda + 5, topo + 9, esquerda + largura + 5, topo + 151), radius=8, fill="#08050c")
        if progresso < 0.5:
            draw.rounded_rectangle((esquerda, topo, esquerda + largura, topo + 142), radius=7, fill="#3a2563", outline="#dfbd7d", width=2)
            if largura > 28:
                draw.text((esquerda + largura // 2 - 8, topo + 57), "✦", font=fonte(23), fill="#f2d492")
        else:
            rosto = faces[j].resize((largura, 142), Image.Resampling.BICUBIC)
            quadro.paste(rosto, (esquerda, topo))
            draw.rectangle((esquerda, topo, esquerda + largura - 1, topo + 141), outline="#f2d492", width=2)

    if tempo < 2.3:
        legenda = "O tarólogo prepara e revela as cartas"
    elif tempo < 4.5:
        legenda = "Você acompanha a tiragem ao vivo"
    else:
        legenda = "A conversa continua no chat da mesa"

    draw.rounded_rectangle((148, 343, 572, 378), radius=10, fill="#100c1a", outline="#684f6d", width=1)
    texto_central(draw, 352, legenda, fonte(15, True), "#f5e9d3")

    if tempo >= 4.4:
        altura_chat = min(88, int((tempo - 4.4) * 90))
        draw.rounded_rectangle((487, 178 - altura_chat, 683, 195), radius=12, fill="#171123", outline="#9f7aca", width=1)
        if altura_chat >= 78:
            draw.text((500, 105), "TARÓLOGO", font=fonte(10, True), fill="#f2d492")
            draw.text((500, 124), "Esta carta fala de", font=fonte(12), fill="#f6f2ff")
            draw.text((500, 143), "novos caminhos.", font=fonte(12), fill="#f6f2ff")
            draw.text((500, 174), "Escreva sua mensagem…", font=fonte(10), fill="#cbbde8")

    processo.stdin.write(quadro.tobytes())

processo.stdin.close()
if processo.wait() != 0:
    raise SystemExit("Falha ao gerar o vídeo de demonstração")
print(SAIDA)
