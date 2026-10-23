// ---- building crash: detection (piggybacks on the throttled height samples), blood burst, slide down the wall, respawn
const CR={graceS:0,cityT:-1e9,lastGroundT:0,probe:null,wall:null,safe:[],safeT:0,pc:null,bc:null,parts:[],decal:null,trail:null,pool:null,ui:null,graceT:0,lastStats:''};
const CR_M=111320,CR_SPEED=6;const crWhy=(r,o)=>{window.__crashWhy={r,...(o||{}),t:Math.round(performance.now())};};
function crAt(lon0,lat0,hd,d){const cosl=Math.cos(lat0*Math.PI/180);return [lon0+Math.sin(hd)*d/(CR_M*cosl),lat0+Math.cos(hd)*d/CR_M];}
function crSurf(lon,lat){const g=groundAt(lon,lat);return g;}
// roofs are flat, tree canopies are lumpy: sample two more points and require they agree
function crFlat(lon,lat,hd,along,ref){const pts=[];for(const [a,l] of along)pts.push(crSurf(...crAtL(lon,lat,hd,a,l)));const v=pts.filter(x=>x!=null);if(v.length<2)return false;
 const all=v.concat([ref]),spread=Math.max(...all)-Math.min(...all);window.__crFlat={pts:v.map(x=>+x.toFixed(2)),ref:+ref.toFixed(2),spread:+spread.toFixed(2)};return v.length>=2&&spread<1.5;}
function crAtL(lon0,lat0,hd,d,l){const cosl=Math.cos(lat0*Math.PI/180);return [lon0+(Math.sin(hd)*d+Math.cos(hd)*l)/(CR_M*cosl),lat0+(Math.cos(hd)*d-Math.sin(hd)*l)/CR_M];}
function crIsBuilding(top,front,terr,flatFn){const tall=top-terr;if(tall<=8)return false;const fromGround=front!=null&&front-terr<4,big=front!=null&&top-front>15;
 if(!(fromGround||big))return false;return tall>35||flatFn();}
function crEligible(now){return mode==='fly'&&!S.crash&&!S.hover&&!S.perched&&!S.landing&&now>CR.graceT&&CR.graceS<=0&&S.speed>=4;}
// called from heightTick right after a look-ahead sample (k: index, dd: distance, g: surface, t: terrain)
function crAheadSample(dd,g,t){const now=performance.now();if(!crEligible(now)||CR.probe||CR.wall||g==null)return;t=t??S.terr;if(t==null)return;// terrain unknown: can't tell a building from the ground
 if(g>S.h-0.3&&g-t>8&&S.h-(S.ground??-1e9)>0.2)CR.probe={lon0:S.lon,lat0:S.lat,hd:S.heading,h:S.h,g0:S.ground,lo:0,hi:dd,hiS:g,loS:S.ground,n:0};}
// one bisection step per frame (one GPU sample) until the wall face is located to ~1 m; returns true if it used the frame's sample
function crProbeStep(){const P=CR.probe;if(!P)return false;const now=performance.now();if(!crEligible(now)){CR.probe=null;return false;}
 if(P.n<6){const mid=(P.lo+P.hi)/2,[lo,la]=crAt(P.lon0,P.lat0,P.hd,mid),s=crSurf(lo,la);if(s!=null&&s>P.h-0.3){P.hi=mid;P.hiS=s;}else{P.lo=mid;if(s!=null)P.loS=s;}P.n++;return true;}
 CR.probe=null;const [lo2,la2]=crAt(P.lon0,P.lat0,P.hd,P.hi+2),s2=crSurf(lo2,la2),[lo3,la3]=crAt(P.lon0,P.lat0,P.hd,P.hi),t=terrainAt(lo3,la3)??S.terr;
 const top=Math.max(P.hiS,s2??-1e9),step=P.hiS-(P.loS??-1e9),sb=crSurf(...crAt(P.lon0,P.lat0,P.hd,Math.max(0,P.hi-4))),rise=P.hiS-(sb??P.hiS);
 const tall=t==null?0:top-t,steep=step>5||rise>5||(sb!=null&&sb<P.h-2);
 const front=P.loS??sb;if(steep&&t!=null&&crIsBuilding(top,front,t,()=>crFlat(P.lon0,P.lat0,P.hd,[[P.hi+2,0],[P.hi+4,1.5],[P.hi+3,-1.5]],s2??P.hiS))){CR.wall={lon0:P.lon0,lat0:P.lat0,hd:P.hd,dist:P.hi,top};crWhy('wall',{dist:P.hi,top,tall});}// a steep face rising well above terrain: a building
 else crWhy('probe-reject',{step,rise,tall,front});
 return true;}
