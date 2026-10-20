"""Transcribe the generated narration, align the authored script, and snap chapters to 129 BPM."""
import os,json,re,math,wave,difflib,subprocess
from pathlib import Path
import numpy as np
os.environ['HF_HUB_DISABLE_XET']='1'
os.environ['HF_HUB_DOWNLOAD_TIMEOUT']='120'
from faster_whisper import WhisperModel
from opencc import OpenCC
cc=OpenCC("t2s")
ROOT=Path(__file__).resolve().parents[1];os.chdir(ROOT)
p=json.loads(Path('src/production.json').read_text());b=60/p['bpm'];cursor=0;captions=[]
Path('output/alignment').mkdir(exist_ok=True)
model=None

def clean(s):
    s=cc.convert(s)
    s=s.replace('110','一百一十').replace('90','九十').replace('30','三十')
    s=s.translate(str.maketrans('0123456789','零一二三四五六七八九'))
    return ''.join(c for c in s if '\u4e00'<=c<='\u9fff' or c.isalnum())

def duration(path):
    with wave.open(str(path)) as w:return w.getnframes()/w.getframerate()

def chunks(text):
    out=[];acc='';start=0;pos=0
    for m in re.finditer(r'[^，。！？；：、]+[，。！？；：、]?',text):
        part=m.group()
        if acc and len(acc)+len(part)>23:out.append((start,pos,acc));acc='';start=pos
        acc+=part;pos=m.end()
        if len(acc)>=12 or (len(acc)>=6 and part[-1] in '。！？'):
            out.append((start,pos,acc));acc='';start=pos
    if acc:out.append((start,pos,acc))
    return out

cue_phrases=[['看这五个','再换一个起点','问题是','让我们从一个格子'],['两种状态','只能读取附近','同时更新','离散的空间','康威生命游戏'],['周围八格','两个或三个','少于两个','多于三个','一个灭格','恰好三个','别急着','先用旧棋盘','再一起切换'],['每一格都','换成横着','横线变成竖线','再走一步','周期为二','你看'],['让我们慢慢','一，二，三，四','形状回来了','继续重复','仔细看','就像球场','局部的变化'],['每隔三十代','有没有滑翔机','精心组合','这里的关键'],['把世界压成','三个位置','八种情况','比如规则九十','从一个亮点','三角形里'],['规则三十','一边整齐','没有掷骰子','相同的起点','但确定','规则的长度'],['重复的背景','数学家','合适的初始配置','这里展示的','真正令人惊讶'],['静止','摆动','移动','生长','甚至计算','涌现','当然','它给我们的','世界']]
for i,c in enumerate(p['chapters']):
    fp=Path(c['audio']);dur=duration(fp);cache=Path(f'output/alignment/{i+1:02}-aligned-asr.json')
    if cache.exists():raw=json.loads(cache.read_text())
    else:
        if model is None:model=WhisperModel('small',device='cpu',compute_type='int8',cpu_threads=4,download_root='.cache/whisper')
        audio=np.frombuffer(subprocess.check_output(['node_modules/ffmpeg-static/ffmpeg','-hide_banner','-loglevel','error','-i',str(fp),'-af','volume=4','-ar','16000','-ac','1','-f','f32le','pipe:1']),dtype='<f4').copy()
        segs,info=model.transcribe(audio,language='zh',word_timestamps=True,beam_size=3,condition_on_previous_text=False,vad_filter=False,no_speech_threshold=None,log_prob_threshold=None,compression_ratio_threshold=None,chunk_length=15)
        raw=[{'start':s.start,'end':s.end,'text':s.text,'words':[{'start':w.start,'end':w.end,'text':w.word}for w in s.words]}for s in segs]
        cache.write_text(json.dumps(raw,ensure_ascii=False,indent=2))
    chars=[];starts=[];ends=[]
    for seg in raw:
        for w in seg['words']:
            ss=clean(w['text']);n=len(ss)
            for j,ch in enumerate(ss):chars.append(ch);starts.append(w['start']+(w['end']-w['start'])*j/max(n,1));ends.append(w['start']+(w['end']-w['start'])*(j+1)/max(n,1))
    expected=clean(c['text']);actual=''.join(chars);match=difflib.SequenceMatcher(None,expected,actual,autojunk=False)
    mapping={}
    for block in match.get_matching_blocks():
        for j in range(block.size):mapping[block.a+j]=block.b+j
    idx=sorted(mapping)
    if not idx:raise RuntimeError('No aligned words in chapter '+str(i+1))
    cs=np.interp(np.arange(len(expected)),idx,[starts[mapping[j]]for j in idx]);ce=np.interp(np.arange(len(expected)),idx,[ends[mapping[j]]for j in idx]);cs=np.maximum.accumulate(cs);ce=np.maximum.accumulate(ce)
    lead=4*b if i in (0,9) else 6*b;tail=8*b if i==9 else 2*b
    span=math.ceil((lead+dur+tail)/(4*b))*4*b;voiceStart=cursor+lead
    c.update(start=cursor,end=cursor+span,duration=span,voiceStart=voiceStart,audioDuration=dur,alignmentCoverage=round(len(mapping)/len(expected),4),cues={})
    for phrase in cue_phrases[i]:
        ix=c['text'].find(phrase)
        if ix>=0:c['cues'][phrase]=round(lead+float(cs[len(clean(c['text'][:ix]))]),3)
    if i==4:
        ix=c['text'].index('一，二，三，四');jj=len(clean(c['text'][:ix]));c['countSteps']=[round(lead+float(cs[jj+j]),3)for j in range(4)]
    for a,z,ss in chunks(c['text']):
        a1=len(clean(c['text'][:a]));z1=len(clean(c['text'][:z]));st=float(cs[min(a1,len(cs)-1)]);en=float(ce[min(z1-1,len(ce)-1)])
        captions.append({'start':round(voiceStart+max(0,st-.06),3),'end':round(voiceStart+en+.14,3),'text':ss.strip('，。！？；：、'),'chapter':i+1})
    cursor+=span
    print(f'{i+1:02}: voice {dur:.2f}s, chapter {span:.2f}s, alignment {c["alignmentCoverage"]:.1%}, cues {c["cues"]}',flush=True)
for j in range(len(captions)-1):captions[j]['end']=min(captions[j]['end'],captions[j+1]['start']-.025)
p.update(duration=round(cursor,6),captions=captions)
Path('src/production-timed.json').write_text(json.dumps(p,ensure_ascii=False,indent=2));Path('src/production-timed.js').write_text('window.PRODUCTION = '+json.dumps(p,ensure_ascii=False)+';\n')
def stamp(s):
    ms=round(s*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
Path('output/subtitles.zh-CN.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(c["start"])} --> {stamp(c["end"])}\n{c["text"]}'for i,c in enumerate(captions))+'\n')
print(f'FINAL: {cursor:.3f} seconds, {len(captions)} captions',flush=True)
