import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.8.0/dist/maplibre-gl.mjs';
import { chooseConnectedJourney, kmBetween } from '../src/routing-core.mjs';

const nodeIndex = new Map();
let services = [];
let activeMode = 'all';
let activeServiceId = null;
let map;
const displayGeometry = new Map();

const $ = selector => document.querySelector(selector);
const MODE_LABELS = {ptsc:'PTSC',bus:'PTSC',maxi:'Maxi',route_taxi:'Route taxi',water_taxi:'Water Taxi',ferry:'Ferry'};
const MODE_COLORS = {ptsc:'#173f5f',bus:'#173f5f',maxi:'#a52a2a',route_taxi:'#6b4d2e',water_taxi:'#146b8c',ferry:'#5c4b8a'};
const ROAD_MODES = new Set(['ptsc','bus','maxi','route_taxi']);
const TT_BOUNDS = [[-61.98,9.95],[-60.42,11.42]];
const TT_MAX_BOUNDS = [[-62.25,9.70],[-60.15,11.68]];
const GEOCODER_BASE = 'https://nominatim.openstreetmap.org/search';
const GEOCODE_CACHE_KEY = 'transittrinidad-geocode-v1';
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';
const OSRM_CACHE_KEY = 'transittrinidad-road-geometry-v1';
let lastGeocodeAt = 0;
let lastOsrmAt = 0;

