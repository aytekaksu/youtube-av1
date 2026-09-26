"""Package the compiled extension. Run npm run build first."""
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
files.extend((root / "assets").glob("*.png"))
files.extend(root / name for name in (
    "assets/logo.svg", "popup/popup.html", "popup/popup.css", "popup/popup.js",
    "src/background.js", "src/force-av1.js", "src/reset-av1.js",
))
for source in files:
    if not source.is_file():
        raise SystemExit(f"Missing {source.name}. Run npm run build first.")
with ZipFile(archive, "w", compression=ZIP_DEFLATED) as bundle:
    for source in sorted(files):
        bundle.write(source, "youtube-av1/" + source.relative_to(root).as_posix())
print(archive)
