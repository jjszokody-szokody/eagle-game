const C=Cesium;const LEGGFX=location.search.includes('legacygfx');const MOBILE=matchMedia('(pointer:coarse)').matches||/Mobi|Android|iPhone|iPad/.test(navigator.userAgent);const MODELS={bald:{uri:'models/bald_eagle.glb?v=3',yaw:0,size:0.28,clip:0,cycles:2,glide:0.375}};
const QP=new URLSearchParams(location.search);const MD=MODELS[QP.get('model')||'bald'];if(QP.get('yaw'))MD.yaw=+QP.get('yaw');if(QP.get('size'))MD.size=+QP.get('size');
const QVALID=['low','medium','high','auto'];let QMODE=(QP.get('quality')||localStorage.getItem('eagleQuality')||'auto').toLowerCase();if(!QVALID.includes(QMODE))QMODE='auto';
let QT=QMODE==='auto'?(MOBILE?'medium':'high'):QMODE;const QMSAA=location.search.includes('msaa')?4:(QT==='high'?4:(QT==='medium'&&!MOBILE?2:1));
const QTDEF={low:{sse:16,dyn:55,relax:16,rs:MOBILE?0.8:1.0,cache:MOBILE?64:128,fog:7e-4,globe:MOBILE?5:3},medium:{sse:8,dyn:35,relax:8,rs:MOBILE?1.0:1.25,cache:MOBILE?96:256,fog:5.5e-4,globe:MOBILE?4:2.5},high:{sse:4,dyn:22,relax:0,rs:MOBILE?1.15:1.5,cache:MOBILE?96:384,fog:4e-4,globe:MOBILE?3:2}};
window.__quality={get mode(){return QMODE},get tier(){return QT},msaa:QMSAA};
const ION=!!window.CESIUM_ION_TOKEN;if(ION)C.Ion.defaultAccessToken=window.CESIUM_ION_TOKEN;
const viewer=new C.Viewer('c',{baseLayer:new C.ImageryLayer(new C.UrlTemplateImageryProvider({url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',maximumLevel:19,credit:'Esri World Imagery'})),
 ...(ION?{terrain:C.Terrain.fromWorldTerrain()}:{terrainProvider:new C.EllipsoidTerrainProvider()}),baseLayerPicker:false,geocoder:false,homeButton:false,sceneModePicker:false,navigationHelpButton:false,animation:false,timeline:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,requestRenderMode:false,shouldAnimate:true,msaaSamples:LEGGFX?1:QMSAA});
viewer.scene.globe.enableLighting=false;viewer.scene.skyAtmosphere.show=true;viewer.scene.fog.enabled=true;
viewer.scene.globe.maximumScreenSpaceError=1.5;viewer.scene.globe.depthTestAgainstTerrain=true;
let gradeStage=null,rsCapF=QTDEF[QT].rs;
function applyQuality(){const d=QTDEF[QT];const dpr=window.devicePixelRatio||1;rsCapF=d.rs;
 viewer.resolutionScale=Math.min(dpr,d.rs)/dpr;viewer.scene.globe.maximumScreenSpaceError=d.globe;
 if(tiles){tiles.maximumScreenSpaceError=d.sse;tiles.dynamicScreenSpaceErrorFactor=d.dyn;tiles.foveatedMinimumScreenSpaceErrorRelaxation=d.relax;tiles.cacheBytes=d.cache*1024*1024;tiles.maximumCacheOverflowBytes=(MOBILE?24:64)*1024*1024;}
 viewer.scene.fog.density=d.fog;viewer.scene.postProcessStages.fxaa.enabled=QMSAA<=1;if(gradeStage)gradeStage.enabled=QT==='high';
 const wantShadow=!MOBILE&&QT==='high';try{viewer.shadowMap.enabled=wantShadow;if(wantShadow){viewer.shadowMap.size=1024;viewer.shadowMap.type=C.ShadowMapType.PCF_SOFT;viewer.shadowMap.darkness=0.35;}}catch(e){}
 const b=$('qual');if(b)b.innerHTML='🎨<small>'+QMODE.toUpperCase()+'</small>';}
if(!LEGGFX){const dpr=window.devicePixelRatio||1;viewer.useBrowserRecommendedResolution=false;viewer.targetFrameRate=60;
 let rsT=performance.now(),rsN=0,lowStreak=0,hiStreak=0;viewer.scene.postRender.addEventListener(()=>{rsN++;const n=performance.now();if(n-rsT>2500){const fps=rsN*1000/(n-rsT);rsN=0;rsT=n;
  const dpr2=window.devicePixelRatio||1,cap=Math.min(dpr2,rsCapF)/dpr2,minS=Math.min(dpr2,rsCapF*0.7)/dpr2;
  if(fps<24&&viewer.resolutionScale>minS)viewer.resolutionScale=Math.max(minS,viewer.resolutionScale*0.85);else if(fps>50&&viewer.resolutionScale<cap)viewer.resolutionScale=Math.min(cap,viewer.resolutionScale*1.1);
  if(QMODE==='auto'){const mb=window.__tileset?window.__tileset.totalMemoryUsageInBytes/1e6:0;
   if((fps<20&&++lowStreak>=2)||(MOBILE&&mb>115)){lowStreak=0;hiStreak=0;if(QT==='high'){QT='medium';applyQuality();}else if(QT==='medium'){QT='low';applyQuality();}}
   else if(fps>50&&mb<(MOBILE?90:300)&&++hiStreak>=3){hiStreak=0;const home=MOBILE?'medium':'high';if(QT!==home){QT=home;applyQuality();}}}}});
 const sc=viewer.scene;sc.highDynamicRange=false;
 gradeStage=new C.PostProcessStage({name:'grade',fragmentShader:'uniform sampler2D colorTexture;uniform float u_sat;uniform float u_con;uniform float u_vig;in vec2 v_textureCoordinates;void main(){vec4 c=texture(colorTexture,v_textureCoordinates);float l=dot(c.rgb,vec3(0.299,0.587,0.114));c.rgb=mix(vec3(l),c.rgb,u_sat);c.rgb=(c.rgb-0.5)*u_con+0.5;vec2 d=v_textureCoordinates-0.5;c.rgb*=1.0-u_vig*dot(d,d)*1.6;out_FragColor=c;}',uniforms:{u_sat:1.07,u_con:1.03,u_vig:0.55}});
 sc.postProcessStages.add(gradeStage);
 sc.skyAtmosphere.hueShift=-0.02;sc.skyAtmosphere.saturationShift=0.12;sc.skyAtmosphere.brightnessShift=0.06;if(sc.atmosphere){sc.atmosphere.lightIntensity=10;}
 sc.globe.enableLighting=false;sc.globe.dynamicAtmosphereLighting=true;sc.globe.dynamicAtmosphereLightingFromSun=true;}
function cycleQuality(){const order=['auto','high','medium','low'];QMODE=order[(order.indexOf(QMODE)+1)%4];try{localStorage.setItem('eagleQuality',QMODE)}catch(e){}
 QT=QMODE==='auto'?(MOBILE?'medium':'high'):QMODE;const needMsaa=(QT==='high'?4:(QT==='medium'&&!MOBILE?2:1));applyQuality();toast('🎨 Graphics: '+QMODE.toUpperCase());
 if(needMsaa!==QMSAA)setTimeout(()=>location.reload(),600);}
window.__setSunFor=(lon)=>{if(LEGGFX)return;const d=new Date();const utcH=14-lon/15;d.setUTCHours(0,0,0,0);d.setTime(d.getTime()+((utcH%24+24)%24)*3600e3);viewer.clock.currentTime=C.JulianDate.fromDate(d);viewer.clock.multiplier=1;};
if(MOBILE&&LEGGFX){viewer.useBrowserRecommendedResolution=true;viewer.resolutionScale=1;viewer.scene.globe.tileCacheSize=60;}
const cv=viewer.scene.canvas;cv.addEventListener('webglcontextlost',e=>{e.preventDefault();saveState(true);console.warn('WebGL context lost; reloading to resume flight');setTimeout(()=>location.reload(),300);},false);
const doResize=()=>{document.documentElement.style.setProperty('--vh',(window.visualViewport?visualViewport.height:innerHeight)+'px');viewer.resize();};
addEventListener('resize',doResize);addEventListener('orientationchange',()=>setTimeout(doResize,300));if(window.visualViewport)visualViewport.addEventListener('resize',doResize);doResize();
const keyLight=new C.DirectionalLight({direction:new C.Cartesian3(0,0,-1),intensity:1.25});viewer.scene.light=LEGGFX?keyLight:new C.SunLight({intensity:2.0});
viewer.scene.preRender.addEventListener(()=>{if(!LEGGFX)return;const up=viewer.scene.globe.ellipsoid.geodeticSurfaceNormal(viewer.camera.positionWC,new C.Cartesian3());const d=C.Cartesian3.add(C.Cartesian3.multiplyByScalar(up,-1.2,new C.Cartesian3()),C.Cartesian3.add(viewer.camera.directionWC,C.Cartesian3.multiplyByScalar(viewer.camera.rightWC,0.4,new C.Cartesian3()),new C.Cartesian3()),new C.Cartesian3());C.Cartesian3.normalize(d,keyLight.direction);});
let tiles=null;window.__tilesReady=false;
(async()=>{if(!ION||location.search.includes('notiles'))return;try{tiles=await C.createGooglePhotorealistic3DTileset();}catch(e){console.warn('Google tiles unavailable, using OSM Buildings',e);try{tiles=await C.createOsmBuildingsAsync();}catch(e2){}}
 if(tiles){const LEG=location.search.includes('legacylod');
 if(LEG){if(MOBILE){tiles.maximumScreenSpaceError=20;tiles.cacheBytes=96*1024*1024;tiles.maximumCacheOverflowBytes=32*1024*1024;}else{tiles.cacheBytes=384*1024*1024;}}
 else{// sharp near the eagle, coarse beyond ~1.6 km: low base SSE + strong distance-based SSE growth + fog culling
  tiles.maximumScreenSpaceError=MOBILE?10:6;tiles.dynamicScreenSpaceError=true;tiles.dynamicScreenSpaceErrorDensity=1.2e-3;tiles.dynamicScreenSpaceErrorFactor=MOBILE?40:28;tiles.dynamicScreenSpaceErrorHeightFalloff=0.5;
  tiles.foveatedScreenSpaceError=true;tiles.foveatedConeSize=0.25;tiles.foveatedTimeDelay=0.1;tiles.preferLeaves=false;tiles.loadSiblings=false;tiles.preloadFlightDestinations=false;tiles.preloadWhenHidden=false;tiles.foveatedMinimumScreenSpaceErrorRelaxation=MOBILE?8:4;tiles.cullRequestsWhileMoving=true;tiles.cullRequestsWhileMovingMultiplier=60;

  viewer.scene.fog.enabled=true;viewer.scene.fog.density=MOBILE?6e-4:4.5e-4;viewer.scene.fog.screenSpaceErrorFactor=6;viewer.scene.fog.minimumBrightness=0.15;
  viewer.scene.globe.maximumScreenSpaceError=MOBILE?2:1.5;}
 try{tiles.enableCollision=false;}catch(e){}// otherwise Scene reads tile geometry back from the GPU every frame for camera collision
 window.__tileset=tiles;if(!LEG)applyQuality();viewer.scene.primitives.add(tiles);window.__tilesReady=true;}})();
const dyn=[];// entities to exclude from height sampling
function terrainAt(lon,lat){const c=C.Cartographic.fromDegrees(lon,lat,0,_tc);const t=viewer.scene.globe.getHeight(c);return t===undefined?null:t;}const _tc=new C.Cartographic();
function groundAt(lon,lat){const c=C.Cartographic.fromDegrees(lon,lat);let h;try{h=viewer.scene.sampleHeightSupported?viewer.scene.sampleHeight(c,dyn):undefined}catch(e){}
 const t=viewer.scene.globe.getHeight(c);if(h===undefined||(t!==undefined&&h<t-30))h=t;return h===undefined?null:h;}
const $=id=>document.getElementById(id);const arrowEl=$('arrow').querySelector('span'),statsEl=$('stats');
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
 S.ground=b;window.__setSunFor&&window.__setSunFor(lon);mode='fly';nest={lon,lat,b};buildNest(lon,lat,b);addChicks(lon,lat,b);$('banner').style.display='none';$('search').style.display='none';$('hud').style.display='block';
 Object.assign(S,{lon,lat,h:b+4,heading:0,pitch:C.Math.toRadians(20)});
 dyn.push(eagle);viewer.scene.screenSpaceCameraController.enableInputs=false;}
let headEnt;const flap={phase:0,rate:1,bob:0};window.__flap=flap;let eagleScale=1,modelYaw=MD.yaw,modelPitch=0,modelRoll=0;window.__orient=(y,p,r)=>{modelYaw=y;modelPitch=p;modelRoll=r};
function makeEagle(){ const eq=()=>{const q=C.Transforms.headingPitchRollQuaternion(pos(),new C.HeadingPitchRoll(S.heading-Math.PI/2,S.pitch,S.roll));
    const fix=C.Quaternion.fromHeadingPitchRoll(new C.HeadingPitchRoll(modelYaw,modelPitch,modelRoll));return C.Quaternion.multiply(q,fix,new C.Quaternion())};
 eagle=viewer.entities.add({position:new C.CallbackProperty(()=>{const p=pos();return C.Cartesian3.fromDegrees(S.lon,S.lat,S.h+flap.bob);const m=C.Matrix3.fromQuaternion(eq());const o=C.Matrix3.multiplyByVector(m,window.__loc,new C.Cartesian3());return C.Cartesian3.subtract(p,o,new C.Cartesian3())},false),
  orientation:new C.CallbackProperty(eq,false),model:{shadows:C.ShadowMode.ENABLED,imageBasedLightingFactor:new C.Cartesian2(1.1,1.1),uri:MD.uri,scale:new C.CallbackProperty(()=>eagleScale,false),minimumPixelSize:0,runAnimations:false}});
 headEnt=eagle;
 const t=setInterval(()=>{try{const mp=viewer.dataSourceDisplay.defaultDataSource._visualizers.find(v=>v._modelHash)._modelHash[eagle.id].modelPrimitive;
  if(mp&&mp.ready){clearInterval(t);patchSkin(mp);try{mp.maximumAnisotropy=8;}catch(e){}const r=mp.boundingSphere.radius/eagleScale;eagleScale=MD.size/r;window.__eagleR=r;window.__mp=mp;setTimeout(()=>{const inv=C.Matrix4.inverse(mp.modelMatrix,new C.Matrix4());const l=C.Matrix4.multiplyByPoint(inv,mp.boundingSphere.center,new C.Cartesian3());window.__loc=l;},800);
   mp.activeAnimations.removeAll();mp.activeAnimations.add({index:MD.clip,loop:C.ModelAnimationLoop.REPEAT,animationTime:()=>flap.phase});window.__anims=mp.activeAnimations.length;}}catch(e){}},300);
}makeEagle();
// Cesium 1.122 recomputes ALL skin joint matrices once per scene-graph node, every frame (O(nodes x joints)).
// Run it once per update instead; joint matrices are only read at draw time, so the result is identical.
function patchSkin(mp){try{const sg=mp._sceneGraph;if(!sg||typeof sg.update!=='function'||typeof sg.updateJointMatrices!=='function')return;const P=Object.getPrototypeOf(sg);if(P.__eagleSkinPatch)return;
 const up=P.update,uj=P.updateJointMatrices,noop=function(){};P.update=function(fs,dirty){this.updateJointMatrices=noop;try{up.call(this,fs,dirty);}finally{delete this.updateJointMatrices;}if(dirty&&this._skinnedNodes&&this._skinnedNodes.length)uj.call(this);};P.__eagleSkinPatch=1;window.__skinPatched=true;}catch(e){console.warn('skin patch',e)}}
function pos(){return C.Cartesian3.fromDegrees(S.lon,S.lat,S.h)}
function fwd(d,up){const m=111320;return C.Cartesian3.fromDegrees(S.lon+Math.sin(S.heading)*d*Math.cos(S.pitch)/(m*Math.cos(S.lat*Math.PI/180)),S.lat+Math.cos(S.heading)*d*Math.cos(S.pitch)/m,S.h+Math.sin(S.pitch)*d+up)}
// --- input
const inp={x:0,y:0};const keys={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=1;if(e.key===' ')boost();if(e.key.toLowerCase()==='p')poop();if(e.key.toLowerCase()==='h')hover();if(e.key.toLowerCase()==='l')landBtn();if(e.key.toLowerCase()==='v')toggleCam();});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=0);
const joy=$('joy'),knob=$('knob');let jid=null;
function jmove(e){const r=joy.getBoundingClientRect();let dx=e.clientX-r.left-70,dy=e.clientY-r.top-70;const l=Math.hypot(dx,dy);if(l>55){dx*=55/l;dy*=55/l}knob.style.left=45+dx+'px';knob.style.top=45+dy+'px';inp.x=dx/55;inp.y=dy/55;}
joy.addEventListener('pointerdown',e=>{jid=e.pointerId;joy.setPointerCapture(jid);jmove(e)});joy.addEventListener('pointermove',e=>{if(e.pointerId===jid)jmove(e)});
const jend=e=>{if(e.pointerId!==jid)return;jid=null;inp.x=inp.y=0;knob.style.left=knob.style.top='45px'};joy.addEventListener('pointerup',jend);joy.addEventListener('pointercancel',jend);
$('boost').addEventListener('pointerdown',e=>{e.preventDefault();boost()});$('poop').addEventListener('pointerdown',e=>{e.preventDefault();poop()});$('hover').addEventListener('pointerdown',e=>{e.preventDefault();hover()});$('qual').addEventListener('pointerdown',e=>{e.preventDefault();cycleQuality()});$('cam').addEventListener('pointerdown',e=>{e.preventDefault();toggleCam()});$('land').addEventListener('pointerdown',e=>{e.preventDefault();landBtn()});
let actx;function beep(f1,f2,dur,type){try{actx=actx||new AudioContext();const o=actx.createOscillator(),g=actx.createGain();o.type=type;o.frequency.setValueAtTime(f1,actx.currentTime);o.frequency.exponentialRampToValueAtTime(f2,actx.currentTime+dur);g.gain.setValueAtTime(.25,actx.currentTime);g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+dur);o.connect(g).connect(actx.destination);o.start();o.stop(actx.currentTime+dur)}catch(e){}}
function takeOff(){if(S.crash)return;CR.graceT=performance.now()+1500;S.perched=false;S.landing=null;S.hover=false;$('hover').classList.remove('on');S.h+=0.6;S.pitch=0.35;S.speed=12;$('land').innerHTML='🛬<small>LAND</small>';beep(400,900,.3,'sine');}
const withTO=(p,ms)=>Promise.race([p,new Promise((_,rj)=>setTimeout(()=>rj('timeout'),ms))]);
let osmB=null;const osmFeat=new Map();
async function ensureOsm(){if(osmB){if(!dyn.includes(osmB))dyn.push(osmB);return;}if(!ION)return;try{osmB=await C.createOsmBuildingsAsync();osmB.style=new C.Cesium3DTileStyle({color:"color('white',0.0)"});osmB.maximumScreenSpaceError=MOBILE?24:16;osmB.cacheBytes=32*1024*1024;
 osmB.tileLoad.addEventListener(t=>{const c=t.content;if(!c||!c.featuresLength)return;for(let k=0;k<c.featuresLength;k++){const f=c.getFeature(k);const h=+f.getProperty('cesium#estimatedHeight');const la=+f.getProperty('cesium#latitude'),lo=+f.getProperty('cesium#longitude');if(h>0&&la&&lo)osmFeat.set(f.getProperty('elementId')||(la+','+lo),{lat:la,lon:lo,h,name:f.getProperty('name')});}});
 viewer.scene.primitives.add(osmB);dyn.push(osmB);}catch(e){console.warn('osm buildings',e)}}
