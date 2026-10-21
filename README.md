# V2 complete project archive

This branch preserves the complete production work directory as 48 MiB binary chunks. Source code is on `main`. The complete archive is also published as `full-project-snapshot.tar.gz` in release `v2.0.0`.

Each part and the assembled archive are covered by `manifest.json`; `backup-inventory.json` covers every file and symlink inside the snapshot. Use `scripts/publish-from-git.py delivery/ready.json --assemble-only` from the main branch to restore and verify the backup.
