const assert=require('node:assert/strict');const CA=require('../src/simulation.js');
const equal=(a,b)=>assert.deepEqual([...a].sort(),[...b].sort());
equal(CA.step(CA.from(CA.block)),CA.from(CA.block));
const bh=CA.history(CA.blinker,2);assert.notDeepEqual([...bh[0]],[...bh[1]]);equal(bh[0],bh[2]);
const gh=CA.history(CA.glider,4);equal(gh[4],CA.from(CA.glider.map(([x,y])=>[x+1,y+1])));
assert.equal(CA.gun.length,36);const gun=CA.history(CA.gun,120);
// The gun's mechanism repeats after 30 generations; escaping gliders live outside x<36,y<9.
const core=s=>new Set([...s].filter(k=>{const[x,y]=k.split(',').map(Number);return x<36&&y<9}));equal(core(gun[0]),core(gun[30]));assert(gun[120].size>gun[0].size);
for(let left=0;left<2;left++)for(let mid=0;mid<2;mid++)for(let right=0;right<2;right++)assert.equal((90>>((left<<2)|(mid<<1)|right))&1,left^right);
assert.equal(Array.from({length:8},(_,i)=>(110>>(7-i))&1).join(''),'01101110');
assert.equal(Array.from({length:8},(_,i)=>(30>>(7-i))&1).join(''),'00011110');
const e=CA.elementary(90,9,3);assert.deepEqual([...e[1]],[0,0,0,1,0,1,0,0,0]);assert.deepEqual([...e[2]],[0,0,1,0,0,0,1,0,0]);
console.log('PASS: still life, period-2 oscillator, glider displacement, 36-cell period-30 gun, XOR rule 90, rule tables 30 and 110, synchronous evolution.');
