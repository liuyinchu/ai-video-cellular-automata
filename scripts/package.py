"""Package a rendered film with chapter metadata, optional soft captions and a local review page."""
import os,json,subprocess,hashlib,zipfile,html,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];os.chdir(ROOT)
p=json.loads(Path('src/production-timed.json').read_text());FF=str(ROOT/'node_modules/ffmpeg-static/ffmpeg');FP=str(ROOT/'node_modules/ffprobe-static/bin/darwin/arm64/ffprobe')
meta=';FFMETADATA1\ntitle='+p['title']+'\nartist=Independent mathematical film\ncomment=Original procedural animation and score; MiniMax synthetic narration.\n'
for c in p['chapters']:meta+=f'\n[CHAPTER]\nTIMEBASE=1/1000\nSTART={round(c["start"]*1000)}\nEND={round(c["end"]*1000)}\ntitle={c["title"]}\n'
Path('output/chapters.ffmeta').write_text(meta)
subprocess.run([FF,'-y','-hide_banner','-loglevel','warning','-i','output/cellular-world-render.mp4','-f','ffmetadata','-i','output/chapters.ffmeta','-i','output/subtitles.zh-CN.srt','-i','output/master.wav','-map','0:v:0','-map','3:a:0','-map','2:s:0','-map_metadata','1','-map_chapters','1','-c:v','copy','-c:a','aac','-b:a','320k','-c:s','mov_text','-metadata:s:s:0','language=zho','-metadata:s:s:0','title=简体中文（画面已含字幕）','-disposition:s:0','0','-movflags','+faststart','output/cellular-world.mp4'],check=True)
probe=json.loads(subprocess.check_output([FP,'-v','error','-show_streams','-show_format','-show_chapters','-of','json','output/cellular-world.mp4']))
Path('output/media-probe.json').write_text(json.dumps(probe,ensure_ascii=False,indent=2))
v=next(s for s in probe['streams']if s['codec_type']=='video');a=next(s for s in probe['streams']if s['codec_type']=='audio')
assert(v['width'],v['height'])==(1920,1080)
assert v['r_frame_rate']=='60/1'
assert abs(float(probe['format']['duration'])-p['duration'])<.1
assert a['channels']==2 and a['sample_rate']=='48000'
assert len(probe['chapters'])==10
assert min(c['alignmentCoverage']for c in p['chapters'])>.85
assert all(c['end']>c['start']for c in p['captions'])
# Verify the encoded delivery itself, including audio true peak after AAC encoding.
subprocess.run([FF,'-hide_banner','-loglevel','error','-xerror','-i','output/cellular-world.mp4','-map','0:v:0','-map','0:a:0','-f','null','-'],check=True)
r=subprocess.run([FF,'-hide_banner','-i','output/cellular-world.mp4','-vn','-af','loudnorm=I=-16:TP=-1.2:LRA=9:print_format=json','-f','null','-'],stderr=subprocess.PIPE,text=True,check=True)
m=re.search(r'\{\s*"input_i".*?\}',r.stderr,re.S);encoded_loudness=json.loads(m.group())
assert abs(float(encoded_loudness['input_i'])+16)<.6
assert float(encoded_loudness['input_tp'])<0
quality={'decode':'passed','videoFrames':int(v['nb_frames']),'fps':v['r_frame_rate'],'resolution':[v['width'],v['height']],'duration':probe['format']['duration'],'audioCodec':a['codec_name'],'audioBitrate':a.get('bit_rate'),'audioIntegratedLUFS':encoded_loudness['input_i'],'audioTruePeakDBTP':encoded_loudness['input_tp'],'audioLoudnessRangeLU':encoded_loudness['input_lra'],'captions':len(p['captions']),'chapters':len(p['chapters']),'minimumAlignmentCoverage':min(c['alignmentCoverage']for c in p['chapters'])}
Path('output/quality-report.json').write_text(json.dumps(quality,ensure_ascii=False,indent=2))

def timestamp(t):return f'{int(t)//60:02}:{int(t)%60:02}'
chapter_md='\n'.join(f'- {timestamp(c["start"])} {c["title"]}'for c in p['chapters'])
Path('docs/chapters.md').write_text('# 章节时间\n\n'+chapter_md+'\n')
Path('docs/script-and-storyboard.md').write_text('# '+p['title']+'\n\n总长：'+timestamp(p['duration'])+'；1920×1080，60 fps，129 BPM。\n\n'+'\n\n'.join(f'## {c["id"]:02} · {c["title"]} · {timestamp(c["start"])}\n\n{c["text"]}\n\n画面：{c["storyboard"]}\n\n旁白入点：{c["voiceStart"]:.3f}s；章节区间：{c["start"]:.3f}–{c["end"]:.3f}s。'for c in p['chapters']))
artifacts=['output/cellular-world.mp4','output/cover/t-0.00.png','output/subtitles.zh-CN.srt','output/master.wav','output/stems/narration.wav','output/stems/music-129bpm.wav','output/stems/sound-design.wav']
manifest={'title':p['title'],'duration':p['duration'],'video':{'width':1920,'height':1080,'fps':60},'bpm':129,'renderer':'Multiplane 0.3.8','voice':p['voice'],'chapters':[{'title':c['title'],'start':c['start']}for c in p['chapters']],'artifacts':[]}
for name in artifacts:
    q=Path(name);h=hashlib.sha256()
    with q.open('rb')as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
    manifest['artifacts'].append({'path':name,'bytes':q.stat().st_size,'sha256':h.hexdigest()})
