// Loopback-only delivery viewer, with byte ranges for smooth video seeking.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),port=Number(process.env.VIDEO_REVIEW_PORT||18731);
const types={'.html':'text/html; charset=utf-8','.mp4':'video/mp4','.wav':'audio/wav','.png':'image/png','.jpg':'image/jpeg','.zip':'application/zip','.json':'application/json; charset=utf-8','.md':'text/markdown; charset=utf-8','.srt':'text/plain; charset=utf-8','.ttf':'font/ttf','.woff2':'font/woff2'};
http.createServer((req,res)=>{
  let name;try{name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname)}catch{res.writeHead(400);return res.end()}
  if(name==='/'){res.writeHead(302,{Location:'/output/index.html'});return res.end()}
  if(name.endsWith('/'))name+='index.html';
  if(!/^\/(output|docs|assets)\//.test(name)){res.writeHead(404);return res.end()}
  const file=path.resolve(root,'.'+name);
  if(!file.startsWith(root+path.sep)||name.split('/').some(x=>x.startsWith('.'))){res.writeHead(403);return res.end()}
  fs.stat(file,(e,stat)=>{
    if(e||!stat.isFile()){res.writeHead(404);return res.end('File is not ready yet.')}
    const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache'};
    let start=0,end=stat.size-1,status=200;
    if(req.headers.range){const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!m){res.writeHead(416);return res.end()}
      if(m[1])start=Number(m[1]);else if(m[2])start=Math.max(0,stat.size-Number(m[2]));
      if(m[1]&&m[2])end=Math.min(end,Number(m[2]));
      if(start>end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});return res.end()}
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
    }
    headers['Content-Length']=end-start+1;res.writeHead(status,headers);if(req.method==='HEAD')return res.end();fs.createReadStream(file,{start,end}).pipe(res);
  });
}).listen(port,'127.0.0.1',()=>console.log(`Film viewer: http://127.0.0.1:${port}/output/index.html`));