// called from heightTick after the ground sample under the eagle: if the "ground" jumped up above us we flew into a building between samples
function crGroundSample(prev,g0,tg){const now=performance.now();if(!crEligible(now)||g0==null)return false;tg=tg??S.terr;if(tg==null)return false;
 const tall=g0-tg;if(!(g0>S.h-0.3&&tall>8))return false;
 const pen=g0-S.h,fromLow=prev!=null&&g0-prev>3;
 if(!fromLow&&prev!=null&&Math.abs(g0-prev)<=3){if(S.pitch<-0.12)return crRoofHit(g0);return false;}// already over this roof: only a dive into it counts
 if(!crIsBuilding(g0,prev,tg,()=>crFlat(S.lon,S.lat,S.heading,[[0,2.5],[0,-2.5],[2.5,0]],g0))){crWhy('ground-reject',{tall,pen,prev});return false;}
 // we entered the building since the last sample: search back along our path for the face
 const gap=Math.min(3,Math.max(0.2,(now-(CR.lastGroundT||now))/1000));let back=S.speed*gap+5;
 for(let k=0;k<3;k++){const sb=crSurf(...crAt(S.lon,S.lat,S.heading,-back));if(sb==null||sb<S.h-1){crWhy('ground-crash',{back,pen,tall});crCrash(-back,0);return true;}back*=2;}
 crWhy('ground-crash-noface',{pen,tall});crCrash(-1,0);return true;}
// dived onto a roof (ground under us is a building top)
function crRoofHit(roof){const now=performance.now();if(!crEligible(now))return false;const vz=Math.sin(S.pitch)*S.speed;if(vz>-3.5)return false;
 if(S.terr==null)return false;const tall=roof-S.terr;if(!(tall>8&&(tall>35||crFlat(S.lon,S.lat,S.heading,[[2.5,0],[-2.5,0],[0,2.5]],roof)))){crWhy('roof-reject',{tall});return false;}
 crWhy('roof',{vz,tall});crCrash(0,0,roof);return true;}
// per-frame CPU check against a located wall
function crWallCheck(){const W=CR.wall;if(!W||S.crash)return;const now=performance.now();if(!crEligible(now)){CR.wall=null;return;}
 const cosl=Math.cos(W.lat0*Math.PI/180),ex=(S.lon-W.lon0)*CR_M*cosl,ny=(S.lat-W.lat0)*CR_M,along=ex*Math.sin(W.hd)+ny*Math.cos(W.hd),lat=ex*Math.cos(W.hd)-ny*Math.sin(W.hd);
 let dh=((S.heading-W.hd+Math.PI*3)%(Math.PI*2))-Math.PI;const rem=W.dist-along;
 if(Math.abs(dh)>0.6||Math.abs(lat)>8||rem<-60){CR.wall=null;return;}
 if(rem<=0.5){if(S.h<W.top-0.2)crCrash(-3,3);else CR.wall=null;}}
// precise wall face along current heading between a (open air) and b (inside), then start the crash sequence
function crCrash(a,b,roof){CR.wall=null;CR.probe=null;const lon0=S.lon,lat0=S.lat,hd=S.heading;if(roof!=null)S.h=roof+0.12;const h=S.h;if(roof!=null){crStart(lon0,lat0,hd,h,0,roof,true);return;}
 let lo=a,hi=b;const sa=crSurf(...crAt(lon0,lat0,hd,a));if(sa!=null&&sa>h-0.3){lo=a-4;}
 for(let i=0;i<6;i++){const mid=(lo+hi)/2,s=crSurf(...crAt(lon0,lat0,hd,mid));if(s!=null&&s>h-0.3)hi=mid;else lo=mid;}
 const w=(lo+hi)/2;
 if(S.speed<CR_SPEED){[S.lon,S.lat]=crAt(lon0,lat0,hd,w-1.2);S.speed=3;S.heading=hd+Math.PI*0.9;CR.graceT=performance.now()+1200;beep(220,120,.15,'triangle');toast('🧱 Bonk!');return;}
 const [bl,ba]=crAt(lon0,lat0,hd,w-0.7);let base=crSurf(bl,ba);const tb=terrainAt(bl,ba);if(base==null||base>h-0.5)base=tb??(S.ground||0);
 crStart(lon0,lat0,hd,h,w,base,false);}
