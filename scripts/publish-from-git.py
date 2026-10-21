#!/usr/bin/env python3
"""Restore a Git-transported backup, verify it, then publish the existing release."""
import argparse, hashlib, json, os, shutil, subprocess, tarfile, urllib.error, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent

def digest(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()

def run(*args):
    return subprocess.check_output(list(args), text=True).strip()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('config', type=Path)
    parser.add_argument('--assemble-only', action='store_true')
    args = parser.parse_args()
    config = json.loads(args.config.read_text())
    repo = config['repository']
    if repo != 'liuyinchu/ai-video-cellular-automata':
        raise SystemExit('Unexpected backup destination')
    transfer = ROOT / 'backup-staging/git-transfer'
    assets = ROOT / 'backup-staging/release-assets'
    transfer.parent.mkdir(parents=True, exist_ok=True)
    assets.mkdir(parents=True, exist_ok=True)
    if not transfer.exists():
        subprocess.run(['git', 'clone', '--depth=1', '--single-branch', '--branch', config['archiveBranch'], f'https://github.com/{repo}.git', str(transfer)], check=True)
    assert run('git', '-C', str(transfer), 'rev-parse', 'HEAD') == config['archiveCommit'], 'Archive commit mismatch'
    manifest_file = transfer / 'manifest.json'
    assert digest(manifest_file) == config['manifestSha256'], 'Transfer manifest mismatch'
    manifest = json.loads(manifest_file.read_text())
    archive = assets / 'full-project-snapshot.tar.gz'
    full_hash = hashlib.sha256()
    total = 0
    with archive.open('wb') as target:
        for chunk in manifest['chunks']:
            assert Path(chunk['file']).name == chunk['file']
            p = transfer / 'chunks' / chunk['file']
            assert p.stat().st_size == chunk['bytes'] and digest(p) == chunk['sha256'], chunk['file']
            with p.open('rb') as source:
                for block in iter(lambda: source.read(1024 * 1024), b''):
                    target.write(block); full_hash.update(block); total += len(block)
    assert total == manifest['bytes'] and full_hash.hexdigest() == manifest['sha256'], 'Complete archive mismatch'
    print(f'Reassembled and verified {total} archive bytes.', flush=True)
    for name in ['backup-inventory.json', 'SHA256SUMS']:
        source = transfer / name
        assert digest(source) == manifest['supportFiles'][name], name
        shutil.copy2(source, assets / name)
    inventory = json.loads((assets / 'backup-inventory.json').read_text())
    expected = {x['path']: x for x in inventory['files']}
    selected = {
        'output/cellular-world.mp4': 'cellular-world-v1.mp4',
        'output/v2/cellular-world-v2.mp4': 'cellular-world-v2.mp4',
        'output/v2/cellular-world-v2-preview.mp4': 'cellular-world-v2-preview.mp4',
        'output/publish/cover-and-description.zip': 'cover-and-description.zip',
    }
    seen = set()
    with tarfile.open(archive, 'r|gz') as tar:
        for member in tar:
            if member.isdir():
                continue
            prefix = 'remote-proj1/'
            assert member.name.startswith(prefix), 'Unexpected archive root'
            rel = member.name[len(prefix):]
            item = expected[rel]
            assert rel not in seen, 'Duplicate archive entry'
            seen.add(rel)
            if member.issym():
                assert item['type'] == 'symlink' and item['target'] == member.linkname, rel
            elif member.islnk():
                target = member.linkname.removeprefix(prefix)
                assert expected[target]['sha256'] == item['sha256'], rel
            elif member.isfile():
                h = hashlib.sha256()
                stream = tar.extractfile(member)
                output = (assets / selected[rel]).open('wb') if rel in selected else None
                try:
                    for block in iter(lambda: stream.read(1024 * 1024), b''):
                        h.update(block)
                        if output:
                            output.write(block)
                finally:
                    if output:
                        output.close()
                assert member.size == item['bytes'] and h.hexdigest() == item['sha256'], rel
            else:
                raise AssertionError(f'Unsupported archive entry: {rel}')
    assert seen == set(expected), 'Missing archive entries'
    wanted = {}
    for line in (assets / 'SHA256SUMS').read_text().splitlines():
        sha, name = line.split('  ', 1)
        assert Path(name).name == name and digest(assets / name) == sha, name
        wanted[name] = sha
    wanted['SHA256SUMS'] = digest(assets / 'SHA256SUMS')
    print(f'Verified every one of {len(seen)} backed-up files and links.', flush=True)
    if args.assemble_only:
        print(f'Restored release assets: {assets}')
        return
    token = os.environ['GH_TOKEN']
    api_root = f'https://api.github.com/repos/{repo}'
    def api(path, method='GET', data=None):
        request = urllib.request.Request(api_root + path, data=json.dumps(data).encode() if data is not None else None, method=method,
            headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28'})
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.load(response)
    tag = config['releaseTag']
    try:
        release = api('/releases/tags/' + tag)
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise
        subprocess.run(['gh', 'release', 'create', tag, '--repo', repo, '--verify-tag', '--draft', '--title', '简单规则，复杂世界？ · V2 正式版', '--notes-file', str(ROOT / 'docs/release-notes.md')], check=True)
        release = api('/releases/tags/' + tag)
    existing = {asset['name']: asset for asset in release['assets']}
    for name, sha in wanted.items():
        if name in existing:
            asset = existing[name]
            assert asset['state'] == 'uploaded' and asset['digest'] == 'sha256:' + sha and asset['size'] == (assets / name).stat().st_size, 'Existing asset mismatch: ' + name
            print('Already uploaded and verified:', name, flush=True)
            continue
        print('Uploading:', name, flush=True)
        subprocess.run(['gh', 'release', 'upload', tag, str(assets / name), '--repo', repo], check=True, timeout=1200)
    release = api('/releases/tags/' + tag)
    online = {asset['name']: asset for asset in release['assets']}
    for name, sha in wanted.items():
        asset = online[name]
        assert asset['state'] == 'uploaded' and asset['digest'] == 'sha256:' + sha and asset['size'] == (assets / name).stat().st_size, 'Uploaded asset mismatch: ' + name
    receipt = {'ok': True, 'repository': repo, 'archiveCommit': config['archiveCommit'], 'snapshotCommit': inventory['gitCommit'], 'verifiedEntries': len(seen), 'snapshotBytes': total,
        'assets': [{'name': name, 'bytes': online[name]['size'], 'sha256': sha, 'url': online[name]['browser_download_url']} for name, sha in wanted.items()]}
    receipt_file = assets / 'backup-verification.json'
    receipt_file.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
    subprocess.run(['gh', 'release', 'upload', tag, str(receipt_file), '--repo', repo, '--clobber'], check=True)
    api('/releases/' + str(release['id']), method='PATCH', data={'draft': False, 'name': '简单规则，复杂世界？ · V2 正式版', 'body': (ROOT / 'docs/release-notes.md').read_text(), 'make_latest': 'true'})
    print('Release published with checksum-verified assets.', flush=True)

if __name__ == '__main__':
    main()
