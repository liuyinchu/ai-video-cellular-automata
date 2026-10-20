"""Original 129 BPM score, event sound design, narration assembly and EBU R128 mastering.
No samples, loops, or external music. All instruments synthesized numerically.
"""
import json,math,subprocess,wave,re,os
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1];os.chdir(ROOT)
p=json.loads(Path('src/production-timed.json').read_text());SR=48000;B=60/p['bpm'];D=p['duration'];N=int(math.ceil(D*SR));FF=str(ROOT/'node_modules/ffmpeg-static/ffmpeg');rng=np.random.default_rng(1021)
Path('output/stems').mkdir(parents=True,exist_ok=True)
voice=np.zeros(N,dtype=np.float32);music=np.zeros((N,2),dtype=np.float32);sfx=np.zeros_like(music)

def add(buf,at,a,gain=1,pan=0):
    st=round(at*SR);clip=max(0,-st);st=max(0,st);n=min(len(a)-clip,len(buf)-st)
    if n<=0:return
    a=a[clip:clip+n]*gain
    if buf.ndim==1:buf[st:st+n]+=a
    else:
        buf[st:st+n,0]+=a*np.sqrt((1-pan)/2);buf[st:st+n,1]+=a*np.sqrt((1+pan)/2)

def hz(m):return 440*2**((m-69)/12)
def pluck(m,dur=2.4,soft=1):
    t=np.arange(int(dur*SR),dtype=np.float32)/SR;f=hz(m)
    env=(1-np.exp(-t/0.008))*np.exp(-t/(.72*soft))
    a=(np.sin(2*np.pi*f*t)+.28*np.sin(2*np.pi*f*2.001*t)*np.exp(-t*2)+.09*np.sin(2*np.pi*f*3.999*t)*np.exp(-t*5))*env
    return a.astype(np.float32)
def bell(m,dur=2):
    t=np.arange(int(dur*SR),dtype=np.float32)/SR;f=hz(m);a=np.sin(2*np.pi*f*t+1.25*np.sin(2*np.pi*f*2*t)*np.exp(-t*9))*np.exp(-t*4)*(1-np.exp(-t*250));return a.astype(np.float32)
def write(path,a):
    data=(np.clip(a,-1,1)*32767).astype('<i2');channels=1 if a.ndim==1 else a.shape[1]
    with wave.open(str(path),'wb')as w:w.setnchannels(channels);w.setsampwidth(2);w.setframerate(SR);w.writeframes(data.tobytes())

