/* V2: one lattice, one camera, explicit object handoffs. All geometry is f(t). */
(()=>{'use strict';
const W=1920,H=1080,U=62,B=60/129,P=window.PRODUCTION,M=MotionV2;
const {clamp,lerp:L,progress:R,quint:Q,out:O,track:T,bezier:bez}=M;
const C={bg:'#080e18',ink:'#f2f0e7',muted:'#8b9baa',faint:'#536575',grid:'#294254',blue:'#61cbd7',deep:'#267f9f',yellow:'#f6cc77',red:'#ea8c89',green:'#9ecb9c',purple:'#b2a6df'};
const canvas=document.getElementById('film'),ctx=canvas.getContext('2d',{alpha:false}),D=window.devicePixelRatio||1;
canvas.width=W*D;canvas.height=H*D;
const chapters=P.chapters,caps=P.captions;
const G=CA.history(CA.gun,620),GL=CA.history(CA.glider,90),BL=CA.history(CA.blinker,80);
const block=[[0,4],[1,4],[0,5],[1,5]],nhood=[[1,4],[1,5],[0,5],[-1,5],[-1,4],[-1,3],[0,3],[1,3]];
const lift=(s,dx=0,dy=0)=>new Set([...s].map(k=>{const[x,y]=k.split(',').map(Number);return CA.key(x+dx,y+dy)}));
const boxSet=CA.from(block);
const far=G.map(s=>{const a=CA.coords(s).sort((a,b)=>(b[0]+b[1])-(a[0]+a[1])).slice(0,5);return a.reduce((c,p)=>[c[0]+p[0]/5,c[1]+p[1]/5],[0,0])});
const phase=(t,a,b)=>Q(R(t,a,b)),alpha=(a,fn)=>{if(a<=.001)return;ctx.save();ctx.globalAlpha*=clamp(a);fn();ctx.restore()};
function txt(s,x,y,size=28,color=C.ink,weight=400,align='left',font='Noto'){ctx.font=`${weight} ${size}px ${font}`;ctx.fillStyle=color;ctx.textBaseline='middle';ctx.textAlign=align;ctx.fillText(s,x,y)}
function line(x,y,xx,yy,color=C.grid,w=1){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke()}
function path(points,color=C.blue,w=1.5){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(...points[0]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);ctx.stroke()}
function arrow(x,y,xx,yy,color=C.yellow,w=1.5,p=1){const X=L(x,xx,p),Y=L(y,yy,p),a=Math.atan2(yy-y,xx-x);line(x,y,X,Y,color,w);path([[X-10*Math.cos(a-.42),Y-10*Math.sin(a-.42)],[X,Y],[X-10*Math.cos(a+.42),Y-10*Math.sin(a+.42)]],color,w)}
function ring(x,y,r,color=C.yellow,a=1){alpha(a,()=>{ctx.strokeStyle=color;ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke()})}
function rect(x,y,w,h,color,r=0,fill=true,width=1){ctx.beginPath();ctx.roundRect(x,y,w,h,Math.max(0,Math.min(r,w/2,h/2)));if(fill){ctx.fillStyle=color;ctx.fill()}else{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}}
function pixel(x,y,s,color=C.blue,k=1,height=s,detail=true){if(k<.005)return;const gap=Math.min(3.6,s*.075),w=Math.max(.5,(s-gap)*k),h=Math.max(.7,(height-Math.min(gap,height*.1))*k),r=Math.min(w,h)*.038;rect(x-w/2,y-h/2,w,h,color,r);if(detail&&s>17&&height>12){alpha(.24,()=>{line(x-w/2+1,y-h/2+1,x+w/2-1,y-h/2+1,'#ffffff',.9)});alpha(.18,()=>line(x-w/2+1,y+h/2-1,x+w/2-1,y+h/2-1,C.bg,1.5))}}
function ghost(x,y,s,col=C.blue,a=.4,h=s){alpha(a,()=>rect(x-s/2+2,y-h/2+2,s-4,Math.max(1,h-4),col,2,false,1.2))}
function label(s,x,y,a=1,color=C.muted,size=23){alpha(a,()=>txt(s,x,y,size,color,400))}
function emerge(s,x,y,t,start,size=36,color=C.ink,weight=500,align='left'){const p=O(R(t,start,start+.8));alpha(p,()=>txt(s,x,y+14*(1-p),size,color,weight,align))}
function formula(a,b,c,y=860){txt(a,960,y,33,C.ink,400,'center','MathSerif');if(b)txt(b,960,y+48,22,C.muted,400,'center');if(c)line(830,y-33,1090,y-33,c,1.5)}
function core(t){const g=clamp(120+Math.max(0,t-2)*2.5,120,200);return{g,xy:[far[120][0]+(g-120)/4,far[120][1]+(g-120)/4]}}
function camera(t){
 let x=0,y=4,z=1.2,r=0;
 if(t<31.3){const q=core(Math.min(t,13));x=q.xy[0];y=q.xy[1];z=2.75;
  const p=phase(t,12.8,18.3);x=L(x,28,p);y=L(y,20,p);z=Math.exp(L(Math.log(z),Math.log(.25),p));r=L(-.018,0,p)*(1-phase(t,1,3));
  const a=phase(t,19.5,22.4);x=L(x,8,a);y=L(y,13,a);
  const b=phase(t,27.4,30.5),lead=phase(t,26.4,28.5);x=L(x,0,lead);y=L(y,4,lead);z=Math.exp(L(Math.log(z),Math.log(32),b));
 }else if(t<66.2){x=T(t,[[31.3,0],[34.02790698,1.6],[45,1.6],[47.8,1.9],[58,1.9],[63,1.9]]);y=T(t,[[31.3,4],[34.02790698,4.5],[61,4.5]]);z=Math.exp(T(t,[[31.3,Math.log(32)],[34.02790698,Math.log(2.05)],[45,Math.log(2.05)],[48,Math.log(2.05)],[62,Math.log(2.05)]]));
 }else if(t<100.4){x=T(t,[[66.2,1.9],[69.4,1.5],[89.8,1.5],[94.5,1.5],[99.8,.4]]);y=T(t,[[66.2,4.5],[69.4,4]]);z=T(t,[[66.2,2.05],[69.4,2.48],[89.5,2.48],[94,1.75],[99.8,2.1]]);
 }else if(t<133.3){x=T(t,[[100.4,.4],[110.6,.4],[113.3,0]]);y=T(t,[[100.4,4],[110.6,4],[113.3,4]]);z=T(t,[[100.4,2.1],[110.6,2.1],[113.3,2.35],[129.5,2.35],[133.3,1.65]]);
 }else if(t<171.1627907){const g=gliderGen(t);x=T(t,[[133.3,0],[136.4,0],[148.8,0],[153,2],[160,4],[168.8,6.2]]);y=T(t,[[133.3,4],[136.4,3],[148.8,3],[154,5],[160,7],[168.8,9.8]]);z=T(t,[[133.3,1.65],[136.4,1.8],[148.8,1.8],[154,1.25],[168.8,1.25]]);
 }else{const p=phase(t,171.1627907,173.5627907);x=L(6.2,-16,p);y=L(9.8,-6,p);z=Math.exp(L(Math.log(1.25),Math.log(.30),p));const q=phase(t,202.5,207.9);x=L(x,-40,q);y=L(y,-19,q);z=Math.exp(L(Math.log(z),Math.log(90/U),q));}
 return{x,y,z,r,flat:1-phase(t,209,215.2)};
}
function project(x,y,cam){let a=(x-cam.x)*U*cam.z,b=(y-cam.y)*U*cam.z*cam.flat;const co=Math.cos(cam.r),si=Math.sin(cam.r);return[960+a*co-b*si,510+a*si+b*co]}
function worldGrid(cam,t){const halfX=1920/(U*cam.z)/2+2,halfY=Math.min(60,800/(U*cam.z*Math.max(.15,cam.flat))/2+3);ctx.save();ctx.beginPath();ctx.rect(70,185,1780,750);ctx.clip();
 const top=cam.y-halfY,bottom=cam.y+halfY,left=cam.x-halfX,right=cam.x+halfX;
 for(let i=Math.floor(left);i<=right;i++){const a=project(i+.5,top,cam),b=project(i+.5,bottom,cam);alpha(.34+Math.max(0,1-Math.abs(i-cam.x)/halfX)*.32,()=>line(...a,...b,C.grid,.85))}
 for(let j=Math.floor(top);j<=bottom;j++){const a=project(left,j+.5,cam),b=project(right,j+.5,cam);alpha((.27+Math.max(0,1-Math.abs(j-cam.y)/halfY)*.3)*Math.max(.02,cam.flat),()=>line(...a,...b,C.grid,.85))}
 ctx.restore();
}
function renderSet(a,b,p,cam,dx=0,dy=0){const all=new Set([...a,...b]),size=U*cam.z,fl=cam.flat;
 ctx.save();ctx.beginPath();ctx.rect(70,185,1780,750);ctx.clip();
 for(const k of all){const[x,y]=k.split(',').map(Number);const[X,Y]=project(x+dx,y+dy,cam);if(X<-size||X>W+size||Y<-size||Y>H+size)continue;const old=a.has(k),now=b.has(k);let scale=old&&now?1:now?p:1-p;const col=old?C.blue:C.yellow;
  const merge=phase(1-fl,0.3,1);const rowAlpha=L(1,Math.abs(y+dy-cam.y)<1.1?1:0,merge);alpha(rowAlpha,()=>pixel(X,Y,size,col,scale,Math.max(2,size*fl)));}
 ctx.restore();
}
function life(h,g,cam,dx=0,dy=0){const n=Math.min(h.length-2,Math.floor(g)),f=Q(clamp((g-n-.70)/.3));renderSet(h[n],h[n+1],f,cam,dx,dy)}
function gliderGen(t){const ss=chapters[4].countSteps.map(v=>v+chapters[4].start);let g=0;for(let i=0;i<4;i++){if(t>=ss[i])g=i+phase(t,ss[i],ss[i]+.18)}if(t>=148.8046)g=Math.min(25,4+(t-148.8046)/(2*B));return g}
function blinkGen(t){if(t<115.735)return 0;if(t<117.535)return phase(t,115.735,115.985);if(t<121.745)return 1+phase(t,117.535,117.785);return Math.min(14,2+(t-121.745)/(B*1.5))}
function ruleCount(t){const u=t-chapters[2].start;return u<10.391?3:u<12.4?2:u<14.891?3:u<16.411?1:u<18.211?4:u<19.671?2:3}
function constructBlink(t,cam){const q=phase(t,110.596,113.1),target=[[-1,4],[0,4],[1,4]];block.forEach((p,i)=>{if(i===3){const[X,Y]=project(...p,cam);pixel(X,Y,U*cam.z,C.yellow,1-q);return}const end=target[i],x=L(p[0],end[0],q),y=L(p[1],end[1],q)-Math.sin(q*Math.PI)*.4;const[X,Y]=project(x,y,cam);pixel(X,Y,U*cam.z,C.blue);});}
function lifePlane(t){const cam=camera(t);worldGrid(cam,t);
 if(t<30.5){const g=core(t).g;life(G,g,cam);if(t>24){const[X,Y]=project(0,4,cam);ghost(X,Y,U*cam.z,C.yellow,phase(t,24,25));}}
 else if(t<76.9)renderSet(boxSet,boxSet,0,cam);
 else if(t<94.448){const n=ruleCount(t),s=CA.from(nhood.slice(0,n));if(t<chapters[2].start+18.211)s.add('0,4');renderSet(s,s,0,cam);}
 else if(t<110.596){const p=phase(t,94.448,94.7),s=CA.from(nhood.slice(0,3));renderSet(t>95.5?boxSet:s,boxSet,p,cam);}
 else if(t<113.1)constructBlink(t,cam);
 else if(t<133.3)life(BL,blinkGen(t),cam,-1,3);
 else if(t<136.4){const p=phase(t,133.3,136.2);renderSet(CA.from([[-1,4],[0,4],[1,4]]),CA.from([[-1,4],[0,4],[1,4]]),0,cam);for(const[x,y]of[[0,2],[1,3]]){const[X,Y]=project(x,y,cam),[XX,YY]=project(x,4,cam);alpha(.6*(1-p),()=>line(XX,YY,X,L(YY,Y,p),C.yellow,1.5));pixel(X,L(YY,Y,p),U*cam.z,C.yellow,p)}}
 else if(t<171.1627907)life(GL,gliderGen(t),cam,-1,2);
 else life(G,120+Math.max(0,t-175.3)*8,cam,-40,-23);
 lifeAnnotations(t,cam);
}
function lifeAnnotations(t,cam){
 if(t>28&&t<35.5){const[X,Y]=project(0,4,cam),s=U*cam.z;alpha(phase(t,28.8,29.5)*(1-phase(t,34,35.5)),()=>{txt('1',X,Y,Math.min(245,s*.4),C.bg,400,'center','MathSerif');if(s>500)txt('一个位置，一种状态。',X,Y+170,28,C.bg,500,'center')})}

 if(t<26.6){if(t<13){emerge('五个格子',960,184,t,.8,50,C.ink,650,'center');emerge('没有方向指令，却在向前。',960,835,t,5,30,C.yellow,400,'center');const n=Math.floor(core(t).g)-120;label(`GENERATION  ${String(n).padStart(3,'0')}`,1410,850,phase(t,2,3),C.muted,18)}
 else if(t<20){emerge('把镜头拉远。',140,150,t,13.3,34,C.ink,500);emerge('同一套规则，长出一台机器。',960,866,t,16.3,32,C.yellow,500,'center')}
 else{const a=phase(t,20,21)*(1-phase(t,25.7,26.6));alpha(a,()=>{txt('简单规则',134,360,77,C.ink,700);txt('复杂世界',134,465,77,C.yellow,700);line(140,553,420,553,C.blue,2);txt('元胞自动机',140,609,29,C.blue,500);txt('CELLULAR AUTOMATA',140,657,15,C.muted,500)});}}
 if(t>=34&&t<65.8){emerge('一张棋盘，就是整个世界。',130,147,t,34,39,C.ink,550);
  const a=phase(t,38.1,39);alpha(a,()=>{pixel(1410,358,36,C.blue);txt('1',1470,358,42,C.ink,400,'left','MathSerif');txt('亮',1540,358,25,C.muted);ghost(1410,435,36,C.muted,.8);txt('0',1470,435,42,C.ink,400,'left','MathSerif');txt('灭',1540,435,25,C.muted)});
  const near=phase(t,45.6,46.5);const[X,Y]=project(0,4,cam),s=U*cam.z;alpha(near,()=>{rect(X-s*1.5,Y-s*1.5,s*3,s*3,C.yellow,4,false,2);line(X+s*1.5,Y-s*1.5,1330,279,C.yellow,1.3);txt('只读附近',1360,278,29,C.yellow,500)});
  if(t>50.55){const p=(t-50.55)/(4*B),pulse=Math.exp(-((p%1)*9));alpha(.12*pulse,()=>rect(90,220,1740,700,C.blue));emerge('离散的空间  ·  离散的时间  ·  局部的规则',960,852,t,51.7,30,C.ink,400,'center');}
  emerge('Conway’s Game of Life',140,904,t,63.3,24,C.blue,400,'left');}
 if(t>=67.5&&t<99.9){const u=t-chapters[2].start,n=ruleCount(t),[X,Y]=project(0,4,cam),s=U*cam.z;
  emerge('只需要数邻居。',130,147,t,67.5,39,C.ink,550);
  const op=1-phase(t,90.5,92);alpha(op,()=>{nhood.forEach(([x,y],i)=>{const[a,b]=project(x,y,cam);const ap=O(R(t,72.9+i*.12,73.4+i*.12));alpha(ap,()=>{txt(i+1,a,b,23,i<n?C.bg:C.faint,500,'center','MathSerif')})});rect(X-s*.5+3,Y-s*.5+3,s-6,s-6,C.yellow,4,false,2);txt('自己不计入',X,Y+s*2.08,22,C.muted,400,'center');});
  alpha(phase(t,72,73)*op,()=>{txt('N',1342,330,64,C.ink,400,'center','MathItalic');txt('=',1412,330,50,C.muted,400,'center','MathSerif');txt(n,1492,330,82,C.yellow,400,'center','MathSerif');line(1240,405,1640,405,C.grid,1.5);});
  if(t>=76.3&&t<89.2){const dead=u>=18.211,survive=n===3||(!dead&&n===2);txt(dead?'灭格':'亮格',1250,473,28,dead?C.muted:C.blue,500);txt(survive?(dead?'→  诞生':'→  存活'):'→  熄灭',1360,473,33,survive?C.yellow:C.muted,550);txt('B3 / S23',1250,574,43,C.ink,400,'left','MathSerif');txt('亮：2 或 3    灭：恰好 3',1250,643,24,C.muted);}
  if(t>=89.2){emerge('先计算',1250,359,t,89.2,40,C.ink,600);emerge('再一起更新',1250,425,t,94.1,40,C.yellow,600);const pp=phase(t,91.75,94.4);nhood.slice(0,3).forEach(([x,y])=>{const[a,b]=project(x,y,cam);alpha(.6*(1-phase(t,94.4,95.1)),()=>arrow(a,b,L(a,X,pp),L(b,Y,pp),C.yellow,1.4))});if(t>=94.448){const p=R(t,94.448,95.3);ring(X,Y,s*(.5+p*.6),C.yellow,1-p)}emerge('所有格子，读取同一张旧棋盘。',960,856,t,91.5,28,C.muted,400,'center');}}
 if(t>=100.7&&t<133.3){const[X,Y]=project(.5,4.5,cam),sz=U*cam.z;emerge(t<110.596?'稳定，也是算出来的。':'摆动，也是算出来的。',130,147,t,t<110.596?100.7:113.2,39,C.ink,550);
  if(t<110.596){alpha(phase(t,105.6,106.4),()=>{block.forEach(p=>{const[a,b]=project(...p,cam);txt('3',a,b,45,C.bg,500,'center','MathSerif')});txt('每格都有 3 个邻居',960,814,29,C.yellow,400,'center');txt('周期 1',1470,505,35,C.ink,400,'center')});}
  else if(t<114.3){label('重新布置初态',1270,786,1-phase(t,113.5,114.3),C.yellow,23)}
  else{const g=blinkGen(t),p=Q(clamp((g-Math.floor(g)-.7)/.3));txt('周期',1420,442,24,C.muted);txt('2',1455,530,100,C.yellow,400,'center','MathSerif');const a=phase(t,121,122);alpha(a,()=>{ctx.strokeStyle=C.yellow;ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(960,510,250,-Math.PI*.78,Math.PI*.78);ctx.stroke();arrow(782,685,760,663,C.yellow,1.4);txt('横',960,205,22,C.muted,400,'center');txt('竖',960,808,22,C.muted,400,'center')});emerge('规则里，没有「摆动」这个词。',960,881,t,124.1,30,C.ink,400,'center');}}
 if(t>=134&&t<171.1){emerge('移动的，是图案。',130,147,t,134.2,39,C.ink,550);const g=gliderGen(t),steps=chapters[4].countSteps.map(v=>v+chapters[4].start);
  if(t<148.8){const idx=Math.min(4,steps.filter(a=>t>=a).length);for(let k=0;k<5;k++){const x=1390+k*64;ring(x,500,k===idx?23:17,k===idx?C.yellow:C.faint,.8);txt(k,x,500,21,k===idx?C.yellow:C.muted,400,'center','MathSerif');if(k<4)line(x+24,500,x+43,500,C.grid,1)}
   if(t>144.4){const[a,b]=project(0,3,cam),s=U*cam.z;alpha(phase(t,144.4,145),()=>{ctx.setLineDash([6,7]);rect(a-s*1.5,b-s*1.5,s*3,s*3,C.yellow,3,false,1.5);ctx.setLineDash([]);arrow(a,b,...project(1,4,cam),C.yellow,2);txt('4 代 → 平移 (1, 1)',1285,622,28,C.yellow,400)})}}
  if(t>=148.8&&t<160.1){emerge('格子没有搬家。',1390,426,t,152.8,32,C.ink,500);emerge('亮灭的关系在传播。',1390,480,t,154.1,25,C.yellow,400);const[a,b]=project(4,6,cam);alpha(phase(t,153.3,154.2),()=>{ghost(a,b,U*cam.z,C.yellow,.9);line(a,b+U*cam.z/2,a,818,C.yellow,1);txt('位置固定',a,848,23,C.muted,400,'center')});}
  if(t>=160.18&&t<168.8){stadium(t,cam);}
  label('B3 / S23',133,903,phase(t,136.8,137.5),C.muted,21);
 }
 if(t>=172.7&&t<207.7){emerge('沿着滑翔机，找到它的来源。',130,147,t,172.7,39,C.ink,550);const g=120+Math.max(0,t-175.3)*8;
  if(t<201.8){const gg=(g-120)%30;alpha(phase(t,179.8,181),()=>{txt('30',144,784,70,C.yellow,400,'left','MathSerif');txt('代 / 一次发射',252,797,26,C.ink);line(145,860,1770,860,C.grid,1.5);for(let i=0;i<13;i++){const x=160+i*130;line(x,852,x,868,C.faint,1);if(i<=(g-120)/30)pixel(x,860,9,C.yellow)}const a=160+(g-120)/30*130;ring(a,860,13,C.yellow,.75)});
   if(t>189.6){emerge('图案',1100,147,t,189.6,32,C.blue,500);emerge('→',1210,147,t,190,28,C.muted);emerge('信息',1270,147,t,190.4,32,C.yellow,500);emerge('→',1380,147,t,190.8,28,C.muted);emerge('计算',1440,147,t,191.2,32,C.ink,500)}
   emerge('精心构造的生命游戏电路，可以支持通用计算。',960,928,t,196,25,C.muted,400,'center');}
  else{emerge('有 / 无',1260,147,t,202.4,26,C.muted);emerge('→',1390,147,t,202.7,26,C.muted);emerge('1 / 0',1460,147,t,203,42,C.yellow,400);}}
 if(t>=208.4&&t<215.2){emerge('把世界压成一条线。',130,147,t,208.4,39,C.ink,550);const p=phase(t,209,215.2);alpha(p,()=>{line(90,510,1830,510,C.yellow,1.1);txt('空间',1760,551,23,C.muted)});}
}
function stadium(t,cam){const q=phase(t,160.18,161.1)*(1-phase(t,167.5,168.8)),yy=821;alpha(q,()=>{line(253,yy,1667,yy,C.grid,1.5);for(let i=0;i<19;i++){const x=285+i*75,z=Math.exp(-Math.pow((i-((t-160.18)*2.7-2)),2)/3.4),rise=z*62;ghost(x,yy-12,24,C.faint,.5);ctx.strokeStyle=z>.12?C.yellow:C.muted;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,yy-58-rise,7,0,7);ctx.stroke();path([[x,yy-49-rise],[x,yy-27-rise*.4],[x-10,yy-3]],z>.12?C.yellow:C.muted,2);line(x,yy-27-rise*.4,x+10,yy-3,C.muted,2);path([[x-15,yy-37-rise*1.4],[x,yy-44-rise],[x+15,yy-37-rise*1.4]],z>.12?C.yellow:C.muted,2)}txt('人留在原位，人浪向前传播。',960,899,27,C.yellow,400,'center')})}
const EW=385,EH=192,SX=4,SY=2.6,FX=960-(EW-1)*SX/2,FY=386;
const elementary={90:CA.elementary(90,EW,EH),30:CA.elementary(30,EW,EH),110:CA.elementary(110,EW,EH)};
const fields={};
for(const rule of[90,30,110]){const c=document.createElement('canvas');c.width=EW*8;c.height=EH*6;const a=c.getContext('2d');const rows=elementary[rule];for(let y=0;y<EH;y++){a.fillStyle=y%32===0?C.blue:y%2? '#3a94ac':'#56bacb';for(let x=0;x<EW;x++)if(rows[y][x])a.fillRect(x*8,y*6,7.65,5.7)}fields[rule]=c}
function ruleState(t){if(t<245.5813953)return{rule:90,old:90,flip:0};if(t<280.9302326)return{rule:30,old:90,flip:phase(t,247.1,250.1)};return{rule:110,old:30,flip:phase(t,282.1,285.1)}}
function outputPosition(i){return[246+i*204,299]}
function table(t,build=1,collapse=0){const rs=ruleState(t),p=O(build),travel=phase(t,236.4,237.9);for(let i=0;i<8;i++){const endx=246+i*204;const lag=clamp((p-.035*Math.abs(i-4))/.86),z=Q(lag);const cx=L(960,endx,z),cy=L(510,239,z)-Math.sin(z*Math.PI)*Math.abs(i-4)*11;const size=L(90,30,z);let old=rs.old,n=7-i,newV=(rs.rule>>n)&1,oldV=(old>>n)&1;
  if(build<1&&i!==4&&p<.1)continue;
  const a=i===4?1:clamp(p*3);alpha(a,()=>{
   if(build<1){const rootx=960,rooty=L(510,326,p);alpha(.32,()=>{ctx.beginPath();ctx.moveTo(rootx,rooty);ctx.bezierCurveTo(rootx,rooty-70,cx,cy+90,cx,cy+size);ctx.strokeStyle=C.blue;ctx.lineWidth=1.1;ctx.stroke()})}
   for(let b=0;b<3;b++){const xx=cx+(b-1)*size;ghost(xx,cy,size,C.blue,.55);if((n>>(2-b))&1)pixel(xx,cy,size,C.blue)}
   const ob=O(clamp((p-.68)/.32));line(cx,cy+size*.6,cx,L(cy+size*.6,299-21,ob),C.faint,1.2);
   const oy=L(cy+size*1.4,299,ob),flip=(oldV!==newV)?Math.sin(rs.flip*Math.PI):0;ghost(cx,oy,29,C.yellow,ob*.6);
   if(ob>.001){let v=rs.flip<.5?oldV:newV;const h=29*(1-flip*.94);if(v)pixel(cx,oy,29,C.yellow,ob,h);const digitY=L(350,FY,collapse);const digitX=L(cx,960+(i-3.5)*66,collapse);txt(v,digitX,digitY,21+collapse*21,C.yellow,400,'center','MathSerif');}
  });}
 if(p>.7){const a=O(clamp((p-.7)/.3));alpha(a,()=>{line(167,326,1753,326,C.grid,1);txt('111',166,237,15,C.faint,400,'right','MathSerif');txt('000',1754,237,15,C.faint,400,'left','MathSerif')})}
}
function spaceTime(rule,rows,fold=1,t=0,head=true,originX=960,originY=FY,scale=1){if(rows<.01||fold<.001)return;const n=clamp(rows,0,EH),tex=fields[rule],ww=EW*SX*scale,hh=n*SY*fold*scale;ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(tex,0,0,tex.width,n*6,originX-ww/2,originY,ww,hh);ctx.restore();
 if(head&&n<EH-.1){const y=originY+hh;line(originX-ww/2,y,originX+ww/2,y,C.yellow,1);const i=Math.floor(n);txt('t = '+i,originX+ww/2+12,y,17,C.yellow,400,'left','MathSerif')}
}
function elementaryPlane(t){
 const build=phase(t,224.9,229.9),grow=phase(t,215.2,217.4);
 if(t<229.9){const count=20;for(let i=-count/2;i<=count/2;i++){const x=960+i*90,sz=90,h=L(2,90,grow);if(x<65||x>1855)continue;
   const ob=1-build;alpha(ob,()=>{ghost(x,510,sz,C.blue,.45,h);if(i===0||i===1)pixel(x,510,sz,C.blue,1,h)});}
  line(90,L(510,326,build),1830,L(510,326,build),C.yellow,1.1);
  emerge('把世界压成一条线。',130,147,t,208.4,39,C.ink,550);
  if(t>=220.7&&t<226.1){alpha(phase(t,220.7,221.4)*(1-phase(t,225.1,226.1)),()=>{['左','自己','右'].forEach((s,i)=>txt(s,870+i*90,421,26,i===1?C.muted:C.blue,400,'center'));txt('2 × 2 × 2 = 8',960,730,57,C.yellow,400,'center','MathSerif');txt('三个位置，八种可能。',960,819,26,C.muted,400,'center')})}
  if(t>224.9)table(t,R(t,224.9,229.9));
  return;
 }
 const state=ruleState(t),rule=state.rule;let rows=0,fold=1,showRule=rule;
 if(t<245.5813953)rows=EH*O(R(t,236.1,243.7));
 else if(t<250.4){showRule=90;rows=EH;fold=1-phase(t,245.5813953,250.4);}
 else if(t<280.9302326)rows=EH*O(R(t,252.99,263.5));
 else if(t<285.8){showRule=30;rows=EH;fold=1-phase(t,280.9302326,285.8);}
 else rows=EH*O(R(t,285.8,304.4));
 const close=phase(t,309.2,314.5),shrink=phase(t,312.5581395,316.8);fold*=1-phase(t,309.2,314.5);
 // The original row survives as the x-axis; its central cell is the seed in every field.
 alpha(1-shrink,()=>{line(184,FY-10,1736,FY-10,C.grid,1);arrow(184,FY-10,1736,FY-10,C.faint,1.2);
 const height=EH*SY*fold;arrow(184,FY,184,FY+height,C.faint,1.1,Math.min(1,rows/50));
 if(rows>25)txt('时间',148,FY+Math.min(height,450)/2,21,C.muted,400,'center');});
 spaceTime(showRule,rows,fold,t,true);
 const seedSize=L(18,4,phase(t,237,239));alpha(1-shrink,()=>pixel(960,FY,seedSize,C.yellow));
 const seed=phase(t,235.9,237.5);if(t>=235.9&&t<237.5){const sx=246+3*204,sy=299;const xx=bez(sx,sx,960,960,seed),yy=bez(sy,338,330,FY,seed);pixel(xx,yy,29*(1-seed)+5*seed,C.yellow);alpha(.3,()=>{ctx.beginPath();ctx.moveTo(sx,sy);ctx.bezierCurveTo(sx,338,960,330,960,FY);ctx.strokeStyle=C.yellow;ctx.lineWidth=1;ctx.stroke()})}
 const hide=phase(t,312.5581395,315.6);alpha(1-hide,()=>table(t,1,close));
 if(t<245.58){emerge('八个答案，定义一个世界。',130,147,t,229.9,39,C.ink,550);emerge('RULE 90',1735,147,t,231.5,31,C.yellow,500,'right');if(t>231.5&&t<237){txt('左右不同 → 亮',960,609,36,C.yellow,500,'center');txt('next = left ⊕ right',960,676,35,C.ink,400,'center','MathSerif');}
  if(t>=239.9){const a=phase(t,239.9,241);alpha(a,()=>{const xx=960,yy=FY+EH*SY*.5;path([[xx-250,yy+135],[xx,yy-8],[xx+250,yy+135]],C.yellow,1.5);txt('大三角形里，藏着小三角形。',960,929,26,C.yellow,400,'center')});}}
 else if(t<280.93){emerge('只换几个答案。',130,147,t,245.8,39,C.ink,550);const which=t<248.6?'RULE 90':'RULE 30';txt(which,1735,147,31,C.yellow,500,'right');
  if(t>248.6&&t<253.5){const a=phase(t,248.6,249.3)*(1-phase(t,252.7,253.5));alpha(a,()=>{txt('00011110₂',960,571,61,C.yellow,400,'center','MathSerif');txt('同一个亮点，同一种更新方式。',960,670,29,C.muted,400,'center')});}
  if(t>257){const a=phase(t,257,258);alpha(a,()=>{const y=FY+400;line(960,FY,960,y,C.yellow,1);txt('整齐',590,920,24,C.blue,400,'center');txt('复杂',1320,920,24,C.yellow,400,'center')});}
  if(t>260.2){const a=phase(t,260.2,261);alpha(a,()=>{txt('没有随机数',130,196,22,C.yellow,500);txt('相同输入 → 相同输出',1735,196,22,C.muted,400,'right')});}
  if(t>267.3){const p=phase(t,267.3,268.3);alpha(p,()=>{txt('确定 ≠ 容易预测',960,148,34,C.ink,550,'center')})}
 }
 else if(t<312.5581395){emerge('八位规则，通向通用计算。',130,147,t,281.2,39,C.ink,550);txt(t<283.6?'RULE 30':'RULE 110',1735,147,31,C.yellow,500,'right');
  if(t>=291){const a=phase(t,291,292);alpha(a,()=>{txt('Matthew Cook · 2004',1734,196,20,C.muted,400,'right');txt('合适的初始配置 → 通用计算',130,196,23,C.yellow,400)});}
  if(t>=296.8&&t<306){txt('演化示例；不是完整通用计算机构造',960,929,22,C.muted,400,'center');}
  if(t>306){alpha(phase(t,306,307)*(1-shrink),()=>{txt('8 位，定义如此丰富的行为。',960,929,27,C.yellow,500,'center')})}
 }
 if(t>=312.5581395)closing(t);
}
function miniature(type,t,x,y,size){const sc=size/10;let pts=[];if(type===0)pts=CA.block;if(type===1)pts=CA.coords(BL[Math.floor(t/B)%2]);if(type===2){const g=Math.floor(t/B)%4;pts=CA.coords(GL[g]);}if(type===3)pts=CA.coords(G[120+Math.floor(t/B)%30]);if(type===4){const r=elementary[110];for(let j=0;j<24;j++)for(let i=168;i<216;i++)if(r[j][i])pts.push([i-168,j])}
 const minX=Math.min(...pts.map(p=>p[0])),maxX=Math.max(...pts.map(p=>p[0])),minY=Math.min(...pts.map(p=>p[1])),maxY=Math.max(...pts.map(p=>p[1]));const n=Math.max(maxX-minX+2,maxY-minY+2),s=size/n;pts.forEach(([xx,yy])=>pixel(x+(xx-(maxX+minX)/2)*s,y+(yy-(maxY+minY)/2)*s,s,type===4?C.yellow:C.blue,1,s,false));}
function closing(t){const start=312.5581395,branch=phase(t,start+1.3,start+6.5),merge=phase(t,326.7,331.8);const labels=['静止','摆动','移动','生长','计算'],tim=[316.318,317.978,319.298,320.218,321.458];const a=1-phase(t,331,332.6);
 // The field retracts to its original row; that row becomes the spine of this constellation.
 const lineY=L(FY,510,branch);alpha(a,()=>line(L(960,285,branch),lineY,L(960,1635,branch),lineY,C.yellow,1.2));
 for(let i=0;i<5;i++){const on=phase(t,tim[i]-.35,tim[i]+.5),x=L(L(960,300+i*330,branch),960,merge),y=L(lineY,510,merge)-Math.sin(merge*Math.PI)*(110+35*Math.abs(i-2));const s=L(136,1,merge)*on;alpha(a,()=>{if(on>0)miniature(i,t,x,y,s);if(on<1)pixel(x,y,14,C.yellow);if(merge<.94){txt(labels[i],x,y+132*(1-merge),L(28,12,merge),C.muted,400,'center');line(x,y+90*(1-merge),x,y+60*(1-merge),C.grid,1)}});}
 const cellY=T(t,[[312.55,FY],[319,510],[332,510],[335,729],[349,729]]);if(t<316.4||t>329.5)pixel(960,cellY,L(5,28,phase(t,329.5,332.5)),C.yellow);
 if(t>330.2){emerge('复杂，藏在关系里。',960,389,t,330.2,72,C.ink,650,'center');emerge('局部规则',590,565,t,332,35,C.blue,500,'center');emerge('×',790,565,t,332.4,43,C.muted,400,'center','MathSerif');emerge('时间',960,565,t,332.6,35,C.ink,500,'center');emerge('→',1125,565,t,333,40,C.muted,400,'center');emerge('整体行为',1350,565,t,333.2,35,C.yellow,500,'center');const q=phase(t,332,335);line(440,630,440+1040*q,630,C.grid,1);}
 if(t>=335.6&&t<342.8){emerge('数学模型，帮助我们理解涌现。',960,840,t,335.6,27,C.muted,400,'center');}
 if(t>=343){emerge('简单规则，究竟能走多远？',960,840,t,343,32,C.yellow,500,'center');}
 if(t>=350){const p=phase(t,350,352),s=22;for(const[x,y]of CA.glider){const xx=960+(x-1)*s,yy=729+(y-1)*s;pixel(L(960,xx,p),L(729,yy,p),L(28,s,p),C.blue)}}
}
let matte;
function buildMatte(){matte=document.createElement('canvas');matte.width=W*D;matte.height=H*D;const a=matte.getContext('2d'),im=a.createImageData(matte.width,matte.height),data=im.data;for(let y=0;y<matte.height;y++)for(let x=0;x<matte.width;x++){let r=Math.min(1,Math.hypot(x/D-960,y/D-470)/1100),p=r<.65?r/.65:(r-.65)/.35,c0=r<.65?[19,35,50]:[10,20,32],c1=r<.65?[10,20,32]:[8,12,20],i=(y*matte.width+x)*4;data[i]=Math.round(L(c0[0],c1[0],p));data[i+1]=Math.round(L(c0[1],c1[1],p));data[i+2]=Math.round(L(c0[2],c1[2],p));data[i+3]=255}a.putImageData(im,0,0)}
function background(t){ctx.drawImage(matte,0,0,W,H)}
function overlay(t){let ci=chapters.findIndex(c=>t<c.end);if(ci<0)ci=9;txt('CELLULAR AUTOMATA',106,64,15,C.muted,500);txt('元胞自动机',106,92,18,C.ink,500);txt(String(ci+1).padStart(2,'0')+' / 10',1814,72,19,C.muted,400,'right','MathSerif');line(346,78,1750,78,C.grid,.75);
 const cap=caps.find(c=>t>=c.start&&t<c.end);if(cap){ctx.font='400 31px Noto';const w=ctx.measureText(cap.text).width;alpha(.94,()=>rect((W-w)/2-23,970,w+46,57,'#080d16',4));txt(cap.text,960,998,31,C.ink,400,'center');}
 line(106,1047,1814,1047,C.grid,1);line(106,1047,106+1708*clamp(t/P.duration),1047,C.blue,1.5);chapters.forEach(c=>{const x=106+1708*c.start/P.duration;line(x,1043,x,1051,t>=c.start?C.blue:C.faint,1)});
}
const fast=[[12.8,18.3],[19.5,22.4],[26.4,36],[45,48],[66.2,69.4],[89.5,99.8],[110.596,113.3],[129.5,136.4],[148.8,154],[160,168.8],[171.1628,173.5628],[202.5,207.9],[209,217.4],[224.9,229.9],[235.9,239],[245.5814,250.4],[280.9303,285.8],[312.5582,319],[326.7,335],[350,352]];
function render(t){ctx.setTransform(D,0,0,D,0,0);ctx.globalAlpha=1;ctx.setLineDash([]);background(t);if(t<215.2)lifePlane(t);else elementaryPlane(t);overlay(t);if(t>P.duration-1.2)alpha(phase(t,P.duration-1.2,P.duration),()=>rect(0,0,W,H,'#000'));}
window.V2={camera,project,gliderGen,blinkGen,fast};
Shot.define({setup:buildMatte,duration:P.duration,fps:60,fonts:[['400 31px Noto','元胞自动机'],['550 39px Noto','只需要数邻居'],['650 72px Noto','复杂藏在关系里'],['700 77px Noto','简单规则'],['400 64px MathSerif','0123456789×='],['400 64px MathItalic','N']],render,post:{motionBlur:8,maxMotionBlur:8,shutter:.5,grain:0},blurAt(t){let displacement=0;for(const[a,b]of fast){const u=R(t,a,b),derivative=30*u*u*(1-u)*(1-u)/(b-a);const distance=a===26.4?6500:a===12.8?2200:a===224.9?1600:a===245.5814||a===280.9303?510:1100;displacement=Math.max(displacement,derivative*distance*D*.5/60)}return clamp(Math.ceil(displacement/2.5),1,8)},meta:{title:'简单规则，复杂世界 · V2',version:2,bpm:129,continuity:'one persistent lattice, physical collapse and expansion, seed preserved through all elementary rules',audio:'V1 AAC stream copied without re-encoding',chapters:chapters.map(({title,start})=>({title,start}))}});
})();
