const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../src/motion-v2.js'),CA=require('../src/simulation.js');
// The glider survives the zoom-out into the gun at exactly the same coordinates.
const gl=CA.history(CA.glider,25)[25],gun=CA.history(CA.gun,120)[120];
const translated=new Set(CA.coords(gun).map(([x,y])=>`${x-40},${y-23}`));
for(const[x,y]of CA.coords(gl))assert(translated.has(`${x-1},${y+2}`));
assert.equal(gl.size,5);
const still=CA.from([[0,4],[1,4],[0,5],[1,5]]);assert.deepEqual(CA.step(still),still);
// Minimum-jerk camera moves end with zero velocity and acceleration.
const h=1e-4;assert.equal(M.quint(0),0);assert.equal(M.quint(1),1);
assert(Math.abs((M.quint(h)-M.quint(0))/h)<1e-5);
assert(Math.abs((M.quint(1)-M.quint(1-h))/h)<1e-5);
assert(Math.abs((M.quint(2*h)-2*M.quint(h)+M.quint(0))/(h*h))<.01);
let previous=0;for(let i=0;i<=1000;i++){const y=M.quint(i/1000);assert(y>=previous-1e-14&&y<=1+1e-14);previous=y;}
// Test the production camera. Pixel determinism is checked separately in Chromium.
const context=new Proxy({},{get:()=>()=>{}}),canvas={getContext:()=>context};
const w={devicePixelRatio:1},scope={window:w,document:{getElementById:()=>canvas,createElement:()=>canvas},MotionV2:M,CA,Shot:{define:()=>{}},Set,Math};
w.PRODUCTION=JSON.parse(fs.readFileSync('src/production-timed.json'));vm.createContext(scope);vm.runInContext(fs.readFileSync('src/film-v2.js','utf8'),scope);
for(const t of[31.3,66.2,100.4,133.3,171.1627907]){const a=w.V2.camera(t-1e-5),b=w.V2.camera(t+1e-5);for(const p of[[a.x,a.y],[a.x+2,a.y+2]]){const aa=w.V2.project(...p,a),bb=w.V2.project(...p,b);assert(Math.hypot(aa[0]-bb[0],aa[1]-bb[1])<.05,`camera jump at ${t}`)}}
const end=w.V2.camera(215.2);assert.equal(end.flat,0);const a=w.V2.project(-40,-19,end),b=w.V2.project(-39,-19,end);assert(Math.abs(a[0]-960)<1e-6&&Math.abs(a[1]-510)<1e-6);assert(Math.abs(b[0]-1050)<1e-6);
assert.equal(w.V2.gliderGen(171),25);
console.log('V2: exact glider-to-gun handoff; B3-to-block handoff; bounded C2 motion; five camera joins; 2D-to-1D shared row — passed.');

for(let t=26.4;t<=30.5;t+=.02){const c=w.V2.camera(t),p=w.V2.project(0,4,c);assert(p[0]>170&&p[0]<1750&&p[1]>200&&p[1]<900,"zoom lost its cell");}
for(let t=171.1628;t<=173.5628;t+=.02){const c=w.V2.camera(t),p=w.V2.project(6.2,9.8,c);assert(p[0]>100&&p[0]<1800&&p[1]>190&&p[1]<920,"zoom-out lost the surviving glider");}
console.log("The hero remains in frame throughout both camera handoffs.");
