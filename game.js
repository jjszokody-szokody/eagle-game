const C=Cesium;const MOBILE=matchMedia('(pointer:coarse)').matches||/Mobi|Android|iPhone|iPad/.test(navigator.userAgent);const MODELS={bald:{uri:'models/bald_eagle.glb',yaw:0,size:0.28,clip:0,cycles:2,glide:0.375}};
const QP=new URLSearchParams(location.search);const MD=MODELS[QP.get('model')||'bald'];if(QP.get('yaw'))MD.yaw=+QP.get('yaw');if(QP.get('size'))MD.size=+QP.get('size');
const ION=!!window.CESIUM_ION_TOKEN;if(ION)C.Ion.defaultAccessToken=window.CESIUM_ION_TOKEN;
const viewer=new C.Viewer('c',{baseLayer:new C.ImageryLayer(new C.UrlTemplateImageryProvider({url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',maximumLevel:19,credit:'Esri World Imagery'})),
 ...(ION?{terrain:C.Terrain.fromWorldTerrain()}:{terrainProvider:new C.EllipsoidTerrainProvider()}),baseLayerPicker:false,geocoder:false,homeButton:false,sceneModePicker:false,navigationHelpButton:false,animation:false,timeline:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,requestRenderMode:false,shouldAnimate:true});
viewer.scene.globe.enableLighting=false;viewer.scene.skyAtmosphere.show=true;viewer.scene.fog.enabled=true;
viewer.scene.globe.maximumScreenSpaceError=1.5;viewer.scene.globe.depthTestAgainstTerrain=true;
if(MOBILE){viewer.useBrowserRecommendedResolution=true;viewer.resolutionScale=1;viewer.scene.globe.tileCacheSize=60;}
const cv=viewer.scene.canvas;cv.addEventListener('webglcontextlost',e=>{e.preventDefault();saveState(true);console.warn('WebGL context lost; reloading to resume flight');setTimeout(()=>location.reload(),300);},false);
const doResize=()=>{document.documentElement.style.setProperty('--vh',(window.visualViewport?visualViewport.height:innerHeight)+'px');viewer.resize();};
addEventListener('resize',doResize);addEventListener('orientationchange',()=>setTimeout(doResize,300));if(window.visualViewport)visualViewport.addEventListener('resize',doResize);doResize();
const keyLight=new C.DirectionalLight({direction:new C.Cartesian3(0,0,-1),intensity:1.25});viewer.scene.light=keyLight;
viewer.scene.preRender.addEventListener(()=>{const up=viewer.scene.globe.ellipsoid.geodeticSurfaceNormal(viewer.camera.positionWC,new C.Cartesian3());const d=C.Cartesian3.add(C.Cartesian3.multiplyByScalar(up,-1.2,new C.Cartesian3()),C.Cartesian3.add(viewer.camera.directionWC,C.Cartesian3.multiplyByScalar(viewer.camera.rightWC,0.4,new C.Cartesian3()),new C.Cartesian3()),new C.Cartesian3());C.Cartesian3.normalize(d,keyLight.direction);});
let tiles=null;window.__tilesReady=false;
(async()=>{if(!ION||location.search.includes('notiles'))return;try{tiles=await C.createGooglePhotorealistic3DTileset();}catch(e){console.warn('Google tiles unavailable, using OSM Buildings',e);try{tiles=await C.createOsmBuildingsAsync();}catch(e2){}}
 if(tiles){const LEG=location.search.includes('legacylod');
 if(LEG){if(MOBILE){tiles.maximumScreenSpaceError=20;tiles.cacheBytes=96*1024*1024;tiles.maximumCacheOverflowBytes=32*1024*1024;}else{tiles.cacheBytes=384*1024*1024;}}
 else{// sharp near the eagle, coarse beyond ~1.6 km: low base SSE + strong distance-based SSE growth + fog culling
  tiles.maximumScreenSpaceError=MOBILE?10:6;tiles.dynamicScreenSpaceError=true;tiles.dynamicScreenSpaceErrorDensity=1.2e-3;tiles.dynamicScreenSpaceErrorFactor=MOBILE?40:28;tiles.dynamicScreenSpaceErrorHeightFalloff=0.5;
  tiles.foveatedScreenSpaceError=true;tiles.foveatedConeSize=0.25;tiles.foveatedMinimumScreenSpaceErrorRelaxation=MOBILE?8:4;tiles.cullRequestsWhileMoving=true;tiles.cullRequestsWhileMovingMultiplier=60;
  tiles.cacheBytes=(MOBILE?96:384)*1024*1024;tiles.maximumCacheOverflowBytes=(MOBILE?24:128)*1024*1024;
  viewer.scene.fog.enabled=true;viewer.scene.fog.density=MOBILE?6e-4:4.5e-4;viewer.scene.fog.screenSpaceErrorFactor=6;viewer.scene.fog.minimumBrightness=0.15;
  viewer.scene.globe.maximumScreenSpaceError=MOBILE?2:1.5;}
 window.__tileset=tiles;viewer.scene.primitives.add(tiles);window.__tilesReady=true;}})();
const dyn=[];// entities to exclude from height sampling
function groundAt(lon,lat){const c=C.Cartographic.fromDegrees(lon,lat);let h;try{h=viewer.scene.sampleHeightSupported?viewer.scene.sampleHeight(c,dyn):undefined}catch(e){}
 const t=viewer.scene.globe.getHeight(c);if(h===undefined||(t!==undefined&&h<t-30))h=t;return h===undefined?null:h;}
const $=id=>document.getElementById(id);
let mode='pick',nest=null,eagle=null;
// geocode search (Nominatim, free)
$('go').onclick=async()=>{try{const r=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent($('q').value));const j=await r.json();if(j[0])viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(+j[0].lon,+j[0].lat,3000)});}catch(e){}};
$('q').onkeydown=e=>{if(e.key==='Enter')$('go').click()};
new C.ScreenSpaceEventHandler(viewer.scene.canvas).setInputAction(e=>{
 if(mode!=='pick')return;let p=viewer.scene.pickPositionSupported?viewer.scene.pickPosition(e.position):null;if(!p)p=viewer.scene.globe.pick(viewer.camera.getPickRay(e.position),viewer.scene)||viewer.camera.pickEllipsoid(e.position);if(!p)return;
 const c=C.Cartographic.fromCartesian(p);start(C.Math.toDegrees(c.longitude),C.Math.toDegrees(c.latitude));
},C.ScreenSpaceEventType.LEFT_CLICK);
// --- nest: procedural woven twig texture on a bowl of stacked cylinders
function twigTex(){const cv=document.createElement('canvas');cv.width=cv.height=256;const g=cv.getContext('2d');g.fillStyle='#5a4128';g.fillRect(0,0,256,256);
 for(let i=0;i<500;i++){g.strokeStyle=['#3b2a18','#7a5a36','#9c7a4e','#2c1e10','#b08d5b'][i%5];g.lineWidth=1+Math.random()*3;g.beginPath();const x=Math.random()*256,y=Math.random()*256,a=Math.random()*Math.PI;g.moveTo(x,y);g.lineTo(x+Math.cos(a)*60,y+Math.sin(a)*15);g.stroke();}return cv;}
