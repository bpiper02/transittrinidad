import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.8.0/dist/maplibre-gl.mjs';
import { chooseConnectedJourney, kmBetween } from './src/routing-core.mjs';

const nodeIndex=new Map();
let services=[];
let activeMode='all';
let activeServiceId=null;
let map;
const displayGeometry=new Map();
const selectedPlaces=new Map();
const autocompleteControllers=new Map();

const $=selector=>document.querySelector(selector);
const MODE_LABELS={ptsc:'PTSC',bus:'PTSC',maxi:'Maxi',route_taxi:'Route taxi',water_taxi:'Water Taxi',ferry:'Ferry'};
const MAXI_BAND_COLORS={1:'#F2C94C',2:'#D92D2D',3:'#2E9B4B',4:'#1C1C1E',5:'#8B5E3C',6:'#2F80ED'};
const OPERATOR_COLORS={ptsc:'#C9252D',bus:'#C9252D',water_taxi:'#0A84FF',ferry:'#0077B6',route_taxi:'#6E6E73'};
const ROAD_MODES=new Set(['ptsc','bus','maxi','route_taxi']);
const TT_BOUNDS=[[-61.98,9.95],[-60.42,11.42]];
const TT_MAX_BOUNDS=[[-62.25,9.70],[-60.15,11.68]];
const GEOCODER_BASE='https://nominatim.openstreetmap.org/search';
const PHOTON_BASE='https://photon.komoot.io/api';
const GEOCODE_CACHE_KEY='transittrinidad-geocode-v1';
const OSRM_BASE='https://router.project-osrm.org/route/v1/driving';
const OSRM_CACHE_KEY='transittrinidad-road-geometry-v1';
let lastGeocodeAt=0;
let lastOsrmAt=0;