async function overpassCands(lat,lon){const q='[out:json][timeout:8];(way["building"](around:250,'+lat+','+lon+');node["natural"="peak"](around:300,'+lat+','+lon+'););out tags center;';
 const j=await (await withTO(fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded'}}),7000)).json();
 return (j.elements||[]).map(e=>{const t=e.tags||{};const c=e.center||e;let h=parseFloat(t.height)||(parseFloat(t['building:levels'])*3.3)||0;return {lat:c.lat,lon:c.lon,h,peak:t.natural==='peak',ele:parseFloat(t.ele)||null,name:t.name}}).filter(c=>c.lat&&(c.h>0||c.peak));}
async function gridMax(){const pts=[],N=9,R=250,cosl=Math.cos(S.lat*Math.PI/180);for(let i=0;i<N;i++)for(let j=0;j<N;j++){const dx=(i/(N-1)*2-1)*R,dy=(j/(N-1)*2-1)*R;if(Math.hypot(dx,dy)<=R)pts.push(C.Cartographic.fromDegrees(S.lon+dx/(111320*cosl),S.lat+dy/111320));}
 let res=pts;try{res=await withTO(C.sampleTerrainMostDetailed(viewer.terrainProvider,pts.map(c=>c.clone())),5000);}catch(e){}let best=null;for(const c of res){const h=c.height??groundAt(C.Math.toDegrees(c.longitude),C.Math.toDegrees(c.latitude));if(h!=null&&(!best||h>best.h))best={lon:C.Math.toDegrees(c.longitude),lat:C.Math.toDegrees(c.latitude),h,src:'terrain'};}return best;}
async function sampleTop(lon,lat){try{const [c]=await withTO(viewer.scene.sampleHeightMostDetailed([C.Cartographic.fromDegrees(lon,lat)],dyn),4000);if(c.height!=null)return c.height;}catch(e){}return groundAt(lon,lat);}
async function landBtn(){if(S.crash)return;if(mode!=='fly')return;if(S.perched||S.landing){takeOff();return;}
 toast('🔎 Looking for the highest perch…');const lat0=S.lat,lon0=S.lon;let base=null;try{const [t]=await withTO(C.sampleTerrainMostDetailed(viewer.terrainProvider,[C.Cartographic.fromDegrees(lon0,lat0)]),4000);base=t.height;}catch(e){}if(base==null)base=S.ground||0;
 let cands=[];try{cands=await overpassCands(lat0,lon0);}catch(e){console.warn('overpass unavailable, using OSM Buildings',e);}
 if(!cands.length){await ensureOsm();if(osmB){const t0=performance.now();while(performance.now()-t0<12000){await new Promise(r=>setTimeout(r,500));if([...osmFeat.values()].some(f=>hdist(lon0,lat0,f.lon,f.lat)<250&&f.h>0)&&performance.now()-t0>2000)break;}
  cands=[...osmFeat.values()].filter(f=>hdist(lon0,lat0,f.lon,f.lat)<=250);}}
 // absolute estimates
 let best=null;for(const c of cands){const abs=c.peak?(c.ele!=null?c.ele:base):base+c.h;if(!best||abs>best.abs)best={...c,abs,src:c.peak?'peak':'building'};}
 const g=await gridMax();if(g&&(!best||g.h>best.abs)){best={lon:g.lon,lat:g.lat,abs:g.h,src:'terrain'};}
 if(!best){toast('No perch found');return;}
 // actual surface at target (may be low-res now; refined in flight)
 let top=await sampleTop(best.lon,best.lat);if(top==null||(best.src==='building'&&top<best.abs-25))top=best.abs;
 const L={from:{lon:S.lon,lat:S.lat,h:S.h},to:{lon:best.lon,lat:best.lat,h:top+0.07},t0:performance.now(),dur:Math.min(9000,Math.max(3500,hdist(S.lon,S.lat,best.lon,best.lat)*25)),base,top,name:best.name,src:best.src,lastRs:0};
 S.hover=true;$('hover').classList.remove('on');S.speed=0;S.pitch=0;S.landing=L;const cosl=Math.cos(S.lat*Math.PI/180);S.heading=Math.atan2((best.lon-S.lon)*cosl,best.lat-S.lat);$('land').innerHTML='🛫<small>TAKE OFF</small>';
 window.__landTarget=best;}
async function resample(L){L.busy=true;const h=await sampleTop(L.to.lon,L.to.lat);if(h!=null&&!(L.src==='building'&&h<L.top-30)){L.top=h;L.to.h=h+0.07;}L.busy=false;}
function landStep(){const L=S.landing;if(!L)return;if(!L.busy&&performance.now()-L.lastRs>1200){L.lastRs=performance.now();resample(L);}const k=Math.min(1,(performance.now()-L.t0)/L.dur),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
 S.lon=L.from.lon+(L.to.lon-L.from.lon)*e;S.lat=L.from.lat+(L.to.lat-L.from.lat)*e;const arc=Math.sin(k*Math.PI)*Math.max(3,Math.abs(L.to.h-L.from.h)*0.3);
 S.holdH=S.h=L.from.h+(L.to.h-L.from.h)*e+arc;if(k>=1){S.landing=null;S.perched=true;S.holdH=S.h=L.to.h;beep(500,250,.25,'sine');
  toast('🪶 Landed on '+(L.name||('highest '+(L.src==='building'?'rooftop':L.src==='peak'?'peak':'point')))+', '+Math.max(0,L.top-L.base).toFixed(0)+' m above ground');}}
function hover(){if(S.crash)return;if(mode!=='fly')return;if(S.perched||S.landing){takeOff();return;}S.hover=!S.hover;if(S.hover){S.holdH=S.h;S.speed=0;S.pitch=0;S.roll=0;}$('hover').classList.toggle('on',S.hover);beep(S.hover?700:400,S.hover?400:700,.25,'sine')}
function boost(){if(S.crash)return;if(mode!=='fly')return;if(S.perched||S.landing){takeOff();}if(S.hover){S.hover=false;$('hover').classList.remove('on');}S.boostT=3;beep(200,900,.6,'sawtooth')}
const poops=[];
function poop(){if(S.crash)return;if(mode!=='fly')return;beep(500,80,.35,'square');const p={lon:S.lon,lat:S.lat,h:S.h-0.3,vh:Math.sin(S.pitch)*S.speed,vf:S.speed*Math.cos(S.pitch)*0.9,hd:S.heading,h0:S.h};poopCam={p,until:Infinity};
 p.ent=viewer.entities.add({position:new C.CallbackProperty(()=>C.Cartesian3.fromDegrees(p.lon,p.lat,p.h),false),ellipsoid:{radii:new C.Cartesian3(.12,.12,.18),material:C.Color.WHITE}});dyn.push(p.ent);poops.push(p);}
function heightTick(){if(mode!=='fly'||S.crash)return;if(crProbeStep())return;const now=performance.now(),m=111320;
 const agl0=S.h-(S.ground||0),still=!!(S.hover||S.perched||S.landing),sInt=still?300:Math.min(agl0>300?700:agl0>40?400:(MOBILE?200:150),S.speed>30?220:1e9);
 if((now-lastSampleT)>sInt){lastSampleT=now;const AH=[Math.max(20,S.speed*0.6),Math.max(60,S.speed*1.8)];const cosl=Math.cos(S.lat*Math.PI/180);
  const moved=Math.abs(S.lon-lastSP.lon)+Math.abs(S.lat-lastSP.lat)>2e-5;// ~2 m
  const far=agl0>900&&!S.hover,skip=still&&!moved&&now-lastStillS<1500;// high above everything: terrain only; hovering/perched in place: ground can't change
  const slot=still?0:(sampleSlot=(sampleSlot+1)%4);const tg=terrainAt(S.lon,S.lat);let ahead=-1e9;aheadB=-1e9;
  if(!skip&&slot%2===0){lastSP.lon=S.lon;lastSP.lat=S.lat;lastStillS=now;const g0=far?tg:groundAt(S.lon,S.lat);if(!far&&crGroundSample(S.ground,g0,tg))return;if(g0!==null)S.ground=g0;else if(tg!==null)S.ground=tg;}
  for(let k=0;k<AH.length;k++){const dd=AH[k],la=S.lat+Math.cos(S.heading)*dd/m,lo=S.lon+Math.sin(S.heading)*dd/(m*cosl);const t=terrainAt(lo,la);
   if(far)aheadS[k]=-1e9;else if(!still&&slot===(k?3:1)){const g=groundAt(lo,la);aheadS[k]=g!==null?g:(t??-1e9);aheadH[k]=S.heading;crAheadSample(dd,g,t);}
   ahead=Math.max(ahead,t??-1e9);aheadB=Math.max(aheadB,Math.abs(S.heading-aheadH[k])<0.35?aheadS[k]:-1e9);}
  if(tg!==null&&(S.ground==null||S.ground<tg-30))S.ground=tg;lastAhead=ahead;}
}
viewer.scene.preRender.addEventListener(heightTick);
// --- loop
let last=performance.now();
viewer.scene.postRender.addEventListener(()=>{const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;if(mode!=='fly')return;if(S.crash){crashStep(dt,now);return;}crParticlesOnly(dt);
 let tx=inp.x+((keys.d||keys.arrowright)?1:0)-((keys.a||keys.arrowleft)?1:0),ty=inp.y+((keys.s||keys.arrowdown)?1:0)-((keys.w||keys.arrowup)?1:0);
 tx=Math.max(-1,Math.min(1,tx));ty=Math.max(-1,Math.min(1,ty));
 if((S.perched||S.landing)&&Math.hypot(tx,ty)>0.35)takeOff();if(S.landing)landStep();if(S.perched||S.landing){tx=0;ty=0;}
 if(!S.landing)S.heading+=tx*(S.hover?1.6:1.3)*dt;S.roll+=((S.hover?0:tx*0.7)-S.roll)*3*dt;
 if(S.hover){S.pitch=0;S.speed=0;const dz=Math.abs(ty)>0.08?-ty*3*dt:0;S.holdH=(S.holdH??S.h)+dz;S.h=S.holdH;}else S.pitch+=(-ty*0.9-S.pitch*0.4)*dt*1.5;S.pitch=Math.max(-1.2,Math.min(1.0,S.pitch));
 S.boostT=Math.max(0,S.boostT-dt);const target=S.hover?0:(S.boostT>0?70:22)-Math.sin(S.pitch)*8;S.speed+=(target-S.speed)*(S.hover?3:1.5)*dt;
 {const climb=Math.max(0,S.pitch),dive=!S.hover&&S.pitch<-0.22;let tr=S.hover?0:dive?0:(0.55+climb*1.6+(S.boostT>0?1.0:0));tr=Math.min(S.hover?2.4:1.9,tr);flap.rate+=(tr-flap.rate)*Math.min(1,(dive?9:3)*dt);
 if((dive||S.hover)&&flap.rate<0.35){flap.phase=(flap.phase+((MD.glide-flap.phase+1.5)%1-0.5)*Math.min(1,7*dt)+1)%1;}else flap.phase=(flap.phase+flap.rate*dt/MD.cycles)%1;
 if(window.__fixPhase!==undefined)flap.phase=window.__fixPhase;flap.bob=(S.perched||S.landing)?0:S.hover?Math.sin(performance.now()/450)*0.02:-Math.sin(flap.phase*MD.cycles*2*Math.PI)*0.025*Math.min(1,flap.rate);}
 {const bz=S.boostT>0;if(bz!==fxBoost){fxBoost=bz;document.body.classList.toggle('boosting',bz);$('fx').className=bz?'boosting':'';}}
 const m=111320,d=S.hover?0:S.speed*dt*Math.cos(S.pitch);if(!S.hover)S.lat+=Math.cos(S.heading)*d/m;S.lon+=Math.sin(S.heading)*d/(m*Math.cos(S.lat*Math.PI/180));if(!S.hover)S.h+=Math.sin(S.pitch)*S.speed*dt;
 // height sampling: scene.sampleHeight forces a GPU pick render + synchronous readPixels (very costly on phones),
 // so do at most ONE per tick, round-robin over [here, ahead1, here, ahead2]; cheap CPU terrain heights fill the gaps every tick.
 crWallCheck();if(S.crash)return;crSafeTick(now);const gnd=S.ground||0,ahead=lastAhead;window.__warn=!S.hover&&!S.perched&&!S.landing&&aheadB+2>S.h;if(!S.hover&&ahead+4>S.h){window.__warn=true;S.pitch=Math.min(1.0,S.pitch+2.5*dt);S.h+=Math.min(ahead+4-S.h,15)*dt*2;}
 if(!S.perched&&!S.landing&&S.h<gnd+2){S.h=gnd+2;if(S.hover)S.holdH=S.h;if(S.pitch<0)S.pitch=0;} if(S.h>gnd+8000)S.h=gnd+8000;
 for(let i=poops.length-1;i>=0;i--){const p=poops[i];p.vh-=9.8*dt;p.h+=p.vh*dt;p.lat+=Math.cos(p.hd)*p.vf*dt/m;p.lon+=Math.sin(p.hd)*p.vf*dt/(m*Math.cos(p.lat*Math.PI/180));
  if(p.gT===undefined||(p.h<(p.g??0)+40&&now-p.gT>(p.h<(p.g??0)+4?60:220))||now-p.gT>600){p.gT=now;p.g=(p.h<(p.g??-1e9)+40||p.g===undefined?groundAt(p.lon,p.lat):terrainAt(p.lon,p.lat))??p.g??0;}const pg=p.g;if(p.h<=pg+0.05){viewer.entities.remove(p.ent);const r=Math.min(3,0.6+Math.abs(p.vh)*0.03);viewer.entities.add({position:C.Cartesian3.fromDegrees(p.lon,p.lat,pg+0.08),ellipse:{semiMajorAxis:r,semiMinorAxis:r*0.75,height:pg+0.08,rotation:Math.random()*3,material:C.Color.WHITE.withAlpha(.92)}});beep(160,60,.15,'triangle');poops.splice(i,1);splatFx(p.lon,p.lat,pg,Math.max(0,p.h0-pg));if(poopCam&&poopCam.p===p)poopCam.until=performance.now()+2500;}}
 stepDrops(dt);wormStep();
 // chase cam

 // HUD
 const dx=(nest.lon-S.lon)*m*Math.cos(S.lat*Math.PI/180),dy=(nest.lat-S.lat)*m,dist=Math.hypot(dx,dy),brg=Math.atan2(dx,dy)-S.heading;
 updCompass(S.heading,Math.atan2(dx,dy));
 if(now-hudT>100){hudT=now;const b=Math.round(brg*50)/50;if(b!==hudBrg){hudBrg=b;arrowEl.style.transform='rotate('+b+'rad)';}
  const ds=dist<1000?dist.toFixed(0)+' m':(dist/1000).toFixed(1)+' km';if(ds!==hudDist){hudDist=ds;$('dist').textContent=ds;}
  const st=(S.perched?'🪶 PERCHED · ':S.landing?'🛬 LANDING · ':S.hover?'🪽 HOVER · ':'')+`Alt ${(S.h-gnd).toFixed(0)} m AGL${window.__warn?' · ⚠️ PULL UP':''} · ${(S.speed*3.6).toFixed(0)} km/h${S.boostT>0?' · 🔥BOOST':''}`;if(st!==hudStats){hudStats=st;statsEl.textContent=st;}
  const cs=dist<500;if(cs!==chickShow){chickShow=cs;for(const e of chicks)e.show=cs;}}
});
viewer.camera.setView({destination:C.Cartesian3.fromDegrees(-92.1,46.78,2.0e7)});
let lastSampleT=0,poopCam=null,frameN=0,lastAhead=-1e9,sampleSlot=0;let aheadB=-1e9;const aheadS=[-1e9,-1e9],aheadH=[0,0],lastSP={lon:0,lat:0,h:0};let lastStillS=0;let hudT=0,hudStats='',hudDist='',hudBrg=1e9,fxBoost=null,chickShow=true;window.__poopCam=()=>poopCam;
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
let camP=-0.21,camH=0;viewer.scene.preRender.addEventListener(()=>{if(mode!=='fly')return;if(S.crash){crashCam();return;}const back=S.boostT>0?1.4:1.0;const tp=Math.max(-1.1,Math.min(-0.18,-0.21+Math.min(0,S.pitch)*0.9));camP+=(tp-camP)*0.08;if(poopCam){if(performance.now()>poopCam.until)poopCam=null;else{const p=poopCam.p;viewer.camera.lookAt(C.Cartesian3.fromDegrees(p.lon,p.lat,p.h),poopCam.close?new C.HeadingPitchRange(S.heading+0.6+(performance.now()%20000)/6000,-0.45,3.2):new C.HeadingPitchRange(S.heading+0.5,-0.75,9));return;}}if(fp&&!poopCam&&!window.__camOv){if(eagle)eagle.show=false;viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
  const b2=Math.sin(flap.phase*MD.cycles*2*Math.PI)*0.02*Math.min(1,flap.rate);viewer.camera.setView({destination:C.Cartesian3.fromDegrees(S.lon+Math.sin(S.heading)*0.13/(m2*Math.cos(S.lat*Math.PI/180)),S.lat+Math.cos(S.heading)*0.13/m2,S.h+0.04+b2+flap.bob),orientation:{heading:S.heading,pitch:S.pitch-0.12,roll:S.roll}});return;}
 if(eagle)eagle.show=true;if(window.__camOv){const o=window.__camOv;viewer.camera.lookAt(o.at?C.Cartesian3.fromDegrees(o.at[0],o.at[1],o.at[2]):pos(),new C.HeadingPitchRange(S.heading+o.dh,o.p,o.r));return;}viewer.camera.lookAt(pos(),new C.HeadingPitchRange((camH+=(((S.heading-camH+Math.PI*3)%(Math.PI*2))-Math.PI)*0.25),camP,back));});
function saveState(force){if(mode!=='fly'||!nest)return;try{sessionStorage.setItem('eagleFlight',JSON.stringify({nest,S:crSaveS()||{lon:S.lon,lat:S.lat,h:S.h,heading:S.heading,pitch:S.pitch},t:Date.now()}))}catch(e){}}
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
function addChicks(lon,lat,b){chicks=[];const DOWN=new C.ImageMaterialProperty({image:downTex(),repeat:new C.Cartesian2(5,5),color:C.Color.fromCssColorString('#a9a39a')});const DOWN2=new C.ImageMaterialProperty({image:downTex(),repeat:new C.Cartesian2(2,2),color:C.Color.fromCssColorString('#c9c3b9')});
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
 viewer.entities.add({position:C.Cartesian3.fromDegrees(lon,lat,b+3.2),label:{text:'🐣',font:'13px sans-serif',fillColor:C.Color.WHITE,outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,disableDepthTestDistance:1e9,distanceDisplayCondition:new C.DistanceDisplayCondition(0,1500)}});}
function chirp(n){for(let i=0;i<n;i++)setTimeout(()=>beep(2400+Math.random()*900,1800,.09,'sine'),i*110)}
function toast(msg){const t=$('toast');t.textContent=msg;t.style.opacity=1;clearTimeout(t._h);t._h=setTimeout(()=>t.style.opacity=0,2500);}
function wormStep(){if(!nest)return;const now=performance.now();if(dn2()<80&&now-lastChirp>2500+Math.random()*2000){lastChirp=now;chirp(2);}landmarkStep();}
let lmPins=[],lmLast=null,lmT=0,lmBusy=false,lmSeen=new Set(),lmCache={};
const LM_BAD=/radio|television|tv station|broadcast|organi[sz]ation|company|corporation|advocacy|non-profit|nonprofit|record label|band|newspaper|magazine|shooting|crash|accident|attack|bombing|murder|riot|disaster|restaurant|law firm|bank|agency|software|retail|chain|neighbou?rhood|census|area of|former|defunct|demolished|subway station|rail station|bus|school district|^$/i;
const LM_GOOD=[[/monument|memorial|statue|landmark|historic|national register/i,5],[/museum|cathedral|castle|palace|tower|bridge|stadium|observatory|lighthouse|temple|mosque|church|basilica/i,4],[/skyscraper|park|garden|square|theat|opera|library|zoo|aquarium|fountain|plaza/i,3],[/mountain|peak|summit|lake|island|waterfall|canyon|beach|forest|river/i,4],[/building|hotel|university|college/i,1]];
async function landmarkFetch(){lmBusy=true;try{const key=S.lat.toFixed(2)+','+S.lon.toFixed(2);let list=lmCache[key];
 if(!list){const u='https://en.wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord='+S.lat.toFixed(5)+'|'+S.lon.toFixed(5)+'&ggsradius=5000&ggslimit=80&prop=description|coordinates&format=json&origin=*';
  const j=await (await fetch(u)).json();list=Object.values((j.query&&j.query.pages)||{}).filter(p=>p.coordinates&&p.coordinates[0]).map(p=>{const d=p.description||'';let sc=0;for(const [re,v] of LM_GOOD)if(re.test(d)||re.test(p.title))sc=Math.max(sc,v);
   return {title:p.title,pageid:p.pageid,lat:p.coordinates[0].lat,lon:p.coordinates[0].lon,desc:d,score:sc}}).filter(g=>g.score>0&&!LM_BAD.test(g.desc)&&!/\((19|20)\d\d/.test(g.title));lmCache[key]=list;}
 list.forEach(g=>g.dist=hdist(S.lon,S.lat,g.lon,g.lat));
 const pick=[];for(const g of list.slice().sort((a,b)=>(b.score-a.score)||(a.dist-b.dist))){if(pick.length>=10)break;if(pick.some(q=>hdist(q.lon,q.lat,g.lon,g.lat)<60))continue;pick.push(g);}if(mode!=='fly'){lmBusy=false;return;}let hs=null;try{hs=await withTO(C.sampleTerrainMostDetailed(viewer.terrainProvider,pick.map(g=>C.Cartographic.fromDegrees(g.lon,g.lat))),4000);}catch(e){}
 if(mode!=='fly'){lmBusy=false;return;}lmPins.forEach(p=>viewer.entities.remove(p.ent));lmPins=[];pick.forEach((g,i)=>{const gh=(hs&&hs[i]&&hs[i].height!=null)?hs[i].height:(terrainAt(g.lon,g.lat)??0);const ent=viewer.entities.add({position:C.Cartesian3.fromDegrees(g.lon,g.lat,gh+3),
  point:{pixelSize:7,color:C.Color.fromCssColorString('#ffd24a').withAlpha(.9),outlineColor:C.Color.BLACK.withAlpha(.6),outlineWidth:1,disableDepthTestDistance:1e9},
  label:{text:'📍 '+g.title,font:'12px system-ui',fillColor:C.Color.WHITE,outlineColor:C.Color.BLACK,outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new C.Cartesian2(0,-12),scaleByDistance:new C.NearFarScalar(200,1.1,5000,0.55),translucencyByDistance:new C.NearFarScalar(3000,1,6000,0.3),distanceDisplayCondition:new C.DistanceDisplayCondition(0,6000),disableDepthTestDistance:1e9}});
  lmPins.push({ent,g});});lmLast={lon:S.lon,lat:S.lat};}catch(e){console.warn('landmarks',e)}lmBusy=false;lmT=performance.now();}
function landmarkStep(){const now=performance.now();if(!lmBusy&&now-lmT>15000&&(!lmLast||hdist(S.lon,S.lat,lmLast.lon,lmLast.lat)>800))landmarkFetch();
 for(const p of lmPins){if(!lmSeen.has(p.g.pageid)&&hdist(S.lon,S.lat,p.g.lon,p.g.lat)<300){lmSeen.add(p.g.pageid);toast('📍 Nearby: '+p.g.title);}}}
window.__lm=()=>lmPins.map(p=>p.g.title);
function dn2(){return hdist(S.lon,S.lat,nest.lon,nest.lat)}
function endFlight(){if(mode!=='fly')return;try{sessionStorage.removeItem('eagleFlight')}catch(e){}mode='pick';poops.length=0;drops.length=0;worms=[];carried=0;carryEnt=null;falling=[];grabTarget=null;lmPins=[];lmLast=null;lmT=0;S.perched=false;S.landing=null;chicks=[];$('arrow').classList.remove('carry');poopCam=null;S.hover=false;S.boostT=0;$('hover').classList.remove('on');window.__mp=null;
 crReset();viewer.entities.removeAll();dyn.length=0;nest=null;makeEagle();
 $('hud').style.display='none';$('banner').style.display='block';$('banner').innerHTML="🦅 Tap anywhere on Earth to build your eagle's nest<br><small>zoom in for precision (pinch / scroll)</small>";$('search').style.display='flex';
 document.body.classList.remove('boosting');$('fx').className='';viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);viewer.scene.screenSpaceCameraController.enableInputs=true;
 viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(S.lon,S.lat,2.0e6),duration:1.5});}