function buildNest(lon,lat,b){const tex=twigTex();const mat=new C.ImageMaterialProperty({image:tex,repeat:new C.Cartesian2(4,1)});
 [[0,1.2,0.9,0.5],[0.4,1.6,1.2,0.5],[0.8,2.0,1.6,0.5]].forEach(([h,top,bot,len])=>viewer.entities.add({position:C.Cartesian3.fromDegrees(lon,lat,b+h+len/2),cylinder:{length:len,topRadius:top,bottomRadius:bot,material:mat}}));
 viewer.entities.add({position:C.Cartesian3.fromDegrees(lon,lat,b+1.29),ellipse:{semiMajorAxis:1.5,semiMinorAxis:1.5,height:b+1.29,material:C.Color.fromCssColorString('#2a1c0e')}});
 [[0.3,0],[-0.3,0.2],[0,-0.35]].forEach(([dx,dy])=>viewer.entities.add({position:C.Cartesian3.fromDegrees(lon+dx/111320/Math.cos(lat*Math.PI/180),lat+dy/111320,b+1.45),ellipsoid:{radii:new C.Cartesian3(0.16,0.16,0.22),material:C.Color.fromCssColorString('#efe8d8')}}));

}
// --- flight state
const S={lon:0,lat:0,h:0,heading:0,pitch:0,roll:0,speed:22,boostT:0};
const HEADING_OFFSET=C.Math.toRadians(-90);// model forward-axis correction
async function start(lon,lat){if(mode!=='pick')return;mode='loading';$('banner').innerHTML='Building nest…';
 viewer.camera.setView({destination:C.Cartesian3.fromDegrees(lon,lat-0.004,500),orientation:{pitch:C.Math.toRadians(-45)}});
 let b=0;try{if(ION){const [t]=await C.sampleTerrainMostDetailed(viewer.terrainProvider,[C.Cartographic.fromDegrees(lon,lat)]);b=t.height||0;}}catch(e){}
 if(tiles){for(let i=0;i<40&&!tiles.tilesLoaded;i++)await new Promise(r=>setTimeout(r,250));try{const [c]=await viewer.scene.sampleHeightMostDetailed([C.Cartographic.fromDegrees(lon,lat)]);if(c.height!==undefined)b=c.height;}catch(e){}}
 S.ground=b;mode='fly';nest={lon,lat,b};buildNest(lon,lat,b);addChicks(lon,lat,b);setTimeout(spawnWorms,1500);$('banner').style.display='none';$('search').style.display='none';$('hud').style.display='block';
 Object.assign(S,{lon,lat,h:b+4,heading:0,pitch:C.Math.toRadians(20)});
 dyn.push(eagle);viewer.scene.screenSpaceCameraController.enableInputs=false;}
