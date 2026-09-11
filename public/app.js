import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.8.0/dist/maplibre-gl.mjs';
import { chooseJourneyOptions, kmBetween } from './src/routing-core.mjs';

const nodeIndex = new Map();
let services = [];
let transfers = [];
let activeMode = 'all';
let activeServiceId = null;
let map;
let plannerRequestId = 0;
let currentRoutePlan = null;

const displayGeometry = new Map();
const selectedPlaces = new Map();
const autocompleteControllers = new Map();

const $ = selector => document.querySelector(selector);
const MODE_LABELS = {
  ptsc: 'PTSC',
  maxi: 'Maxi',
  route_taxi: 'Route taxi',
  water_taxi: 'Water Taxi',
  ferry: 'Ferry'
};
const MAXI_BAND_COLORS = {1:'#F2C94C',2:'#D92D2D',3:'#2E9B4B',4:'#1C1C1E',5:'#8B5E3C',6:'#2F80ED'};
const OPERATOR_COLORS = {ptsc:'#C9252D',water_taxi:'#0A84FF',ferry:'#0077B6',route_taxi:'#6E6E73'};
const ROAD_MODES = new Set(['ptsc','maxi','route_taxi']);
const TT_BOUNDS = [[-61.98,9.95],[-60.42,11.42]];
const TT_MAX_BOUNDS = [[-62.25,9.70],[-60.15,11.68]];
const GEOCODER_BASE = 'https://nominatim.openstreetmap.org/search';
const PHOTON_BASE = 'https://photon.komoot.io/api';
const GEOCODE_CACHE_KEY = 'transittrinidad-geocode-v1';
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';
const OSRM_CACHE_KEY = 'transittrinidad-road-geometry-v1';
let lastGeocodeAt = 0;
let lastOsrmAt = 0;

