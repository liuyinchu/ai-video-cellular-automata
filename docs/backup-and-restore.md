# 完整工程备份与恢复

GitHub 仓库保存全部源码、素材和 V1/V2 的 Git 提交历史。`v2.0.0` Release 同时保存最终视频与完整工作目录快照。完整快照包含原始工作目录中的隐藏文件、Git 历史、音频母带与分轨、渲染输出、审核图、日志、Node/Python 依赖和模型缓存。它与仅包含受 Git 跟踪文件的 GitHub 自动 Source code 下载不同。

## 下载与检查

下载 Release 中以下文件并放在同一目录：

- `full-project-snapshot.tar.gz`
- `backup-inventory.json`
- `SHA256SUMS`

使用 `shasum -a 256 -c SHA256SUMS` 检查下载内容。该校验清单也包含同一 Release 的独立成片与封面附件；如果未下载全部附件，可只检查快照对应的一行。

## 恢复

```sh
mkdir restored-cellular-world
tar -xzf full-project-snapshot.tar.gz -C restored-cellular-world
cd restored-cellular-world/remote-proj1
python3 scripts/verify-backup.py ../../backup-inventory.json
```

`verify-backup.py` 逐项检查快照内常规文件的长度及 SHA-256，并检查符号链接目标。依赖目录来自 macOS ARM64，并不保证能在其他系统直接运行；跨平台复现时按 README 重新执行 `npm ci` 和 Python 虚拟环境安装。

`_site/` 是可重建的部署目录，不纳入完整快照；网页源文件和完整视频已在快照中。备份生成期间的新校验清单与上传收据单独保存，避免归档包含自身。

## 发布

静态页面使用同仓库的 Release 视频，并在 GitHub Actions 中逐项核对 `site/media-manifest.json` 后部署。复现 V2 时运行 `scripts/run.sh npm run render:v2`。旧版输出与源码完整保留。