function modeLabel(mode){return MODE_LABELS[mode]||mode;}
function escapeHtml(value=''){return String(value).replace(/[&<>'\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[char]));}
function routeColor(service){
  if(service.mode==='maxi'){
    const routeArea=Number(service.routeArea||service.maxiRouteArea||service.bandRouteArea);
    if(MAXI_BAND_COLORS[routeArea])return MAXI_BAND_COLORS[routeArea];
    const named={yellow:1,red:2,green:3,black:4,brown:5,blue:6}[String(service.bandColor||'').toLowerCase()];
    if(named)return MAXI_BAND_COLORS[named];
    return '#8E8E93';
  }
  return OPERATOR_COLORS[service.mode]||'#6E6E73';
}
function filteredServices(){return services.filter(service=>activeMode==='all'||service.mode===activeMode||(activeMode==='ptsc'&&service.mode==='bus'));}
function routingServices(){return filteredServices();}
function hasLocation(node){return node?.location&&Number.isFinite(node.location.lat)&&Number.isFinite(node.location.lng);}
function serviceNodes(service){return[nodeIndex.get(service.originNodeId),nodeIndex.get(service.destinationNodeId)];}
function fallbackCoordinates(service){
  const[origin,destination]=serviceNodes(service);
  if(!hasLocation(origin)||!hasLocation(destination))return null;
  return service.geometry?.length?service.geometry.map(point=>[point.lng,point.lat]):[[origin.location.lng,origin.location.lat],[destination.location.lng,destination.location.lat]];
}
function serviceCoordinates(service){return displayGeometry.get(service.id)?.coordinates||fallbackCoordinates(service);}
function displayPathKind(service){
  if(service.geometry?.length&&service.geometryConfidence==='verified_path')return'verified';
  if(displayGeometry.get(service.id)?.source==='osrm')return'estimated';
  return'connector';
}
function displayPathLabel(service){const kind=displayPathKind(service);return kind==='verified'?'Verified':kind==='estimated'?'Estimated':'Approx.';}
function serviceFeature(service){
  const coordinates=serviceCoordinates(service);
  return coordinates?{type:'Feature',properties:{id:service.id,mode:service.mode,pathKind:displayPathKind(service),routeColor:routeColor(service)},geometry:{type:'LineString',coordinates}}:null;
}
function visibleGeoJson(){return{type:'FeatureCollection',features:filteredServices().map(serviceFeature).filter(Boolean)};}
function nodeGeoJson(){return{type:'FeatureCollection',features:[...nodeIndex.values()].filter(hasLocation).map(node=>({type:'Feature',properties:{id:node.id,name:node.name},geometry:{type:'Point',coordinates:[node.location.lng,node.location.lat]}}))};}
function fitCountry(){map?.fitBounds(TT_BOUNDS,{padding:50,duration:0});}
function refreshMapData(){if(map?.isStyleLoaded())map.getSource('services')?.setData(visibleGeoJson());}
function emptyFeatureCollection(){return{type:'FeatureCollection',features:[]};}
function clearJourney(){
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
  if(total<60)return`~${total} min`;
  const hours=Math.floor(total/60),mins=total%60;
  return`~${hours}h${mins?` ${mins}m`:''}`;
}
async function getJson(url){const response=await fetch(url,{cache:'no-cache'});if(!response.ok)throw new Error(`${url} returned ${response.status}`);return response.json();}

function renderList(){
  const list=$('#serviceList'),visible=filteredServices();
  $('#serviceCount').textContent=visible.length;
  if(!visible.length){list.innerHTML='<p class="loading">No services yet.</p>';return;}
  list.innerHTML=visible.map(service=>{
    const[origin,destination]=serviceNodes(service);
    return`<article class="service-card ${service.id===activeServiceId?'is-active':''}" data-service-id="${escapeHtml(service.id)}" tabindex="0"><span class="route-swatch" style="--route-color:${routeColor(service)}"></span><div><h3>${escapeHtml(origin?.name||service.originNodeId)} → ${escapeHtml(destination?.name||service.destinationNodeId)}</h3><div class="service-meta"><span>${escapeHtml(modeLabel(service.mode))}</span><span>${escapeHtml(displayPathLabel(service))}</span></div></div></article>`;
  }).join('');
  list.querySelectorAll('.service-card').forEach(card=>card.addEventListener('click',async()=>{const service=services.find(item=>item.id===card.dataset.serviceId);if(service)await estimateRoadGeometry(service);selectService(card.dataset.serviceId,true);}));
}
function renderDetail(service){
  const panel=$('#detailPanel'),[origin,destination]=serviceNodes(service);
  const fare=Number.isFinite(service.fareTTD)?`TT$${service.fareTTD}`:'Fare unavailable';
  panel.hidden=false;
  panel.innerHTML=`<div class="journey-summary"><div class="route-title-row"><span class="route-swatch large" style="--route-color:${routeColor(service)}"></span><div><p class="eyebrow">${escapeHtml(modeLabel(service.mode))}</p><h2>${escapeHtml(origin?.name)} → ${escapeHtml(destination?.name)}</h2></div></div><p class="service-line">${fare} · ${escapeHtml(displayPathLabel(service))}</p></div>`;
}
function selectService(id,zoom=false){
  const service=services.find(item=>item.id===id);if(!service)return;
  activeServiceId=id;renderList();renderDetail(service);refreshMapData();
  if(zoom){const coordinates=serviceCoordinates(service),bounds=new maplibregl.LngLatBounds();coordinates?.forEach(point=>bounds.extend(point));if(!bounds.isEmpty())map.fitBounds(bounds,{padding:80,maxZoom:11,duration:400});}
}
function setupModeTabs(){
  $('#modeTabs').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
    activeMode=button.dataset.mode;
    $('#modeTabs').querySelectorAll('button').forEach(item=>item.classList.toggle('is-active',item===button));
    clearJourney();renderList();refreshMapData();
    $('#plannerStatus').textContent=activeMode==='all'?'All transport modes.':`${modeLabel(activeMode)} only.`;
  }));
}
function setupTray(){const button=$('#trayToggle'),list=$('#serviceList');button.addEventListener('click',()=>{list.hidden=!list.hidden;button.setAttribute('aria-expanded',String(!list.hidden));});}
function findNodeByInput(value){const target=String(value||'').trim().toLowerCase();return[...nodeIndex.values()].find(node=>node.name.toLowerCase()===target)||null;}