function modeLabel(mode){ return MODE_LABELS[mode] || mode; }
function escapeHtml(value=''){
  return String(value).replace(/[&<>'\"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[char]));
}
async function getJson(url){
  const response = await fetch(url,{cache:'no-cache'});
  if(!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}
function hasLocation(node){
  return node?.location && Number.isFinite(node.location.lat) && Number.isFinite(node.location.lng);
}
function serviceNodes(service){
  return [nodeIndex.get(service.originNodeId),nodeIndex.get(service.destinationNodeId)];
}
function filteredServices(){
  return services.filter(service => activeMode==='all' || service.mode===activeMode || (activeMode==='ptsc' && service.mode==='bus'));
}
function fallbackCoordinates(service){
  const [origin,destination] = serviceNodes(service);
  if(!hasLocation(origin) || !hasLocation(destination)) return null;
  return service.geometry?.length
    ? service.geometry.map(point=>[point.lng,point.lat])
    : [[origin.location.lng,origin.location.lat],[destination.location.lng,destination.location.lat]];
}
function serviceCoordinates(service){
  return displayGeometry.get(service.id)?.coordinates || fallbackCoordinates(service);
}
function displayPathKind(service){
  if(service.geometry?.length && service.geometryConfidence==='verified_path') return 'verified';
  if(displayGeometry.get(service.id)?.source==='osrm') return 'estimated';
  return 'connector';
}
function displayPathLabel(service){
  const kind = displayPathKind(service);
  return kind==='verified' ? 'Verified path' : kind==='estimated' ? 'Estimated road path' : 'Endpoint connector';
}
function serviceFeature(service){
  const coordinates = serviceCoordinates(service);
  return coordinates ? {
    type:'Feature',
    properties:{id:service.id,mode:service.mode,pathKind:displayPathKind(service)},
    geometry:{type:'LineString',coordinates}
  } : null;
}
function visibleGeoJson(){
  return {type:'FeatureCollection',features:filteredServices().map(serviceFeature).filter(Boolean)};
}
function nodeGeoJson(){
  return {
    type:'FeatureCollection',
    features:[...nodeIndex.values()].filter(hasLocation).map(node=>({
      type:'Feature',
      properties:{id:node.id,name:node.name},
      geometry:{type:'Point',coordinates:[node.location.lng,node.location.lat]}
    }))
  };
}
function fitCountry(){
  map?.fitBounds(TT_BOUNDS,{padding:{top:50,bottom:50,left:50,right:50},duration:0});
}
function fitNetwork(){ fitCountry(); }
function refreshMapData(){
  if(map?.isStyleLoaded()) map.getSource('services')?.setData(visibleGeoJson());
}

function renderList(){
  const list = $('#serviceList');
  const visible = filteredServices();
  $('#serviceCount').textContent = visible.length;
  if(!visible.length){
    list.innerHTML = '<p class="loading">No verified services in this mode yet.</p>';
    return;
  }
  list.innerHTML = visible.map(service=>{
    const [origin,destination] = serviceNodes(service);
    return `<article class="service-card ${service.id===activeServiceId?'is-active':''}" data-service-id="${escapeHtml(service.id)}" tabindex="0"><h3>${escapeHtml(origin?.name||service.originNodeId)} → ${escapeHtml(destination?.name||service.destinationNodeId)}</h3><div class="service-meta"><span>${escapeHtml(modeLabel(service.mode))}</span><span>${escapeHtml(displayPathLabel(service))}</span></div></article>`;
  }).join('');
  list.querySelectorAll('.service-card').forEach(card=>card.addEventListener('click',()=>selectService(card.dataset.serviceId,true)));
}
function renderDetail(service){
  const panel = $('#detailPanel');
  const [origin,destination] = serviceNodes(service);
  const fare = Number.isFinite(service.fareTTD) ? `TT$${service.fareTTD}` : 'Fare not confirmed';
  const kind = displayPathKind(service);
  panel.hidden = false;
  panel.innerHTML = `<div class="journey-summary"><p class="eyebrow">SERVICE</p><h2>${escapeHtml(origin?.name)} → ${escapeHtml(destination?.name)}</h2><p>${escapeHtml(modeLabel(service.mode))} · ${fare}</p></div><div class="journey-warning">${kind==='verified'?'Displayed path is verified.':kind==='estimated'?'Displayed line follows a plausible road route between verified endpoints. It is an estimate, not a claim that the operator uses every street shown.':'Only the service endpoints are mapped right now, so this is shown as a connector.'}</div>`;
}
function selectService(id,zoom=false){
  const service = services.find(item=>item.id===id);
  if(!service) return;
  activeServiceId = id;
  renderList();
  renderDetail(service);
  if(zoom){
    const coordinates = serviceCoordinates(service);
    const bounds = new maplibregl.LngLatBounds();
    coordinates?.forEach(point=>bounds.extend(point));
    if(!bounds.isEmpty()) map.fitBounds(bounds,{padding:80,maxZoom:11,duration:400});
  }
}
function setupModeTabs(){
  $('#modeTabs').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
    activeMode = button.dataset.mode;
    $('#modeTabs').querySelectorAll('button').forEach(item=>item.classList.toggle('is-active',item===button));
    renderList();
    refreshMapData();
  }));
}
function setupTray(){
  const button = $('#trayToggle');
  const list = $('#serviceList');
  button.addEventListener('click',()=>{
    list.hidden = !list.hidden;
    button.setAttribute('aria-expanded',String(!list.hidden));
  });
}
function findNodeByInput(value){
  const target = String(value||'').trim().toLowerCase();
  return [...nodeIndex.values()].find(node=>node.name.toLowerCase()===target) || null;
}
function findDirectService(a,b){
  return services.find(service =>
    (service.originNodeId===a.id && service.destinationNodeId===b.id) ||
    (service.originNodeId===b.id && service.destinationNodeId===a.id)
  ) || null;
}

function readGeoCache(){ try{return JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY)||'{}');}catch{return{};} }
function writeGeoCache(cache){ try{localStorage.setItem(GEOCODE_CACHE_KEY,JSON.stringify(cache));}catch{} }
function readRoadCache(){ try{return JSON.parse(localStorage.getItem(OSRM_CACHE_KEY)||'{}');}catch{return{};} }
function writeRoadCache(cache){ try{localStorage.setItem(OSRM_CACHE_KEY,JSON.stringify(cache));}catch{} }
function sleep(ms){ return new Promise(resolve=>setTimeout(resolve,ms)); }

