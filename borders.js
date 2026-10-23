// ---- picker overlay: country + state/province borders and names (Natural Earth, public domain), faded by camera height, picker only
(function(){const BD={cP:null,sP:null,lab:null,ready:false,ca:-1,sa:-1};window.__borders=BD;
 const H=6000;// draw slightly above the surface so terrain doesn't hide the lines
 function prim(lines,width,color){const inst=[];for(const L of lines){const a=[];for(let i=0;i<L.length;i+=2)a.push(L[i],L[i+1],H);
  inst.push(new C.GeometryInstance({geometry:new C.PolylineGeometry({positions:C.Cartesian3.fromDegreesArrayHeights(a),width,arcType:C.ArcType.RHUMB})}));}
  const p=new C.Primitive({geometryInstances:inst,appearance:new C.PolylineMaterialAppearance({material:C.Material.fromType('Color',{color})}),asynchronous:true,show:false});return viewer.scene.primitives.add(p);}
 async function load(){try{const d=await (await fetch('borders.json?v='+(window.EAGLE_BUILD||''))).json();
  BD.cP=prim(d.c,2.0,new C.Color(1,1,1,0));BD.sP=prim(d.s,1.3,new C.Color(1,0.92,0.6,0));
  BD.lab=viewer.scene.primitives.add(new C.LabelCollection());BD.lab.show=false;
  for(const [n,lo,la,r] of d.cl){const far=r<=3?1.4e7:r<=4?9e6:r<=5?6e6:4e6;
   BD.lab.add({position:C.Cartesian3.fromDegrees(lo,la,H),text:n.toUpperCase(),font:'800 15px system-ui,sans-serif',fillColor:C.Color.WHITE,outlineColor:C.Color.BLACK.withAlpha(.85),outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,
    horizontalOrigin:C.HorizontalOrigin.CENTER,verticalOrigin:C.VerticalOrigin.CENTER,distanceDisplayCondition:new C.DistanceDisplayCondition(3.0e5,far),translucencyByDistance:new C.NearFarScalar(far*0.7,1,far,0.0)});}
  for(const [n,lo,la,r] of d.sl){const far=r<=2?6.5e6:r<=6?3.5e6:2.0e6;
   BD.lab.add({position:C.Cartesian3.fromDegrees(lo,la,H),text:n,font:'italic 700 13px system-ui,sans-serif',fillColor:C.Color.fromCssColorString('#ffe9a8'),outlineColor:C.Color.BLACK,outlineWidth:4,style:C.LabelStyle.FILL_AND_OUTLINE,
    horizontalOrigin:C.HorizontalOrigin.CENTER,verticalOrigin:C.VerticalOrigin.CENTER,distanceDisplayCondition:new C.DistanceDisplayCondition(1.5e4,far),translucencyByDistance:new C.NearFarScalar(far*0.7,1,far,0.0)});}
  BD.ready=true;}catch(e){console.warn('borders',e)}}
 const ramp=(h,hi,lo,max)=>h>=hi?0:h<=lo?max:max*(hi-h)/(hi-lo);
 viewer.scene.preRender.addEventListener(()=>{if(!BD.ready)return;const pick=mode==='pick';
  if(!pick){if(BD.cP.show||BD.sP.show||BD.lab.show){BD.cP.show=BD.sP.show=BD.lab.show=false;BD.ca=BD.sa=-1;}return;}
  const h=viewer.camera.positionCartographic.height;const ca=Math.round(ramp(h,1.7e7,1.1e7,0.8)*50)/50,sa=Math.round(ramp(h,5.5e6,3.2e6,0.65)*50)/50;
  if(ca!==BD.ca){BD.ca=ca;BD.cP.show=ca>0;if(BD.cP.ready||BD.cP.appearance)BD.cP.appearance.material.uniforms.color.alpha=ca;}
  if(sa!==BD.sa){BD.sa=sa;BD.sP.show=sa>0;BD.sP.appearance.material.uniforms.color.alpha=sa;}
  BD.lab.show=h<1.5e7;});
 setTimeout(load,1200);})();
