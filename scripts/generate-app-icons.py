"""Generates the DriverTrack app icons: Android legacy mipmaps + iOS slots.

Artwork matches the splash screen: DriverTrack blue background, white disc,
brand-blue navigation mark. Drawn at 4x supersampling for smooth edges.
"""
import os
from PIL import Image, ImageDraw

BLUE = (29, 93, 242, 255)      # #1D5DF2
WHITE = (255, 255, 255, 255)
SS = 4  # supersample factor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANDROID_RES = os.path.join(ROOT, "android", "app", "src", "main", "res")
IOS_SET = os.path.join(ROOT, "ios", "deliveryApp", "Images.xcassets",
                       "AppIcon.appiconset")

# Material "navigation" glyph (24dp viewport), scaled onto the white disc.
GLYPH = [(12, 2), (4.5, 20.29), (5.21, 21), (12, 18), (18.79, 21), (19.5, 20.29)]


def arrow_polygon(size: float):
    cx = cy = size / 2
    scale = size * 0.021
    return [((x - 12) * scale + cx, (y - 11.5) * scale + cy) for x, y in GLYPH]


def draw_base(size: int, circular: bool) -> Image.Image:
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if circular:
        d.ellipse([0, 0, s - 1, s - 1], fill=BLUE)
    else:
        d.rectangle([0, 0, s - 1, s - 1], fill=BLUE)
    radius = s * 0.36
    center = s / 2
    d.ellipse([center - radius, center - radius, center + radius, center + radius],
              fill=WHITE)
    # arrow_polygon() returns final-size coords; scale onto the SS canvas
    d.polygon([(x * SS, y * SS) for x, y in arrow_polygon(size)], fill=BLUE)
    return img.resize((size, size), Image.LANCZOS)


def save_png(img: Image.Image, path: str, strip_alpha: bool = False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if strip_alpha:
        bg = Image.new("RGB", img.size, BLUE[:3])
        bg.paste(img, mask=img.split()[3])
        bg.save(path, "PNG")
    else:
        img.save(path, "PNG")
    print("wrote", os.path.relpath(path, ROOT))


# ---- Android legacy launcher icons (API 24-25 + any launcher fallback) ----
DENSITIES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
square_master = draw_base(1024, circular=False)
round_master = draw_base(1024, circular=True)
for density, px in DENSITIES.items():
    folder = os.path.join(ANDROID_RES, f"mipmap-{density}")
    square_master.resize((px, px), Image.LANCZOS).save(
        os.path.join(folder, "ic_launcher.png"), "PNG")
    round_master.resize((px, px), Image.LANCZOS).save(
        os.path.join(folder, "ic_launcher_round.png"), "PNG")
    print("wrote android mipmap-" + density)

# ---- iOS app icon slots (no alpha allowed) ----
IOS_SIZES = {
    "icon-20@2x.png": 40,
    "icon-20@3x.png": 60,
    "icon-29@2x.png": 58,
    "icon-29@3x.png": 87,
    "icon-40@2x.png": 80,
    "icon-40@3x.png": 120,
    "icon-60@2x.png": 120,
    "icon-60@3x.png": 180,
    "icon-1024.png": 1024,
}
for name, px in IOS_SIZES.items():
    save_png(draw_base(px, circular=False), os.path.join(IOS_SET, name),
             strip_alpha=True)

# 1024 master reference copy in the repo root docs folder? keep repo clean: skip.
print("done")
