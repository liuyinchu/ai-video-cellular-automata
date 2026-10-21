"""Apply a frame-aligned V2 range repair using MP4 stream copies.
Usage: python scripts/replace-render-segments.py BASE_JOB PATCH_JOB OUTPUT_MP4
The two successful render logs are logs/v2/final-render.jsonl and polish-render.jsonl.
This works after Multiplane has removed its temporary checkpoint segments.
"""
import sys,json,subprocess,os,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];os.chdir(ROOT)
base_id,patch_id,dest=sys.argv[1:];dest=Path(dest)
FF=str(ROOT/'node_modules/ffmpeg-static/ffmpeg');FP=str(ROOT/'node_modules/ffprobe-static/bin/darwin/arm64/ffprobe')
def result(file):return next(e for e in reversed([json.loads(l) for l in Path(file).read_text().splitlines() if l.strip()])if e['type']=='result')
def probe(file):return json.loads(subprocess.check_output([FP,'-v','error','-show_streams','-show_format','-of','json',str(file)]))
def video(probe):return next(s for s in probe['streams'] if s['codec_type']=='video')
def pts(file):
 out=subprocess.check_output([FP,'-v','error','-select_streams','v:0','-show_packets','-show_entries','packet=pts','-of','csv=p=0',str(file)],text=True)
 return sorted(int(l.strip().split(',')[0])for l in out.splitlines()if l.strip())
b=result('logs/v2/final-render.jsonl');p=result('logs/v2/polish-render.jsonl');assert b['ok']and p['ok'];assert b['jobId']==base_id and p['jobId']==patch_id
bd,pd=b['data'],p['data'];start,end=pd['from'],pd['to'];fps=bd['fps'];assert bd['from']==0
for k in ['fps','width','height','encoder','format']:assert bd[k]==pd[k],f'Incompatible {k}'
assert start%10==0 and end%10==0 and 0<start<end<bd['to']
patch=Path(pd['output']);parts=Path('output/v2/review/repair-parts');parts.mkdir(exist_ok=True)
subprocess.run([FF,'-nostdin','-y','-hide_banner','-loglevel','warning','-i',str(dest),'-map','0:v:0','-c','copy','-f','segment','-segment_times',f'{start},{end}','-segment_time_delta',str(.5/fps),'-reset_timestamps','1',str(parts/'base-%02d.mp4')],check=True)
prefix,middle,suffix=[parts/f'base-{i:02}.mp4'for i in range(3)]
expected=[round(start*fps),round((end-start)*fps),bd['frames']-round(end*fps)]
for f,n in zip([prefix,middle,suffix],expected):assert int(video(probe(f))['nb_frames'])==n,'Boundary is not frame-aligned'
assert int(video(probe(patch))['nb_frames'])==expected[1]
listing=parts/'repair.ffconcat'
# Explicit durations remove the MP4 B-frame presentation offset of the first part.
listing.write_text('ffconcat version 1.0\n'+''.join("file '"+str(f.resolve()).replace("'","'\\''")+f"'\nduration {duration:.12f}\n"for f,duration in[(prefix,start),(patch,end-start),(suffix,expected[2]/fps)]))
tmp=dest.with_name(dest.stem+'.repaired.mp4')
subprocess.run([FF,'-nostdin','-y','-hide_banner','-loglevel','warning','-f','concat','-safe','0','-i',str(listing),'-map','0:v:0','-c','copy','-movflags','+faststart',str(tmp)],check=True)
source_probe=probe(dest);new_probe=probe(tmp);sv=video(source_probe);nv=video(new_probe)
for k in ['nb_frames','width','height','r_frame_rate','time_base','pix_fmt']:assert sv[k]==nv[k],f'Assembly changed {k}'
assert abs(float(new_probe['format']['duration'])-bd['frames']/fps)<.02
assert abs(float(nv['start_time']))<.001
assert pts(dest)==pts(tmp),'Presentation timestamps changed'
backup=Path('output/v2/review/uncorrected-full-render.mp4')
if dest.exists()and not backup.exists():dest.rename(backup)
os.replace(tmp,dest)
audit={'baseJob':base_id,'repairJob':patch_id,'rangeSeconds':[start,end],'reason':'Move explanatory labels out of the live glider paths.','frameCount':int(nv['nb_frames']),'resolution':[nv['width'],nv['height']],'fps':nv['r_frame_rate'],'allPresentationTimestampsPreserved':True,'finalSourceSHA256':hashlib.sha256(Path('src/film-v2.js').read_bytes()).hexdigest(),'assembly':'H.264 stream copy with exact frame boundaries; no rescaling, frame loss or re-encoding','repairOutputCheck':pd['outputCheck']}
Path('output/v2/repair-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2));print(json.dumps(audit,ensure_ascii=False))