function modeLabel(mode){ return MODE_LABELS[mode] || mode; }
function escapeHtml(value=''){
  return String(value).replace(/[&<>'\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[char]));
}
function routeColor(service){
  if(service.mode==='maxi'){
    const routeArea=Number(service.routeArea||service.maxiRouteArea||service.bandRouteArea);
    if(MAXI_BAND_COLORS[routeArea]) return MAXI_BAND_COLORS[routeArea];
    const named={yellow:1,red:2,green:3,black:4,brown:5,blue:6}[String(service.bandColor||'').toLowerCase()];
    if(named) return MAXI_BAND_COLORS[named];
    return '#8E8E93';
  }
  return OPERATOR_COLORS[service.mode] || '#6E6E73';
}
function filteredServices(){ return services.filter(service=>activeMode==='all'||service.mode===activeMode); }
function routingServices(){ return filteredServices(); }
function corridorGroups(list=filteredServices()){
  const grouped=new Map();
  for(const service of list){
    if(!grouped.has(service.corridorId)) grouped.set(service.corridorId,[]);
    grouped.get(service.corridorId).push(service);
  }
  return [...grouped.entries()].map(([corridorId,patterns])=>({corridorId,patterns,representative:patterns[0]}));
}
function corridorIsBidirectional(group){
  return group.patterns.some(a=>group.patterns.some(b=>a.originNodeId===b.destinationNodeId&&a.destinationNodeId===b.originNodeId));
}
function backgroundServices(){ return corridorGroups().map(group=>group.representative); }
function hasLocation(node){ return node?.location&&Number.isFinite(node.location.lat)&&Number.isFinite(node.location.lng); }
function serviceNodes(service){ return [nodeIndex.get(service.originNodeId),nodeIndex.get(service.destinationNodeId)]; }
function nodeCoordinates(id){
  const node=nodeIndex.get(id);
  return hasLocation(node)?[node.location.lng,node.location.lat]:null;
}
function fallbackCoordinates(service){
  const [origin,destination]=serviceNodes(service);
  if(!hasLocation(origin)||!hasLocation(destination)) return null;
  return service.geometry?.length
    ? service.geometry.map(point=>[point.lng,point.lat])
    : [[origin.location.lng,origin.location.lat],[destination.location.lng,destination.location.lat]];
}
function serviceCoordinates(service){ return displayGeometry.get(service.id)?.coordinates||fallbackCoordinates(service); }
function displayPathKind(service){
  if(service.geometry?.length&&service.geometryConfidence==='verified_path') return 'verified';
  if(displayGeometry.get(service.id)?.source==='osrm') return 'estimated';
  return 'connector';
}
function displayPathLabel(service){
  const kind=displayPathKind(service);
  return kind==='verified'?'Verified':kind==='estimated'?'Estimated':'Approx.';
}
function serviceFeature(service){
  const coordinates=serviceCoordinates(service);
  return coordinates?{
    type:'Feature',
    properties:{id:service.id,corridorId:service.corridorId,mode:service.mode,pathKind:displayPathKind(service),routeColor:routeColor(service)},
    geometry:{type:'LineString',coordinates}
  }:null;
}
function visibleGeoJson(){
  return {type:'FeatureCollection',features:backgroundServices().map(serviceFeature).filter(Boolean)};
}
function nodeGeoJson(){
  return {
    type:'FeatureCollection',
    features:[...nodeIndex.values()].filter(hasLocation).map(node=>({
      type:'Feature',properties:{id:node.id,name:node.name},geometry:{type:'Point',coordinates:[node.location.lng,node.location.lat]}
    }))
  };
}
function emptyFeatureCollection(){ return {type:'FeatureCollection',features:[]}; }
function fitCountry(){ map?.fitBounds(TT_BOUNDS,{padding:50,duration:0}); }
function refreshMapData(){ if(map?.isStyleLoaded()) map.getSource('services')?.setData(visibleGeoJson()); }
function invalidatePlanner(){ plannerRequestId+=1; }
function ensureCurrent(requestId){ if(requestId!==plannerRequestId) throw new DOMException('Superseded','AbortError'); }
function clearJourney(){
  currentRoutePlan=null;
  if(map?.isStyleLoaded()){
    map.getSource('journey')?.setData(emptyFeatureCollection());
    map.getSource('search-points')?.setData(emptyFeatureCollection());
  }
  $('#detailPanel').hidden=true;
  $('#detailPanel').innerHTML='';
  activeServiceId=null;
}
function formatMinutes(minutes){
  const total=Math.max(1,Math.round(minutes||0));
  if(total<60) return `~${total} min`;
  const hours=Math.floor(total/60),mins=total%60;
  return `~${hours}h${mins?` ${mins}m`:''}`;
}
function accessCopy(access,nodeName,isDestination=false){
  if(!access||access.mode==='none') return null;
  const time=formatMinutes(access.minutes).replace('~','');
  if(access.mode==='walk') return {title:isDestination?'Walk to destination':`Walk to ${nodeName}`,detail:`${access.km.toFixed(1)} km · ${time}`};
  return {title:isDestination?'Local connection to destination':`Local connection to ${nodeName}`,detail:`${access.km.toFixed(1)} km · ~${time}`};
}
function compactJourneySteps(steps=[]){
  const compact=[];
  for(const step of steps){
    const previous=compact.at(-1);
    if(step.kind==='transit'&&previous?.kind==='transit'&&previous.service.id===step.service.id){
      previous.to=step.to;
      previous.minutes+=step.minutes||0;
      continue;
    }
    compact.push({...step});
  }
  return compact;
}
function rideSteps(steps=[]){ return compactJourneySteps(steps).filter(step=>step.kind==='transit'); }
function routeOptionLabel(option,index){
  const waterMode=option.modes.find(mode=>mode==='water_taxi'||mode==='ferry');
  if(index===0) return waterMode?`Best · ${modeLabel(waterMode)}`:'Best';
  if(waterMode) return modeLabel(waterMode);
  return 'Alternative';
}
function routeOptionModes(option){
  const seen=[];
  for(const mode of option.modes) if(!seen.includes(mode)) seen.push(mode);
  return seen.map(modeLabel).join(' + ');
}
function routeStatus(option){
  const rides=rideSteps(option.steps);
  return `${formatMinutes(option.estimatedMinutes)} · ${rides.length} ride${rides.length===1?'':'s'}${option.transferCount?` · ${option.transferCount} transfer${option.transferCount===1?'':'s'}`:''}`;
}

async function fetchWithTimeout(url,options={},timeoutMs=7000){
  const controller=new AbortController();
  const external=options.signal;
  const forwardAbort=()=>controller.abort();
  if(external){
    if(external.aborted) controller.abort();
    else external.addEventListener('abort',forwardAbort,{once:true});
  }
  let timedOut=false;
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
  try{ return await fetch(url,{...options,signal:controller.signal}); }
  catch(error){ if(timedOut) throw new Error('Request timed out.'); throw error; }
  finally{ clearTimeout(timer); external?.removeEventListener('abort',forwardAbort); }
}
async function getJson(url){
  const response=await fetchWithTimeout(url,{cache:'no-cache'},7000);
  if(!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

function renderList(){
  const list=$('#serviceList'),groups=corridorGroups();
  $('#serviceCount').textContent=groups.length;
  if(!groups.length){ list.innerHTML='<p class="loading">No services yet.</p>'; return; }
  list.innerHTML=groups.map(group=>{
    const service=group.representative,[origin,destination]=serviceNodes(service),arrow=corridorIsBidirectional(group)?'↔':'→';
    return `<article class="service-card ${service.id===activeServiceId?'is-active':''}" data-service-id="${escapeHtml(service.id)}" tabindex="0"><span class="route-swatch" style="--route-color:${routeColor(service)}"></span><div><h3>${escapeHtml(origin?.name||service.originNodeId)} ${arrow} ${escapeHtml(destination?.name||service.destinationNodeId)}</h3><div class="service-meta"><span>${escapeHtml(modeLabel(service.mode))}</span><span>${group.patterns.length} direction${group.patterns.length===1?'':'s'}</span></div></div></article>`;
  }).join('');
  list.querySelectorAll('.service-card').forEach(card=>{
    const open=async()=>{
      const service=services.find(item=>item.id===card.dataset.serviceId);
      if(!service) return;
      await estimateRoadGeometry(service);
      selectService(service.id,true);
    };
    card.addEventListener('click',open);
    card.addEventListener('keydown',event=>{ if(event.key==='Enter'||event.key===' '){event.preventDefault();open();} });
  });
}
function renderDetail(service){
  const panel=$('#detailPanel'),[origin,destination]=serviceNodes(service);
  const fare=Number.isFinite(service.fareTTD)?`TT$${service.fareTTD}`:'Fare unavailable';
  panel.hidden=false;
  panel.innerHTML=`<div class="journey-summary"><div class="route-title-row"><span class="route-swatch large" style="--route-color:${routeColor(service)}"></span><div><p class="eyebrow">${escapeHtml(modeLabel(service.mode))}</p><h2>${escapeHtml(origin?.name)} → ${escapeHtml(destination?.name)}</h2></div></div><p class="service-line">${fare} · ${escapeHtml(displayPathLabel(service))}</p></div>`;
}
function selectService(id,zoom=false){
  const service=services.find(item=>item.id===id);
  if(!service) return;
  currentRoutePlan=null;
  activeServiceId=id;
  renderList();
  renderDetail(service);
  refreshMapData();
  if(zoom){
    const coordinates=serviceCoordinates(service),bounds=new maplibregl.LngLatBounds();
    coordinates?.forEach(point=>bounds.extend(point));
    if(!bounds.isEmpty()) map.fitBounds(bounds,{padding:80,maxZoom:11,duration:400});
  }
}
function setupModeTabs(){
  $('#modeTabs').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
    invalidatePlanner();
    activeMode=button.dataset.mode;
    $('#modeTabs').querySelectorAll('button').forEach(item=>item.classList.toggle('is-active',item===button));
    clearJourney();
    renderList();
    refreshMapData();
    $('#plannerStatus').textContent=activeMode==='all'?'All modes':`${modeLabel(activeMode)} only`;
  }));
}
function setupTray(){
  const button=$('#trayToggle'),list=$('#serviceList');
  button.addEventListener('click',()=>{list.hidden=!list.hidden;button.setAttribute('aria-expanded',String(!list.hidden));});
}
function findNodeByInput(value){
  const target=String(value||'').trim().toLowerCase();
  return [...nodeIndex.values()].find(node=>node.name.toLowerCase()===target)||null;
}

function readGeoCache(){try{return JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY)||'{}');}catch{return{};}}
function writeGeoCache(cache){try{localStorage.setItem(GEOCODE_CACHE_KEY,JSON.stringify(cache));}catch{}}
function readRoadCache(){try{return JSON.parse(localStorage.getItem(OSRM_CACHE_KEY)||'{}');}catch{return{};}}
function writeRoadCache(cache){try{localStorage.setItem(OSRM_CACHE_KEY,JSON.stringify(cache));}catch{}}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function inTT(lng,lat){return lng>=TT_BOUNDS[0][0]&&lng<=TT_BOUNDS[1][0]&&lat>=TT_BOUNDS[0][1]&&lat<=TT_BOUNDS[1][1];}
function photonLabel(properties={}){
  const parts=[properties.name,properties.street,properties.city||properties.district||properties.county].filter(Boolean);
  return [...new Set(parts)].join(', ');
}
async function autocompletePlaces(query,signal){
  const cleaned=String(query||'').trim();
  if(cleaned.length<2) return [];
  const params=new URLSearchParams({q:cleaned,limit:'6',lang:'en',bbox:'-61.98,9.95,-60.42,11.42'});
  const response=await fetchWithTimeout(`${PHOTON_BASE}?${params}`,{signal,headers:{Accept:'application/json'}},5000);
  if(!response.ok) return [];
  const data=await response.json();
  const seen=new Set();
  return (data.features||[]).map(feature=>{
    const [lng,lat]=feature.geometry?.coordinates||[];
    return {name:photonLabel(feature.properties),lat:+lat,lng:+lng};
  }).filter(place=>{
    if(!place.name||!Number.isFinite(place.lat)||!Number.isFinite(place.lng)||!inTT(place.lng,place.lat)) return false;
    const key=`${place.name.toLowerCase()}|${place.lat.toFixed(4)}|${place.lng.toFixed(4)}`;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function chooseSuggestion(inputId,menu,place){
  const input=$(`#${inputId}`);
  input.value=place.name;
  selectedPlaces.set(inputId,{...place,inputValue:place.name});
  menu.hidden=true;
  invalidatePlanner();
}
function renderSuggestions(inputId,menuId,places){
  const menu=$(`#${menuId}`);
  if(!places.length){menu.hidden=true;menu.innerHTML='';return;}
  menu.innerHTML=places.map((place,index)=>`<button type="button" role="option" data-index="${index}"><strong>${escapeHtml(place.name.split(',')[0])}</strong><span>${escapeHtml(place.name.split(',').slice(1).join(',').trim()||'Trinidad & Tobago')}</span></button>`).join('');
  menu.hidden=false;
  menu.querySelectorAll('button').forEach(button=>button.addEventListener('mousedown',event=>{
    event.preventDefault();
    chooseSuggestion(inputId,menu,places[Number(button.dataset.index)]);
  }));
}
function setupAutocomplete(inputId,menuId){
  const input=$(`#${inputId}`),menu=$(`#${menuId}`);
  let timer,activeIndex=-1,currentPlaces=[];
  input.addEventListener('input',()=>{
    invalidatePlanner();
    selectedPlaces.delete(inputId);
    clearTimeout(timer);
    autocompleteControllers.get(inputId)?.abort();
    activeIndex=-1;
    const query=input.value.trim();
    if(query.length<2){menu.hidden=true;menu.innerHTML='';return;}
    timer=setTimeout(async()=>{
      const controller=new AbortController();
      autocompleteControllers.set(inputId,controller);
      try{
        const places=await autocompletePlaces(query,controller.signal);
        if(input.value.trim()!==query) return;
        currentPlaces=places;
        renderSuggestions(inputId,menuId,places);
      }catch(error){
        if(error.name!=='AbortError'){menu.hidden=true;menu.innerHTML='';}
      }
    },350);
  });
  input.addEventListener('keydown',event=>{
    const buttons=[...menu.querySelectorAll('button')];
    if(event.key==='Escape'){menu.hidden=true;activeIndex=-1;return;}
    if((event.key==='ArrowDown'||event.key==='ArrowUp')&&buttons.length){
      event.preventDefault();
      activeIndex=event.key==='ArrowDown'?Math.min(activeIndex+1,buttons.length-1):Math.max(activeIndex-1,0);
      buttons.forEach((button,index)=>button.classList.toggle('is-keyboard-active',index===activeIndex));
      buttons[activeIndex]?.scrollIntoView({block:'nearest'});
      return;
    }
    if(event.key==='Enter'){
      if(!menu.hidden&&activeIndex>=0&&currentPlaces[activeIndex]){
        event.preventDefault();
        chooseSuggestion(inputId,menu,currentPlaces[activeIndex]);
        return;
      }
      event.preventDefault();
      $('#planButton').click();
    }
  });
  input.addEventListener('blur',()=>setTimeout(()=>{menu.hidden=true;activeIndex=-1;},120));
}
async function geocodePlace(query){
  const cleaned=String(query||'').trim();
  if(!cleaned) throw new Error('Enter a start and destination.');
  const key=cleaned.toLowerCase(),cache=readGeoCache();
  if(cache[key]) return cache[key];
  const wait=Math.max(0,1100-(Date.now()-lastGeocodeAt));
  if(wait) await sleep(wait);
  const params=new URLSearchParams({q:cleaned,format:'jsonv2',limit:'1',countrycodes:'tt',bounded:'1',viewbox:'-61.98,11.42,-60.42,9.95'});
  lastGeocodeAt=Date.now();
  const response=await fetchWithTimeout(`${GEOCODER_BASE}?${params}`,{headers:{Accept:'application/json'}},7000);
  if(!response.ok) throw new Error('Place search failed.');
  const rows=await response.json();
  if(!rows.length) throw new Error(`Could not find “${cleaned}”.`);
  const place={name:rows[0].display_name,lat:+rows[0].lat,lng:+rows[0].lon};
  cache[key]=place;
  writeGeoCache(cache);
  return place;
}
async function resolvePlace(inputId){
  const input=$(`#${inputId}`),known=findNodeByInput(input.value);
  if(known) return {name:known.name,...known.location};
  const selected=selectedPlaces.get(inputId);
  if(selected&&selected.inputValue===input.value) return selected;
  return geocodePlace(input.value);
}

async function estimateRoadGeometry(service){
  if(!ROAD_MODES.has(service.mode)||service.geometry?.length) return;
  const [origin,destination]=serviceNodes(service);
  if(!hasLocation(origin)||!hasLocation(destination)) return;
  const cache=readRoadCache();
  const key=`${service.id}:${origin.location.lng},${origin.location.lat}:${destination.location.lng},${destination.location.lat}`;
  if(cache[key]?.coordinates?.length){displayGeometry.set(service.id,{...cache[key],source:'osrm'});return;}
  const wait=Math.max(0,350-(Date.now()-lastOsrmAt));
  if(wait) await sleep(wait);
  lastOsrmAt=Date.now();
  const url=`${OSRM_BASE}/${origin.location.lng},${origin.location.lat};${destination.location.lng},${destination.location.lat}?overview=full&geometries=geojson&steps=false&alternatives=false`;
  try{
    const response=await fetchWithTimeout(url,{},6000);
    if(!response.ok) return;
    const data=await response.json(),route=data?.routes?.[0];
    if(!route?.geometry?.coordinates?.length) return;
    const value={coordinates:route.geometry.coordinates,durationSeconds:route.duration,distanceMeters:route.distance};
    displayGeometry.set(service.id,{...value,source:'osrm'});
    cache[key]=value;
    writeRoadCache(cache);
  }catch(error){console.warn('Road geometry unavailable for',service.id,error);}
}
async function hydrateDisplayGeometry(list){
  for(const service of [...new Map(list.map(item=>[item.id,item])).values()]) await estimateRoadGeometry(service);
  refreshMapData();
  renderList();
}

function transitStepCoordinates(step){
  const service=step.service;
  if(step.from===service.originNodeId&&step.to===service.destinationNodeId) return serviceCoordinates(service);
  const from=nodeCoordinates(step.from),to=nodeCoordinates(step.to);
  return from&&to?[from,to]:serviceCoordinates(service);
}
function journeyGeoJson(from,to,connected){
  const {fromNear,toNear,fromAccess,toAccess}=connected;
  const steps=compactJourneySteps(connected.steps);
  const features=[];
  if(fromAccess.mode!=='none'){
    features.push({type:'Feature',properties:{kind:'access',accessMode:fromAccess.mode},geometry:{type:'LineString',coordinates:[[from.lng,from.lat],[fromNear.node.location.lng,fromNear.node.location.lat]]}});
  }
  for(const step of steps){
    if(step.kind==='transfer'){
      const a=nodeCoordinates(step.from),b=nodeCoordinates(step.to);
      if(a&&b) features.push({type:'Feature',properties:{kind:'transfer'},geometry:{type:'LineString',coordinates:[a,b]}});
      continue;
    }
    const coordinates=transitStepCoordinates(step);
    if(coordinates) features.push({type:'Feature',properties:{kind:'transit',routeColor:routeColor(step.service),pathKind:displayPathKind(step.service)},geometry:{type:'LineString',coordinates}});
  }
  if(toAccess.mode!=='none'){
    features.push({type:'Feature',properties:{kind:'access',accessMode:toAccess.mode},geometry:{type:'LineString',coordinates:[[toNear.node.location.lng,toNear.node.location.lat],[to.lng,to.lat]]}});
  }
  return {type:'FeatureCollection',features};
}
function showJourneyMap(from,to,connected){
  map.getSource('search-points')?.setData({type:'FeatureCollection',features:[
    {type:'Feature',properties:{kind:'from'},geometry:{type:'Point',coordinates:[from.lng,from.lat]}},
    {type:'Feature',properties:{kind:'to'},geometry:{type:'Point',coordinates:[to.lng,to.lat]}}
  ]});
  map.getSource('journey')?.setData(journeyGeoJson(from,to,connected));
  const bounds=new maplibregl.LngLatBounds();
  bounds.extend([from.lng,from.lat]);
  bounds.extend([to.lng,to.lat]);
  for(const step of compactJourneySteps(connected.steps)){
    const fromPoint=nodeCoordinates(step.from),toPoint=nodeCoordinates(step.to);
    if(fromPoint) bounds.extend(fromPoint);
    if(toPoint) bounds.extend(toPoint);
    if(step.kind==='transit') for(const point of transitStepCoordinates(step)||[]) bounds.extend(point);
  }
  map.fitBounds(bounds,{padding:{top:70,bottom:70,left:70,right:70},maxZoom:11,duration:450});
}
function showNoRouteMap(from,to){
  map.getSource('journey')?.setData(emptyFeatureCollection());
  map.getSource('search-points')?.setData({type:'FeatureCollection',features:[
    {type:'Feature',properties:{kind:'from'},geometry:{type:'Point',coordinates:[from.lng,from.lat]}},
    {type:'Feature',properties:{kind:'to'},geometry:{type:'Point',coordinates:[to.lng,to.lat]}}
  ]});
  const bounds=new maplibregl.LngLatBounds([from.lng,from.lat],[to.lng,to.lat]);
  map.fitBounds(bounds,{padding:90,maxZoom:12,duration:350});
}
function renderJourney(connected,options=[],selectedIndex=0){
  const {fromNear,toNear,fromAccess,toAccess,estimatedMinutes,transferCount}=connected;
  const steps=compactJourneySteps(connected.steps);
  const rides=steps.filter(step=>step.kind==='transit');
  const panel=$('#detailPanel');
  panel.hidden=false;
  const knownFare=rides.reduce((sum,step)=>sum+(Number.isFinite(step.service.fareTTD)?step.service.fareTTD:0),0);
  const allFaresKnown=rides.length>0&&rides.every(step=>Number.isFinite(step.service.fareTTD));
  let html=`<div class="journey-summary"><p class="eyebrow">Route</p><h2>${escapeHtml($('#fromInput').value)} → ${escapeHtml($('#toInput').value)}</h2><div class="journey-kpis"><div><strong>${formatMinutes(estimatedMinutes)}</strong><span>est. trip</span></div><div><strong>${transferCount}</strong><span>transfer${transferCount===1?'':'s'}</span></div><div><strong>${allFaresKnown?`TT$${knownFare}`:'—'}</strong><span>transit fare</span></div></div></div>`;

  if(options.length>1){
    html+=`<div class="route-options" aria-label="Route alternatives">${options.map((option,index)=>`<button type="button" class="route-option ${index===selectedIndex?'is-active':''}" data-route-option="${index}"><strong>${escapeHtml(routeOptionLabel(option,index))}</strong><span>${escapeHtml(formatMinutes(option.estimatedMinutes))}</span><small>${escapeHtml(routeOptionModes(option)||'Transit')}</small></button>`).join('')}</div>`;
  }

  const first=accessCopy(fromAccess,fromNear.node.name,false);
  if(first) html+=`<div class="journey-leg access-leg"><span class="leg-icon">${fromAccess.mode==='walk'?'↟':'●'}</span><div><h3>${escapeHtml(first.title)}</h3><p>${escapeHtml(first.detail)}</p></div></div>`;

  for(const step of steps){
    const origin=nodeIndex.get(step.from),destination=nodeIndex.get(step.to);
    if(step.kind==='transfer'){
      html+=`<div class="journey-leg access-leg"><span class="leg-icon">↟</span><div><h3>Walk to ${escapeHtml(destination?.name||step.to)}</h3><p>${step.transfer.distanceKm.toFixed(1)} km · ~${Math.round(step.minutes)} min transfer</p></div></div>`;
      continue;
    }
    const fare=Number.isFinite(step.service.fareTTD)?` · TT$${step.service.fareTTD}`:'';
    html+=`<div class="journey-leg"><span class="leg-route" style="--route-color:${routeColor(step.service)}"></span><div><h3>${escapeHtml(origin?.name||step.from)} → ${escapeHtml(destination?.name||step.to)}</h3><p>${escapeHtml(modeLabel(step.service.mode))}${fare}</p></div></div>`;
  }

  const last=accessCopy(toAccess,toNear.node.name,true);
  if(last) html+=`<div class="journey-leg access-leg"><span class="leg-icon">${toAccess.mode==='walk'?'↟':'◆'}</span><div><h3>${escapeHtml(last.title)}</h3><p>${escapeHtml(last.detail)}</p></div></div>`;
  if(rides.some(step=>displayPathKind(step.service)!=='verified')) html+='<p class="route-note">Route geometry is estimated.</p>';
  if(connected.modes.some(mode=>mode==='water_taxi'||mode==='ferry')) html+='<p class="route-note">Sailing times are not yet included in this estimate.</p>';
  panel.innerHTML=html;
  panel.querySelectorAll('[data-route-option]').forEach(button=>button.addEventListener('click',()=>selectRouteOption(Number(button.dataset.routeOption))));
}
async function selectRouteOption(index){
  if(!currentRoutePlan||!currentRoutePlan.options[index]) return;
  const requestId=++plannerRequestId;
  const option=currentRoutePlan.options[index];
  currentRoutePlan.selectedIndex=index;
  $('#plannerStatus').textContent='Loading route…';
  try{
    await hydrateDisplayGeometry(rideSteps(option.steps).map(step=>step.service));
    ensureCurrent(requestId);
    showJourneyMap(currentRoutePlan.from,currentRoutePlan.to,option);
    renderJourney(option,currentRoutePlan.options,index);
    $('#plannerStatus').textContent=routeStatus(option);
  }catch(error){
    if(error.name!=='AbortError') $('#plannerStatus').textContent=error.message;
  }
}

function setupPlanner(){
  setupAutocomplete('fromInput','fromSuggestions');
  setupAutocomplete('toInput','toSuggestions');
  $('#swapButton').addEventListener('click',()=>{
    invalidatePlanner();
    const fromInput=$('#fromInput'),toInput=$('#toInput');
    const fromValue=fromInput.value,fromSelected=selectedPlaces.get('fromInput'),toSelected=selectedPlaces.get('toInput');
    fromInput.value=toInput.value;
    toInput.value=fromValue;
    selectedPlaces.delete('fromInput');
    selectedPlaces.delete('toInput');
    if(toSelected) selectedPlaces.set('fromInput',{...toSelected,inputValue:fromInput.value});
    if(fromSelected) selectedPlaces.set('toInput',{...fromSelected,inputValue:toInput.value});
  });
  $('#planButton').addEventListener('click',async()=>{
    const status=$('#plannerStatus'),button=$('#planButton'),requestId=++plannerRequestId;
    button.disabled=true;
    status.textContent='Finding routes…';
    try{
      const knownFrom=findNodeByInput($('#fromInput').value),knownTo=findNodeByInput($('#toInput').value);
      const from=await resolvePlace('fromInput');
      ensureCurrent(requestId);
      const to=await resolvePlace('toInput');
      ensureCurrent(requestId);
      if(kmBetween(from,to)<0.03){clearJourney();status.textContent='Start and destination are the same place.';return;}
      const options=chooseJourneyOptions({
        fromPlace:from,
        toPlace:to,
        nodes:nodeIndex,
        services:routingServices(),
        transfers,
        knownFrom,
        knownTo,
        candidateLimit:10,
        maxAccessKm:20,
        transferPenaltyMinutes:10,
        maxOptions:3
      });
      ensureCurrent(requestId);
      if(!options.length){currentRoutePlan=null;showNoRouteMap(from,to);status.textContent='No route in the current network.';return;}
      const connected=options[0];
      currentRoutePlan={from,to,options,selectedIndex:0};
      await hydrateDisplayGeometry(rideSteps(connected.steps).map(step=>step.service));
      ensureCurrent(requestId);
      showJourneyMap(from,to,connected);
      renderJourney(connected,options,0);
      status.textContent=routeStatus(connected);
    }catch(error){
      if(error.name!=='AbortError'){console.error(error);status.textContent=error.message;}
    }finally{button.disabled=false;}
  });
}

function addMapLayers(){
  map.addSource('services',{type:'geojson',data:visibleGeoJson()});
  map.addLayer({id:'service-lines',type:'line',source:'services',layout:{'line-join':'round','line-cap':'round'},paint:{
    'line-color':['get','routeColor'],
    'line-width':['case',['==',['get','pathKind'],'verified'],3,2.5],
    'line-opacity':['case',['==',['get','pathKind'],'connector'],.18,.42],
    'line-dasharray':['case',['==',['get','pathKind'],'connector'],['literal',[2,2]],['literal',[1,0]]]
  }});
  map.addSource('journey',{type:'geojson',data:emptyFeatureCollection()});
  map.addLayer({id:'journey-access',type:'line',source:'journey',filter:['==',['get','kind'],'access'],layout:{'line-join':'round','line-cap':'round'},paint:{
    'line-color':['case',['==',['get','accessMode'],'walk'],'#636366','#8E8E93'],
    'line-width':3,
    'line-dasharray':['case',['==',['get','accessMode'],'walk'],['literal',[1,1]],['literal',[2,1]]]
  }});
  map.addLayer({id:'journey-transfer',type:'line',source:'journey',filter:['==',['get','kind'],'transfer'],layout:{'line-join':'round','line-cap':'round'},paint:{
    'line-color':'#636366','line-width':4,'line-dasharray':[1,1]
  }});
  map.addLayer({id:'journey-transit-casing',type:'line',source:'journey',filter:['==',['get','kind'],'transit'],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#fff','line-width':10,'line-opacity':.9}});
  map.addLayer({id:'journey-transit',type:'line',source:'journey',filter:['==',['get','kind'],'transit'],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':['get','routeColor'],'line-width':6.5,'line-opacity':1}});
  map.addSource('nodes',{type:'geojson',data:nodeGeoJson()});
  map.addLayer({id:'nodes',type:'circle',source:'nodes',paint:{'circle-radius':4,'circle-color':'#fff','circle-stroke-color':'#636366','circle-stroke-width':1.5}});
  map.addSource('search-points',{type:'geojson',data:emptyFeatureCollection()});
  map.addLayer({id:'search-points',type:'circle',source:'search-points',paint:{'circle-radius':8,'circle-color':['match',['get','kind'],'from','#0A84FF','to','#FF3B30','#111'],'circle-stroke-color':'#fff','circle-stroke-width':3}});
  map.on('click','service-lines',async event=>{
    const id=event.features?.[0]?.properties?.id,service=services.find(item=>item.id===id);
    if(service){await estimateRoadGeometry(service);selectService(id,false);}
  });
  map.on('mouseenter','service-lines',()=>{map.getCanvas().style.cursor='pointer';});
  map.on('mouseleave','service-lines',()=>{map.getCanvas().style.cursor='';});
}

async function start(){
  try{
    const [nodesData,servicesData,transfersData]=await Promise.all([
      getJson('./data/nodes.json'),
      getJson('./data/services.json'),
      getJson('./data/transfers.json')
    ]);
    nodesData.forEach(node=>nodeIndex.set(node.id,node));
    services=servicesData;
    transfers=transfersData;
    renderList();
    setupModeTabs();
    setupTray();
    setupPlanner();
    map=new maplibregl.Map({
      container:'map',
      style:{version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]},
      bounds:TT_BOUNDS,
      fitBoundsOptions:{padding:50},
      maxBounds:TT_MAX_BOUNDS,
      minZoom:7,
      maxZoom:17,
      attributionControl:true
    });
    map.addControl(new maplibregl.NavigationControl({showCompass:false}),'bottom-right');
    map.on('load',()=>{addMapLayers();fitCountry();});
  }catch(error){
    console.error(error);
    $('#plannerStatus').textContent='Transport data failed to load.';
  }
}

start();