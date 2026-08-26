from pathlib import Path

from PIL import Image


SOURCE = Path("/home/ubuntu/webdev-static-assets/n64-aurora-icon.png")
TARGETS = {
    "icon.png": 768,
    "splash-icon.png": 512,
    "favicon.png": 96,
    "android-icon-foreground.png": 512,
}
DESTINATION = Path("/home/ubuntu/n64-android-emulator/assets/images")


def optimize_icon(name: str, size: int) -> None:
    with Image.open(SOURCE) as source:
        image = source.convert("RGB")
        image = image.resize((size, size), Image.Resampling.LANCZOS)
        optimized = image.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
        optimized.save(DESTINATION / name, format="PNG", optimize=True, compress_level=9)


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Ícone fonte não encontrado: {SOURCE}")
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for name, size in TARGETS.items():
        optimize_icon(name, size)
        output = DESTINATION / name
        print(f"{name}: {size}x{size}, {output.stat().st_size} bytes")


if __name__ == "__main__":
    main()