$('info').onclick=()=>$('creditsPanel').classList.toggle('open');$('closeCredits').onclick=()=>$('creditsPanel').classList.remove('open');
$('quit').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const now=Date.now();if(now-quitArmed<3000){quitArmed=0;$('quitc').style.display='none';endFlight();}else{quitArmed=now;$('quitc').style.display='block';setTimeout(()=>{if(Date.now()-quitArmed>=2900)$('quitc').style.display='none'},3000);}});
const PERF={ft:[],last:0,firstFlight:null,longTasks:0};window.__perf=PERF;
try{new PerformanceObserver(l=>{PERF.longTasks+=l.getEntries().length}).observe({entryTypes:['longtask']})}catch(e){}
viewer.scene.postRender.addEventListener(()=>{const n=performance.now();if(PERF.last)PERF.ft.push(n-PERF.last);PERF.last=n;if(PERF.ft.length>20000)PERF.ft.splice(0,10000);
 if(mode==='fly'&&PERF.firstFlight===null)PERF.firstFlight=n;if(fpsEl&&PERF.ft.length%15===0){const a=PERF.ft.slice(-60);const avg=a.reduce((x,y)=>x+y,0)/a.length;fpsEl.textContent=(1000/avg).toFixed(0)+' fps · '+Math.max(...a).toFixed(0)+' ms max';}});