let headEnt;const flap={phase:0,rate:1,bob:0};window.__flap=flap;let eagleScale=1,modelYaw=MD.yaw,modelPitch=0,modelRoll=0;window.__orient=(y,p,r)=>{modelYaw=y;modelPitch=p;modelRoll=r};
function makeEagle(){ const eq=()=>{const q=C.Transforms.headingPitchRollQuaternion(pos(),new C.HeadingPitchRoll(S.heading-Math.PI/2,S.pitch,S.roll));
    const fix=C.Quaternion.fromHeadingPitchRoll(new C.HeadingPitchRoll(modelYaw,modelPitch,modelRoll));return C.Quaternion.multiply(q,fix,new C.Quaternion())};
 eagle=viewer.entities.add({position:new C.CallbackProperty(()=>{const p=pos();return C.Cartesian3.fromDegrees(S.lon,S.lat,S.h+flap.bob);const m=C.Matrix3.fromQuaternion(eq());const o=C.Matrix3.multiplyByVector(m,window.__loc,new C.Cartesian3());return C.Cartesian3.subtract(p,o,new C.Cartesian3())},false),
  orientation:new C.CallbackProperty(eq,false),model:{uri:MD.uri,scale:new C.CallbackProperty(()=>eagleScale,false),minimumPixelSize:0,runAnimations:false}});
 headEnt=eagle;
 const t=setInterval(()=>{try{const mp=viewer.dataSourceDisplay.defaultDataSource._visualizers.find(v=>v._modelHash)._modelHash[eagle.id].modelPrimitive;
  if(mp&&mp.ready){clearInterval(t);const r=mp.boundingSphere.radius/eagleScale;eagleScale=MD.size/r;window.__eagleR=r;window.__mp=mp;setTimeout(()=>{const inv=C.Matrix4.inverse(mp.modelMatrix,new C.Matrix4());const l=C.Matrix4.multiplyByPoint(inv,mp.boundingSphere.center,new C.Cartesian3());window.__loc=l;},800);
   mp.activeAnimations.removeAll();mp.activeAnimations.add({index:MD.clip,loop:C.ModelAnimationLoop.REPEAT,animationTime:()=>flap.phase});window.__anims=mp.activeAnimations.length;}}catch(e){}},300);
}makeEagle();
function pos(){return C.Cartesian3.fromDegrees(S.lon,S.lat,S.h)}
function fwd(d,up){const m=111320;return C.Cartesian3.fromDegrees(S.lon+Math.sin(S.heading)*d*Math.cos(S.pitch)/(m*Math.cos(S.lat*Math.PI/180)),S.lat+Math.cos(S.heading)*d*Math.cos(S.pitch)/m,S.h+Math.sin(S.pitch)*d+up)}
// --- input
const inp={x:0,y:0};const keys={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=1;if(e.key===' ')boost();if(e.key.toLowerCase()==='p')poop();if(e.key.toLowerCase()==='h')hover();if(e.key.toLowerCase()==='g')grab();if(e.key.toLowerCase()==='v')toggleCam();if(e.key.toLowerCase()==='f')dropWorms();});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=0);
const joy=$('joy'),knob=$('knob');let jid=null;
function jmove(e){const r=joy.getBoundingClientRect();let dx=e.clientX-r.left-70,dy=e.clientY-r.top-70;const l=Math.hypot(dx,dy);if(l>55){dx*=55/l;dy*=55/l}knob.style.left=45+dx+'px';knob.style.top=45+dy+'px';inp.x=dx/55;inp.y=dy/55;}
joy.addEventListener('pointerdown',e=>{jid=e.pointerId;joy.setPointerCapture(jid);jmove(e)});joy.addEventListener('pointermove',e=>{if(e.pointerId===jid)jmove(e)});
const jend=e=>{if(e.pointerId!==jid)return;jid=null;inp.x=inp.y=0;knob.style.left=knob.style.top='45px'};joy.addEventListener('pointerup',jend);joy.addEventListener('pointercancel',jend);
$('boost').addEventListener('pointerdown',e=>{e.preventDefault();boost()});$('poop').addEventListener('pointerdown',e=>{e.preventDefault();poop()});$('hover').addEventListener('pointerdown',e=>{e.preventDefault();hover()});$('cam').addEventListener('pointerdown',e=>{e.preventDefault();toggleCam()});$('grab').addEventListener('pointerdown',e=>{e.preventDefault();grab()});$('drop').addEventListener('pointerdown',e=>{e.preventDefault();dropWorms()});
let actx;function beep(f1,f2,dur,type){try{actx=actx||new AudioContext();const o=actx.createOscillator(),g=actx.createGain();o.type=type;o.frequency.setValueAtTime(f1,actx.currentTime);o.frequency.exponentialRampToValueAtTime(f2,actx.currentTime+dur);g.gain.setValueAtTime(.25,actx.currentTime);g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+dur);o.connect(g).connect(actx.destination);o.start();o.stop(actx.currentTime+dur)}catch(e){}}
function hover(){if(mode!=='fly')return;S.hover=!S.hover;$('hover').classList.toggle('on',S.hover);beep(S.hover?700:400,S.hover?400:700,.25,'sine')}
function boost(){if(mode!=='fly')return;if(S.hover){S.hover=false;$('hover').classList.remove('on');}S.boostT=3;beep(200,900,.6,'sawtooth')}
const poops=[];
function poop(){if(mode!=='fly')return;beep(500,80,.35,'square');const p={lon:S.lon,lat:S.lat,h:S.h-0.3,vh:Math.sin(S.pitch)*S.speed,vf:S.speed*Math.cos(S.pitch)*0.9,hd:S.heading,h0:S.h};poopCam={p,until:Infinity};
 p.ent=viewer.entities.add({position:new C.CallbackProperty(()=>C.Cartesian3.fromDegrees(p.lon,p.lat,p.h),false),ellipsoid:{radii:new C.Cartesian3(.12,.12,.18),material:C.Color.WHITE}});dyn.push(p.ent);poops.push(p);}