function readGeoCache(){try{return JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY)||'{}');}catch{return{};}}
function writeGeoCache(cache){try{localStorage.setItem(GEOCODE_CACHE_KEY,JSON.stringify(cache));}catch{}}
function readRoadCache(){try{return JSON.parse(localStorage.getItem(OSRM_CACHE_KEY)||'{}');}catch{return{};}}
function writeRoadCache(cache){try{localStorage.setItem(OSRM_CACHE_KEY,JSON.stringify(cache));}catch{}}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function inTT(lng,lat){return lng>=TT_BOUNDS[0][0]&&lng<=TT_BOUNDS[1][0]&&lat>=TT_BOUNDS[0][1]&&lat<=TT_BOUNDS[1][1];}
function photonLabel(properties={}){const parts=[properties.name,properties.street,properties.city||properties.district||properties.county].filter(Boolean);return[...new Set(parts)].join(', ');}
async function autocompletePlaces(query,signal){
  const cleaned=String(query||'').trim();if(cleaned.length<2)return[];
  const params=new URLSearchParams({q:cleaned,limit:'6',lang:'en',bbox:'-61.98,9.95,-60.42,11.42'});
  const response=await fetch(`${PHOTON_BASE}?${params}`,{signal,headers:{Accept:'application/json'}});if(!response.ok)return[];
  const data=await response.json();
  return(data.features||[]).map(feature=>{const[lng,lat]=feature.geometry?.coordinates||[];return{name:photonLabel(feature.properties),lat:+lat,lng:+lng};}).filter(place=>place.name&&Number.isFinite(place.lat)&&Number.isFinite(place.lng)&&inTT(place.lng,place.lat));
}
function renderSuggestions(inputId,menuId,places){
  const input=$(`#${inputId}`),menu=$(`#${menuId}`);if(!places.length){menu.hidden=true;menu.innerHTML='';return;}
  menu.innerHTML=places.map((place,index)=>`<button type="button" role="option" data-index="${index}"><strong>${escapeHtml(place.name.split(',')[0])}</strong><span>${escapeHtml(place.name.split(',').slice(1).join(',').trim()||'Trinidad & Tobago')}</span></button>`).join('');menu.hidden=false;
  menu.querySelectorAll('button').forEach(button=>button.addEventListener('mousedown',event=>{event.preventDefault();const place=places[Number(button.dataset.index)];input.value=place.name;selectedPlaces.set(inputId,{...place,inputValue:place.name});menu.hidden=true;}));
}
function setupAutocomplete(inputId,menuId){
  const input=$(`#${inputId}`),menu=$(`#${menuId}`);let timer;
  input.addEventListener('input',()=>{
    selectedPlaces.delete(inputId);clearTimeout(timer);const query=input.value.trim();if(query.length<2){menu.hidden=true;return;}
    timer=setTimeout(async()=>{autocompleteControllers.get(inputId)?.abort();const controller=new AbortController();autocompleteControllers.set(inputId,controller);try{renderSuggestions(inputId,menuId,await autocompletePlaces(query,controller.signal));}catch(error){if(error.name!=='AbortError')menu.hidden=true;}},400);
  });
  input.addEventListener('keydown',event=>{if(event.key==='Escape')menu.hidden=true;});
  input.addEventListener('blur',()=>setTimeout(()=>{menu.hidden=true;},120));
}
async function geocodePlace(query){
  const cleaned=String(query||'').trim();if(!cleaned)throw new Error('Enter a start and destination.');
  const key=cleaned.toLowerCase(),cache=readGeoCache();if(cache[key])return cache[key];
  const wait=Math.max(0,1100-(Date.now()-lastGeocodeAt));if(wait)await sleep(wait);
  const params=new URLSearchParams({q:cleaned,format:'jsonv2',limit:'1',countrycodes:'tt',bounded:'1',viewbox:'-61.98,11.42,-60.42,9.95'});lastGeocodeAt=Date.now();
  const response=await fetch(`${GEOCODER_BASE}?${params}`,{headers:{Accept:'application/json'}});if(!response.ok)throw new Error('Place search failed.');
  const rows=await response.json();if(!rows.length)throw new Error(`Could not find “${cleaned}”.`);
  const place={name:rows[0].display_name,lat:+rows[0].lat,lng:+rows[0].lon};cache[key]=place;writeGeoCache(cache);return place;
}
async function resolvePlace(inputId){
  const input=$(`#${inputId}`),known=findNodeByInput(input.value);if(known)return{name:known.name,...known.location};
  const selected=selectedPlaces.get(inputId);if(selected&&selected.inputValue===input.value)return selected;
  return geocodePlace(input.value);
}