const fpsEl=location.search.includes('fps')?Object.assign(document.body.appendChild(document.createElement('div')),{style:'position:fixed;left:50%;top:2px;transform:translateX(-50%);z-index:99;color:#0f0;font:11px monospace;background:rgba(0,0,0,.5);padding:1px 5px;pointer-events:none'}):null;
// ---- compass tape
const CPX=2;(function(){const st=$('cstrip');if(!st)return;let h='';for(let d=-360;d<=720;d+=15){const n=((d%360)+360)%360;const lab={0:'N',45:'NE',90:'E',135:'SE',180:'S',225:'SW',270:'W',315:'NW'}[n];
 h+='<i class="'+(lab?'maj':'min')+'" style="left:'+((d+360)*CPX)+'px"></i>'+(lab?'<b class="'+(n===0?'n':'')+'" style="left:'+((d+360)*CPX)+'px">'+lab+'</b>':(n%30===0?'<em style="left:'+((d+360)*CPX)+'px">'+n+'</em>':''));}st.innerHTML=h;})();
const CMP={w:0,tx:null,deg:null,nl:null,edge:null,strip:$('cstrip'),cdeg:$('cdeg'),nm:$('cnest'),box:$('compass')};addEventListener('resize',()=>CMP.w=0);
function updCompass(hd,nestBrg){const deg=((hd*180/Math.PI)%360+360)%360;if(!CMP.w)CMP.w=CMP.box.clientWidth||150;const w=CMP.w;
 const tx=Math.round((w/2-(deg+360)*CPX)*2)/2;if(tx!==CMP.tx){CMP.tx=tx;CMP.strip.style.transform='translate3d('+tx+'px,0,0)';}const dg=Math.round(deg)%360;if(dg!==CMP.deg){CMP.deg=dg;CMP.cdeg.textContent=dg+'°';}
 if(nest){let rel=((nestBrg-hd)*180/Math.PI+540)%360-180;const half=w/2/CPX-4;const ed=Math.abs(rel)>half;if(ed!==CMP.edge){CMP.edge=ed;CMP.nm.classList.toggle('edge',ed);}rel=Math.max(-half,Math.min(half,rel));const nl=Math.round(w/2+rel*CPX);if(nl!==CMP.nl){CMP.nl=nl;CMP.nm.style.left=nl+'px';}}}
