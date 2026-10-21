"""Keep V1 intact; attach its original encoded audio and metadata to V2."""
import json,subprocess,hashlib,zipfile,html,math,os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];os.chdir(ROOT)
if Path('output/v2/.awaiting-polish').exists():
 print('Packaging deferred until the visual repair is complete.');raise SystemExit(0)
FF=str(ROOT/'node_modules/ffmpeg-static/ffmpeg');FP=str(ROOT/'node_modules/ffprobe-static/bin/darwin/arm64/ffprobe')
OUT=Path('output/v2');p=json.loads(Path('src/production-timed.json').read_text())
meta=';FFMETADATA1\ntitle=简单规则，复杂世界 · V2\n'
for c in p['chapters']:meta+=f'\n[CHAPTER]\nTIMEBASE=1/1000\nSTART={round(c["start"]*1000)}\nEND={round(c["end"]*1000)}\ntitle={c["title"]}\n'
(OUT/'chapters.ffmeta').write_text(meta)
def st(t):
 m=round(t*1000);return f'{m//3600000:02}:{m//60000%60:02}:{m//1000%60:02},{m%1000:03}'
(OUT/'subtitles.zh-CN.srt').write_text('\n\n'.join(f'{i+1}\n{st(c["start"])} --> {st(c["end"])}\n{c["text"]}'for i,c in enumerate(p['captions']))+'\n')
def run(args):subprocess.run(args,check=True)
def mux(source,dest,title):
 run([FF,'-nostdin','-y','-hide_banner','-loglevel','warning','-i',str(source),'-i','assets/audio/v1-master.m4a','-f','ffmetadata','-i',str(OUT/'chapters.ffmeta'),'-i',str(OUT/'subtitles.zh-CN.srt'),'-map','0:v:0','-map','1:a:0','-map','3:s:0','-map_metadata','2','-map_chapters','2','-c:v','copy','-c:a','copy','-c:s','mov_text','-metadata','title='+title,'-metadata:s:s:0','language=zho','-disposition:s:0','0','-movflags','+faststart',str(dest)])