async function estimateRoadGeometry(service){
  if(!ROAD_MODES.has(service.mode)||service.geometry?.length)return;
  const[origin,destination]=serviceNodes(service);if(!hasLocation(origin)||!hasLocation(destination))return;
  const cache=readRoadCache(),key=`${service.id}:${origin.location.lng},${origin.location.lat}:${destination.location.lng},${destination.location.lat}`;
  if(cache[key]?.coordinates?.length){displayGeometry.set(service.id,{...cache[key],source:'osrm'});return;}
  const wait=Math.max(0,350-(Date.now()-lastOsrmAt));if(wait)await sleep(wait);lastOsrmAt=Date.now();
  const url=`${OSRM_BASE}/${origin.location.lng},${origin.location.lat};${destination.location.lng},${destination.location.lat}?overview=full&geometries=geojson&steps=false&alternatives=false`;
  try{const response=await fetch(url);if(!response.ok)return;const data=await response.json(),route=data?.routes?.[0];if(!route?.geometry?.coordinates?.length)return;const value={coordinates:route.geometry.coordinates,durationSeconds:route.duration,distanceMeters:route.distance};displayGeometry.set(service.id,{...value,source:'osrm'});cache[key]=value;writeRoadCache(cache);}catch(error){console.warn('Road geometry unavailable for',service.id,error);}
}
async function hydrateDisplayGeometry(list){for(const service of [...new Map(list.map(item=>[item.id,item])).values()])await estimateRoadGeometry(service);refreshMapData();renderList();}
function nearestNode(place){let best=null;for(const node of nodeIndex.values()){if(!hasLocation(node))continue;const km=kmBetween(place,node.location);if(!best||km<best.km)best={node,km};}return best;}