window.__compass=()=>({deg:$('cdeg').textContent});
// ---- auto-hide controls
let lastInput=performance.now();const IDLE_MS=4000;
function wake(){lastInput=performance.now();document.body.classList.remove('idle');}
['pointerdown','touchstart','keydown','mousemove','wheel'].forEach(ev=>addEventListener(ev,e=>{const was=document.body.classList.contains('idle');wake();
 if(was&&(ev==='pointerdown'||ev==='touchstart')&&e.target.closest&&e.target.closest('#btns')){e.preventDefault();e.stopPropagation();}},{capture:true,passive:false}));
setInterval(()=>{const armed=quitArmed&&Date.now()-quitArmed<3000;const joyActive=typeof jid!=='undefined'&&jid!==null;
 if(mode==='fly'&&!armed&&!joyActive&&performance.now()-lastInput>IDLE_MS)document.body.classList.add('idle');else if(mode!=='fly'||armed)document.body.classList.remove('idle');},250);
window.__idle=()=>document.body.classList.contains('idle');
window.__game={crRespawn:(n)=>crRespawn(n),get crash(){return S.crash},endFlight,cycleQuality,applyQuality,landBtn,takeOff,toggleCam,get fp(){return fp},worms:()=>worms,nest:()=>nest,get carried(){return carried},grab,dropWorms,get score(){return score},S,teleport(lon,lat,h,hd){Object.assign(S,{lon,lat,h,heading:hd,pitch:0})},start,poop,boost,get mode(){return mode}};
