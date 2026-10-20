/* Exact, unbounded Conway B3/S23 and elementary one-dimensional automata. */
(function(root){
  const key=(x,y)=>`${x},${y}`;
  const from=(a)=>new Set(a.map(([x,y])=>key(x,y)));
  const coords=s=>Array.from(s,k=>k.split(',').map(Number));
  function step(s){
    const n=new Map();
    for(const k of s){const [x,y]=k.split(',').map(Number);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const q=key(x+dx,y+dy);n.set(q,(n.get(q)||0)+1)}}
    const next=new Set();for(const [k,c] of n)if(c===3||(c===2&&s.has(k)))next.add(k);return next;
  }
  function history(seed,n){const h=[from(seed)];for(let i=0;i<n;i++)h.push(step(h[i]));return h}
  function parseRLE(s){let x=0,y=0,n='',out=[];for(const c of s){if(/\d/.test(c)){n+=c;continue}const q=Number(n)||1;n='';if(c==='b')x+=q;else if(c==='o'){for(let i=0;i<q;i++)out.push([x++,y])}else if(c==='$'){y+=q;x=0}else if(c==='!')break}return out}
  const glider=[[1,0],[2,1],[0,2],[1,2],[2,2]];
  const block=[[0,0],[1,0],[0,1],[1,1]];
  const blinker=[[0,1],[1,1],[2,1]];
  const gun=parseRLE('24bo11b$22bobo11b$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o14b$2o8bo3bob2o4bobo11b$10bo5bo7bo11b$11bo3bo20b$12b2o!');
  function elementary(rule,width,height,initial){let row=new Uint8Array(width);if(initial)for(let i=0;i<width;i++)row[i]=initial[i]||0;else row[Math.floor(width/2)]=1;const rows=[row];for(let y=1;y<height;y++){const a=new Uint8Array(width);for(let x=1;x<width-1;x++)a[x]=(rule>>((row[x-1]<<2)|(row[x]<<1)|row[x+1]))&1;rows.push(a);row=a}return rows}
  const api={key,from,coords,step,history,parseRLE,glider,block,blinker,gun,elementary};
  if(typeof module!=='undefined')module.exports=api;else root.CA=api;
})(typeof window!=='undefined'?window:globalThis);