function crStart(lon0,lat0,hd,h,w,base,roof){const [wl,wa]=crAt(lon0,lat0,hd,w);// point on the wall face at eagle height
 [S.lon,S.lat]=crAt(lon0,lat0,hd,roof?0:w-0.32);
 const now=performance.now();const sf=CR.safe.length>4?CR.safe[CR.safe.length-5]:CR.safe[0];
 S.crash={t0:now,hd,wl,wa,h0:h,base,roof,v:0,phase:'impact',safe:sf?{...sf}:null,speed:S.speed,spin:(Math.random()<.5?-1:1)*(3+Math.random()*2)};
 S.boostT=0;S.hover=false;$('hover').classList.remove('on');poopCam=null;
 beep(160,40,.45,'sawtooth');setTimeout(()=>beep(900,200,.12,'square'),40);try{navigator.vibrate&&navigator.vibrate([60,40,120]);}catch(e){}
 crBurst(wl,wa,h,hd);if(!roof)crDecal(wl,wa,h,hd);else{if(CR.decal)viewer.entities.remove(CR.decal);if(CR.trail)viewer.entities.remove(CR.trail);if(CR.pool)viewer.entities.remove(CR.pool);CR.decal=CR.trail=CR.pool=null;}toast('💥 SPLAT! Crashed into a building');
 statsEl.textContent='💀 CRASHED';window.__crash={w,base,h0:h,roof:!!roof};}
// --- visuals
function crCanvasSplat(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
 const blob=(x,y,r,a)=>{g.fillStyle=`rgba(${110+Math.random()*60|0},0,${Math.random()*12|0},${a})`;g.beginPath();g.arc(x,y,r,0,7);g.fill();};
 blob(64,60,26,.92);for(let i=0;i<26;i++){const a=Math.random()*6.28,d=18+Math.random()*40;blob(64+Math.cos(a)*d,60+Math.sin(a)*d,2+Math.random()*7,.85);}
 for(let i=0;i<7;i++){const x=40+Math.random()*48;g.fillStyle='rgba(120,0,4,.85)';g.fillRect(x,64,3+Math.random()*3,30+Math.random()*34);blob(x+2,96+Math.random()*30,4,.85);}return c;}
function crCanvasFeather(){const c=document.createElement('canvas');c.width=64;c.height=20;const g=c.getContext('2d');g.fillStyle='#4a3220';g.beginPath();g.ellipse(34,10,28,7,0,0,7);g.fill();g.strokeStyle='#d9d0c0';g.lineWidth=1.5;g.beginPath();g.moveTo(4,10);g.lineTo(62,10);g.stroke();
 g.strokeStyle='rgba(20,12,6,.6)';for(let x=12;x<60;x+=5){g.beginPath();g.moveTo(x,10);g.lineTo(x+4,4);g.moveTo(x,10);g.lineTo(x+4,16);g.stroke();}return c;}
let CR_SPLAT=null,CR_FEATHER=null,CR_FEATHER_W=null;
function crEnsure(){if(!CR.pc){CR.pc=viewer.scene.primitives.add(new C.PointPrimitiveCollection());CR.bc=viewer.scene.primitives.add(new C.BillboardCollection());}
 if(!CR_SPLAT){CR_SPLAT=crCanvasSplat();CR_FEATHER=crCanvasFeather().toDataURL();}}
function crBurst(lon,lat,h,hd){crEnsure();const enu=C.Transforms.eastNorthUpToFixedFrame(C.Cartesian3.fromDegrees(lon,lat,h));const nx=-Math.sin(hd),ny=-Math.cos(hd),px=Math.cos(hd),py=-Math.sin(hd);
 CR.enu=enu;CR.h0=h;
 for(let i=0;i<46;i++){const out=1.5+Math.random()*5,side=(Math.random()-.5)*7,up=Math.random()*5-0.5;const shade=90+Math.random()*110|0;
  const prim=CR.pc.add({position:C.Cartesian3.ZERO,pixelSize:3+Math.random()*7,color:C.Color.fromBytes(shade,0,Math.random()*15|0,240)});
  CR.parts.push({k:'b',x:nx*0.25,y:ny*0.25,z:0,vx:nx*out+px*side,vy:ny*out+py*side,vz:up,life:1.6+Math.random()*1.2,prim});}
 for(let i=0;i<12;i++){const out=0.8+Math.random()*2.5,side=(Math.random()-.5)*3;
  const prim=CR.bc.add({position:C.Cartesian3.ZERO,image:CR_FEATHER,width:0.16,height:0.05,sizeInMeters:true,rotation:Math.random()*6.28,color:Math.random()<.35?C.Color.WHITE:C.Color.fromCssColorString('#cbb8a0')});
  CR.parts.push({k:'f',x:nx*0.3,y:ny*0.3,z:0,vx:nx*out+px*side,vy:ny*out+py*side,vz:1+Math.random()*2.5,life:4.5+Math.random()*2,prim,ph:Math.random()*6,spin:(Math.random()-.5)*6});}}