// --- loop
let last=performance.now();
viewer.scene.postRender.addEventListener(()=>{const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;if(mode!=='fly')return;
 let tx=inp.x+((keys.d||keys.arrowright)?1:0)-((keys.a||keys.arrowleft)?1:0),ty=inp.y+((keys.s||keys.arrowdown)?1:0)-((keys.w||keys.arrowup)?1:0);
 tx=Math.max(-1,Math.min(1,tx));ty=Math.max(-1,Math.min(1,ty));
 S.heading+=tx*(S.hover?1.6:1.3)*dt;S.roll+=((S.hover?0:tx*0.7)-S.roll)*3*dt;
 if(S.hover){S.pitch+=(0-S.pitch)*4*dt;S.h+=-ty*6*dt;}else S.pitch+=(-ty*0.9-S.pitch*0.4)*dt*1.5;S.pitch=Math.max(-1.2,Math.min(1.0,S.pitch));
 S.boostT=Math.max(0,S.boostT-dt);const target=S.hover?0:(S.boostT>0?70:22)-Math.sin(S.pitch)*8;S.speed+=(target-S.speed)*(S.hover?3:1.5)*dt;
 {const climb=Math.max(0,S.pitch),dive=!S.hover&&S.pitch<-0.22;let tr=S.hover?0:dive?0:(0.55+climb*1.6+(S.boostT>0?1.0:0));tr=Math.min(S.hover?2.4:1.9,tr);flap.rate+=(tr-flap.rate)*Math.min(1,(dive?9:3)*dt);
 if((dive||S.hover)&&flap.rate<0.35){flap.phase=(flap.phase+((MD.glide-flap.phase+1.5)%1-0.5)*Math.min(1,7*dt)+1)%1;}else flap.phase=(flap.phase+flap.rate*dt/MD.cycles)%1;
 if(window.__fixPhase!==undefined)flap.phase=window.__fixPhase;flap.bob=S.hover?Math.sin(performance.now()/450)*0.02:-Math.sin(flap.phase*MD.cycles*2*Math.PI)*0.025*Math.min(1,flap.rate);}
 document.body.classList.toggle('boosting',S.boostT>0);$('fx').className=S.boostT>0?'boosting':'';
 const m=111320,d=S.speed*dt*Math.cos(S.pitch);S.lat+=Math.cos(S.heading)*d/m;S.lon+=Math.sin(S.heading)*d/(m*Math.cos(S.lat*Math.PI/180));S.h+=Math.sin(S.pitch)*S.speed*dt;
 const g0=groundAt(S.lon,S.lat);if(g0!==null)S.ground=g0;const gnd=S.ground||0;
 // look-ahead collision avoidance (mountains/buildings)
 frameN=(frameN+1)%1000;let ahead=(MOBILE&&frameN%2)?lastAhead:-1e9;for(const dd of (MOBILE?(frameN%2?[]:[20,60]):[15,40,80])){const la=S.lat+Math.cos(S.heading)*dd/m,lo=S.lon+Math.sin(S.heading)*dd/(m*Math.cos(S.lat*Math.PI/180));const g=groundAt(lo,la);if(g!==null)ahead=Math.max(ahead,g);}
 lastAhead=ahead;window.__warn=false;if(ahead+4>S.h){window.__warn=true;S.pitch=Math.min(1.0,S.pitch+2.5*dt);S.h+=Math.min(ahead+4-S.h,15)*dt*2;}
 if(S.h<gnd+2){S.h=gnd+2;if(S.pitch<0)S.pitch=0;} if(S.h>gnd+8000)S.h=gnd+8000;
 for(let i=poops.length-1;i>=0;i--){const p=poops[i];p.vh-=9.8*dt;p.h+=p.vh*dt;p.lat+=Math.cos(p.hd)*p.vf*dt/m;p.lon+=Math.sin(p.hd)*p.vf*dt/(m*Math.cos(p.lat*Math.PI/180));
  const pg=groundAt(p.lon,p.lat)??0;if(p.h<=pg+0.05){viewer.entities.remove(p.ent);const r=Math.min(3,0.6+Math.abs(p.vh)*0.03);viewer.entities.add({position:C.Cartesian3.fromDegrees(p.lon,p.lat,pg+0.08),ellipse:{semiMajorAxis:r,semiMinorAxis:r*0.75,height:pg+0.08,rotation:Math.random()*3,material:C.Color.WHITE.withAlpha(.92)}});beep(160,60,.15,'triangle');poops.splice(i,1);splatFx(p.lon,p.lat,pg,Math.max(0,p.h0-pg));if(poopCam&&poopCam.p===p)poopCam.until=performance.now()+2500;}}
 stepDrops(dt);wormStep();
 // chase cam

 // HUD
 const dx=(nest.lon-S.lon)*m*Math.cos(S.lat*Math.PI/180),dy=(nest.lat-S.lat)*m,dist=Math.hypot(dx,dy),brg=Math.atan2(dx,dy)-S.heading;
 $('arrow').querySelector('span').style.transform=`rotate(${brg}rad)`;$('dist').textContent=dist<1000?dist.toFixed(0)+' m':(dist/1000).toFixed(1)+' km';
 $('score').textContent='🐣 Worms delivered: '+score;$('stats').innerHTML=(carried?'🪱 Carrying '+carried+' · ':'')+(S.hover?'🪽 HOVER · ':'')+`Alt ${(S.h-gnd).toFixed(0)} m AGL${window.__warn?' · ⚠️ PULL UP':''} · ${(S.speed*3.6).toFixed(0)} km/h${S.boostT>0?' · 🔥BOOST':''}`;
});
viewer.camera.setView({destination:C.Cartesian3.fromDegrees(-92.1,46.78,2.0e7)});
let poopCam=null,frameN=0,lastAhead=-1e9;window.__poopCam=()=>poopCam;
const drops=[];function spray(lon,lat,g){for(let i=0;i<26;i++){const a=Math.random()*6.283,v=1.5+Math.random()*3;const d={lon,lat,h:g+0.1,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:2+Math.random()*4,life:1.6};
 d.ent=viewer.entities.add({position:new C.CallbackProperty(()=>C.Cartesian3.fromDegrees(d.lon,d.lat,d.h),false),point:{pixelSize:5+Math.random()*5,color:C.Color.WHITE.withAlpha(.95),outlineColor:C.Color.fromCssColorString('#ddd8c8'),outlineWidth:1}});drops.push(d);}}
