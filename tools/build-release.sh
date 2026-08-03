#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
rm -rf dist
mkdir -p dist/stage
while IFS= read -r entry; do
  entry="${entry%%#*}"
  entry="$(printf "%s" "$entry" | xargs)"
  [[ -z "$entry" ]] && continue
  [[ -e "$entry" ]] || { echo "Missing allow-listed path: $entry" >&2; exit 1; }
  cp -R --parents "$entry" dist/stage/
done < release-allowlist.txt
python -c 'import pathlib,zipfile; stage=pathlib.Path("dist/stage"); out=pathlib.Path("dist/gurps-quickdeck.zip"); files=sorted(p for p in stage.rglob("*") if p.is_file()); assert files, "No release files staged"; archive=zipfile.ZipFile(out,"w",zipfile.ZIP_DEFLATED,compresslevel=9); [archive.write(path,path.relative_to(stage).as_posix()) for path in files]; archive.close(); print(f"Built {out} with {len(files)} files")'
ls -lh dist/gurps-quickdeck.zip