async function geocodePlace(query){
  const cleaned = String(query||'').trim();
  if(!cleaned) throw new Error('Enter both a starting point and destination.');
  const key = cleaned.toLowerCase();
  const cache = readGeoCache();
  if(cache[key]) return cache[key];
  const wait = Math.max(0,1100-(Date.now()-lastGeocodeAt));
  if(wait) await sleep(wait);
  const params = new URLSearchParams({q:cleaned,format:'jsonv2',limit:'1',countrycodes:'tt',bounded:'1',viewbox:'-61.98,11.42,-60.42,9.95'});
  lastGeocodeAt = Date.now();
  const response = await fetch(`${GEOCODER_BASE}?${params}`,{headers:{Accept:'application/json'}});
  if(!response.ok) throw new Error(`Place search failed (${response.status}).`);
  const rows = await response.json();
  if(!rows.length) throw new Error(`Could not find “${cleaned}” in Trinidad & Tobago.`);
  const place = {name:rows[0].display_name,lat:+rows[0].lat,lng:+rows[0].lon};
  cache[key] = place;
  writeGeoCache(cache);
  return place;
}

async function estimateRoadGeometry(service){
  if(!ROAD_MODES.has(service.mode) || service.geometry?.length) return;
  const [origin,destination] = serviceNodes(service);
  if(!hasLocation(origin) || !hasLocation(destination)) return;
  const cache = readRoadCache();
  const key = `${service.id}:${origin.location.lng},${origin.location.lat}:${destination.location.lng},${destination.location.lat}`;
  if(cache[key]?.coordinates?.length){
    displayGeometry.set(service.id,{...cache[key],source:'osrm'});
    return;
  }
  const wait = Math.max(0,300-(Date.now()-lastOsrmAt));
  if(wait) await sleep(wait);
  lastOsrmAt = Date.now();
  const url = `${OSRM_BASE}/${origin.location.lng},${origin.location.lat};${destination.location.lng},${destination.location.lat}?overview=full&geometries=geojson&steps=false&alternatives=false`;
  try{
    const response = await fetch(url);
    if(!response.ok) return;
    const data = await response.json();
    const route = data?.routes?.[0];
    if(!route?.geometry?.coordinates?.length) return;
    const value = {coordinates:route.geometry.coordinates,durationSeconds:route.duration,distanceMeters:route.distance};
    displayGeometry.set(service.id,{...value,source:'osrm'});
    cache[key] = value;
    writeRoadCache(cache);
  }catch(error){
    console.warn('Estimated route geometry unavailable for',service.id,error);
  }
}
async function hydrateDisplayGeometry(list=services){
  for(const service of list) await estimateRoadGeometry(service);
  refreshMapData();
  renderList();
  if(activeServiceId){
    const selected = services.find(service=>service.id===activeServiceId);
    if(selected) renderDetail(selected);
  }
}

function nearestNode(place){
  let best = null;
  for(const node of nodeIndex.values()){
    if(!hasLocation(node)) continue;
    const km = kmBetween(place,node.location);
    if(!best || km<best.km) best = {node,km};
  }
  return best;
}

