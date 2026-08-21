"""Reduce native MIA icon assets while preserving their square composition."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "images"
SOURCE = ASSETS / "mia-logo.png"
TARGETS = [
    "icon.png",
    "splash-icon.png",
    "favicon.png",
    "android-icon-background.png",
    "android-icon-foreground.png",
    "android-icon-monochrome.png",
    "mia-logo.png",
]
MAX_SIDE = 512


def optimize(target: Path, source: Image.Image) -> None:
    image = source.copy()
    image.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
    image.save(target, format="PNG", optimize=True, compress_level=9)
    size = target.stat().st_size
    if size >= 1_000_000:
        raise RuntimeError(f"{target.name} remains too large: {size} bytes")


def main() -> None:
    with Image.open(SOURCE) as original:
        source = original.convert("RGBA")
    for filename in TARGETS:
        optimize(ASSETS / filename, source)
    print("Optimized", ", ".join(TARGETS))


if __name__ == "__main__":
    main()
