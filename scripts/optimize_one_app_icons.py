from pathlib import Path

from PIL import Image


ROOT = Path("/home/ubuntu/kiko-native-app/assets/images")
TARGETS = {
    "icon.png": 1024,
    "splash-icon.png": 1024,
    "android-icon-foreground.png": 1024,
    "favicon.png": 512,
}


def optimize_icon(filename: str, side: int) -> None:
    path = ROOT / filename
    with Image.open(path) as image:
        image = image.convert("RGBA")
        image.thumbnail((side, side), Image.Resampling.LANCZOS)
        image.save(path, format="PNG", optimize=True, compress_level=9)
    print(f"Optimized {filename} to {side}px")


for filename, side in TARGETS.items():
    optimize_icon(filename, side)
