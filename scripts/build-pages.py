#!/usr/bin/env python3
"""Build the static site using locally rendered or checksum-verified release media."""
import argparse, hashlib, json, shutil, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--local', action='store_true', help='Use rendered output instead of GitHub Releases')
args = parser.parse_args()
manifest = json.loads((ROOT / 'site/media-manifest.json').read_text())
out = ROOT / '_site'
if out.exists():
    shutil.rmtree(out)
shutil.copytree(ROOT / 'site', out)
(out / 'media').mkdir()
for item in manifest['files']:
    dest = out / 'media' / item['name']
    if args.local:
        shutil.copy2(ROOT / item['local'], dest)
    else:
        url = f"https://github.com/{manifest['repository']}/releases/download/{manifest['release']}/{item['name']}"
        with urllib.request.urlopen(url, timeout=90) as response, dest.open('wb') as target:
            shutil.copyfileobj(response, target)
    digest = hashlib.sha256()
    with dest.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    if dest.stat().st_size != item['bytes'] or digest.hexdigest() != item['sha256']:
        raise SystemExit(f"Media checksum mismatch: {item['name']}")
    print(f"Verified {item['name']} ({item['bytes']} bytes)")
print(f"Site ready: {out}")