# Normalize narration chapter by chapter. Original downloads remain untouched.
for c in p['chapters']:
    cmd=[FF,'-hide_banner','-loglevel','error','-i',c['audio'],'-af','highpass=f=70,lowpass=f=14500,loudnorm=I=-19:TP=-2:LRA=7','-ar',str(SR),'-ac','1','-f','f32le','pipe:1']
    a=np.frombuffer(subprocess.check_output(cmd),dtype='<f4').copy();fade=min(240,len(a)//4);a[:fade]*=np.linspace(0,1,fade);a[-fade:]*=np.linspace(1,0,fade)
    add(voice,c['voiceStart'],a);print('narration',c['id'],len(a)/SR,flush=True)

# Four spacious add9/minor-7 chords. Harmony unfolds over 8 bars; a quiet motif returns.
chords=[[45,52,60,64,71],[41,48,57,60,67],[48,55,59,64,69],[43,50,57,62,67]]
for k,at in enumerate(np.arange(0,D,32*B)):
    notes=chords[k%4];dur=min(35*B,D-at);t=np.arange(int(dur*SR),dtype=np.float32)/SR
    env=np.clip(t/2.8,0,1)*np.clip((dur-t)/2.8,0,1)
    for j,m in enumerate(notes):
        f=hz(m);a=(np.sin(2*np.pi*f*t)+.28*np.sin(2*np.pi*f*1.0017*t+.4*j)+.13*np.sin(2*np.pi*f*2*t))*.009*env
        add(music,at,a,1,(-1)**j*.45)

motif=[69,76,72,71,64,67,72,71]
for k,at in enumerate(np.arange(4*B,D,2*B)):
    chapter=next((i for i,c in enumerate(p['chapters'])if at<c['end']),9)
    m=motif[(k+chapter//3)%8];amp=.032 if k%4==0 else .021
    if chapter in (0,1,2,9):amp*=.75
    add(music,at,pluck(m,2.6,1.2),amp,math.sin(k*1.7)*.32)
    # Two echoes on exact dotted-eighth and eighth-note offsets.
    add(music,at+1.5*B,pluck(m,1.8),amp*.18,-.45)
    add(music,at+2.5*B,pluck(m,1.4),amp*.08,.45)
for k,at in enumerate(np.arange(0,D,8*B)):
    m=chords[(k//4)%4][0]-12
    t=np.arange(int(1.8*SR),dtype=np.float32)/SR
    a=(np.sin(2*np.pi*hz(m)*t)+.14*np.sin(4*np.pi*hz(m)*t))*(1-np.exp(-t*35))*np.exp(-t*1.8)
    add(music,at,a,.025,0)

# Soft pulse, not a dance beat. Extra high-frequency detail appears with the one-dimensional rules.
for k,at in enumerate(np.arange(0,D,B)):
    chapter=next((i for i,c in enumerate(p['chapters'])if at<c['end']),9)
    if chapter>=3 and chapter<9:
        if k%4==0:
            t=np.arange(int(.25*SR),dtype=np.float32)/SR
            a=np.sin(2*np.pi*(47*t+35*.025*(1-np.exp(-t/.025))))*np.exp(-t*22)*(1-np.exp(-t*500));add(music,at,a,.027)
        if k%2==1:
            a=rng.standard_normal(int(.045*SR)).astype(np.float32);a=np.diff(a,prepend=0);a*=np.exp(-np.arange(len(a))/SR*120);add(music,at,a,.0028,(-1)**k*.25)

# Transitions sound like a breath and a glass tap, synchronized to the camera landing.
for c in p['chapters'][1:]:
    start=c['start'];dur=.75;t=np.arange(int(dur*SR),dtype=np.float32)/SR
    noise=rng.standard_normal(len(t)).astype(np.float32);noise=np.convolve(noise,np.ones(55,dtype=np.float32)/55,'same');env=np.sin(np.pi*t/dur)**2
    add(sfx,start-.38,noise*env,.12,-.2);add(sfx,start+2.4,bell(81,.8),.038,.15)
# Audible counting clicks at the exact narrated one / two / three / four cues.
c=p['chapters'][4]
for i,at in enumerate(c.get('countSteps',[5,6,7,8])):add(sfx,c['start']+at,bell([69,72,76,81][i],.5),.075,(-.25+i/6))
c=p['chapters'][5]
for k in range(15):
    at=c['start']+(30*k-16)*B*.25
    if c['start']<at<c['end']:add(sfx,at,bell(76,.4),.026,.3)
# Tiny clock ticks link synchronous updates to the musical grid.
for ci in (1,3,5):
    c=p['chapters'][ci]
    for k,at in enumerate(np.arange(c['start']+4*B,c['end']-B,2*B)):
        add(sfx,at,bell(88+(k%3)*2,.12),.011,math.sin(k)*.25)
# Resolve softly, leaving a short visual breath at the end.
for i,m in enumerate([57,64,69,72,76]):add(music,D-5*B+i*.12,pluck(m,4.8,2),.06,(i-2)*.16)

# Duck the score continuously from the actual narration envelope.
block=960;pad=int(math.ceil(N/block)*block);v=np.pad(voice,(0,pad-N));rms=np.sqrt(np.mean(v.reshape(-1,block)**2,axis=1))
raw=np.clip((rms-.003)/.025,0,1);env=np.zeros_like(raw)
for i,v in enumerate(raw):env[i]=(env[i-1]if i else 0)*(.12 if v>(env[i-1]if i else 0) else .94)+v*(.88 if v>(env[i-1]if i else 0) else .06)
duck=np.interp(np.arange(N),np.arange(len(env))*block,env).astype(np.float32);gain=1-.62*duck
music*=gain[:,None]*2.8
fadein=np.clip(np.arange(N)/SR/1.8,0,1);fadeout=np.clip((D-np.arange(N)/SR)/2.1,0,1);music*=(fadein*fadeout)[:,None];sfx*=fadeout[:,None]
write('output/stems/narration.wav',voice);write('output/stems/music-129bpm.wav',music);write('output/stems/sound-design.wav',sfx)
premix=voice[:,None]*np.ones((1,2),dtype=np.float32)*.707+music+sfx
peak=float(np.max(np.abs(premix)));print('Premix peak',peak,flush=True)
if peak>.95:premix*=.95/peak
write('output/premix.wav',premix)
cmd=[FF,'-hide_banner','-i','output/premix.wav','-af','loudnorm=I=-16:TP=-1.2:LRA=9:print_format=json','-f','null','-']
r=subprocess.run(cmd,stderr=subprocess.PIPE,text=True);m=re.search(r'\{\s*"input_i".*?\}',r.stderr,re.S);stats=json.loads(m.group())
Path('output/loudness-measured.json').write_text(json.dumps(stats,indent=2))
filt=f'loudnorm=I=-16:TP=-1.2:LRA=9:measured_I={stats["input_i"]}:measured_TP={stats["input_tp"]}:measured_LRA={stats["input_lra"]}:measured_thresh={stats["input_thresh"]}:offset={stats["target_offset"]}:linear=true:print_format=json'
r=subprocess.run([FF,'-y','-hide_banner','-i','output/premix.wav','-af',filt,'-ar',str(SR),'-c:a','pcm_s24le','output/master.wav'],stderr=subprocess.PIPE,text=True,check=True)
Path('logs/mastering.log').write_text(r.stderr)
print('MASTER READY',D,'seconds; original 129 BPM score + MiniMax narration + synthesized events',flush=True)
