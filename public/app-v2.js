import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.8.0/dist/maplibre-gl.mjs';
import {chooseJourneyOptions,kmBetween} from './src/routing-core.mjs';
import {exactPlace,explicitNetworkNode,matchPlaces,mergePlaceSuggestions,placeToPoint} from './src/place-core.mjs';
import {formatClock,formatServiceDays,nextDepartures,scheduleForDate,scheduleFreshness} from './src/schedule-core.mjs';
import {fareForJourney,fareForSegment,formatFare} from './src/fare-core.mjs';
import {boardingGuidance,transitAction} from './src/rider-instruction-core.mjs';
import {coordinatesForJourneyLeg} from './src/journey-geometry-core.mjs';
import {requestCurrentPosition} from './src/location-core.mjs';

const nodeIndex=new Map();
let services=[];
let transfers=[];
let schedules=[];
let places=[];
let fares=[];
let activeMode='all';
let activeServiceId=null;
let selectedScheduleDate=new Date();
let map;
let plannerRequestId=0;
let currentTripContext=null;
let currentRoutePlan=null;

const displayGeometry=new Map();
const selectedPlaces=new Map();
const autocompleteControllers=new Map();

const $=selector=>document.querySelector(selector);
const MODE_LABELS={ptsc:'PTSC',maxi:'Maxi',route_taxi:'Route taxi',water_taxi:'Water Taxi',ferry:'Ferry'};
const MAXI_BAND_COLORS={1:'#F2C94C',2:'#D92D2D',3:'#2E9B4B',4:'#1C1C1E',5:'#8B5E3C',6:'#2F80ED'};
const MAXI_BAND_LABELS={1:'Route 1 / Yellow Band',2:'Route 2 / Red Band',3:'Route 3 / Green Band',4:'Route 4 / Black Band',5:'Route 5 / Brown Band',6:'Route 6 / Blue Band'};
const OPERATOR_COLORS={ptsc:'#C9252D',water_taxi:'#0A84FF',ferry:'#0077B6',route_taxi:'#6E6E73'};
const ROAD_MODES=new Set(['ptsc','maxi','route_taxi']);
const TT_BOUNDS=[[-61.98,9.95],[-60.42,11.42]];
const TT_MAX_BOUNDS=[[-62.25,9.70],[-60.15,11.68]];
const GEOCODER_BASE='https://nominatim.openstreetmap.org/search';
const PHOTON_BASE='https://photon.komoot.io/api';
const GEOCODE_CACHE_KEY='transittrinidad-geocode-v2';
const OSRM_BASE='https://router.project-osrm.org/route/v1/driving';
const OSRM_CACHE_KEY='transittrinidad-road-geometry-v1';
let lastGeocodeAt=0;
let lastOsrmAt=0;

