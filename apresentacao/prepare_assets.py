"""Prepara as imagens das telas para a apresentação (molduras e recortes)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(r"D:\Users\vivis.DESKTOP-RN5T169\Downloads\Deepseek Harness\area-comum")
SHOTS = ROOT / "screenshots"
OUT = ROOT / "apresentacao" / "assets"
OUT.mkdir(parents=True, exist_ok=True)

CREAM = (247, 242, 232)
CARD = (253, 251, 247)
BORDER = (231, 221, 203)
SHADOW = (18, 47, 39, 55)


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def frame(name, out_name, width=1700, crop=None, radius=26, padding=26, shadow=28):
    source = SHOTS / name
    image = Image.open(source).convert("RGB")
    if crop:
        image = image.crop(crop)
    ratio = width / image.width
    image = image.resize((width, int(image.height * ratio)), Image.LANCZOS)

    canvas_w = image.width + padding * 2
    canvas_h = image.height + padding * 2 + shadow
    canvas = Image.new("RGBA", (canvas_w, canvas_h), CREAM + (255,))

    # sombra
    shadow_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow_layer)
    sd.rounded_rectangle(
        (padding + 4, padding + 10, padding + image.width + 4, padding + image.height + 10),
        radius=radius,
        fill=SHADOW,
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(16))
    canvas.alpha_composite(shadow_layer)

    # cartão com borda
    card = Image.new("RGBA", (image.width + 8, image.height + 8), CARD + (255,))
    cd = ImageDraw.Draw(card)
    cd.rounded_rectangle(
        (0, 0, card.width - 1, card.height - 1), radius=radius + 4, fill=CARD + (255,),
        outline=BORDER + (255,), width=2,
    )
    canvas.alpha_composite(card, (padding - 4, padding - 4))

    # screenshot com cantos arredondados
    rounded = Image.new("RGBA", image.size, (0, 0, 0, 0))
    rounded.paste(image, (0, 0))
    rounded.putalpha(rounded_mask(image.size, radius))
    canvas.alpha_composite(rounded, (padding, padding))

    canvas.convert("RGB").save(OUT / out_name, quality=95)
    print("ok", out_name, canvas.size)


# Telas completas / recortes principais
frame("01-login.png", "login.png", width=1500)
frame("02-visao-geral.png", "visao-geral.png", width=1500, crop=(0, 0, 1440, 1020))
frame("03-agenda.png", "agenda.png", width=1600, crop=(0, 0, 1440, 1050))
frame("04-agenda-area.png", "agenda-area.png", width=1500)
frame("05-minhas.png", "minhas.png", width=1500)
frame("06-painel-sindico.png", "painel.png", width=1500, crop=(0, 0, 1440, 1120))
frame("07-portaria.png", "portaria.png", width=1500)
frame("08-historico.png", "historico.png", width=1500)

# Pagamento (foco no modal)
frame("09-pagamento.png", "pagamento.png", width=1100, crop=(430, 175, 1010, 790), padding=22)

# Notificações (painel superior direito)
frame("10-notificacoes.png", "notificacoes.png", width=1080, crop=(930, 0, 1440, 350), padding=22)

print("Assets prontos em", OUT)