function stepDrops(dt){const m=111320;for(let i=drops.length-1;i>=0;i--){const d=drops[i];d.vz-=9.8*dt;d.h+=d.vz*dt;d.lat+=d.vy*dt/m;d.lon+=d.vx*dt/(m*Math.cos(d.lat*Math.PI/180));d.life-=dt;
 if(d.life<=0||d.vz<0&&d.h<(d.g0??-1e9)){viewer.entities.remove(d.ent);drops.splice(i,1);}}}
function splatFx(lon,lat,g,dist){spray(lon,lat,g);drops.forEach(d=>{if(d.g0===undefined)d.g0=g;});const t0=performance.now();const P=C.Cartesian3.fromDegrees(lon,lat,g+0.1);
 const ring=viewer.entities.add({position:P,ellipse:{semiMajorAxis:new C.CallbackProperty(()=>0.3+((performance.now()-t0)/1000%1.2)*3,false),semiMinorAxis:new C.CallbackProperty(()=>0.3+((performance.now()-t0)/1000%1.2)*3,false),height:g+0.12,fill:false,outline:true,outlineWidth:3,outlineColor:new C.CallbackProperty(()=>C.Color.YELLOW.withAlpha(1-((performance.now()-t0)/1000%1.2)/1.2),false)}});
 const pin=viewer.entities.add({position:C.Cartesian3.fromDegrees(lon,lat,g+0.2),point:{pixelSize:12,color:C.Color.YELLOW,outlineColor:C.Color.BLACK,outlineWidth:2,disableDepthTestDistance:1e9},
  label:{text:'SPLAT! '+dist.toFixed(0)+' m below',font:'bold 18px sans-serif',fillColor:C.Color.WHITE,outlineColor:C.Color.BLACK,outlineWidth:4,style:C.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new C.Cartesian2(0,-22),disableDepthTestDistance:1e9}});
 setTimeout(()=>{viewer.entities.remove(ring);pin.label.show=false;pin.point.pixelSize=7;},4000);
 const t=$('toast');t.textContent='💩 SPLAT! '+dist.toFixed(0)+' m below';t.style.opacity=1;clearTimeout(t._h);t._h=setTimeout(()=>t.style.opacity=0,2500);}
let camP=-0.21;viewer.scene.preRender.addEventListener(()=>{if(mode!=='fly')return;const back=S.boostT>0?1.4:1.0;const tp=Math.max(-1.1,Math.min(-0.18,-0.21+Math.min(0,S.pitch)*0.9));camP+=(tp-camP)*0.08;if(poopCam){if(performance.now()>poopCam.until)poopCam=null;else{const p=poopCam.p;viewer.camera.lookAt(C.Cartesian3.fromDegrees(p.lon,p.lat,p.h),poopCam.close?new C.HeadingPitchRange(S.heading+0.6+(performance.now()%20000)/6000,-0.45,3.2):new C.HeadingPitchRange(S.heading+0.5,-0.75,9));return;}}if(fp&&!poopCam&&!window.__camOv){if(eagle)eagle.show=false;viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
  const b2=Math.sin(flap.phase*MD.cycles*2*Math.PI)*0.02*Math.min(1,flap.rate);viewer.camera.setView({destination:C.Cartesian3.fromDegrees(S.lon+Math.sin(S.heading)*0.13/(m2*Math.cos(S.lat*Math.PI/180)),S.lat+Math.cos(S.heading)*0.13/m2,S.h+0.04+b2+flap.bob),orientation:{heading:S.heading,pitch:S.pitch-0.12,roll:S.roll}});return;}
 if(eagle)eagle.show=true;if(window.__camOv){const o=window.__camOv;viewer.camera.lookAt(o.at?C.Cartesian3.fromDegrees(o.at[0],o.at[1],o.at[2]):pos(),new C.HeadingPitchRange(S.heading+o.dh,o.p,o.r));return;}viewer.camera.lookAt(pos(),new C.HeadingPitchRange(S.heading,camP,back));});
function saveState(force){if(mode!=='fly'||!nest)return;try{sessionStorage.setItem('eagleFlight',JSON.stringify({nest,S:{lon:S.lon,lat:S.lat,h:S.h,heading:S.heading,pitch:S.pitch},t:Date.now()}))}catch(e){}}
setInterval(saveState,2000);addEventListener('pagehide',()=>saveState(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)saveState(true)});
async function resumeSaved(){let st;try{st=JSON.parse(sessionStorage.getItem('eagleFlight')||'null')}catch(e){}if(!st||!st.nest)return;
 await start(st.nest.lon,st.nest.lat);Object.assign(S,st.S);S.pitch=Math.max(0,S.pitch);console.log('resumed flight');}
