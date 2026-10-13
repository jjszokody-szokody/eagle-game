const C=Cesium;const MODELS={bald:{uri:'models/bald_eagle.glb',yaw:0,size:1.1,clip:0,cycles:2,glide:0.375}};
const QP=new URLSearchParams(location.search);const MD=MODELS[QP.get('model')||'bald'];if(QP.get('yaw'))MD.yaw=+QP.get('yaw');if(QP.get('size'))MD.size=+QP.get('size');
const ION=!!window.CESIUM_ION_TOKEN;if(ION)C.Ion.defaultAccessToken=window.CESIUM_ION_TOKEN;
const viewer=new C.Viewer('c',{baseLayer:new C.ImageryLayer(new C.UrlTemplateImageryProvider({url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',maximumLevel:19,credit:'Esri World Imagery'})),
 ...(ION?{terrain:C.Terrain.fromWorldTerrain()}:{terrainProvider:new C.EllipsoidTerrainProvider()}),baseLayerPicker:false,geocoder:false,homeButton:false,sceneModePicker:false,navigationHelpButton:false,animation:false,timeline:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,requestRenderMode:false,shouldAnimate:true});
viewer.scene.globe.enableLighting=false;viewer.scene.skyAtmosphere.show=true;viewer.scene.fog.enabled=true;
viewer.scene.globe.maximumScreenSpaceError=1.5;viewer.scene.globe.depthTestAgainstTerrain=true;
const keyLight=new C.DirectionalLight({direction:new C.Cartesian3(0,0,-1),intensity:1.25});viewer.scene.light=keyLight;
viewer.scene.preRender.addEventListener(()=>{const up=viewer.scene.globe.ellipsoid.geodeticSurfaceNormal(viewer.camera.positionWC,new C.Cartesian3());const d=C.Cartesian3.add(C.Cartesian3.multiplyByScalar(up,-1.2,new C.Cartesian3()),C.Cartesian3.add(viewer.camera.directionWC,C.Cartesian3.multiplyByScalar(viewer.camera.rightWC,0.4,new C.Cartesian3()),new C.Cartesian3()),new C.Cartesian3());C.Cartesian3.normalize(d,keyLight.direction);});
let tiles=null;window.__tilesReady=false;
(async()=>{if(!ION||location.search.includes('notiles'))return;try{tiles=await C.createGooglePhotorealistic3DTileset();}catch(e){console.warn('Google tiles unavailable, using OSM Buildings',e);try{tiles=await C.createOsmBuildingsAsync();}catch(e2){}}
 if(tiles){viewer.scene.primitives.add(tiles);window.__tilesReady=true;}})();
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
 viewer.entities.add({position:C.Cartesian3.fromDegrees(lon,lat,b+6),label:{text:'🏠 HOME NEST',font:'16px sans-serif',fillColor:C.Color.WHITE,outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,distanceDisplayCondition:new C.DistanceDisplayCondition(0,20000),disableDepthTestDistance:1e9}});
}
// --- flight state
const S={lon:0,lat:0,h:0,heading:0,pitch:0,roll:0,speed:22,boostT:0};
const HEADING_OFFSET=C.Math.toRadians(-90);// model forward-axis correction
async function start(lon,lat){if(mode!=='pick')return;mode='loading';$('banner').innerHTML='Building nest…';
 viewer.camera.setView({destination:C.Cartesian3.fromDegrees(lon,lat-0.004,500),orientation:{pitch:C.Math.toRadians(-45)}});
 let b=0;try{if(ION){const [t]=await C.sampleTerrainMostDetailed(viewer.terrainProvider,[C.Cartographic.fromDegrees(lon,lat)]);b=t.height||0;}}catch(e){}
 if(tiles){for(let i=0;i<40&&!tiles.tilesLoaded;i++)await new Promise(r=>setTimeout(r,250));try{const [c]=await viewer.scene.sampleHeightMostDetailed([C.Cartographic.fromDegrees(lon,lat)]);if(c.height!==undefined)b=c.height;}catch(e){}}
 S.ground=b;mode='fly';nest={lon,lat,b};buildNest(lon,lat,b);$('banner').style.display='none';$('search').style.display='none';$('hud').style.display='block';
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
const inp={x:0,y:0};const keys={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=1;if(e.key===' ')boost();if(e.key.toLowerCase()==='p')poop();});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=0);
const joy=$('joy'),knob=$('knob');let jid=null;
function jmove(e){const r=joy.getBoundingClientRect();let dx=e.clientX-r.left-70,dy=e.clientY-r.top-70;const l=Math.hypot(dx,dy);if(l>55){dx*=55/l;dy*=55/l}knob.style.left=45+dx+'px';knob.style.top=45+dy+'px';inp.x=dx/55;inp.y=dy/55;}
joy.addEventListener('pointerdown',e=>{jid=e.pointerId;joy.setPointerCapture(jid);jmove(e)});joy.addEventListener('pointermove',e=>{if(e.pointerId===jid)jmove(e)});
const jend=e=>{if(e.pointerId!==jid)return;jid=null;inp.x=inp.y=0;knob.style.left=knob.style.top='45px'};joy.addEventListener('pointerup',jend);joy.addEventListener('pointercancel',jend);
$('boost').addEventListener('pointerdown',e=>{e.preventDefault();boost()});$('poop').addEventListener('pointerdown',e=>{e.preventDefault();poop()});
let actx;function beep(f1,f2,dur,type){try{actx=actx||new AudioContext();const o=actx.createOscillator(),g=actx.createGain();o.type=type;o.frequency.setValueAtTime(f1,actx.currentTime);o.frequency.exponentialRampToValueAtTime(f2,actx.currentTime+dur);g.gain.setValueAtTime(.25,actx.currentTime);g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+dur);o.connect(g).connect(actx.destination);o.start();o.stop(actx.currentTime+dur)}catch(e){}}
function boost(){if(mode!=='fly')return;S.boostT=3;beep(200,900,.6,'sawtooth')}
const poops=[];
function poop(){if(mode!=='fly')return;beep(500,80,.35,'square');const p={lon:S.lon,lat:S.lat,h:S.h-0.3,vh:Math.sin(S.pitch)*S.speed,vf:S.speed*Math.cos(S.pitch)*0.9,hd:S.heading};
 p.ent=viewer.entities.add({position:new C.CallbackProperty(()=>C.Cartesian3.fromDegrees(p.lon,p.lat,p.h),false),ellipsoid:{radii:new C.Cartesian3(.12,.12,.18),material:C.Color.WHITE}});dyn.push(p.ent);poops.push(p);}
