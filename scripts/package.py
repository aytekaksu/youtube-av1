"""Build a ready-to-load ZIP using only the Python standard library."""
from pathlib import Path
import json
import sys
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parent.parent
version = json.loads((root / "manifest.json").read_text())["version"]
output = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else root / "work" / "packages"
output.mkdir(parents=True, exist_ok=True)
archive = output / f"youtube-av1-{version}.zip"
files = [root / name for name in ("manifest.json", "INSTALL.txt", "LICENSE", "NOTICE.md")]
for folder in ("assets", "popup", "src"):
    files.extend(p for p in (root / folder).rglob("*") if p.is_file())
with ZipFile(archive, "w", compression=ZIP_DEFLATED) as bundle:
    for source in sorted(files):
        bundle.write(source, "youtube-av1/" + source.relative_to(root).as_posix())
print(archive)
