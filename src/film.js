/* A continuous mathematical wall. Every visible pixel is a pure function of t. */
const W=1920,H=1080,B=60/129;
const C={bg:'#0b0e14',ink:'#F4F2E9',muted:'#94a3b5',grid:'#24303c',blue:'#58C4DD',yellow:'#F6D65C',green:'#83C167',red:'#FC6255',purple:'#B49ADD'};
const cv=document.getElementById('film'),ctx=cv.getContext('2d',{alpha:false});
const dpr=window.devicePixelRatio||1;cv.width=W*dpr;cv.height=H*dpr;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mix=(a,b,p)=>a+(b-a)*p;
const prog=(t,s,d)=>clamp((t-s)/d);
const out=x=>1-Math.pow(1-clamp(x),3);
const smooth=x=>(x=clamp(x))*x*(3-2*x);
const ease=x=>(x=clamp(x))<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const appear=(t,s=.8,d=.8)=>out(prog(t,s,d));
const alpha=(a,fn)=>{if(a<.002)return;ctx.save();ctx.globalAlpha*=clamp(a);fn();ctx.restore()};
function text(s,x,y,size=32,color=C.ink,weight=400,align='left',font='Noto'){ctx.fillStyle=color;ctx.font=`${weight} ${size}px ${font}`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(s,x,y)}
function lines(ss,x,y,size=32,color=C.ink,weight=400,gap=1.55){ss.forEach((s,i)=>text(s,x,y+i*size*gap,size,color,weight))}
function line(x1,y1,x2,y2,color=C.muted,width=2,p=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(mix(x1,x2,p),mix(y1,y2,p));ctx.stroke()}
function arrow(x1,y1,x2,y2,color=C.yellow,width=2,p=1){let x=mix(x1,x2,p),y=mix(y1,y2,p);line(x1,y1,x,y,color,width);let a=Math.atan2(y2-y1,x2-x1);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-13*Math.cos(a-.45),y-13*Math.sin(a-.45));ctx.moveTo(x,y);ctx.lineTo(x-13*Math.cos(a+.45),y-13*Math.sin(a+.45));ctx.stroke()}
function box(x,y,w,h,color=C.grid,fill=false,r=0){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=color;ctx.fill()}else{ctx.lineWidth=1.5;ctx.strokeStyle=color;ctx.stroke()}}
function cell(x,y,s,color=C.blue,k=1){const m=(1-k)*s/2;ctx.fillStyle=color;ctx.fillRect(x+m+1.5,y+m+1.5,s*k-3,s*k-3)}
function glow(x,y,r,color=C.blue,op=.14){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,C.bg);alpha(op,()=>{ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)})}
function grid(x,y,nx,ny,s,op=1){alpha(op,()=>{ctx.strokeStyle=C.grid;ctx.lineWidth=1;ctx.beginPath();for(let a=0;a<=nx;a++){ctx.moveTo(x+a*s,y);ctx.lineTo(x+a*s,y+ny*s)}for(let b=0;b<=ny;b++){ctx.moveTo(x,y+b*s);ctx.lineTo(x+nx*s,y+b*s)}ctx.stroke()})}
function title(s,sub='',color=C.ink){text(s,-740,-354,52,color,600);if(sub)text(sub,-738,-286,22,C.muted)}
const gh=CA.history(CA.glider,320),bh=CA.history(CA.blinker,64),blh=CA.history(CA.block,5),gunh=CA.history(CA.gun,420);
const e90=CA.elementary(90,513,256),e30=CA.elementary(30,513,256),e110=CA.elementary(110,513,256);
const stations=[{x:0,y:0},{x:2050,y:0},{x:4100,y:0},{x:6150,y:0},{x:8200,y:0},{x:8200,y:1450},{x:6150,y:1450},{x:4100,y:1450},{x:2050,y:1450}];
let prod,chapters,captions;
const cue=(i,name,fallback)=>chapters[i].cues?.[name]??fallback;
function life(h,g,x,y,s,nx,ny,ox=0,oy=0,colors=true){
  const gi=clamp(Math.floor(g),0,h.length-1),a=h[Math.max(gi-1,0)],b=h[gi];
  const f=smooth(clamp((g-gi)/.34));grid(x,y,nx,ny,s,.78);
  const all=new Set([...a,...b]);
  for(const k of all){const [cx,cy]=k.split(',').map(Number),xx=cx+ox,yy=cy+oy;if(xx<0||yy<0||xx>=nx||yy>=ny)continue;
    const was=a.has(k),now=b.has(k);if(was&&now)cell(x+xx*s,y+yy*s,s,C.blue);
    else if(!was&&now){alpha(f,()=>cell(x+xx*s,y+yy*s,s,colors?C.yellow:C.blue,.65+.35*f))}
    else{alpha(1-f,()=>cell(x+xx*s,y+yy*s,s,colors&&f>.1?C.red:C.blue,1-.12*f))}
  }
}
function gen(g,x,y,label='generation'){text(label.toUpperCase(),x,y,15,C.muted,500);text(String(Math.floor(g)).padStart(3,'0'),x,y+36,36,C.yellow,400,'left','MathSerif')}
function ruleTable(rule,x,y,size=24,spacing=167,highlight=-1,op=1){alpha(op,()=>{for(let i=0;i<8;i++){const n=7-i,xx=x+i*spacing;for(let b=0;b<3;b++){box(xx+b*size,y,size,size,C.grid);if((n>>(2-b))&1)cell(xx+b*size,y,size,C.blue)}arrow(xx+size*1.5,y+size+5,xx+size*1.5,y+size+29,C.muted,1.3);box(xx+size,y+size+34,size,size,C.grid);if((rule>>n)&1)cell(xx+size,y+size+34,size,C.yellow);text((rule>>n)&1,xx+size*1.5,y+size*2+66,20,C.muted,400,'center','MathSerif');if(i===highlight){ctx.setLineDash([4,4]);box(xx-8,y-8,size*3+16,size*2+48,C.yellow);ctx.setLineDash([])}}})}
function field(rows,x,y,width,height,reveal=1,color=C.blue){const rh=Math.floor(rows.length*clamp(reveal)),cw=width/rows[0].length,ch=height/rows.length;ctx.fillStyle=color;for(let j=0;j<rh;j++)for(let i=0;i<rows[j].length;i++)if(rows[j][i])ctx.fillRect(x+i*cw,y+j*ch,Math.max(cw-.25,.8),Math.max(ch-.2,.8));if(rh>0&&rh<rows.length){line(x,y+rh*ch,x+width,y+rh*ch,C.yellow,1);text(`t = ${rh}`,x+width+16,y+rh*ch,18,C.yellow,400,'left','MathSerif')}}
function tag(s,x,y,color=C.blue){text(s,x,y,20,color,500);line(x,y+19,x+Math.min(s.length*16,290),y+19,color,1)}
function intro(t,d){
  const tease=cue(0,'再换一个起点',14),question=cue(0,'问题是',19.5);
  const shrink=out(prog(t,question,1.8)),gunA=appear(t,tease,.8);
  const size=mix(50,36,shrink),xx=mix(-360,150,shrink),yy=mix(-280,-215,shrink);
  const g=Math.min(28,Math.max(0,(t-3)/(B*.75)));
  alpha(appear(t,.2,1)*(1-gunA),()=>{life(gh,g,xx,yy,size,20,14,4,3,false);gen(g,xx+size*20+28,yy+15)});
  alpha(gunA,()=>{const ss=mix(18,9,shrink),gx=mix(-730,142,shrink),gy=mix(-180,-180,shrink);life(gunh,Math.max(0,(t-tease)*8+15),gx,gy,ss,82,34,4,4,false);gen(Math.max(0,(t-tease)*8+15),gx+82*ss+22,gy)});
  alpha(appear(t,3,1)*(1-appear(t,tease,.8)),()=>{text('五个格子。没有导航。',-735,-355,44,C.ink,500);text('为什么，看起来像在飞？',-735,330,30,C.yellow)});
  alpha(gunA*(1-shrink),()=>{text('同一套规则，还能长出一台机器。',-735,-355,44,C.ink,500)});
  alpha(shrink,()=>{text('几条简单规则',-745,-205,76,C.ink,700);text('一个复杂世界',-745,-90,76,C.yellow,700);text('元胞自动机',-738,28,34,C.blue,500);text('CELLULAR AUTOMATA',-738,84,19,C.muted,400);line(-738,133,-540,133,C.blue,2,shrink);lines(['没有导演。','没有写好的剧情。','只有下一步。'],-738,200,25,C.muted,400,1.55)});
}
function foundations(t,d){
  title('世界的最小配方','一套规则，在每个位置重复。');
  const x=-700,y=-155,s=56,nx=18,ny=10;
  alpha(appear(t,.2,1),()=>grid(x,y,nx,ny,s));
  const seed=CA.from([[4,3],[5,4],[3,5],[4,5],[5,5],[11,2],[12,2],[11,3],[12,3]]);
  alpha(appear(t,2,1),()=>{for(const k of seed){const[a,b]=k.split(',').map(Number);cell(x+a*s,y+b*s,s,C.blue)}});
  const age=prog(t,d*.12,d*.13),cx=x+4*s,cy=y+4*s;
  alpha(appear(t,cue(1,'只能读取附近',14),.8),()=>{ctx.strokeStyle=C.yellow;ctx.lineWidth=3;ctx.strokeRect(cx-s,cy-s,3*s,3*s);text('只看附近',cx+3*s+25,cy+s*.5,27,C.yellow);arrow(cx+3*s+17,cy+s*.5,cx+2*s+6,cy+s*.5,C.yellow)});
  alpha(appear(t,cue(1,'两种状态',7),.8),()=>{tag('STATE',430,-160);cell(430,-115,48,C.blue);text('1  /  亮',500,-90,27,C.ink);box(430,-40,48,48,C.muted);text('0  /  灭',500,-16,27,C.muted)});
  const pulse=(t/B)%4;alpha(appear(t,cue(1,'同时更新',19),.8),()=>{line(x,y-22,x+nx*s,y-22,C.yellow,2);alpha(.14*Math.exp(-pulse*5),()=>{ctx.fillStyle=C.yellow;ctx.fillRect(x,y,nx*s,ny*s)});text('同 一 时 刻 更 新',-190,420,24,C.yellow,500,'center')});
  alpha(appear(t,cue(1,'离散的空间',20),1),()=>{lines(['离散的空间','离散的时间','局部的规则'],430,140,34,C.ink,500,1.9);text('康威生命游戏',430,380,31,C.blue,600);text('John Conway · 1970',430,427,19,C.muted)});
}
function rules(t,d){
  title('只需要数邻居','Conway’s Game of Life');
  const x=-640,y=-164,s=108,center=[x+s,y+s];
  grid(x,y,3,3,s);const around=[[0,0],[1,0],[2,0],[2,1],[2,2],[1,2],[0,2],[0,1]];
  const two=cue(2,'两个或三个',10),few=cue(2,'少于两个',15),many=cue(2,'多于三个',16.5),dead=cue(2,'一个灭格',18.2),birth=cue(2,'恰好三个',19.7);
  const count=t<two?3:t<two+2?2:t<few?3:t<many?1:t<dead?4:t<birth?2:3;
  const live=t<dead;const next=count===3||(live&&count===2);
  around.forEach(([a,b],i)=>{alpha(appear(t,.4+i*.11,.45),()=>{if(i<count)cell(x+a*s,y+b*s,s,C.blue);text(String(i+1),x+a*s+s/2,y+b*s+s/2,27,i<count?C.bg:C.muted,500,'center')})});
  if(live)cell(center[0],center[1],s,C.blue);ctx.strokeStyle=C.yellow;ctx.lineWidth=3;ctx.strokeRect(center[0]+2,center[1]+2,s-4,s-4);
  text('自己不计入',x+1.5*s,y+3*s+56,23,C.muted,400,'center');
  alpha(appear(t,3,.8),()=>{text('N =',x-12,y+3*s+126,32,C.ink,400,'left','MathSerif');text(String(count),x+77,y+3*s+126,48,C.yellow,400,'left','MathSerif')});
  alpha(appear(t,cue(2,'两个或三个',10)-1,1),()=>{text('亮格',-80,-130,30,C.blue,600);text('2 或 3',120,-130,52,C.yellow,500);text('→  存活',360,-130,32,C.ink);text('其余',120,-56,30,C.muted);text('→  熄灭',360,-56,30,C.muted)});
  alpha(appear(t,cue(2,'一个灭格',18.2),.8),()=>{text('灭格',-80,85,30,C.muted,600);text('恰好 3',120,85,52,C.yellow,500);text('→  诞生',360,85,32,C.ink)});
  alpha(appear(t,cue(2,'别急着',22.2),.7),()=>{line(-80,173,700,173,C.grid,2);text('B3 / S23',-80,237,50,C.ink,400,'left','MathSerif');text('先计算，再一起更新',-80,321,33,C.yellow,500);text('旧棋盘',-645,370,23,C.muted);arrow(-515,370,-367,370,C.yellow,2,appear(t,d*.81,.7));box(-333,330,80,80,C.grid);if(next)alpha(appear(t,cue(2,'再一起切换',27.5),.35),()=>cell(-333,330,80,C.yellow));text('下一代',-293,426,21,C.muted,400,'center')});
}
function oscillators(t,d){
  title('稳定与摆动，都是算出来的','同样的规则，不同的初始条件。');
  const change=cue(3,'换成横着',10),turn=change+2.8,again=cue(3,'再走一步',17)+.6,cycle=cue(3,'周期为二',20.8);
  let g=t<turn?0:t<again?1+clamp((t-turn)*2,0,.9):t<cycle?2+clamp((t-again)*2,0,.9):2.4+(t-cycle)/(B*2);
  life(blh,0,-665,-120,69,7,7,2,2);text('方块',-426,-204,36,C.blue,600,'center');
  alpha(appear(t,3,.8),()=>{for(const[a,b]of CA.block)text('3',-665+(a+2.5)*69,-120+(b+2.5)*69,27,C.bg,600,'center');text('周期 1',-426,421,27,C.muted,400,'center')});
  alpha(appear(t,cue(3,'换成横着',10),1),()=>{life(bh,g,160,-120,69,7,7,2,2);text('闪烁器',400,-204,36,C.yellow,600,'center');text('周期 2',400,421,27,C.muted,400,'center');gen(g,700,-102)});
  alpha(appear(t,d*.58,1),()=>{arrow(-100,100,90,100,C.muted,2);text('同一规则',-5,48,22,C.muted,400,'center')});
  alpha(appear(t,cue(3,'你看',23.5),1),()=>{text('规则里没有「摆动」',-38,-286,26,C.yellow,400,'center')});
}
function gliderScene(t,d){
  title('移动的，是图案','格子始终留在原位。');
  const s=44,x=-715,y=-178;
  const steps=chapters[4].countSteps||[6.7,7.9,8.4,9.1],cont=cue(4,'继续重复',14.85),shape=cue(4,'形状回来了',10.5);
  let g=0;for(let k=0;k<4;k++)if(t>=steps[k])g=k+1+clamp((t-steps[k])*2,0,.9);
  if(t>=cont)g=4.4+(t-cont)/(B*2);g=Math.min(g,28.9);
  const waveCue=cue(4,'就像球场',26.2),waveA=appear(t,waveCue,1)*(1-appear(t,cue(4,'局部的变化',31.5)+1.8,1));
  alpha(1-.82*waveA,()=>life(gh,g,x,y,s,30,12,3,2));
  alpha(appear(t,shape,.5)*(1-appear(t,cont+1.8,.8)),()=>{ctx.setLineDash([7,6]);ctx.strokeStyle=C.yellow;ctx.lineWidth=2;ctx.strokeRect(x+3*s,y+2*s,3*s,3*s);ctx.setLineDash([]);arrow(x+4.5*s,y+3.5*s,x+5.5*s,y+4.5*s,C.yellow,3);text('4 代 → (1, 1)',x+7*s,y+2*s,30,C.yellow,400,'left','MathSerif')});
  gen(g,740,-167);
  alpha(appear(t,shape,.5)*(1-appear(t,cue(4,'就像球场',26.2),1)),()=>{text('每 4 代，向右下平移 1 格',-700,438,27,C.ink);text('c / 4',540,438,38,C.yellow,400,'left','MathSerif')});
  alpha(waveA,()=>{for(let i=0;i<16;i++){const z=Math.exp(-Math.pow((i-((t-waveCue)*2.5)%22),2)/4);const px=-620+i*75,head=110-70*z,hip=170-45*z;ctx.strokeStyle=z>.1?C.yellow:C.muted;ctx.lineWidth=2.4;ctx.beginPath();ctx.arc(px,head,8,0,Math.PI*2);ctx.stroke();line(px,head+10,px,hip,z>.1?C.yellow:C.muted,2.4);line(px,hip,px-12,211,C.muted,2.4);line(px,hip,px+12,211,C.muted,2.4);line(px,head+24,px-17,head+40-38*z,C.muted,2);line(px,head+24,px+17,head+40-38*z,C.muted,2)}text('人不移动，人浪在移动',0,289,30,C.yellow,400,'center')});

}
function gunScene(t,d){
  title('一台不断产生图案的机器','Gosper glider gun · 1970');
  const g=clamp((t+4*B)/(B*.25),0,419),x=-745,y=-180,s=17;
  life(gunh,g,x,y,s,88,33,4,4,false);gen(g,780,-182);
  alpha(appear(t,3,1),()=>{text('30',-665,414,50,C.yellow,400,'left','MathSerif');text('代 / 一次发射',-552,414,26,C.ink);line(-735,387,735,387,C.grid,2);const q=Math.floor(g/30);for(let i=0;i<12;i++){let xx=-690+i*126;line(xx,380,xx,395,C.muted,1);if(i<=q){ctx.fillStyle=C.yellow;ctx.beginPath();ctx.arc(xx,387,4,0,7);ctx.fill()}}});
  alpha(appear(t,cue(5,'有没有滑翔机',18.5),1),()=>{text('图案',-195,414,29,C.blue,500);arrow(-110,414,-30,414,C.yellow);text('信息',10,414,29,C.yellow,500);arrow(91,414,171,414,C.yellow);text('计算',210,414,29,C.ink,500)});
  alpha(appear(t,cue(5,'精心组合',24.5),1),()=>{text('精心构造的生命游戏电路，可以实现通用计算',-55,-278,25,C.yellow,400,'center')});
}
function elementaryScene(t,d){
  title('把世界压成一条线');
  const small=out(prog(t,cue(6,'八种情况',17.85)-1,1.4));const sz=mix(90,28,small),xx=mix(-130,-715,small),yy=mix(-130,-225,small);
  alpha(1-small,()=>{grid(-715,-130,16,1,90);cell(-130,-130,90,C.blue);cell(50,-130,90,C.blue);text('左',-85,-179,25,C.blue,400,'center');text('自己',5,-179,25,C.muted,400,'center');text('右',95,-179,25,C.blue,400,'center');text('2 × 2 × 2 = 8',0,68,58,C.yellow,400,'center','MathSerif');arrow(5,-32,5,121,C.muted,2);box(-40,140,90,90,C.blue);text('下一代',5,280,28,C.muted,400,'center')});
  alpha(small,()=>{ruleTable(90,-710,-218,23,181);text('RULE 90',-715,-281,24,C.blue,600);text('左右不同 → 亮',450,-281,24,C.yellow);const reveal=prog(t,cue(6,'从一个亮点',27.7),6.5);field(e90,-670,-65,1340,400,reveal,C.blue);arrow(-714,-55,-714,335,C.muted,2,reveal);text('t',-734,350,28,C.muted,400,'center','MathItalic')});
  alpha(appear(t,cue(6,'三角形里',31.5),.8),()=>{text('大三角形里，藏着小三角形。',0,408,29,C.yellow,400,'center')});
}
function chaos(t,d){
  title('确定，却难以预测');
  ruleTable(30,-710,-216,23,181,-1,appear(t,.8,1));
  text('RULE 30',-715,-280,24,C.yellow,600);text('00011110₂ = 30',440,-280,25,C.muted,400,'left','MathSerif');
  field(e30,-670,-57,1340,400,prog(t,cue(7,'规则三十',7.4),8),C.blue);
  alpha(appear(t,cue(7,'没有掷骰子',14.6),1),()=>{text('没有随机数',-690,410,30,C.yellow,500);text('相同输入 → 相同输出',170,410,30,C.ink,500)});
  alpha(appear(t,cue(7,'规则的长度',29),1),()=>{ctx.strokeStyle=C.yellow;ctx.lineWidth=1.6;ctx.setLineDash([6,6]);ctx.strokeRect(-2,-53,4,395);ctx.setLineDash([]);text('规则很短，结果很长。',0,-282,25,C.ink,400,'center')});
}
function computing(t,d){
  title('八个答案，也能支持通用计算');text('RULE 110',-715,-281,24,C.blue,600);text('Matthew Cook · 2004',450,-281,24,C.muted);
  ruleTable(110,-710,-217,23,181,-1,appear(t,.7,1));
  field(e110,-670,-60,1340,400,prog(t,1,d*.82),C.blue);
  alpha(appear(t,d*.18,1),()=>{text('重复、传播、相互作用',60,-281,28,C.yellow,400,'center')});
  alpha(appear(t,cue(8,'合适的初始配置',12.8),1),()=>{box(-710,351,1418,88,C.bg,true);text('合适的初始配置 → 通用计算',-700,383,28,C.yellow,500);text('此处为演化示例，非完整通用计算机构造',-700,425,21,C.muted)});
  const readCue=cue(8,'真正令人惊讶',21.4)+1.5;
  alpha(appear(t,readCue,.3),()=>{const bits='01101110';for(let i=0;i<8;i++){const q=out(prog(t,readCue+i*.08,1.25));text(bits[i],mix(-675.5+i*181,150+i*48,q),mix(-105,80,q)-65*Math.sin(Math.PI*q),30,C.yellow,400,'center','MathSerif')}alpha(appear(t,readCue+1.9,.6),()=>{text('2',512,94,17,C.yellow,400,'left','MathSerif');text('= 110',130,159,58,C.ink,400,'left','MathSerif');text('8 位，定义一套规则。',130,242,25,C.muted)})});

}
const sceneFns=[intro,foundations,rules,oscillators,gliderScene,gunScene,elementaryScene,chaos,computing];
function sceneTime(i,t){const c=chapters[i];return clamp(t-c.start,0,c.duration-.25)}
function camera(t){
  let ci=chapters.findIndex(c=>t<c.end);if(ci<0)ci=chapters.length-1;
  if(ci===9){const q=prog(t,chapters[9].start,6);let x=mix(stations[8].x,4100,ease(q)),y=mix(stations[8].y,700,ease(q)),z=mix(1,.18,ease(q));return{x,y,z,ci}}
  let a=stations[ci],b=stations[Math.max(ci-1,0)],q=ci?prog(t,chapters[ci].start,2.4):1;
  let z=1-.12*Math.sin(Math.PI*q);if(ci===0)z=1;
  if(q>=1&&ci>0){const local=prog(t,chapters[ci].start+2.4,chapters[ci].duration-2.4);z+=.018*Math.sin(Math.PI*local)}
  return{x:mix(b.x,a.x,ease(q)),y:mix(b.y,a.y,ease(q)),z,ci};
}
function mural(t,cam){
  ctx.save();ctx.translate(W/2,H/2-18);ctx.scale(cam.z,cam.z);ctx.translate(-cam.x,-cam.y);
  // One unbroken world-space grid; the camera travels instead of swapping slides.
  const left=cam.x-W/2/cam.z,right=cam.x+W/2/cam.z,top=cam.y-H/2/cam.z,bottom=cam.y+H/2/cam.z;
  alpha(.20,()=>{ctx.strokeStyle=C.grid;ctx.lineWidth=1/cam.z;ctx.beginPath();for(let x=Math.floor(left/96)*96;x<right;x+=96){ctx.moveTo(x,top);ctx.lineTo(x,bottom)}for(let y=Math.floor(top/96)*96;y<bottom;y+=96){ctx.moveTo(left,y);ctx.lineTo(right,y)}ctx.stroke()});
  for(let i=1;i<stations.length;i++){const a=stations[i-1],b=stations[i];if(t<chapters[i].start-2.4)continue;alpha(.34,()=>{ctx.strokeStyle=C.blue;ctx.lineWidth=2;ctx.setLineDash([8,12]);ctx.beginPath();if(a.y===b.y){const dir=b.x>a.x?1:-1;ctx.moveTo(a.x+dir*800,a.y+240);ctx.bezierCurveTo(a.x+dir*1000,a.y+200,b.x-dir*1000,b.y+200,b.x-dir*800,b.y+240)}else{ctx.moveTo(a.x+700,a.y+420);ctx.bezierCurveTo(a.x+920,a.y+830,b.x+920,b.y-650,b.x+700,b.y-420)}ctx.stroke();ctx.setLineDash([])})}
  for(let i=0;i<stations.length;i++){const s=stations[i];if(Math.abs(s.x-cam.x)>W/2/cam.z+900||Math.abs(s.y-cam.y)>H/2/cam.z+550)continue;if(t<chapters[i].start-2.4)continue;ctx.save();ctx.translate(s.x,s.y);sceneFns[i](sceneTime(i,t),chapters[i].duration);ctx.restore()}
  ctx.restore();
}
function closing(t){const c=chapters[9],u=t-c.start,d=c.duration;
  alpha(appear(u,3.4,4)*.88,()=>{ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H)});
  alpha(appear(u,3.6,.8),()=>{const terms=['静止','摆动','移动','生长','计算'];for(let i=0;i<5;i++){let x=280+i*330;alpha(appear(u,cue(9,terms[i]==='计算'?'甚至计算':terms[i],4+i),.7),()=>{text(terms[i],x,250,35,i===4?C.yellow:C.blue,500,'center');if(i<4)arrow(x+70,250,x+230,250,C.muted,1.5)})}});
  alpha(appear(u,cue(9,'涌现',17.8),1.5),()=>{text('复杂，藏在关系里。',W/2,439,80,C.ink,650,'center');text('局部规则  ×  时间  →  整体行为',W/2,566,37,C.yellow,500,'center')});
  alpha(appear(u,d*.64,1),()=>{text('涌现不是魔法；它是一种值得追问的结构。',W/2,688,27,C.muted,400,'center')});
  alpha(appear(u,d*.86,1.2),()=>{cell(W/2-15,790,30,C.blue);text('下一步，会怎样？',W/2,867,24,C.blue,400,'center')});
}
function overlay(t,cam){
  const ci=cam.ci,c=chapters[ci];
  alpha(appear(t,.5,1),()=>{text('元胞自动机',76,58,18,C.muted,500);text(String(ci+1).padStart(2,'0')+'  /  '+c.title,1840,58,18,C.muted,400,'right');line(76,88,1844,88,C.grid,1)});
  // Captions are voice-aligned and independent of world transforms.
  const cap=captions.find(s=>t>=s.start&&t<s.end);
  if(cap){const size=31;ctx.font=`400 ${size}px Noto`;const wid=ctx.measureText(cap.text).width;alpha(.92,()=>box((W-wid)/2-24,969,wid+48,57,C.bg,true,6));text(cap.text,W/2,998,size,C.ink,400,'center')}
  const p=clamp(t/prod.duration);line(76,1048,1844,1048,C.grid,2);line(76,1048,76+1768*p,1048,C.blue,2);
  for(const c of chapters){const x=76+1768*c.start/prod.duration;ctx.fillStyle=t>=c.start?C.blue:C.grid;ctx.beginPath();ctx.arc(x,1048,2.5,0,7);ctx.fill()}
  if(t>prod.duration-3.4)alpha(appear(t,prod.duration-3.4,1),()=>{text('动画由真实规则计算 · MiniMax 合成旁白 · 原创程序配乐',W/2,925,17,C.muted,400,'center')});
}
function render(t){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=1;ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H);let cam=camera(t);mural(t,cam);if(cam.ci===9)closing(t);overlay(t,cam);const fade=1-prog(t,prod.duration-1.2,1.2);if(fade<1){ctx.fillStyle='#000';alpha(1-fade,()=>ctx.fillRect(0,0,W,H))}}
prod=window.PRODUCTION;chapters=prod.chapters;captions=prod.captions;
Shot.define({duration:prod.duration,fps:60,fonts:[['400 32px Noto','元胞自动机'],['600 60px Noto','复杂世界'],['400 48px MathSerif','0123456789'],['400 32px MathItalic','t']],render,post:{motionBlur:2,maxMotionBlur:2,shutter:.35,grain:0},blurAt(t){for(let i=1;i<chapters.length;i++)if(t>=chapters[i].start&&t<chapters[i].start+(i===9?6:2.4))return 2;return 1},meta:{title:prod.title,bpm:129,chapters:chapters.map(({title,start})=>({title,start})),simulation:'Conway B3/S23; elementary rules 90,30,110'}});