function journeyGeoJson(from,to,fromNear,toNear,legs){
  const features = [];
  features.push({type:'Feature',properties:{kind:'access'},geometry:{type:'LineString',coordinates:[[from.lng,from.lat],[fromNear.node.location.lng,fromNear.node.location.lat]]}});
  for(const leg of legs){
    const service = leg.service;
    const coordinates = serviceCoordinates(service);
    if(coordinates){
      features.push({
        type:'Feature',
        properties:{kind:'transit',mode:service.mode,pathKind:displayPathKind(service)},
        geometry:{type:'LineString',coordinates:service.originNodeId===leg.from?coordinates:[...coordinates].reverse()}
      });
    }
  }
  features.push({type:'Feature',properties:{kind:'access'},geometry:{type:'LineString',coordinates:[[toNear.node.location.lng,toNear.node.location.lat],[to.lng,to.lat]]}});
  return {type:'FeatureCollection',features};
}
function showJourneyMap(from,to,fromNear,toNear,legs){
  const points = {type:'FeatureCollection',features:[
    {type:'Feature',properties:{kind:'from'},geometry:{type:'Point',coordinates:[from.lng,from.lat]}},
    {type:'Feature',properties:{kind:'to'},geometry:{type:'Point',coordinates:[to.lng,to.lat]}}
  ]};
  map.getSource('search-points')?.setData(points);
  map.getSource('journey')?.setData(journeyGeoJson(from,to,fromNear,toNear,legs));
  const bounds = new maplibregl.LngLatBounds();
  bounds.extend([from.lng,from.lat]);
  bounds.extend([to.lng,to.lat]);
  for(const leg of legs){
    for(const point of serviceCoordinates(leg.service)||[]) bounds.extend(point);
  }
  map.fitBounds(bounds,{padding:{top:70,bottom:70,left:70,right:70},maxZoom:11,duration:450});
}
function renderJourney(from,to,fromNear,toNear,legs){
  const panel = $('#detailPanel');
  panel.hidden = false;
  const knownFare = legs.reduce((sum,leg)=>sum+(Number.isFinite(leg.service.fareTTD)?leg.service.fareTTD:0),0);
  const allFaresKnown = legs.every(leg=>Number.isFinite(leg.service.fareTTD));
  let html = `<div class="journey-summary"><p class="eyebrow">ROUTE</p><h2>${escapeHtml($('#fromInput').value)} → ${escapeHtml($('#toInput').value)}</h2><div class="journey-kpis"><div><strong>${legs.length}</strong><span>transit leg${legs.length===1?'':'s'}</span></div><div><strong>${allFaresKnown?`TT$${knownFare}`:'—'}</strong><span>${allFaresKnown?'known fare':'fare incomplete'}</span></div></div></div>`;
  if(fromNear.km>.05) html += `<div class="journey-leg"><div class="leg-icon">1</div><div><h3>Get to ${escapeHtml(fromNear.node.name)}</h3><p>${fromNear.km.toFixed(1)} km from your starting point.</p></div></div>`;
  legs.forEach((leg,index)=>{
    const origin = nodeIndex.get(leg.from);
    const destination = nodeIndex.get(leg.to);
    const fare = Number.isFinite(leg.service.fareTTD) ? ` · TT$${leg.service.fareTTD}` : '';
    html += `<div class="journey-leg"><div class="leg-icon">${index+1}</div><div><h3>${escapeHtml(modeLabel(leg.service.mode))}: ${escapeHtml(origin.name)} → ${escapeHtml(destination.name)}</h3><p>${escapeHtml(leg.service.operator)}${fare} · ${escapeHtml(displayPathLabel(leg.service))}</p></div></div>`;
  });
  if(toNear.km>.05) html += `<div class="journey-leg"><div class="leg-icon">✓</div><div><h3>Continue to destination</h3><p>${toNear.km.toFixed(1)} km from ${escapeHtml(toNear.node.name)}.</p></div></div>`;
  html += `<div class="journey-warning">Blue line shows the best map path currently available. Road-based services use estimated road geometry when exact operator geometry is not yet verified; marine connectors and any unresolved paths remain approximate.</div>`;
  panel.innerHTML = html;
}

