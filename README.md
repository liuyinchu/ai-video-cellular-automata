# 简单规则，复杂世界

一支 5 分 55 秒的中文元胞自动机科普片。正式成片为 V2：3840×2160、60 fps。源码、台本、配音素材与渲染管线保留在仓库；成片、音频分轨和完整工作目录快照保存在同仓库的 Releases。

**[观看成片与同步对比](https://liuyinchu.github.io/ai-video-cellular-automata/)** · **[下载与完整备份](https://github.com/liuyinchu/ai-video-cellular-automata/releases/tag/v2.0.0)**

![发布封面](site/assets/cover.jpg)

## 正式发布

- V2 4K60：Release 附件 `cellular-world-v2.mp4`
- V2 1080p30：Release 附件 `cellular-world-v2-preview.mp4`
- V1 1080p60：Release 附件 `cellular-world-v1.mp4`
- 发布封面、简介、章节与标签：`cover-and-description.zip`
- 完整工程快照与校验文件：见 [备份与恢复说明](docs/backup-and-restore.md)
- 发布页面源码：`site/`；部署工作流：`.github/workflows/pages.yml`

网页默认观看 V2，展开「探索 V1 / V2 的动画变化」即可拖动分界线同步对比。影片和压缩包从 Releases 提供；Pages 部署时会校验并复制三份视频，所以网站不依赖任何本地服务。

## 原始 V1 交付目录

- 最终视频：`output/cellular-world.mp4`
- 观看页面：`output/index.html`
- 4K 封面：`output/cover/t-0.00.png`
- 字幕：`output/subtitles.zh-CN.srt`
- 混音母带：`output/master.wav`
- 分轨：`output/stems/`（旁白、129 BPM 原创程序配乐、音效）
- 台本 / 分镜：`docs/script-and-storyboard.md`
- 发布文案：`docs/publishing.md`
- 科学核查：`docs/science-and-sources.md`

## 制作方法

Multiplane 0.3.8 使用 Chromium 和 FFmpeg 逐帧渲染 `film.html`。`src/film.js` 把整片画在同一个二维世界中，镜头在世界坐标里连续运动。画面仅由时间参数决定，不依赖播放历史。所有元胞状态在固定规则下预计算；显示插值只是帮助阅读的过渡。数学与状态不由生成式图像提供。

生命游戏使用无界稀疏集合与同步双缓冲更新。一维规则使用 513 格、256 代的因果锥，边界不影响显示的演化。主封面由真实规则 90 渲染；`assets/artwork/cover-atmosphere.png` 是 imagegen 生成的可选宣传意象图，不作为科学模拟证据。

旁白在 Chrome 的 MiniMax Audio 网站逐段生成，模型 speech-2.8-hd，音色「温润青年」，语速 1。原始 WAV 位于 `assets/audio/`。Faster Whisper 在本机转写后与原始台本逐字匹配，生成字幕与动作标记；实际文本仍以人工写定的台本为准。

配乐全部由 `scripts/soundtrack.py` 合成：软音色拨弦、正弦和弦、低频脉冲、噪声呼吸与玻璃音。无外部乐曲、无采样循环。配乐和转场共享 129 BPM 的时间网格，人声触发音乐自动衰减。双遍 loudnorm 目标为 -16 LUFS / -1.2 dBTP，48 kHz 立体声母带。

## 复现

克隆仓库后安装依赖，或从 Release 恢复完整工作目录。完整快照中的依赖来自 macOS ARM64，跨平台使用时应重新安装依赖。

需要 Node.js ≥24、Python ≥3.9。已安装的环境可直接使用：

```sh
scripts/run.sh npm test
scripts/run.sh npx multiplane lint film.html --json
scripts/run.sh npx multiplane inspect film.html --json
.venv/bin/python scripts/align.py
.venv/bin/python scripts/soundtrack.py
scripts/render-final.sh
```

首次安装：

```sh
npm ci
npx playwright install chromium
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

`npm` 项目依赖中的 ffmpeg-static 提供 FFmpeg，`scripts/run.sh` 只给当前命令设置路径，不修改系统配置。Mac Homebrew Node 24 的路径兼容逻辑也在该脚本中。

```sh
scripts/run.sh npx multiplane serve --port 18721
scripts/run.sh npx multiplane stills film.html --at 15,80,150,220,290 --out output/review/custom --json
```

渲染工作以约十秒分段保存。如被中断，可从 `logs/final-render.jsonl` 找到 jobId 后运行 `scripts/run.sh npx multiplane resume <jobId> --json`。先修改画面再续渲会被拒绝，此时应重新完整渲染。

## 成片观看服务

可运行 `scripts/run.sh node scripts/review-server.cjs`。服务只监听远端 127.0.0.1:18731，支持视频范围请求和章节跳转。通过 SSH 转发该端口后访问 `/output/index.html`。正式观看使用上方的 GitHub Pages 地址，预览服务仅供开发时临时启动。

## 科学范围

生命游戏中的「生命」是规则名称；本片不声称它模拟了真实生命的全部性质，也不声称宇宙必然是元胞自动机。规则 110 的画面是演化示例，不是 Cook 通用计算证明的完整构造。3Blue1Brown 是视觉语言参考，本片为独立创作，无关联或背书。


## V2 连续生长版

`film-v2.html` 是独立入口，保留 V1 源码及全部音频。4K60 成片与同步对比页位于 `output/v2/`。视觉交接设计、音频无损沿用方式和复现命令见 [V2 连续性说明](docs/v2-continuity.md)。

```sh
scripts/run.sh npm run test:v2
scripts/run.sh npm run render:v2
```

## 网站部署

GitHub Pages 使用 GitHub Actions 发布。发布 Release 会触发部署；也可在 Actions 的 **Publish film website** 中手动运行。

```sh
# 从 Release 下载并逐文件验证视频 SHA-256，生成 _site/
python3 scripts/build-pages.py
# 已有完整工程输出时，可使用本地成片
python3 scripts/build-pages.py --local
# 临时本地预览（支持视频字节范围请求）
scripts/run.sh node scripts/serve-pages.cjs
```

页面、字幕和封面在 `site/`；视频大小及校验值在 `site/media-manifest.json`。部署只包含网页需要的内容，完整工程保存在 Release 附件中。

## Git 完整备份

`main` 保存制作源码与发布管线；`archive/v2.0.0` 保存完整工作目录快照的 48 MiB 分块。只需源码时，使用：

```sh
git clone --single-branch --branch main https://github.com/liuyinchu/ai-video-cellular-automata.git
```

GitHub Actions 根据 `delivery/ready.json` 锁定归档提交，校验每块、完整压缩包以及包内全部文件，再上传 Release 并部署 Pages。它不依赖本地浏览器上传或本地运行的服务。

也可以仅从 Git 恢复 Release 文件，不需要 GitHub 写入凭据：

```sh
python3 scripts/publish-from-git.py delivery/ready.json --assemble-only
```