Path('output/delivery-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
buttons=''.join(f'<button data-time="{c["start"]}"><span>{timestamp(c["start"])}</span>{html.escape(c["title"])}</button>'for c in p['chapters'])
page='''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>简单规则，复杂世界 · 成片</title><style>
*{box-sizing:border-box}body{margin:0;background:#0b0e14;color:#f4f2e9;font-family:system-ui,-apple-system,'PingFang SC',sans-serif;line-height:1.7}main{max-width:1320px;padding:46px 30px 70px;margin:auto}header{display:flex;align-items:end;justify-content:space-between;margin-bottom:26px;gap:25px}.eyebrow{font-size:12px;letter-spacing:.2em;color:#58c4dd}h1{font-size:clamp(26px,4vw,42px);letter-spacing:-.04em;line-height:1.2;margin:12px 0}p{color:#94a3b5;margin:12px 0}.spec{white-space:nowrap;font-size:13px;color:#94a3b5}video{width:100%;display:block;background:#000;box-shadow:0 20px 80px #0006;border:1px solid #29343e;border-radius:8px}.links{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0 32px}a{color:#58c4dd;text-decoration:none}a:hover{text-decoration:underline}.links a{border:1px solid #30404b;padding:9px 17px;border-radius:5px;font-size:14px}.links a:first-child{background:#58c4dd;color:#0b0e14;font-weight:600;border-color:#58c4dd}.chapters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:#23303a;border:1px solid #23303a;border-radius:6px;overflow:hidden}button{border:0;background:#10161e;color:#d4dbe3;text-align:left;font:inherit;padding:15px 20px;cursor:pointer}button:hover{background:#1a2833;color:#f6d65c}button span{font:13px monospace;color:#58c4dd;margin-right:18px}details{margin-top:30px;border-top:1px solid #23303a;padding-top:20px;color:#94a3b5;font-size:14px}summary{cursor:pointer;color:#d4dbe3}.credits{max-width:900px}.art{width:min(100%,700px);margin-top:16px;border:1px solid #23303a;border-radius:5px}.fine{font-size:12px;color:#718095}footer{margin-top:28px;color:#718095;font-size:12px}@media(max-width:700px){header{display:block}.chapters{grid-template-columns:1fr}main{padding:24px 16px}button{padding:13px}.spec{white-space:normal}}
</style></head><body><main><header><div><div class="eyebrow">CELLULAR AUTOMATA · A MATHEMATICAL FILM</div><h1>简单规则，复杂世界。</h1><p>从五个格子出发，沿一面不断展开的数学墙，走向涌现。</p></div><div class="spec">05:55 / 1080p / 60 fps / 129 BPM</div></header><video id="film" controls preload="metadata" poster="cover/t-0.00.png" src="cellular-world.mp4"></video><nav class="links"><a href="cellular-world.mp4" download>下载完整成片</a><a href="cover/t-0.00.png" download>4K 封面</a><a href="subtitles.zh-CN.srt" download>中文字幕</a><a href="cellular-world-source.zip" download>完整制作工程</a><a href="master.wav" download>混音母带</a></nav><div class="chapters">CHAPTER_BUTTONS</div><details><summary>制作说明与科学来源</summary><div class="credits"><p>每一个元胞状态均由真实规则计算。Multiplane 逐帧渲染连续画面；MiniMax speech-2.8-hd「温润青年」提供中文合成旁白。129 BPM 配乐和音效全部原创程序合成，混音目标 -16 LUFS、-1.2 dBTP。</p><p>生命游戏是数学模型。规则 110 的画面展示演化纹理，不代表通用计算证明的完整构造。</p><p><a href="../docs/script-and-storyboard.md">台本与分镜</a> · <a href="../docs/publishing.md">发布文案</a> · <a href="../docs/science-and-sources.md">科学来源与边界</a> · <a href="delivery-manifest.json">交付清单与校验值</a></p><p><a href="stems/narration.wav" download>旁白分轨</a> · <a href="stems/music-129bpm.wav" download>音乐分轨</a> · <a href="stems/sound-design.wav" download>音效分轨</a></p></div></details><details><summary>可选宣传意象图</summary><p>内置 imagegen 生成的封面素材。主视频和上方主封面使用可核验的数学演化数据。</p><img class="art" src="../assets/artwork/cover-atmosphere.png" alt="元胞自动机的生成式宣传意象"><p class="fine"><a href="../docs/imagegen-prompt.md">完整提示词与素材说明</a></p></details><footer>独立制作 · 2026-10-21 · 旁白为 AI 合成。视觉参考数学动画的几何语言，无第三方关联或背书。</footer></main><script>const v=document.getElementById('film');document.querySelectorAll('[data-time]').forEach(b=>b.addEventListener('click',()=>{v.currentTime=Number(b.dataset.time);v.play();v.scrollIntoView({behavior:'smooth',block:'center'})}));</script></body></html>'''.replace('CHAPTER_BUTTONS',buttons)
Path('output/index.html').write_text(page)
with zipfile.ZipFile('output/cellular-world-source.zip','w',zipfile.ZIP_DEFLATED,compresslevel=5)as z:
    for d in ['src','scripts','docs','assets']:
        for f in Path(d).rglob('*'):
            if f.is_file()and'__pycache__'not in str(f):z.write(f)
    for f in ['README.md','film.html','cover.html','package.json','package-lock.json','requirements.txt','.gitignore']:z.write(f)
print('Packaged final MP4, 10 chapters, 107 captions, review page, source archive and SHA256 manifest.')
print(json.dumps({'duration':probe['format']['duration'],'streams':[(s['codec_type'],s['codec_name'])for s in probe['streams']],'bytes':Path('output/cellular-world.mp4').stat().st_size},ensure_ascii=False))
