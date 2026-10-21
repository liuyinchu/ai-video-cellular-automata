/* Analytic, bounded motion primitives. No integrator, previous-frame state, or clock. */
(function(root){
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,p)=>a+(b-a)*p;
  const progress=(t,a,b)=>clamp((t-a)/(b-a));
  const quint=x=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x))};
  const out=x=>{x=clamp(x);return 1-Math.pow(1-x,4)};
  const spring=(x,w=8)=>{x=clamp(x);const f=u=>1-(1+w*u)*Math.exp(-w*u);return f(x)/f(1)};
  function track(t,keys){if(t<=keys[0][0])return keys[0][1];for(let i=1;i<keys.length;i++){if(t<=keys[i][0])return lerp(keys[i-1][1],keys[i][1],quint(progress(t,keys[i-1][0],keys[i][0])))}return keys[keys.length-1][1]}
  function bezier(a,b,c,d,u){const v=1-u;return v*v*v*a+3*v*v*u*b+3*v*u*u*c+u*u*u*d}
  const M={clamp,lerp,progress,quint,out,spring,track,bezier};
  if(typeof module!=='undefined')module.exports=M;else root.MotionV2=M;
})(typeof window!=='undefined'?window:globalThis);