// --- loop
let last=performance.now();
viewer.scene.postRender.addEventListener(()=>{const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;if(mode!=='fly')return;
 let tx=inp.x+((keys.d||keys.arrowright)?1:0)-((keys.a||keys.arrowleft)?1:0),ty=inp.y+((keys.s||keys.arrowdown)?1:0)-((keys.w||keys.arrowup)?1:0);
 tx=Math.max(-1,Math.min(1,tx));ty=Math.max(-1,Math.min(1,ty));
 S.heading+=tx*1.3*dt;S.roll+=(tx*0.7-S.roll)*3*dt;
 S.pitch+=(-ty*0.9-S.pitch*0.4)*dt*1.5;S.pitch=Math.max(-1.2,Math.min(1.0,S.pitch));
 S.boostT=Math.max(0,S.boostT-dt);const target=(S.boostT>0?70:22)-Math.sin(S.pitch)*8;S.speed+=(target-S.speed)*1.5*dt;
 {const climb=Math.max(0,S.pitch),dive=S.pitch<-0.22;let tr=dive?0:(0.55+climb*1.6+(S.boostT>0?1.0:0));tr=Math.min(1.9,tr);flap.rate+=(tr-flap.rate)*Math.min(1,3*dt);
 if(flap.rate<0.08){flap.phase=(flap.phase+((MD.glide-flap.phase+1.5)%1-0.5)*Math.min(1,4*dt)+1)%1;}else flap.phase=(flap.phase+flap.rate*dt/MD.cycles)%1;
 if(window.__fixPhase!==undefined)flap.phase=window.__fixPhase;flap.bob=-Math.sin(flap.phase*MD.cycles*2*Math.PI)*0.05*Math.min(1,flap.rate);}
 document.body.classList.toggle('boosting',S.boostT>0);$('fx').className=S.boostT>0?'boosting':'';
 const m=111320,d=S.speed*dt*Math.cos(S.pitch);S.lat+=Math.cos(S.heading)*d/m;S.lon+=Math.sin(S.heading)*d/(m*Math.cos(S.lat*Math.PI/180));S.h+=Math.sin(S.pitch)*S.speed*dt;
 const g0=groundAt(S.lon,S.lat);if(g0!==null)S.ground=g0;const gnd=S.ground||0;
 // look-ahead collision avoidance (mountains/buildings)
 let ahead=-1e9;for(const dd of [15,40,80]){const la=S.lat+Math.cos(S.heading)*dd/m,lo=S.lon+Math.sin(S.heading)*dd/(m*Math.cos(S.lat*Math.PI/180));const g=groundAt(lo,la);if(g!==null)ahead=Math.max(ahead,g);}
 window.__warn=false;if(ahead+4>S.h){window.__warn=true;S.pitch=Math.min(1.0,S.pitch+2.5*dt);S.h+=Math.min(ahead+4-S.h,15)*dt*2;}
 if(S.h<gnd+2){S.h=gnd+2;if(S.pitch<0)S.pitch=0;} if(S.h>gnd+8000)S.h=gnd+8000;
 for(let i=poops.length-1;i>=0;i--){const p=poops[i];p.vh-=9.8*dt;p.h+=p.vh*dt;p.lat+=Math.cos(p.hd)*p.vf*dt/m;p.lon+=Math.sin(p.hd)*p.vf*dt/(m*Math.cos(p.lat*Math.PI/180));
  const pg=groundAt(p.lon,p.lat)??0;if(p.h<=pg+0.05){viewer.entities.remove(p.ent);const r=Math.min(3,0.6+Math.abs(p.vh)*0.03);viewer.entities.add({position:C.Cartesian3.fromDegrees(p.lon,p.lat,pg+0.08),ellipse:{semiMajorAxis:r,semiMinorAxis:r*0.75,height:pg+0.08,rotation:Math.random()*3,material:C.Color.WHITE.withAlpha(.92)}});beep(160,60,.15,'triangle');poops.splice(i,1);}}
 // chase cam

 // HUD
 const dx=(nest.lon-S.lon)*m*Math.cos(S.lat*Math.PI/180),dy=(nest.lat-S.lat)*m,dist=Math.hypot(dx,dy),brg=Math.atan2(dx,dy)-S.heading;
 $('arrow').querySelector('span').style.transform=`rotate(${brg}rad)`;$('dist').textContent=dist<1000?dist.toFixed(0)+' m':(dist/1000).toFixed(1)+' km';
 $('stats').innerHTML=`Alt ${(S.h-gnd).toFixed(0)} m AGL${window.__warn?' · ⚠️ PULL UP':''} · ${(S.speed*3.6).toFixed(0)} km/h${S.boostT>0?' · 🔥BOOST':''}`;
});
viewer.camera.setView({destination:C.Cartesian3.fromDegrees(-92.1,46.78,2.0e7)});
viewer.scene.preRender.addEventListener(()=>{if(mode!=='fly')return;const back=S.boostT>0?4.8:3.4;viewer.camera.lookAt(pos(),new C.HeadingPitchRange(S.heading,C.Math.toRadians(-12)-S.pitch*0.3,back));});
window.__game={S,teleport(lon,lat,h,hd){Object.assign(S,{lon,lat,h,heading:hd,pitch:0})},start,poop,boost,get mode(){return mode}};