function journeyGeoJson(from,to,fromNear,toNear,legs){
  const features=[{type:'Feature',properties:{kind:'access',routeColor:'#8E8E93'},geometry:{type:'LineString',coordinates:[[from.lng,from.lat],[fromNear.node.location.lng,fromNear.node.location.lat]]}}];
  for(const leg of legs){const coordinates=serviceCoordinates(leg.service);if(coordinates)features.push({type:'Feature',properties:{kind:'transit',routeColor:routeColor(leg.service),pathKind:displayPathKind(leg.service)},geometry:{type:'LineString',coordinates:leg.service.originNodeId===leg.from?coordinates:[...coordinates].reverse()}});}
  features.push({type:'Feature',properties:{kind:'access',routeColor:'#8E8E93'},geometry:{type:'LineString',coordinates:[[toNear.node.location.lng,toNear.node.location.lat],[to.lng,to.lat]]}});return{type:'FeatureCollection',features};
}
function showJourneyMap(from,to,fromNear,toNear,legs){
  map.getSource('search-points')?.setData({type:'FeatureCollection',features:[{type:'Feature',properties:{kind:'from'},geometry:{type:'Point',coordinates:[from.lng,from.lat]}},{type:'Feature',properties:{kind:'to'},geometry:{type:'Point',coordinates:[to.lng,to.lat]}}]});
  map.getSource('journey')?.setData(journeyGeoJson(from,to,fromNear,toNear,legs));
  const bounds=new maplibregl.LngLatBounds();bounds.extend([from.lng,from.lat]);bounds.extend([to.lng,to.lat]);for(const leg of legs)for(const point of serviceCoordinates(leg.service)||[])bounds.extend(point);map.fitBounds(bounds,{padding:{top:70,bottom:70,left:70,right:70},maxZoom:11,duration:450});
}
function renderJourney(fromNear,toNear,legs,estimatedMinutes){
  const panel=$('#detailPanel');panel.hidden=false;
  const knownFare=legs.reduce((sum,leg)=>sum+(Number.isFinite(leg.service.fareTTD)?leg.service.fareTTD:0),0),allFaresKnown=legs.length>0&&legs.every(leg=>Number.isFinite(leg.service.fareTTD)),transfers=Math.max(0,legs.length-1);
  let html=`<div class="journey-summary"><p class="eyebrow">Route</p><h2>${escapeHtml($('#fromInput').value)} → ${escapeHtml($('#toInput').value)}</h2><div class="journey-kpis"><div><strong>${formatMinutes(estimatedMinutes)}</strong><span>rough time</span></div><div><strong>${transfers}</strong><span>transfer${transfers===1?'':'s'}</span></div><div><strong>${allFaresKnown?`TT$${knownFare}`:'—'}</strong><span>fare</span></div></div></div>`;
  if(fromNear.km>.05)html+=`<div class="journey-leg access-leg"><span class="leg-icon">●</span><div><h3>Get to ${escapeHtml(fromNear.node.name)}</h3><p>${fromNear.km.toFixed(1)} km away</p></div></div>`;
  legs.forEach(leg=>{const origin=nodeIndex.get(leg.from),destination=nodeIndex.get(leg.to),fare=Number.isFinite(leg.service.fareTTD)?` · TT$${leg.service.fareTTD}`:'';html+=`<div class="journey-leg"><span class="leg-route" style="--route-color:${routeColor(leg.service)}"></span><div><h3>${escapeHtml(origin.name)} → ${escapeHtml(destination.name)}</h3><p>${escapeHtml(modeLabel(leg.service.mode))}${fare}</p></div></div>`;});
  if(toNear.km>.05)html+=`<div class="journey-leg access-leg"><span class="leg-icon">◆</span><div><h3>Continue to destination</h3><p>${toNear.km.toFixed(1)} km away</p></div></div>`;
  if(legs.some(leg=>displayPathKind(leg.service)!=='verified'))html+='<p class="route-note">Estimated route geometry.</p>';panel.innerHTML=html;
}

