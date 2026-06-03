#!/usr/bin/env python3
"""Generate NSIS installer header/sidebar BMP assets for GenCode."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "src-tauri" / "icons"
ICON_SRC = ICONS / "icon.png"
HEADER_OUT = ICONS / "installer-header.bmp"
SIDEBAR_OUT = ICONS / "installer-sidebar.bmp"

HEADER_SIZE = (150, 57)
SIDEBAR_SIZE = (164, 314)

BG_TOP = (12, 12, 18)
BG_BOTTOM = (8, 8, 14)
ACCENT_A = (124, 92, 255)
ACCENT_B = (56, 189, 248)
TEXT_PRIMARY = (245, 245, 250)
TEXT_MUTED = (156, 163, 175)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/msyh.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
        if bold
        else "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def vertical_gradient(size: tuple[int, int]) -> Image.Image:
    w, h = size
    img = Image.new("RGB", size)
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(h - 1, 1)
        r = int(BG_TOP[0] * (1 - t) + BG_BOTTOM[0] * t)
        g = int(BG_TOP[1] * (1 - t) + BG_BOTTOM[1] * t)
        b = int(BG_TOP[2] * (1 - t) + BG_BOTTOM[2] * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    return img


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def accent_color(t: float) -> tuple[int, int, int]:
    return (
        lerp(ACCENT_A[0], ACCENT_B[0], t),
        lerp(ACCENT_A[1], ACCENT_B[1], t),
        lerp(ACCENT_A[2], ACCENT_B[2], t),
    )


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def load_logo(size: int) -> Image.Image:
    logo = Image.open(ICON_SRC).convert("RGBA")
    logo.thumbnail((size, size), Image.Resampling.LANCZOS)
    return logo


def save_bmp(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(path, format="BMP")


def draw_header() -> Image.Image:
    w, h = HEADER_SIZE
    canvas = vertical_gradient(HEADER_SIZE)
    draw = ImageDraw.Draw(canvas)

    for x in range(w):
        t = x / max(w - 1, 1)
        draw.line([(x, h - 2), (x, h - 1)], fill=accent_color(t))

    logo = load_logo(34)
    canvas.paste(logo, (10, (h - logo.height) // 2), logo)

    title_font = load_font(13, bold=True)
    sub_font = load_font(9)
    draw.text((52, 16), "GenCode", fill=TEXT_PRIMARY, font=title_font)
    draw.text((52, 33), "灵码ADE", fill=TEXT_MUTED, font=sub_font)
    return canvas


def draw_sidebar() -> Image.Image:
    w, h = SIDEBAR_SIZE
    canvas = vertical_gradient(SIDEBAR_SIZE)
    draw = ImageDraw.Draw(canvas)

    for y in range(h):
        t = y / max(h - 1, 1)
        draw.line([(0, y), (3, y)], fill=accent_color(t))

    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((18, 36, 146, 164), fill=(124, 92, 255, 28))
    glow_draw.ellipse((28, 56, 136, 144), fill=(56, 189, 248, 18))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=8))
    canvas.paste(glow, (0, 0), glow)

    logo = load_logo(72)
    lx = (w - logo.width) // 2
    canvas.paste(logo, (lx, 58), logo)

    title_font = load_font(18, bold=True)
    sub_font = load_font(11)
    tag_font = load_font(9)

    title = "GenCode"
    tw = draw.textlength(title, font=title_font)
    draw.text(((w - tw) / 2, 148), title, fill=TEXT_PRIMARY, font=title_font)

    sub = "灵码ADE"
    sw = draw.textlength(sub, font=sub_font)
    draw.text(((w - sw) / 2, 174), sub, fill=accent_color(0.55), font=sub_font)

    tag = "AI-native terminal"
    tg_w = draw.textlength(tag, font=tag_font)
    draw.text(((w - tg_w) / 2, 204), tag, fill=TEXT_MUTED, font=tag_font)

    for x in range(24, w - 24):
        t = (x - 24) / max(w - 48, 1)
        draw.point((x, 232), fill=accent_color(t))

    footer_font = load_font(8)
    footer = "yamikeji.com"
    fw = draw.textlength(footer, font=footer_font)
    draw.text(((w - fw) / 2, h - 24), footer, fill=(90, 96, 110), font=footer_font)
    return canvas


def main() -> None:
    if not ICON_SRC.exists():
        raise SystemExit(f"Missing icon source: {ICON_SRC}")
    save_bmp(draw_header(), HEADER_OUT)
    save_bmp(draw_sidebar(), SIDEBAR_OUT)
    print(f"Wrote {HEADER_OUT}")
    print(f"Wrote {SIDEBAR_OUT}")


if __name__ == "__main__":
    main()