def probe(f):return json.loads(subprocess.check_output([FP,'-v','error','-show_streams','-show_format','-show_chapters','-of','json',str(f)]))
def audiohash(f):return subprocess.check_output([FF,'-v','error','-i',str(f),'-map','0:a:0','-c:a','copy','-f','hash','-hash','sha256','-'],text=True).strip()
def pcmhash(f):return subprocess.check_output([FF,'-nostdin','-v','error','-i',str(f),'-map','0:a:0','-c:a','pcm_s16le','-f','hash','-hash','sha256','-'],text=True).strip()
def sha(f):
 h=hashlib.sha256()
 with Path(f).open('rb') as x:
  for b in iter(lambda:x.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
final=OUT/'cellular-world-v2.mp4';preview=OUT/'cellular-world-v2-preview.mp4'
mux(OUT/'cellular-world-v2-render.mp4',final,'简单规则，复杂世界 · V2')
raw=OUT/'review/preview-render.mp4'
if raw.exists():mux(raw,preview,'简单规则，复杂世界 · V2 1080p30 预览')
else:run([FF,'-y','-hide_banner','-loglevel','warning','-i',str(final),'-vf','scale=1920:1080:flags=lanczos,fps=30','-c:v','libx264','-preset','fast','-crf','19','-c:a','copy','-c:s','copy','-map','0:v:0','-map','0:a:0','-map','0:s:0?','-map_chapters','0','-map_metadata','0','-movflags','+faststart',str(preview)])
if Path('output/delivery-manifest.json').exists():
 old_manifest=json.loads(Path('output/delivery-manifest.json').read_text());old_video=next(x for x in old_manifest['artifacts'] if x['path']=='output/cellular-world.mp4');assert sha('output/cellular-world.mp4')==old_video['sha256'],'V1 changed'
audio=audiohash('assets/audio/v1-master.m4a');origin=json.loads(Path('assets/audio/v1-master.provenance.json').read_text());assert audio==origin['audioPacketSHA256']
assert audiohash(final)==audiohash(preview)==audio,'Audio stream was altered'
assert pcmhash(final)==pcmhash(preview)==origin['decodedPCM16SHA256'],'Decoded audio differs from V1'
r=probe(final);v=next(s for s in r['streams'] if s['codec_type']=='video');a=next(s for s in r['streams'] if s['codec_type']=='audio')
refa=next(s for s in probe('assets/audio/v1-master.m4a')['streams'] if s['codec_type']=='audio');assert abs(float(a['start_time'])-float(refa['start_time']))<1e-6;assert abs(float(a['duration'])-float(refa['duration']))<.001
assert (v['width'],v['height'])==(3840,2160);assert v['r_frame_rate']=='60/1';assert int(v['nb_frames'])==math.ceil(p['duration']*60)
assert abs(float(r['format']['duration'])-p['duration'])<.05;assert len(r['chapters'])==10
pr=probe(preview);pv=next(s for s in pr['streams'] if s['codec_type']=='video');assert (pv['width'],pv['height'],pv['r_frame_rate'])==(1920,1080,'30/1')
run([FF,'-hide_banner','-loglevel','error','-xerror','-i',str(final),'-map','0:v:0','-map','0:a:0','-f','null','-'])
events=[json.loads(l)for l in Path('logs/v2/final-render.jsonl').read_text().splitlines() if l.strip()];render=next(e for e in reversed(events)if e['type']=='result');assert render['ok']
verify=[json.loads(l)for l in Path('logs/v2/verify-final.jsonl').read_text().splitlines() if l.strip()];vr=next(e for e in reversed(verify)if e['type']=='result');assert vr['ok']
quality={'version':2,'resolution':[3840,2160],'fps':v['r_frame_rate'],'frames':int(v['nb_frames']),'duration':float(r['format']['duration']),'decodedWithoutErrors':True,'determinism':vr['data'],'motionBlur':render['data']['blurSamples'],'audioStreamSHA256':audio,'audioIdenticalToV1':True,'decodedAudioIdenticalToV1':True,'decodedPCM16SHA256':origin['decodedPCM16SHA256'],'captions':len(p['captions']),'chapters':10,'preview':{'resolution':[1920,1080],'fps':30},'renderer':'Multiplane 0.3.8'}
repair=json.loads((OUT/'repair-audit.json').read_text())if (OUT/'repair-audit.json').exists()else None
if repair and repair['baseJob']==render['jobId']:quality['localRenderRepair']=repair
if 'localRenderRepair' in quality and Path('logs/v2/verify-polish.jsonl').exists():
 quality['additionalDeterminism']=next(json.loads(l)['data'] for l in reversed(Path('logs/v2/verify-polish.jsonl').read_text().splitlines())if json.loads(l)['type']=='result')
(OUT/'quality-report.json').write_text(json.dumps(quality,ensure_ascii=False,indent=2));(OUT/'media-probe.json').write_text(json.dumps(r,ensure_ascii=False,indent=2))
buttons=''.join(f'<button data-time="{c["start"]}"><small>{int(c["start"])//60:02}:{int(c["start"])%60:02}</small>{html.escape(c["title"])}</button>'for c in p['chapters'])
page=Path('scripts/compare-v2.html').read_text().replace('CHAPTERS',buttons)
(OUT/'index.html').write_text(page)
(OUT/'index-portable.html').write_text(page.replace('../cover/t-0.00.png','../cover.png'))
archive=OUT/'cellular-world-v2-source.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=5)as z:
 for d in ['src','scripts','docs','assets']:
  for f in Path(d).rglob('*'):
   if f.is_file()and'__pycache__'not in str(f):z.write(f)
 for f in ['README.md','film.html','film-v2.html','cover.html','cover-v2.html','package.json','package-lock.json','requirements.txt','.gitignore']:z.write(f)
manifest={'version':2,'title':'简单规则，复杂世界 · V2','audioIdenticalToV1':True,'files':[]}
for f in [final,preview,OUT/'cover.png',archive,OUT/'quality-report.json',OUT/'index.html',OUT/'index-portable.html',OUT/'subtitles.zh-CN.srt']:
 manifest['files'].append({'path':str(f),'bytes':f.stat().st_size,'sha256':sha(f)})
(OUT/'delivery-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps({'ok':True,'video':str(final),'sizeBytes':final.stat().st_size,'audioIdenticalToV1':True,'blurSamples':render['data']['blurSamples']},ensure_ascii=False))