function escapeHtml(value=''){
  return String(value).replace(/[&<>'\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[char]));
}
function modeLabel(mode){return MODE_LABELS[mode]||mode;}
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
function maxiBandLabel(service){
  const routeArea=Number(service.routeArea||service.maxiRouteArea||service.bandRouteArea);
  if(MAXI_BAND_LABELS[routeArea])return MAXI_BAND_LABELS[routeArea];
  const color=String(service.bandColor||'').trim();
  return color?`${color[0].toUpperCase()}${color.slice(1)} Band`:'Maxi';
}
function filteredServices(){return services.filter(service=>service.serviceConfidence!=='needs_review'&&(activeMode==='all'||service.mode===activeMode));}
function routingServices(){return services.filter(service=>service.serviceConfidence!=='needs_review');}
function corridorGroups(list=filteredServices()){
  const grouped=new Map();
  for(const service of list){
    if(!grouped.has(service.corridorId))grouped.set(service.corridorId,[]);
    grouped.get(service.corridorId).push(service);
  }
  return [...grouped.entries()].map(([corridorId,patterns])=>({corridorId,patterns,representative:patterns[0]}));
}
function corridorIsBidirectional(group){
  return group.patterns.some(a=>group.patterns.some(b=>a.originNodeId===b.destinationNodeId&&a.destinationNodeId===b.originNodeId));
}
function backgroundServices(){return corridorGroups().map(group=>group.representative);}
function hasLocation(node){return node?.location&&Number.isFinite(node.location.lat)&&Number.isFinite(node.location.lng);}
function serviceNodes(service){return[nodeIndex.get(service.originNodeId),nodeIndex.get(service.destinationNodeId)];}
function serviceSchedules(serviceId){return schedules.filter(schedule=>schedule.serviceId===serviceId);}
function nodeCoordinates(id){const node=nodeIndex.get(id);return hasLocation(node)?[node.location.lng,node.location.lat]:null;}
function emptyFeatureCollection(){return{type:'FeatureCollection',features:[]};}
function localDateValue(date=selectedScheduleDate){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Port_of_Spain',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
function scheduleDateFromInput(value){return new Date(`${value}T12:00:00-04:00`);}
function fareForService(service,fromNodeId=service.originNodeId,toNodeId=service.destinationNodeId){return fareForSegment({service,fromNodeId,toNodeId,fares,nodes:[...nodeIndex.values()]});}
function journeyFareLabel(journeyFare){if(!journeyFare)return'Fare unavailable';return formatFare({...journeyFare,confidence:journeyFare.confidence==='includes_estimate'?'estimated':'community_verified'});}

function scheduleHtml(service){
  const variants=serviceSchedules(service.id);
  if(!variants.length)return'';
  const schedule=scheduleForDate(variants,selectedScheduleDate);
  const picker=`<label class="schedule-date-label">Travel date <input id="scheduleDate" type="date" value="${localDateValue()}" /></label>`;
  if(!schedule)return`<section class="schedule-block"><p class="eyebrow">Schedule</p>${picker}<p>No published timetable for this date.</p><span class="data-chip">Schedule unavailable</span></section>`;
  const freshness=scheduleFreshness(schedule);
  const freshnessChip=`<span class="data-chip data-${escapeHtml(freshness.kind)}">${escapeHtml(freshness.label)}</span>`;
  const days=formatServiceDays(schedule.serviceDays);
  if(schedule.status!=='published_times'||!schedule.departureTimes.length){
    return`<section class="schedule-block"><p class="eyebrow">Schedule</p>${picker}<strong>Runs ${escapeHtml(days)}</strong><p>Exact departure times are not in the dataset.</p><span class="data-chip">Published service days</span>${freshnessChip}</section>`;
  }
  return`<section class="schedule-block"><p class="eyebrow">Scheduled departures</p>${picker}<div class="departure-times">${schedule.departureTimes.map(time=>`<strong>${escapeHtml(formatClock(time))}</strong>`).join('')}</div><p>${escapeHtml(days)}</p><span class="data-chip">Published timetable</span>${freshnessChip}</section>`;
}
function availabilityHtml(service){
  if(service.availability?.kind!=='frequency_based')return'';
  return`<section class="schedule-block"><p class="eyebrow">Service pattern</p><strong>Frequency based</strong><p>${escapeHtml(service.availability.note||'No timetable is stored for this route.')}</p><span class="data-chip">No timetable</span></section>`;
}
function sourceLinks(service){
  return(service.sources||[]).filter(source=>/^https?:\/\//i.test(source.url)).map(source=>`<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.name)}</a></li>`).join('');
}
function serviceEvidenceHtml(service){
  const links=sourceLinks(service);
  if(!links)return'';
  return`<details class="data-details"><summary>Data details</summary><ul>${links}</ul></details>`;
}
function serviceConfidenceLabel(service){
  if(service.serviceConfidence==='verified_service')return'Verified route';
  if(service.serviceConfidence==='reported_service')return'Reported route';
  return'Route';
}
function serviceBadges(service,fromNodeId=service.originNodeId,toNodeId=service.destinationNodeId){
  const fare=fareForService(service,fromNodeId,toNodeId);
  const badges=[serviceConfidenceLabel(service),formatFare(fare)];
  if(serviceSchedules(service.id).length)badges.push('Timetable');else badges.push('No timetable');
  return badges.map(label=>`<span class="data-chip">${escapeHtml(label)}</span>`).join('');
}

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
function displayPathLabel(service){const kind=displayPathKind(service);return kind==='verified'?'Verified path':kind==='estimated'?'Estimated path':'Approx. path';}
function serviceFeature(service){
  const coordinates=serviceCoordinates(service);
  return coordinates?{type:'Feature',properties:{id:service.id,corridorId:service.corridorId,mode:service.mode,pathKind:displayPathKind(service),routeColor:routeColor(service)},geometry:{type:'LineString',coordinates}}:null;
}
function visibleGeoJson(){return{type:'FeatureCollection',features:backgroundServices().map(serviceFeature).filter(Boolean)};}
function nodeGeoJson(){
  return{type:'FeatureCollection',features:[...nodeIndex.values()].filter(hasLocation).map(node=>({type:'Feature',properties:{id:node.id,name:node.name},geometry:{type:'Point',coordinates:[node.location.lng,node.location.lat]}}))};
}
function fitCountry(){map?.fitBounds(TT_BOUNDS,{padding:50,duration:0});}
function refreshMapData(){if(map?.isStyleLoaded())map.getSource('services')?.setData(visibleGeoJson());}
function invalidatePlanner(){plannerRequestId+=1;}
function ensureCurrent(requestId){if(requestId!==plannerRequestId)throw new DOMException('Superseded','AbortError');}
function clearJourney({clearTrip=false}={}){
  currentRoutePlan=null;
  if(clearTrip)currentTripContext=null;
  if(map?.isStyleLoaded()){
    map.setLayoutProperty?.('service-lines','visibility','visible');
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
function formatJourneyMinutes(option){
  const min=option?.estimatedMinutesMin,max=option?.estimatedMinutesMax;
  if(!Number.isFinite(min)||!Number.isFinite(max)||max-min<5)return formatMinutes(option?.estimatedMinutes);
  return`${formatMinutes(min)}–${formatMinutes(max).replace(/^~/,'')}`;
}
function compactJourneySteps(steps=[]){
  const compact=[];
  for(const step of steps){
    const previous=compact.at(-1);
    if(step.kind==='transit'&&previous?.kind==='transit'&&previous.service.id===step.service.id){previous.to=step.to;previous.minutes+=step.minutes||0;continue;}
    compact.push({...step});
  }
  return compact;
}
function rideSteps(steps=[]){return compactJourneySteps(steps).filter(step=>step.kind==='transit');}
function accessCopy(access,nodeName,isDestination=false){
  if(!access||access.mode==='none')return null;
  const distance=`${access.km.toFixed(1)} km`;
  if(access.mode==='walk')return{title:isDestination?'Walk to destination':`Walk to ${nodeName}`,detail:`${distance} · ${formatMinutes(access.minutes).replace('~','')}`};
  return{title:isDestination?'Continue to destination':`Get to ${nodeName}`,detail:`${distance} from ${isDestination?'final stop':'start'}`};
}
function routeOptionLabel(option,index){
  const waterMode=option.modes.find(mode=>mode==='water_taxi'||mode==='ferry');
  if(index===0)return waterMode?`Fastest est. · ${modeLabel(waterMode)}`:'Fastest est.';
  if(waterMode)return modeLabel(waterMode);
  return'Alternative';
}
function routeOptionModes(option){const seen=[];for(const mode of option.modes)if(!seen.includes(mode))seen.push(mode);return seen.map(modeLabel).join(' + ');}
function locationAccuracySuffix(...points){
  const warnings=points.filter(point=>point?.source==='browser_geolocation'&&point.accuracyWarning).map(point=>point.accuracyWarning);
  return warnings.length?` · ${warnings[0]}`:'';
}
function routeStatus(option){const rides=rideSteps(option.steps);const fare=fareForJourney(compactJourneySteps(option.steps),{fares,nodes:[...nodeIndex.values()]});const wait=option.timing?.waitMinutes?` · ~${Math.round(option.timing.waitMinutes)} min expected waiting`:'';return`${formatJourneyMinutes(option)} · ${journeyFareLabel(fare)} · ${rides.length} ride${rides.length===1?'':'s'}${option.transferCount?` · ${option.transferCount} transfer${option.transferCount===1?'':'s'}`:''}${wait}`;}
function isFormalBoardingNode(node){return['terminal','stand','ferry_terminal','water_taxi_terminal'].includes(node?.kind);}
function transitInstruction(step){
  const origin=nodeIndex.get(step.from);
  const destination=nodeIndex.get(step.to);
  return transitAction(step.service,{
    toward:destination?.name||step.to,
    bandLabel:step.service.mode==='maxi'?maxiBandLabel(step.service):'Maxi',
    fromIsTerminal:isFormalBoardingNode(origin)
  });
}
function boardingDetail(step){
  const origin=nodeIndex.get(step.from);
  const destination=nodeIndex.get(step.to);
  const fare=fareForService(step.service,step.from,step.to);
  const guidance=boardingGuidance(step.service,{
    fromName:origin?.name||step.from,
    toName:destination?.name||step.to,
    fromIsTerminal:isFormalBoardingNode(origin),
    toIsTerminal:isFormalBoardingNode(destination)
  });
  const parts=[guidance,formatFare(fare)];
  const variants=serviceSchedules(step.service.id);
  const departures=nextDepartures(variants,selectedScheduleDate,1);
  if(departures.length)parts.push(`scheduled ${departures[0].label}`);
  return parts.join(' · ');
}
function journeyEvidenceHtml(rides){
  const unique=[...new Map(rides.map(step=>[step.service.id,step.service])).values()];
  const rows=unique.map(service=>{
    const links=sourceLinks(service);
    return`<div class="evidence-row"><strong>${escapeHtml(modeLabel(service.mode))}</strong><span>${escapeHtml(serviceConfidenceLabel(service))}</span>${links?`<ul>${links}</ul>`:''}</div>`;
  }).join('');
  return`<details class="data-details journey-data"><summary>Journey data</summary>${rows}</details>`;
}

async function fetchWithTimeout(url,options={},timeoutMs=7000){
  const controller=new AbortController();
  const external=options.signal;
  const forwardAbort=()=>controller.abort();
  if(external){if(external.aborted)controller.abort();else external.addEventListener('abort',forwardAbort,{once:true});}
  let timedOut=false;
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
  try{return await fetch(url,{...options,signal:controller.signal});}
  catch(error){if(timedOut)throw new Error('Request timed out.');throw error;}
  finally{clearTimeout(timer);external?.removeEventListener('abort',forwardAbort);}
}
async function getJson(url){const response=await fetchWithTimeout(url,{cache:'no-cache'},7000);if(!response.ok)throw new Error(`${url} returned ${response.status}`);return response.json();}

function renderList(){
  const list=$('#serviceList'),groups=corridorGroups();
  $('#serviceCount').textContent=groups.length;
  if(!groups.length){list.innerHTML='<p class="loading">No services yet.</p>';return;}
  list.innerHTML=groups.map(group=>{
    const service=group.representative,[origin,destination]=serviceNodes(service),arrow=corridorIsBidirectional(group)?'↔':'→';
    return`<article class="service-card ${service.id===activeServiceId?'is-active':''}" data-service-id="${escapeHtml(service.id)}" tabindex="0"><span class="route-swatch" style="--route-color:${routeColor(service)}"></span><div><h3>${escapeHtml(origin?.name||service.originNodeId)} ${arrow} ${escapeHtml(destination?.name||service.destinationNodeId)}</h3><div class="service-meta"><span>${escapeHtml(modeLabel(service.mode))}</span><span>${group.patterns.length} direction${group.patterns.length===1?'':'s'}</span></div></div></article>`;
  }).join('');
  list.querySelectorAll('.service-card').forEach(card=>{
    const open=async()=>{const service=services.find(item=>item.id===card.dataset.serviceId);if(!service)return;await estimateRoadGeometry(service);selectService(service.id,true);};
    card.addEventListener('click',open);
    card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open();}});
  });
}
function renderDetail(service){
  const panel=$('#detailPanel'),[origin,destination]=serviceNodes(service);
  panel.hidden=false;
  panel.innerHTML=`<div class="journey-summary"><div class="route-title-row"><span class="route-swatch large" style="--route-color:${routeColor(service)}"></span><div><p class="eyebrow">${escapeHtml(modeLabel(service.mode))}</p><h2>${escapeHtml(origin?.name)} → ${escapeHtml(destination?.name)}</h2></div></div><div class="data-chips">${serviceBadges(service)}<span class="data-chip">${escapeHtml(displayPathLabel(service))}</span></div></div>${scheduleHtml(service)||availabilityHtml(service)}${serviceEvidenceHtml(service)}`;
  $('#scheduleDate')?.addEventListener('change',event=>{selectedScheduleDate=scheduleDateFromInput(event.target.value);renderDetail(service);});
}
function selectService(id,zoom=false){
  const service=services.find(item=>item.id===id);if(!service)return;
  currentTripContext=null;currentRoutePlan=null;activeServiceId=id;renderList();renderDetail(service);refreshMapData();
  if(zoom){const coordinates=serviceCoordinates(service),bounds=new maplibregl.LngLatBounds();coordinates?.forEach(point=>bounds.extend(point));if(!bounds.isEmpty())map.fitBounds(bounds,{padding:80,maxZoom:11,duration:400});}
}
function setupModeTabs(){
  $('#modeTabs').querySelectorAll('button').forEach(button=>button.addEventListener('click',async()=>{
    const shouldReplan=Boolean(currentTripContext);invalidatePlanner();activeMode=button.dataset.mode;
    $('#modeTabs').querySelectorAll('button').forEach(item=>item.classList.toggle('is-active',item===button));
    clearJourney();renderList();refreshMapData();
    if(shouldReplan){await planCurrentTrip({reuseContext:true});return;}
    $('#plannerStatus').textContent=activeMode==='all'?'All modes':`Routes using ${modeLabel(activeMode)}`;
  }));
}
function setupTray(){const button=$('#trayToggle'),list=$('#serviceList');button.addEventListener('click',()=>{list.hidden=!list.hidden;button.setAttribute('aria-expanded',String(!list.hidden));});}

function readGeoCache(){try{return JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY)||'{}');}catch{return{};}}
function writeGeoCache(cache){try{localStorage.setItem(GEOCODE_CACHE_KEY,JSON.stringify(cache));}catch{}}
function readRoadCache(){try{return JSON.parse(localStorage.getItem(OSRM_CACHE_KEY)||'{}');}catch{return{};}}
function writeRoadCache(cache){try{localStorage.setItem(OSRM_CACHE_KEY,JSON.stringify(cache));}catch{}}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function inTT(lng,lat){return lng>=TT_BOUNDS[0][0]&&lng<=TT_BOUNDS[1][0]&&lat>=TT_BOUNDS[0][1]&&lat<=TT_BOUNDS[1][1];}
function photonLabel(properties={}){const parts=[properties.name,properties.street,properties.city||properties.district||properties.county].filter(Boolean);return[...new Set(parts)].join(', ');}
async function remoteAutocomplete(query,signal){
  const cleaned=String(query||'').trim();if(cleaned.length<2)return[];
  const params=new URLSearchParams({q:cleaned,limit:'6',lang:'en',bbox:'-61.98,9.95,-60.42,11.42'});
  const response=await fetchWithTimeout(`${PHOTON_BASE}?${params}`,{signal,headers:{Accept:'application/json'}},5000);if(!response.ok)return[];
  const data=await response.json();
  return(data.features||[]).map(feature=>{const[lng,lat]=feature.geometry?.coordinates||[];return{name:photonLabel(feature.properties),lat:+lat,lng:+lng};}).filter(place=>place.name&&Number.isFinite(place.lat)&&Number.isFinite(place.lng)&&inTT(place.lng,place.lat));
}
async function autocompletePlaces(query,signal){
  const local=matchPlaces(query,places,{limit:4});
  let remote=[];
  try{remote=await remoteAutocomplete(query,signal);}catch(error){if(error.name!=='AbortError')console.warn('Remote autocomplete unavailable',error);else throw error;}
  return mergePlaceSuggestions(local,remote,{limit:6});
}
function chooseSuggestion(inputId,menu,place){
  const input=$(`#${inputId}`);input.value=place.name;selectedPlaces.set(inputId,{...place,inputValue:place.name});menu.hidden=true;invalidatePlanner();
}
function renderSuggestions(inputId,menuId,suggestions){
  const menu=$(`#${menuId}`);if(!suggestions.length){menu.hidden=true;menu.innerHTML='';return;}
  menu.innerHTML=suggestions.map((place,index)=>`<button type="button" role="option" data-index="${index}"><strong>${escapeHtml(place.name.split(',')[0])}</strong><span>${escapeHtml(place.source==='local'?'Place · Trinidad & Tobago':place.name.split(',').slice(1).join(',').trim()||'Trinidad & Tobago')}</span></button>`).join('');
  menu.hidden=false;
  menu.querySelectorAll('button').forEach(button=>button.addEventListener('mousedown',event=>{event.preventDefault();chooseSuggestion(inputId,menu,suggestions[Number(button.dataset.index)]);}));
}
function setupAutocomplete(inputId,menuId){
  const input=$(`#${inputId}`),menu=$(`#${menuId}`);let timer,activeIndex=-1,currentPlaces=[];
  input.addEventListener('input',()=>{
    invalidatePlanner();currentTripContext=null;currentRoutePlan=null;selectedPlaces.delete(inputId);clearTimeout(timer);autocompleteControllers.get(inputId)?.abort();activeIndex=-1;
    const query=input.value.trim();if(query.length<2){menu.hidden=true;menu.innerHTML='';return;}
    timer=setTimeout(async()=>{
      const controller=new AbortController();autocompleteControllers.set(inputId,controller);
      try{const matches=await autocompletePlaces(query,controller.signal);if(input.value.trim()!==query)return;currentPlaces=matches;renderSuggestions(inputId,menuId,matches);}catch(error){if(error.name!=='AbortError'){menu.hidden=true;menu.innerHTML='';}}
    },250);
  });
  input.addEventListener('keydown',event=>{
    const buttons=[...menu.querySelectorAll('button')];
    if(event.key==='Escape'){menu.hidden=true;activeIndex=-1;return;}
    if((event.key==='ArrowDown'||event.key==='ArrowUp')&&buttons.length){event.preventDefault();activeIndex=event.key==='ArrowDown'?Math.min(activeIndex+1,buttons.length-1):Math.max(activeIndex-1,0);buttons.forEach((button,index)=>button.classList.toggle('is-keyboard-active',index===activeIndex));buttons[activeIndex]?.scrollIntoView({block:'nearest'});return;}
    if(event.key==='Enter'){
      if(!menu.hidden&&activeIndex>=0&&currentPlaces[activeIndex]){event.preventDefault();chooseSuggestion(inputId,menu,currentPlaces[activeIndex]);return;}
      event.preventDefault();$('#planButton').click();
    }
  });
  input.addEventListener('blur',()=>setTimeout(()=>{menu.hidden=true;activeIndex=-1;},120));
}
async function geocodePlace(query){
  const cleaned=String(query||'').trim();if(!cleaned)throw new Error('Enter a start and destination.');
  const key=cleaned.toLowerCase(),cache=readGeoCache();if(cache[key])return cache[key];
  const wait=Math.max(0,1100-(Date.now()-lastGeocodeAt));if(wait)await sleep(wait);
  const params=new URLSearchParams({q:cleaned,format:'jsonv2',limit:'1',countrycodes:'tt',bounded:'1',viewbox:'-61.98,11.42,-60.42,9.95'});lastGeocodeAt=Date.now();
  const response=await fetchWithTimeout(`${GEOCODER_BASE}?${params}`,{headers:{Accept:'application/json'}},7000);if(!response.ok)throw new Error('Place search failed.');
  const rows=await response.json();if(!rows.length)throw new Error(`Could not find “${cleaned}”.`);
  const point={name:rows[0].display_name,lat:+rows[0].lat,lng:+rows[0].lon};cache[key]=point;writeGeoCache(cache);return point;
}
async function resolveEndpoint(inputId){
  const input=$(`#${inputId}`),value=input.value.trim();
  const selected=selectedPlaces.get(inputId);
  if(selected&&selected.inputValue===input.value){
    if(selected.source==='browser_geolocation')return{point:{...selected,name:selected.name,lat:selected.lat,lng:selected.lng,routingRadiusKm:selected.routingRadiusKm},knownNode:null,routingRadiusKm:selected.routingRadiusKm||5};
    return{point:{name:selected.name,lat:selected.lat,lng:selected.lng,routingRadiusKm:selected.routingRadiusKm},knownNode:null,routingRadiusKm:selected.routingRadiusKm||4};
  }
  const local=exactPlace(value,places);
  if(local){const point=placeToPoint(local);return{point,knownNode:null,routingRadiusKm:local.routingRadiusKm||4};}
  const node=explicitNetworkNode(value,nodeIndex,places);
  if(node)return{point:{name:node.name,...node.location},knownNode:node,routingRadiusKm:0};
  const point=await geocodePlace(value);
  return{point,knownNode:null,routingRadiusKm:4};
}

async function estimateRoadGeometry(service){
  if(!ROAD_MODES.has(service.mode)||service.geometry?.length)return;
  const[origin,destination]=serviceNodes(service);if(!hasLocation(origin)||!hasLocation(destination))return;
  const cache=readRoadCache();const key=`${service.id}:${origin.location.lng},${origin.location.lat}:${destination.location.lng},${destination.location.lat}`;
  if(cache[key]?.coordinates?.length){displayGeometry.set(service.id,{...cache[key],source:'osrm'});return;}
  const wait=Math.max(0,350-(Date.now()-lastOsrmAt));if(wait)await sleep(wait);lastOsrmAt=Date.now();
  const url=`${OSRM_BASE}/${origin.location.lng},${origin.location.lat};${destination.location.lng},${destination.location.lat}?overview=full&geometries=geojson&steps=false&alternatives=false`;
  try{const response=await fetchWithTimeout(url,{},6000);if(!response.ok)return;const data=await response.json(),route=data?.routes?.[0];if(!route?.geometry?.coordinates?.length)return;const value={coordinates:route.geometry.coordinates,durationSeconds:route.duration,distanceMeters:route.distance};displayGeometry.set(service.id,{...value,source:'osrm'});cache[key]=value;writeRoadCache(cache);}catch(error){console.warn('Road geometry unavailable for',service.id,error);}
}
async function hydrateDisplayGeometry(list){for(const service of[...new Map(list.map(item=>[item.id,item])).values()])await estimateRoadGeometry(service);refreshMapData();renderList();}
function transitStepCoordinates(step){
  const service=step.service,from=nodeCoordinates(step.from),to=nodeCoordinates(step.to);
  return coordinatesForJourneyLeg({coordinates:serviceCoordinates(service),from,to,isWholeService:step.from===service.originNodeId&&step.to===service.destinationNodeId});
}
function searchPointFeature(kind,point){return{type:'Feature',properties:{kind,source:point.source||null,accuracyMeters:point.accuracyMeters||null},geometry:{type:'Point',coordinates:[point.lng,point.lat]}};}
function journeyGeoJson(from,to,connected){
  const{fromNear,toNear,fromAccess,toAccess}=connected;const steps=compactJourneySteps(connected.steps);const features=[];
  if(fromAccess.mode!=='none')features.push({type:'Feature',properties:{kind:'access',accessMode:fromAccess.mode},geometry:{type:'LineString',coordinates:[[from.lng,from.lat],[fromNear.node.location.lng,fromNear.node.location.lat]]}});
  for(const step of steps){
    if(step.kind==='transfer'){const a=nodeCoordinates(step.from),b=nodeCoordinates(step.to);if(a&&b)features.push({type:'Feature',properties:{kind:'transfer'},geometry:{type:'LineString',coordinates:[a,b]}});continue;}
    const coordinates=transitStepCoordinates(step);if(coordinates)features.push({type:'Feature',properties:{kind:'transit',routeColor:routeColor(step.service),pathKind:displayPathKind(step.service)},geometry:{type:'LineString',coordinates}});
  }
  if(toAccess.mode!=='none')features.push({type:'Feature',properties:{kind:'access',accessMode:toAccess.mode},geometry:{type:'LineString',coordinates:[[toNear.node.location.lng,toNear.node.location.lat],[to.lng,to.lat]]}});
  return{type:'FeatureCollection',features};
}
function showJourneyMap(from,to,connected){
  map.setLayoutProperty?.('service-lines','visibility','none');
  map.getSource('search-points')?.setData({type:'FeatureCollection',features:[searchPointFeature(from.source==='browser_geolocation'?'current-from':'from',from),searchPointFeature(to.source==='browser_geolocation'?'current-to':'to',to)]});
  map.getSource('journey')?.setData(journeyGeoJson(from,to,connected));
  const bounds=new maplibregl.LngLatBounds();bounds.extend([from.lng,from.lat]);bounds.extend([to.lng,to.lat]);
  for(const step of compactJourneySteps(connected.steps)){const fromPoint=nodeCoordinates(step.from),toPoint=nodeCoordinates(step.to);if(fromPoint)bounds.extend(fromPoint);if(toPoint)bounds.extend(toPoint);if(step.kind==='transit')for(const point of transitStepCoordinates(step)||[])bounds.extend(point);}
  map.fitBounds(bounds,{padding:{top:70,bottom:70,left:70,right:70},maxZoom:11,duration:450});
}
function showNoRouteMap(from,to){
  map.setLayoutProperty?.('service-lines','visibility','visible');
  map.getSource('journey')?.setData(emptyFeatureCollection());map.getSource('search-points')?.setData({type:'FeatureCollection',features:[searchPointFeature(from.source==='browser_geolocation'?'current-from':'from',from),searchPointFeature(to.source==='browser_geolocation'?'current-to':'to',to)]});
  const bounds=new maplibregl.LngLatBounds([from.lng,from.lat],[to.lng,to.lat]);map.fitBounds(bounds,{padding:90,maxZoom:12,duration:350});
}
function renderJourney(connected,options=[],selectedIndex=0){
  const{fromNear,toNear,fromAccess,toAccess,estimatedMinutes,transferCount}=connected;const steps=compactJourneySteps(connected.steps);const rides=steps.filter(step=>step.kind==='transit');const panel=$('#detailPanel');panel.hidden=false;
  const journeyFare=fareForJourney(steps,{fares,nodes:[...nodeIndex.values()]});
  let html=`<div class="journey-summary"><p class="eyebrow">Route</p><h2>${escapeHtml($('#fromInput').value)} → ${escapeHtml($('#toInput').value)}</h2><div class="journey-kpis"><div><strong>${formatJourneyMinutes(connected)}</strong><span>estimated trip</span></div><div><strong>${transferCount}</strong><span>transfer${transferCount===1?'':'s'}</span></div><div><strong>${escapeHtml(journeyFareLabel(journeyFare))}</strong><span>${journeyFare?.confidence==='includes_estimate'?'estimated fare':'fare'}</span></div></div></div>`;
  if(options.length>1)html+=`<div class="route-options" aria-label="Route alternatives">${options.map((option,index)=>`<button type="button" class="route-option ${index===selectedIndex?'is-active':''}" data-route-option="${index}"><strong>${escapeHtml(routeOptionLabel(option,index))}</strong><span>${escapeHtml(formatJourneyMinutes(option))}</span><small>${escapeHtml(routeOptionModes(option)||'Transit')}</small></button>`).join('')}</div>`;
  const first=accessCopy(fromAccess,fromNear.node.name,false);if(first)html+=`<div class="journey-leg access-leg"><span class="leg-icon">${fromAccess.mode==='walk'?'↟':'●'}</span><div><h3>${escapeHtml(first.title)}</h3><p>${escapeHtml(first.detail)}</p></div></div>`;
  for(const step of steps){
    const destination=nodeIndex.get(step.to);
    if(step.kind==='transfer'){html+=`<div class="journey-leg access-leg"><span class="leg-icon">↟</span><div><h3>Walk to ${escapeHtml(destination?.name||step.to)}</h3><p>${step.transfer.distanceKm.toFixed(1)} km · ~${Math.round(step.minutes)} min</p></div></div>`;continue;}
    html+=`<div class="journey-leg"><span class="leg-route" style="--route-color:${routeColor(step.service)}"></span><div><h3>${escapeHtml(transitInstruction(step))}</h3><p>${escapeHtml(boardingDetail(step))}</p><div class="data-chips leg-chips">${serviceBadges(step.service,step.from,step.to)}</div></div></div>`;
  }
  const last=accessCopy(toAccess,toNear.node.name,true);if(last)html+=`<div class="journey-leg access-leg"><span class="leg-icon">${toAccess.mode==='walk'?'↟':'◆'}</span><div><h3>${escapeHtml(last.title)}</h3><p>${escapeHtml(last.detail)}</p></div></div>`;
  html+=journeyEvidenceHtml(rides);panel.innerHTML=html;
  panel.querySelectorAll('[data-route-option]').forEach(button=>button.addEventListener('click',()=>selectRouteOption(Number(button.dataset.routeOption))));
}
async function selectRouteOption(index){
  if(!currentRoutePlan||!currentRoutePlan.options[index])return;const requestId=++plannerRequestId;const option=currentRoutePlan.options[index];currentRoutePlan.selectedIndex=index;$('#plannerStatus').textContent='Loading route…';
  try{await hydrateDisplayGeometry(rideSteps(option.steps).map(step=>step.service));ensureCurrent(requestId);showJourneyMap(currentRoutePlan.from,currentRoutePlan.to,option);renderJourney(option,currentRoutePlan.options,index);$('#plannerStatus').textContent=routeStatus(option)+locationAccuracySuffix(currentRoutePlan.from,currentRoutePlan.to);}catch(error){if(error.name!=='AbortError')$('#plannerStatus').textContent=error.message;}
}
async function planCurrentTrip({reuseContext=false}={}){
  const status=$('#plannerStatus'),button=$('#planButton'),requestId=++plannerRequestId;button.disabled=true;status.textContent=activeMode==='all'?'Finding routes…':`Finding routes using ${modeLabel(activeMode)}…`;
  try{
    let fromEndpoint,toEndpoint,from,to,knownFrom,knownTo;
    if(reuseContext&&currentTripContext){({fromEndpoint,toEndpoint,from,to,knownFrom,knownTo}=currentTripContext);}else{
      fromEndpoint=await resolveEndpoint('fromInput');ensureCurrent(requestId);toEndpoint=await resolveEndpoint('toInput');ensureCurrent(requestId);
      from=fromEndpoint.point;to=toEndpoint.point;knownFrom=fromEndpoint.knownNode;knownTo=toEndpoint.knownNode;
      if(kmBetween(from,to)<0.03){clearJourney({clearTrip:true});status.textContent='Start and destination are the same place.';return;}
      currentTripContext={fromEndpoint,toEndpoint,from,to,knownFrom,knownTo};
    }
    const options=chooseJourneyOptions({fromPlace:from,toPlace:to,nodes:nodeIndex,services:routingServices(),transfers,schedules,departureDate:new Date(),knownFrom,knownTo,candidateLimit:12,maxAccessKm:Math.max(4,fromEndpoint?.routingRadiusKm||4,toEndpoint?.routingRadiusKm||4),transferPenaltyMinutes:10,accessOptions:{localWaitMinutes:10,localKph:18},maxOptions:3,requiredMode:activeMode==='all'?null:activeMode,rankingOptions:{allowDirectLocalFallback:true,maxDirectLocalFallbackKm:8}});
    ensureCurrent(requestId);
    if(!options.length){currentRoutePlan=null;showNoRouteMap(from,to);$('#detailPanel').hidden=true;$('#detailPanel').innerHTML='';status.textContent=(activeMode==='all'?'No route in the current network.':`No route using ${modeLabel(activeMode)} for this trip.`)+locationAccuracySuffix(from,to);return;}
    const connected=options[0];currentRoutePlan={from,to,knownFrom,knownTo,options,selectedIndex:0};await hydrateDisplayGeometry(rideSteps(connected.steps).map(step=>step.service));ensureCurrent(requestId);showJourneyMap(from,to,connected);renderJourney(connected,options,0);status.textContent=routeStatus(connected)+locationAccuracySuffix(from,to);
  }catch(error){if(error.name!=='AbortError'){console.error(error);status.textContent=error.message;}}
  finally{if(requestId===plannerRequestId)button.disabled=false;}
}
function setLocationStatus(message,kind='info'){
  const status=$('#locationStatus');
  status.hidden=!message;
  status.textContent=message||'';
  status.classList.toggle('is-warning',kind==='warning');
  status.classList.toggle('is-error',kind==='error');
}
async function useLiveLocation(inputId){
  const button=$(`#${inputId==='fromInput'?'fromLocationButton':'toLocationButton'}`),input=$(`#${inputId}`),menu=$(`#${inputId==='fromInput'?'fromSuggestions':'toSuggestions'}`);
  const requestId=++plannerRequestId;
  button.disabled=true;setLocationStatus('Getting your location…');
  try{
    const place=await requestCurrentPosition();ensureCurrent(requestId);
    input.value=place.name;
    selectedPlaces.set(inputId,{...place,inputValue:place.name});
    menu.hidden=true;menu.innerHTML='';currentTripContext=null;currentRoutePlan=null;clearJourney();
    setLocationStatus(`${inputId==='fromInput'?'Start':'Destination'} set to current location · ${place.accuracyLabel}${place.accuracyWarning?` · ${place.accuracyWarning}`:''}`,place.accuracyWarning?'warning':'info');
    map?.getSource('search-points')?.setData({type:'FeatureCollection',features:[searchPointFeature(inputId==='fromInput'?'current-from':'current-to',place)]});
  }catch(error){if(error.name!=='AbortError')setLocationStatus(error.message||'Could not get your location.', 'error');}
  finally{button.disabled=false;}
}
function setupPlanner(){
  setupAutocomplete('fromInput','fromSuggestions');setupAutocomplete('toInput','toSuggestions');
  $('#fromLocationButton').addEventListener('click',()=>useLiveLocation('fromInput'));
  $('#toLocationButton').addEventListener('click',()=>useLiveLocation('toInput'));
  $('#swapButton').addEventListener('click',()=>{invalidatePlanner();currentTripContext=null;currentRoutePlan=null;const fromInput=$('#fromInput'),toInput=$('#toInput');const fromValue=fromInput.value,fromSelected=selectedPlaces.get('fromInput'),toSelected=selectedPlaces.get('toInput');fromInput.value=toInput.value;toInput.value=fromValue;selectedPlaces.delete('fromInput');selectedPlaces.delete('toInput');if(toSelected)selectedPlaces.set('fromInput',{...toSelected,inputValue:fromInput.value});if(fromSelected)selectedPlaces.set('toInput',{...fromSelected,inputValue:toInput.value});});
  $('#planButton').addEventListener('click',()=>planCurrentTrip());
}
function addMapLayers(){
  map.addSource('services',{type:'geojson',data:visibleGeoJson()});
  map.addLayer({id:'service-lines',type:'line',source:'services',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':['get','routeColor'],'line-width':['case',['==',['get','pathKind'],'verified'],3,2.5],'line-opacity':['case',['==',['get','pathKind'],'connector'],.18,.42],'line-dasharray':['case',['==',['get','pathKind'],'connector'],['literal',[2,2]],['literal',[1,0]]]}});
  map.addSource('journey',{type:'geojson',data:emptyFeatureCollection()});
  map.addLayer({id:'journey-access',type:'line',source:'journey',filter:['==',['get','kind'],'access'],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':['case',['==',['get','accessMode'],'walk'],'#636366','#8E8E93'],'line-width':3,'line-dasharray':['case',['==',['get','accessMode'],'walk'],['literal',[1,1]],['literal',[2,1]]]}});
  map.addLayer({id:'journey-transfer',type:'line',source:'journey',filter:['==',['get','kind'],'transfer'],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#636366','line-width':4,'line-dasharray':[1,1]}});
  map.addLayer({id:'journey-transit-casing',type:'line',source:'journey',filter:['==',['get','kind'],'transit'],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#fff','line-width':10,'line-opacity':.9}});
  map.addLayer({id:'journey-transit',type:'line',source:'journey',filter:['==',['get','kind'],'transit'],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':['get','routeColor'],'line-width':6.5,'line-opacity':1}});
  map.addSource('nodes',{type:'geojson',data:nodeGeoJson()});map.addLayer({id:'nodes',type:'circle',source:'nodes',paint:{'circle-radius':4,'circle-color':'#fff','circle-stroke-color':'#636366','circle-stroke-width':1.5}});
  map.addSource('search-points',{type:'geojson',data:emptyFeatureCollection()});map.addLayer({id:'search-points',type:'circle',source:'search-points',paint:{'circle-radius':['case',['in',['get','kind'],['literal',['current-from','current-to']]],10,8],'circle-color':['match',['get','kind'],'from','#0A84FF','current-from','#0A84FF','to','#FF3B30','current-to','#FF3B30','#111'],'circle-stroke-color':'#fff','circle-stroke-width':3}});
  map.on('click','service-lines',async event=>{const id=event.features?.[0]?.properties?.id,service=services.find(item=>item.id===id);if(service){await estimateRoadGeometry(service);selectService(id,false);}});map.on('mouseenter','service-lines',()=>{map.getCanvas().style.cursor='pointer';});map.on('mouseleave','service-lines',()=>{map.getCanvas().style.cursor='';});
}
async function start(){
  try{
    const[nodesData,servicesData,transfersData,schedulesData,placesData,faresData]=await Promise.all([getJson('./data/nodes.json'),getJson('./data/services.json'),getJson('./data/transfers.json'),getJson('./data/schedules.json'),getJson('./data/places.json'),getJson('./data/fares.json')]);
    nodesData.forEach(node=>nodeIndex.set(node.id,node));services=servicesData;transfers=transfersData;schedules=schedulesData;places=placesData;fares=faresData;
    renderList();setupModeTabs();setupTray();setupPlanner();
    map=new maplibregl.Map({container:'map',style:{version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]},bounds:TT_BOUNDS,fitBoundsOptions:{padding:50},maxBounds:TT_MAX_BOUNDS,minZoom:7,maxZoom:17,attributionControl:true});
    map.addControl(new maplibregl.NavigationControl({showCompass:false}),'bottom-right');map.on('load',()=>{addMapLayers();fitCountry();});
  }catch(error){console.error(error);$('#plannerStatus').textContent='Transport data failed to load.';}
}
start();