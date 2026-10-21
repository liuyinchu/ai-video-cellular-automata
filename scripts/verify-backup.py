#!/usr/bin/env python3
"""Verify a restored working directory against the complete backup inventory."""
import hashlib, json, sys
from pathlib import Path
root = Path(__file__).resolve().parent.parent
manifest = json.loads(Path(sys.argv[1]).resolve().read_text())
errors = []
for item in manifest['files']:
    p = root / item['path']
    if item['type'] == 'symlink':
        if not p.is_symlink() or str(p.readlink()) != item['target']:
            errors.append(item['path'])
    elif not p.is_file() or p.stat().st_size != item['bytes']:
        errors.append(item['path'])
    else:
        h = hashlib.sha256()
        with p.open('rb') as f:
            for block in iter(lambda: f.read(1024 * 1024), b''):
                h.update(block)
        if h.hexdigest() != item['sha256']:
            errors.append(item['path'])
if errors:
    print('Verification failed:', '\n'.join(errors))
    raise SystemExit(1)
print(f"Verified {len(manifest['files'])} files and links.")