const _crL=new C.Cartesian3(),_crW=new C.Cartesian3();
function crParts(dt){if(!CR.parts.length)return;const zg=(S.crash?S.crash.base:CR.h0)-CR.h0+0.03;
 for(let i=CR.parts.length-1;i>=0;i--){const p=CR.parts[i];p.life-=dt;
  if(p.k==='b'){if(p.z>zg){p.vz-=9.8*dt;p.vx*=1-1.2*dt;p.vy*=1-1.2*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.z<zg)p.z=zg;}}
  else{p.ph+=dt*4;p.vx*=1-2.2*dt;p.vy*=1-2.2*dt;p.vz+=(-0.7-p.vz)*2.5*dt;p.x+=(p.vx+Math.sin(p.ph)*0.5)*dt;p.y+=(p.vy+Math.cos(p.ph*0.7)*0.5)*dt;if(p.z>zg)p.z+=p.vz*dt;else p.z=zg;p.prim.rotation+=p.spin*dt*(p.z>zg?1:0);}
  _crL.x=p.x;_crL.y=p.y;_crL.z=p.z;p.prim.position=C.Matrix4.multiplyByPoint(CR.enu,_crL,_crW);
  if(p.life<=0){(p.k==='b'?CR.pc:CR.bc).remove(p.prim);CR.parts.splice(i,1);}}}
function crDecal(lon,lat,h,hd){if(CR.decal)viewer.entities.remove(CR.decal);if(CR.trail)viewer.entities.remove(CR.trail);if(CR.pool)viewer.entities.remove(CR.pool);
 const [dl,da]=crAt(lon,lat,hd,-0.12),n=new C.Cartesian3(-Math.sin(hd),-Math.cos(hd),0);
 CR.decal=viewer.entities.add({position:C.Cartesian3.fromDegrees(dl,da,h),plane:{plane:new C.Plane(n,0),dimensions:new C.Cartesian2(1.3,1.3),material:new C.ImageMaterialProperty({image:CR_SPLAT,transparent:true})}});
 const [tl,ta]=crAt(lon,lat,hd,-0.1);const top=C.Cartesian3.fromDegrees(tl,ta,h-0.3);CR.trailBot=h-0.3;
 CR.trail=viewer.entities.add({polyline:{positions:new C.CallbackProperty(()=>[top,C.Cartesian3.fromDegrees(tl,ta,Math.min(h-0.3,CR.trailBot))],false),width:7,material:C.Color.fromBytes(120,0,6,220)}});}
function crPool(lon,lat,g){const t0=performance.now();const r=()=>0.15+Math.min(1,(performance.now()-t0)/2200)*0.85;
 CR.pool=viewer.entities.add({position:C.Cartesian3.fromDegrees(lon,lat,g+0.04),ellipse:{semiMajorAxis:new C.CallbackProperty(()=>r()*0.85,false),semiMinorAxis:new C.CallbackProperty(()=>r()*0.65,false),height:g+0.04,rotation:Math.random()*3,material:C.Color.fromBytes(105,0,4,235)}});
 setTimeout(()=>{if(CR.pool){CR.pool.ellipse.semiMajorAxis=0.85;CR.pool.ellipse.semiMinorAxis=0.65;}},2300);}
