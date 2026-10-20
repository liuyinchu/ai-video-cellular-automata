# 简单规则，复杂世界

一支 1920×1080 / 60 fps 的中文元胞自动机科普片。全部制作源码、配音、封面和成片在此远端仓库内。

## 观看与交付

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

远端：`yangshuyun@10.10.10.1`，目录 `~/workspace/dev/ai-video/test-1021-astra`。

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

可运行 `scripts/run.sh node scripts/review-server.cjs`。服务只监听远端 127.0.0.1:18731，支持视频范围请求和章节跳转。通过 SSH 转发该端口后访问 `/output/index.html`。生产源码与素材以远端仓库为准。

## 科学范围

生命游戏中的「生命」是规则名称；本片不声称它模拟了真实生命的全部性质，也不声称宇宙必然是元胞自动机。规则 110 的画面是演化示例，不是 Cook 通用计算证明的完整构造。3Blue1Brown 是视觉语言参考，本片为独立创作，无关联或背书。