setTimeout(resumeSaved,1500);
let quitArmed=0;let fp=localStorage.getItem('eagleCam')==='fp';
function toggleCam(){fp=!fp;try{localStorage.setItem('eagleCam',fp?'fp':'tp')}catch(e){};$('cam').innerHTML=(fp?'👁':'🎥')+'<small>'+(fp?'1ST':'3RD')+'</small>';toast(fp?'👁 Eagle-eye view':'🎥 Chase view');}
setTimeout(()=>{$('cam').innerHTML=(fp?'👁':'🎥')+'<small>'+(fp?'1ST':'3RD')+'</small>'},0);
// ---- worm quest
let worms=[],carried=0,carryEnt=null,grabTarget=null,falling=[],feastUntil=0,chicks=[],happyUntil=0,score=+(localStorage.getItem('wormsDelivered')||0),lastChirp=0;
function wormImg(){const c=document.createElement('canvas');c.width=128;c.height=64;const g=c.getContext('2d');g.lineCap='round';g.lineWidth=14;g.strokeStyle='#e8829a';g.beginPath();for(let x=10;x<=110;x+=4){const y=32+Math.sin(x/14)*10;x===10?g.moveTo(x,y):g.lineTo(x,y)}g.stroke();
 g.lineWidth=4;g.strokeStyle='#c45a74';for(let x=30;x<100;x+=12){g.beginPath();g.moveTo(x,24+Math.sin(x/14)*10);g.lineTo(x,40+Math.sin(x/14)*10);g.stroke()}g.fillStyle='#000';g.beginPath();g.arc(110,32+Math.sin(110/14)*10,2.5,0,7);g.fill();return c.toDataURL()}
const WORM=wormImg();const m2=111320;
function hdist(lon1,lat1,lon2,lat2){return Math.hypot((lon2-lon1)*m2*Math.cos(lat1*Math.PI/180),(lat2-lat1)*m2)}
async function spawnWorm(){if(!nest)return;const a=Math.random()*6.283,d=40+Math.random()*260;const lat=nest.lat+Math.cos(a)*d/m2,lon=nest.lon+Math.sin(a)*d/(m2*Math.cos(nest.lat*Math.PI/180));
 let g=null;try{const [c]=await viewer.scene.sampleHeightMostDetailed([C.Cartographic.fromDegrees(lon,lat)],dyn);g=c.height}catch(e){}if(g===undefined||g===null)g=groundAt(lon,lat);if(g===null||g===undefined)g=nest.b;if(!nest)return;placeWorm(lon,lat,g);}
function placeWorm(lon,lat,g){
 const w={lon,lat,g,t0:Math.random()*10};const P=C.Cartesian3.fromDegrees(lon,lat,g+0.15);
 w.ents=[viewer.entities.add({position:P,billboard:{image:WORM,width:new C.CallbackProperty(()=>60+Math.sin(performance.now()/180+w.t0)*10,false),height:30,rotation:new C.CallbackProperty(()=>Math.sin(performance.now()/260+w.t0)*0.35,false),verticalOrigin:C.VerticalOrigin.BOTTOM,disableDepthTestDistance:1e9}}),
  viewer.entities.add({polyline:{positions:[C.Cartesian3.fromDegrees(lon,lat,g+0.3),C.Cartesian3.fromDegrees(lon,lat,g+18)],width:8,material:new C.PolylineGlowMaterialProperty({glowPower:0.3,color:C.Color.fromCssColorString('#ff6fa5').withAlpha(.8)})}}),
  viewer.entities.add({position:C.Cartesian3.fromDegrees(lon,lat,g+19),point:{pixelSize:new C.CallbackProperty(()=>11+Math.sin(performance.now()/300+w.t0)*4,false),color:C.Color.fromCssColorString('#ff4f9a'),outlineColor:C.Color.WHITE,outlineWidth:2,disableDepthTestDistance:1e9},label:{text:'🪱',font:'22px sans-serif',pixelOffset:new C.Cartesian2(0,-20),disableDepthTestDistance:1e9,distanceDisplayCondition:new C.DistanceDisplayCondition(0,600)}})];
 worms.push(w);}
function updCarry(){if(carried>0&&!carryEnt)carryEnt=viewer.entities.add({position:new C.CallbackProperty(()=>C.Cartesian3.fromDegrees(S.lon,S.lat,S.h+flap.bob-0.1),false),billboard:{image:WORM,width:new C.CallbackProperty(()=>34+Math.sin(performance.now()/150)*5,false),height:17,rotation:new C.CallbackProperty(()=>1.2+Math.sin(performance.now()/200)*0.4,false)}});
 if(carried===0&&carryEnt){viewer.entities.remove(carryEnt);carryEnt=null;}}