// --- per-frame crash animation (runs instead of normal flight physics)
function crashStep(dt,now){const c=S.crash;crParts(dt);const k=(now-c.t0)/1000;flap.bob=0;flap.rate=0;flap.phase=0.45;
 if(c.phase==='impact'){S.pitch=-0.3;S.roll=c.spin*0.05;if(k>0.35)c.phase='slide';}
 else if(c.phase==='slide'){c.v=Math.min(c.v+7.5*dt,14);S.h-=c.v*dt;CR.trailBot=S.h-0.05;S.roll+=c.spin*dt*0.6;S.pitch=-1.0+Math.sin(k*5)*0.25;
  if(S.h<=c.base+0.12){S.h=c.base+0.12;c.phase='dead';c.t1=now;beep(110,40,.3,'triangle');const [pl,pa]=c.roof?[S.lon,S.lat]:crAt(c.wl,c.wa,c.hd,-0.95);crPool(pl,pa,c.base);}}
 else if(c.phase==='dead'){const kk=Math.min(1,(now-c.t1)/400);S.pitch+=(0-S.pitch)*kk;S.roll+=(1.45-S.roll)*kk*0.5;if(now-c.t1>2600&&!c.ui){c.ui=true;crShowUI(true);}}
 const st=c.phase==='dead'?'💀 CRASHED':'💥 FALLING…';if(st!==CR.lastStats){CR.lastStats=st;statsEl.textContent=st;}}
function crParticlesOnly(dt){if(CR.graceS>0)CR.graceS-=dt;if(!S.crash&&CR.parts.length)crParts(dt);}
function crashCam(){const c=S.crash,now=performance.now(),k=(now-c.t0)/1000;if(eagle)eagle.show=true;viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
 const amp=k<0.7?0.06*(1-k/0.7):0,sh=()=>(Math.random()-.5)*2*amp;const dead=c.phase==='dead';const orbit=dead?(now-c.t1)/9000:0;
 viewer.camera.lookAt(C.Cartesian3.fromDegrees(S.lon,S.lat,S.h),new C.HeadingPitchRange(c.hd+0.22+orbit+sh(),(dead?-0.55:-0.2)+sh(),dead?5.5:4.5+Math.min(1.5,k)));}
// safe-spot ring (CPU only), sampled from the main loop
function crSafeTick(now){if(S.crash||S.landing||S.perched||now-CR.safeT<700)return;CR.safeT=now;if(S.h-(S.ground||0)<4)return;CR.safe.push({lon:S.lon,lat:S.lat,h:S.h,heading:S.heading});if(CR.safe.length>10)CR.safe.shift();}
function crShowUI(on){if(!CR.ui){CR.ui=document.createElement('div');CR.ui.id='crashUI';CR.ui.innerHTML='<button id="flyAgain">🔁 Fly again</button><button id="toNest">🏠 Nest</button>';$('hud').appendChild(CR.ui);
  $('flyAgain').addEventListener('click',e=>{e.preventDefault();crRespawn(false)});$('toNest').addEventListener('click',e=>{e.preventDefault();crRespawn(true)});}
 CR.ui.style.display=on?'flex':'none';}
function crRespawn(toNest){const c=S.crash;if(!c)return;const sf=c.safe;S.crash=null;CR.lastStats='';hudStats='';crShowUI(false);
 for(const p of CR.parts)(p.k==='b'?CR.pc:CR.bc).remove(p.prim);CR.parts.length=0;
 if(toNest||!sf){Object.assign(S,{lon:nest.lon,lat:nest.lat,h:nest.b+4,heading:0,pitch:0.35,roll:0,speed:12,ground:nest.b});}
 else{Object.assign(S,{lon:sf.lon,lat:sf.lat,h:sf.h+3,heading:c.hd+Math.PI,pitch:0.1,roll:0,speed:18,ground:null});}
 S.boostT=0;S.hover=false;S.perched=false;S.landing=null;lastSP.lon=0;CR.graceT=performance.now()+2000;CR.graceS=2;CR.safe.length=0;beep(400,900,.3,'sine');toast(toNest?'🏠 Back at the nest':'🦅 Back in the air');}
function crReset(){S.crash=null;CR.wall=null;CR.probe=null;CR.safe.length=0;CR.parts.length=0;CR.decal=CR.trail=CR.pool=null;CR.lastStats='';if(CR.pc){CR.pc.removeAll();CR.bc.removeAll();}if(CR.ui)crShowUI(false);}
function crSaveS(){const c=S.crash;if(!c)return null;const sf=c.safe;return sf?{lon:sf.lon,lat:sf.lat,h:sf.h+3,heading:c.hd+Math.PI,pitch:0}:{lon:nest.lon,lat:nest.lat,h:nest.b+4,heading:0,pitch:0};}
window.__crashDbg=()=>({crash:S.crash&&{phase:S.crash.phase,h:S.h,base:S.crash.base},wall:CR.wall,probe:!!CR.probe,parts:CR.parts.length});