function setupPlanner(){
  setupAutocomplete('fromInput','fromSuggestions');setupAutocomplete('toInput','toSuggestions');
  $('#swapButton').addEventListener('click',()=>{const fromInput=$('#fromInput'),toInput=$('#toInput'),fromValue=fromInput.value,fromSelected=selectedPlaces.get('fromInput'),toSelected=selectedPlaces.get('toInput');fromInput.value=toInput.value;toInput.value=fromValue;selectedPlaces.delete('fromInput');selectedPlaces.delete('toInput');if(toSelected)selectedPlaces.set('fromInput',{...toSelected,inputValue:fromInput.value});if(fromSelected)selectedPlaces.set('toInput',{...fromSelected,inputValue:toInput.value});});
  $('#planButton').addEventListener('click',async()=>{
    const status=$('#plannerStatus'),button=$('#planButton');button.disabled=true;status.textContent='Finding route…';
    try{
      const knownFrom=findNodeByInput($('#fromInput').value),knownTo=findNodeByInput($('#toInput').value),from=await resolvePlace('fromInput'),to=await resolvePlace('toInput');
      const usableServices=routingServices();
      const connected=chooseConnectedJourney({fromPlace:from,toPlace:to,nodes:nodeIndex,services:usableServices,knownFrom,knownTo,candidateLimit:10,maxAccessKm:25,transferPenaltyMinutes:10,walkKph:18});
      if(!connected){const fromNear=knownFrom?{node:knownFrom,km:0}:nearestNode(from),toNear=knownTo?{node:knownTo,km:0}:nearestNode(to);if(!fromNear||!toNear)throw new Error('No nearby transport coverage yet.');showJourneyMap(from,to,fromNear,toNear,[]);status.textContent='No route in the current network.';return;}
      const{fromNear,toNear,legs,estimatedMinutes}=connected;await hydrateDisplayGeometry(legs.map(leg=>leg.service));showJourneyMap(from,to,fromNear,toNear,legs);renderJourney(fromNear,toNear,legs,estimatedMinutes);status.textContent=`${formatMinutes(estimatedMinutes)} · ${legs.length} leg${legs.length===1?'':'s'}`;
    }catch(error){console.error(error);status.textContent=error.message;}finally{button.disabled=false;}
  });
}

function addMapLayers(){
  map.addSource('services',{type:'geojson',data:visibleGeoJson()});
  map.addLayer({id:'service-lines',type:'line',source:'services',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':['get','routeColor'],'line-width':['case',['==',['get','pathKind'],'verified'],3,2.5],'line-opacity':['case',['==',['get','pathKind'],'connector'],.18,.42],'line-dasharray':['case',['==',['get','pathKind'],'connector'],['literal',[2,2]],['literal',[1,0]]]}});
  map.addSource('journey',{type:'geojson',data:emptyFeatureCollection()});
  map.addLayer({id:'journey-access',type:'line',source:'journey',filter:['==',['get','kind'],'access'],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#8E8E93','line-width':3,'line-dasharray':[1.5,1.5]}});
  map.addLayer({id:'journey-transit-casing',type:'line',source:'journey',filter:['==',['get','kind'],'transit'],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#fff','line-width':10,'line-opacity':.9}});
  map.addLayer({id:'journey-transit',type:'line',source:'journey',filter:['==',['get','kind'],'transit'],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':['get','routeColor'],'line-width':6.5,'line-opacity':1}});
  map.addSource('nodes',{type:'geojson',data:nodeGeoJson()});map.addLayer({id:'nodes',type:'circle',source:'nodes',paint:{'circle-radius':4,'circle-color':'#fff','circle-stroke-color':'#636366','circle-stroke-width':1.5}});
  map.addSource('search-points',{type:'geojson',data:emptyFeatureCollection()});map.addLayer({id:'search-points',type:'circle',source:'search-points',paint:{'circle-radius':8,'circle-color':['match',['get','kind'],'from','#0A84FF','to','#FF3B30','#111'],'circle-stroke-color':'#fff','circle-stroke-width':3}});
  map.on('click','service-lines',async event=>{const id=event.features?.[0]?.properties?.id,service=services.find(item=>item.id===id);if(service){await estimateRoadGeometry(service);selectService(id,false);}});
}

async function start(){
  try{
    const[nodesData,servicesData]=await Promise.all([getJson('./data/nodes.json'),getJson('./data/services.json')]);nodesData.forEach(node=>nodeIndex.set(node.id,node));services=servicesData;renderList();setupModeTabs();setupTray();setupPlanner();
    map=new maplibregl.Map({container:'map',style:{version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]},bounds:TT_BOUNDS,fitBoundsOptions:{padding:50},maxBounds:TT_MAX_BOUNDS,minZoom:7,maxZoom:17,attributionControl:true});
    map.addControl(new maplibregl.NavigationControl({showCompass:false}),'bottom-right');map.on('load',()=>{addMapLayers();fitCountry();});
  }catch(error){console.error(error);$('#plannerStatus').textContent='Transport data failed to load.';}
}

start();
