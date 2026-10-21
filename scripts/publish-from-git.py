#!/usr/bin/env python3
"""Restore a Git-transported backup, verify it, then publish the existing release."""
import argparse, hashlib, json, os, shutil, subprocess, tarfile, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
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
    transfer.mkdir(parents=True, exist_ok=True)
    (transfer / 'chunks').mkdir(exist_ok=True)
    base_url = f"https://raw.githubusercontent.com/{repo}/{config['archiveCommit']}"
    def fetch(relative, expected_hash):
        destination = transfer / relative
        if destination.exists() and digest(destination) == expected_hash:
            return relative
        temporary = destination.with_suffix(destination.suffix + '.partial')
        for attempt in range(3):
            try:
                with urllib.request.urlopen(base_url + '/' + relative, timeout=90) as response, temporary.open('wb') as target:
                    shutil.copyfileobj(response, target, 1024 * 1024)
                assert digest(temporary) == expected_hash, 'Download checksum mismatch: ' + relative
                temporary.replace(destination)
                return relative
            except (OSError, AssertionError):
                if attempt == 2:
                    raise
                time.sleep(2 ** attempt)
    fetch('manifest.json', config['manifestSha256'])
    manifest_file = transfer / 'manifest.json'
    manifest = json.loads(manifest_file.read_text())
    for name, sha in manifest['supportFiles'].items():
        assert Path(name).name == name
        fetch(name, sha)
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = []
        for chunk in manifest['chunks']:
            assert Path(chunk['file']).name == chunk['file']
            futures.append(pool.submit(fetch, 'chunks/' + chunk['file'], chunk['sha256']))
        for count, future in enumerate(as_completed(futures), 1):
            future.result()
            print(f"Downloaded and verified {count}/{len(futures)} Git backup chunks.", flush=True)
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
    # gh resolves a draft's pending tag with GraphQL, then returns its REST ID.
    lookup = subprocess.run(['gh', 'release', 'view', tag, '--repo', repo, '--json', 'databaseId'], capture_output=True, text=True)
    if lookup.returncode == 0:
        release_id = json.loads(lookup.stdout)['databaseId']
        release = api('/releases/' + str(release_id))
    elif 'release not found' in lookup.stderr.lower():
        release = api('/releases', method='POST', data={'tag_name': tag, 'name': '简单规则，复杂世界？ · V2 正式版', 'draft': True, 'body': (ROOT / 'docs/release-notes.md').read_text()})
    else:
        raise RuntimeError('Release lookup failed: ' + lookup.stderr)
    for duplicate in api('/releases?per_page=100'):
        created_here = duplicate['author']['login'] == 'github-actions[bot]' or duplicate['html_url'].endswith('/untagged-4416341ef25d549c3b3d')
        if duplicate['id'] != release['id'] and duplicate['draft'] and not duplicate['assets'] and duplicate['name'] == '简单规则，复杂世界？ · V2 正式版' and created_here:
            request = urllib.request.Request(api_root + '/releases/' + str(duplicate['id']), method='DELETE', headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json'})
            with urllib.request.urlopen(request, timeout=60) as response:
                assert response.status == 204
    print('Using release ID:', release['id'], flush=True)
    existing = {asset['name']: asset for asset in release['assets']}
    for name, sha in wanted.items():
        if name in existing:
            asset = existing[name]
            assert asset['state'] == 'uploaded' and asset['digest'] == 'sha256:' + sha and asset['size'] == (assets / name).stat().st_size, 'Existing asset mismatch: ' + name
            print('Already uploaded and verified:', name, flush=True)
            continue
        print('Uploading:', name, flush=True)
        subprocess.run(['gh', 'release', 'upload', tag, str(assets / name), '--repo', repo], check=True, timeout=1200)
    release = api('/releases/' + str(release['id']))
    online = {asset['name']: asset for asset in release['assets']}
    for name, sha in wanted.items():
        asset = online[name]
        assert asset['state'] == 'uploaded' and asset['digest'] == 'sha256:' + sha and asset['size'] == (assets / name).stat().st_size, 'Uploaded asset mismatch: ' + name
    receipt = {'ok': True, 'repository': repo, 'archiveCommit': config['archiveCommit'], 'snapshotCommit': inventory['gitCommit'], 'verifiedEntries': len(seen), 'snapshotBytes': total,
        'assets': [{'name': name, 'bytes': online[name]['size'], 'sha256': sha, 'url': online[name]['browser_download_url']} for name, sha in wanted.items()]}
    receipt_file = assets / 'backup-verification.json'
    receipt_file.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
    subprocess.run(['gh', 'release', 'upload', tag, str(receipt_file), '--repo', repo, '--clobber'], check=True)
    api('/releases/' + str(release['id']), method='PATCH', data={'tag_name': tag, 'draft': False, 'name': '简单规则，复杂世界？ · V2 正式版', 'body': (ROOT / 'docs/release-notes.md').read_text(), 'make_latest': 'true'})
    print('Release published with checksum-verified assets.', flush=True)

if __name__ == '__main__':
    main()