function grab(){if(mode!=='fly'||!grabTarget)return;const w=grabTarget;w.ents.forEach(e=>viewer.entities.remove(e));worms=worms.filter(x=>x!==w);grabTarget=null;carried++;updCarry();beep(900,1400,.15,'triangle');toast('🪱 Got a worm! ('+carried+' carried)');if(worms.length<10)setTimeout(spawnWorm,3000);}
function dropWorms(){if(mode!=='fly'||carried===0)return;const n=carried;carried=0;updCarry();const toNest=hdist(S.lon,S.lat,nest.lon,nest.lat)<=40;
 const f={lon:S.lon,lat:S.lat,h:S.h-0.3,vh:Math.min(0,Math.sin(S.pitch)*S.speed),n,toNest,t:performance.now(),h0g:S.ground||0};
 f.ent=viewer.entities.add({position:new C.CallbackProperty(()=>C.Cartesian3.fromDegrees(f.lon,f.lat,f.h),false),billboard:{image:WORM,width:46,height:23,rotation:new C.CallbackProperty(()=>performance.now()/120,false)},label:{text:n>1?'×'+n:'',font:'bold 16px sans-serif',fillColor:C.Color.WHITE,outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new C.Cartesian2(24,-10)}});
 falling.push(f);poopCam={p:f,until:Infinity};beep(600,300,.3,'sine');if(toNest)toast('🎯 Incoming to the nest!');}
function feast(n){const now=performance.now();happyUntil=now+3500;feastUntil=now+3200;score+=n;try{localStorage.setItem('wormsDelivered',score)}catch(e){};chirp(14);
 poopCam={p:{lon:nest.lon,lat:nest.lat,h:nest.b+1.6},until:now+3200,close:true};
 for(let i=0;i<10;i++){const a=Math.random()*6.28,t0=now+i*200;const e=viewer.entities.add({position:new C.CallbackProperty(()=>{const k=(performance.now()-t0)/1000;return C.Cartesian3.fromDegrees(nest.lon+Math.cos(a)*0.5/(m2*Math.cos(nest.lat*Math.PI/180)),nest.lat+Math.sin(a)*0.5/m2,nest.b+2+Math.max(0,k)*0.9)},false),label:{text:i%2?'💖':'✨',font:'26px sans-serif',disableDepthTestDistance:1e9}});setTimeout(()=>viewer.entities.remove(e),3400);}
 setTimeout(()=>toast('🐣 Yum! Worms delivered: '+score),2600);}
function spawnWorms(){for(let i=worms.length;i<12;i++)spawnWorm();}
function downTex(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle='#d9d4cb';g.fillRect(0,0,128,128);
 for(let k=0;k<2600;k++){const x=Math.random()*128,y=Math.random()*128,l=150+Math.random()*100|0;g.strokeStyle=`rgba(${l},${l-4},${l-12},.55)`;g.lineWidth=0.8;g.beginPath();g.moveTo(x,y);const a=Math.random()*6.28;g.lineTo(x+Math.cos(a)*5,y+Math.sin(a)*5);g.stroke();}return c;}
function addChicks(lon,lat,b){chicks=[];const DOWN=new C.ImageMaterialProperty({image:downTex(),repeat:new C.Cartesian2(3,3)});const DOWN2=new C.ImageMaterialProperty({image:downTex(),repeat:new C.Cartesian2(2,2),color:C.Color.fromCssColorString('#f2efe9')});
 const cosl=Math.cos(lat*Math.PI/180);
 [[0.32,0.12],[-0.3,0.22],[0.02,-0.36]].forEach(([dx,dy],i)=>{const ph=i*2.1;const hd=Math.atan2(dx,dy);// face outward
  const fx=Math.sin(hd),fy=Math.cos(hd);
  const lift=()=>{const n=performance.now();return (n<feastUntil?Math.max(0,Math.sin(n/160+ph))*0.3:0)+Math.abs(Math.sin(n/(n<happyUntil?120:420)+ph))*(n<happyUntil?0.18:0.05);};
  const lunge=()=>{const n=performance.now();return n<feastUntil?Math.max(0,Math.sin(n/160+ph))*0.12:0;};
  const P=(ex,ey,ez,fwd=0)=>new C.CallbackProperty(()=>{const L=lunge()*fwd;return C.Cartesian3.fromDegrees(lon+(dx+ex+fx*L)/(m2*cosl),lat+(dy+ey+fy*L)/m2,b+1.35+ez+lift())},false);
  const add=o=>{const e=viewer.entities.add(o);chicks.push(e);return e;};
  // downy pear-shaped body + wing stubs
  add({position:P(0,0,0.2),ellipsoid:{radii:new C.Cartesian3(0.2,0.2,0.24),material:DOWN}});
  add({position:P(-fx*0.04,-fy*0.04,0.06),ellipsoid:{radii:new C.Cartesian3(0.22,0.22,0.14),material:DOWN}});
  [-1,1].forEach(sd=>add({position:P(fy*0.19*sd,-fx*0.19*sd,0.2),ellipsoid:{radii:new C.Cartesian3(0.06,0.06,0.12),material:DOWN}}));
  // big head on short neck
  add({position:P(fx*0.07,fy*0.07,0.5,0.6),ellipsoid:{radii:new C.Cartesian3(0.15,0.15,0.14),material:DOWN2}});
  // dark eyes
  [-1,1].forEach(sd=>add({position:P(fx*0.17+fy*0.07*sd,fy*0.17-fx*0.07*sd,0.54,0.6),ellipsoid:{radii:new C.Cartesian3(0.03,0.03,0.035),material:C.Color.fromCssColorString('#1a1410')}}));
  // hooked beak: dark base cere, grey upper mandible, hooked tip, gaping lower mandible
  add({position:P(fx*0.2,fy*0.2,0.5,0.6),ellipsoid:{radii:new C.Cartesian3(0.045,0.045,0.035),material:C.Color.fromCssColorString('#4a4038')}});
  add({position:P(fx*0.25,fy*0.25,0.49,0.6),ellipsoid:{radii:new C.Cartesian3(0.045,0.045,0.025),material:C.Color.fromCssColorString('#2b2622')}});
  add({position:P(fx*0.285,fy*0.285,0.465,0.6),ellipsoid:{radii:new C.Cartesian3(0.018,0.018,0.03),material:C.Color.fromCssColorString('#1d1916')}});
  add({position:new C.CallbackProperty(()=>{const n=performance.now();const gape=0.02+Math.abs(Math.sin(n/(n<feastUntil?90:170)+ph))*0.035;const L=lunge()*0.6;return C.Cartesian3.fromDegrees(lon+(dx+fx*(0.24+L))/(m2*cosl),lat+(dy+fy*(0.24+L))/m2,b+1.35+0.47-gape+lift())},false),ellipsoid:{radii:new C.Cartesian3(0.04,0.04,0.015),material:C.Color.fromCssColorString('#e7a0a0')}});
 });
 viewer.entities.add({position:C.Cartesian3.fromDegrees(lon,lat,b+3.2),label:{text:new C.CallbackProperty(()=>'🐣 fed '+score,false),font:'13px sans-serif',fillColor:C.Color.WHITE,outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,disableDepthTestDistance:1e9,distanceDisplayCondition:new C.DistanceDisplayCondition(0,1500)}});}