function setupPlanner(){
  $('#swapButton').addEventListener('click',()=>{
    const from = $('#fromInput').value;
    $('#fromInput').value = $('#toInput').value;
    $('#toInput').value = from;
  });
  $('#planButton').addEventListener('click',async()=>{
    const status = $('#plannerStatus');
    const button = $('#planButton');
    button.disabled = true;
    status.textContent = 'Finding route…';
    try{
      const rawFrom = $('#fromInput').value;
      const rawTo = $('#toInput').value;
      const knownFrom = findNodeByInput(rawFrom);
      const knownTo = findNodeByInput(rawTo);
      const from = knownFrom ? {name:knownFrom.name,...knownFrom.location} : await geocodePlace(rawFrom);
      const to = knownTo ? {name:knownTo.name,...knownTo.location} : await geocodePlace(rawTo);

      const connected = chooseConnectedJourney({
        fromPlace:from,
        toPlace:to,
        nodes:nodeIndex,
        services,
        knownFrom,
        knownTo,
        candidateLimit:6
      });

      if(!connected){
        const fromNear = knownFrom ? {node:knownFrom,km:0} : nearestNode(from);
        const toNear = knownTo ? {node:knownTo,km:0} : nearestNode(to);
        if(!fromNear || !toNear) throw new Error('Transport coverage is not loaded near one of these places yet.');
        showJourneyMap(from,to,fromNear,toNear,[]);
        status.textContent = 'Places found, but the current network does not connect nearby transport nodes yet.';
        return;
      }

      const {fromNear,toNear,legs} = connected;
      await hydrateDisplayGeometry(legs.map(leg=>leg.service));
      showJourneyMap(from,to,fromNear,toNear,legs);
      renderJourney(from,to,fromNear,toNear,legs);
      status.textContent = `Route found: ${fromNear.node.name} → ${toNear.node.name}${legs.length?` · ${legs.length} transit leg${legs.length===1?'':'s'}`:''}.`;
    }catch(error){
      console.error(error);
      status.textContent = error.message;
    }finally{
      button.disabled = false;
    }
  });
}

function addMapLayers(){
  map.addSource('services',{type:'geojson',data:visibleGeoJson()});
  map.addLayer({id:'service-lines',type:'line',source:'services',layout:{'line-join':'round','line-cap':'round'},paint:{
    'line-color':['match',['get','mode'],'water_taxi',MODE_COLORS.water_taxi,'ferry',MODE_COLORS.ferry,'ptsc',MODE_COLORS.ptsc,'maxi',MODE_COLORS.maxi,'route_taxi',MODE_COLORS.route_taxi,'#555'],
    'line-width':['case',['==',['get','pathKind'],'verified'],3,['==',['get','pathKind'],'estimated'],2.5,2],
    'line-opacity':['case',['==',['get','pathKind'],'connector'],.22,.38],
    'line-dasharray':['case',['==',['get','pathKind'],'connector'],['literal',[2,2]],['literal',[1,0]]]
  }});
  map.addSource('journey',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
  map.addLayer({id:'journey-access',type:'line',source:'journey',filter:['==',['get','kind'],'access'],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#5f6368','line-width':3,'line-dasharray':[1.5,1.5]}});
  map.addLayer({id:'journey-transit-casing',type:'line',source:'journey',filter:['==',['get','kind'],'transit'],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#fff','line-width':10,'line-opacity':.92}});
  map.addLayer({id:'journey-transit',type:'line',source:'journey',filter:['==',['get','kind'],'transit'],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#174ea6','line-width':6.5,'line-opacity':['case',['==',['get','pathKind'],'connector'],.72,1]}});
  map.addSource('nodes',{type:'geojson',data:nodeGeoJson()});
  map.addLayer({id:'nodes',type:'circle',source:'nodes',paint:{'circle-radius':4,'circle-color':'#fff','circle-stroke-color':'#333','circle-stroke-width':1.5}});
  map.addSource('search-points',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
  map.addLayer({id:'search-points',type:'circle',source:'search-points',paint:{'circle-radius':8,'circle-color':['match',['get','kind'],'from','#174ea6','to','#d93025','#111'],'circle-stroke-color':'#fff','circle-stroke-width':3}});
  map.on('click','service-lines',event=>{
    const id = event.features?.[0]?.properties?.id;
    if(id) selectService(id,false);
  });
}

async function start(){
  try{
    const [nodesData,servicesData] = await Promise.all([getJson('./data/nodes.json'),getJson('./data/services.json')]);
    nodesData.forEach(node=>nodeIndex.set(node.id,node));
    services = servicesData;
    renderList();
    setupModeTabs();
    setupTray();
    setupPlanner();
    map = new maplibregl.Map({
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
    map.on('load',()=>{
      addMapLayers();
      fitCountry();
      hydrateDisplayGeometry().catch(error=>console.warn('Background route estimation failed',error));
    });
  }catch(error){
    console.error(error);
    $('#plannerStatus').textContent = `Transport data failed to load: ${error.message}`;
  }
}

start();