function chirp(n){for(let i=0;i<n;i++)setTimeout(()=>beep(2400+Math.random()*900,1800,.09,'sine'),i*110)}
function toast(msg){const t=$('toast');t.textContent=msg;t.style.opacity=1;clearTimeout(t._h);t._h=setTimeout(()=>t.style.opacity=0,2500);}
function wormStep(){if(!nest)return;const now=performance.now();
 let near=null,nd=1e9;for(const w of worms){const d=Math.hypot(hdist(S.lon,S.lat,w.lon,w.lat),S.h-w.g);if(d<nd){nd=d;near=w;}}
 const can=nd<=8;$('grab').classList.toggle('ready',can);$('grab').disabled=!can;grabTarget=can?near:null;
 for(let i=falling.length-1;i>=0;i--){const f=falling[i];const dt=Math.min(.05,(now-f.t)/1000);f.t=now;f.vh-=9.8*dt;f.h+=f.vh*dt;
  if(f.toNest){const k=Math.min(1,dt*2.2);f.lon+=(nest.lon-f.lon)*k;f.lat+=(nest.lat-f.lat)*k;if(f.h<=nest.b+1.6){falling.splice(i,1);viewer.entities.remove(f.ent);if(!falling.some(x=>x.toNest))feast(f.n);continue;}}
  else{const g=groundAt(f.lon,f.lat)??f.h0g;if(f.h<=g+0.1){falling.splice(i,1);viewer.entities.remove(f.ent);for(let k=0;k<f.n;k++)placeWorm(f.lon+(Math.random()-.5)*3/m2,f.lat+(Math.random()-.5)*3/m2,g);if(poopCam&&poopCam.p===f)poopCam.until=now+1200;toast('🪱 Worms landed — grab them again');continue;}}}
 if(dn2()<80&&now-lastChirp>2500+Math.random()*2000){lastChirp=now;chirp(2);}
 $('arrow').classList.toggle('carry',carried>0);$('drop').disabled=carried===0;$('dropn').textContent=carried||'';$('drop').classList.toggle('ready',carried>0);}
function dn2(){return hdist(S.lon,S.lat,nest.lon,nest.lat)}
function endFlight(){if(mode!=='fly')return;try{sessionStorage.removeItem('eagleFlight')}catch(e){}mode='pick';poops.length=0;drops.length=0;worms=[];carried=0;carryEnt=null;falling=[];grabTarget=null;chicks=[];$('arrow').classList.remove('carry');poopCam=null;S.hover=false;S.boostT=0;$('hover').classList.remove('on');window.__mp=null;
 viewer.entities.removeAll();dyn.length=0;nest=null;makeEagle();
 $('hud').style.display='none';$('banner').style.display='block';$('banner').innerHTML="🦅 Tap anywhere on Earth to build your eagle's nest<br><small>zoom in for precision (pinch / scroll)</small>";$('search').style.display='flex';
 document.body.classList.remove('boosting');$('fx').className='';viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);viewer.scene.screenSpaceCameraController.enableInputs=true;
 viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(S.lon,S.lat,2.0e6),duration:1.5});}
$('info').onclick=()=>$('creditsPanel').classList.toggle('open');$('closeCredits').onclick=()=>$('creditsPanel').classList.remove('open');
$('quit').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const now=Date.now();if(now-quitArmed<3000){quitArmed=0;$('quitc').style.display='none';endFlight();}else{quitArmed=now;$('quitc').style.display='block';setTimeout(()=>{if(Date.now()-quitArmed>=2900)$('quitc').style.display='none'},3000);}});
window.__game={endFlight,toggleCam,get fp(){return fp},worms:()=>worms,nest:()=>nest,get carried(){return carried},grab,dropWorms,get score(){return score},S,teleport(lon,lat,h,hd){Object.assign(S,{lon,lat,h,heading:hd,pitch:0})},start,poop,boost,get mode(){return mode}};
