const nodeIndex = new Map();
let services = [];
let activeMode = 'all';
let activeServiceId = null;
let map;
let layerGroup;

const $ = (s) => document.querySelector(s);

function modeLabel(mode) {
  return ({ptsc:'PTSC',bus:'PTSC',maxi:'Maxi',route_taxi:'Route taxi',water_taxi:'Water Taxi',ferry:'Ferry'})[mode] || mode;
}

function confidenceLabel(value) {
  return ({verified_service:'Verified service',community_verified:'Community verified',needs_review:'Needs review'})[value] || 'Unverified';
}

function geometryLabel(value) {
  return ({verified_path:'Verified path',partial_path:'Partial path',endpoints_only:'Endpoints only',unknown:'Unknown'})[value] || 'Unknown';
}

function escapeHtml(value='') {
  return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]));
}

async function getJson(url) {
  const res = await fetch(url, {cache:'no-cache'});
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

function hasLocation(node) {
  return node?.location && Number.isFinite(node.location.lat) && Number.isFinite(node.location.lng);
}

function serviceNodes(service) {
  return [nodeIndex.get(service.originNodeId), nodeIndex.get(service.destinationNodeId)];
}

function filteredServices() {
  return services.filter(service => activeMode === 'all' || service.mode === activeMode || (activeMode === 'ptsc' && service.mode === 'bus'));
}

function allLocatedPoints() {
  return [...nodeIndex.values()].filter(hasLocation).map(node => [node.location.lat,node.location.lng]);
}

function fitAll() {
  if (!map) return;
  const pts = allLocatedPoints();
  map.invalidateSize(false);
  if (pts.length) map.fitBounds(pts,{padding:[35,35],maxZoom:9});
  else map.setView([10.45,-61.25],8);
}

function renderMap() {
  if (!layerGroup) return;
  layerGroup.clearLayers();
  const visible = filteredServices();
  for (const service of visible) {
    const [origin,destination] = serviceNodes(service);
    if (!hasLocation(origin) || !hasLocation(destination)) continue;
    const points = service.geometry?.length
      ? service.geometry.map(point => [point.lat,point.lng])
      : [[origin.location.lat,origin.location.lng],[destination.location.lat,destination.location.lng]];
    const line = L.polyline(points,{
      weight: service.id === activeServiceId ? 6 : 4,
      opacity: .9,
      dashArray: service.geometryConfidence === 'endpoints_only' ? '9 8' : null
    }).addTo(layerGroup);
    line.on('click',()=>selectService(service.id,true));
    L.circleMarker([origin.location.lat,origin.location.lng],{radius:5,weight:2,fillOpacity:1}).bindTooltip(origin.name).addTo(layerGroup);
    L.circleMarker([destination.location.lat,destination.location.lng],{radius:5,weight:2,fillOpacity:1}).bindTooltip(destination.name).addTo(layerGroup);
  }
}

function renderList() {
  const list = $('#serviceList');
  const visible = filteredServices();
  $('#serviceCount').textContent = visible.length;
  if (!visible.length) {
    list.innerHTML = '<p class="loading">No verified services in this mode yet.</p>';
    return;
  }
  list.innerHTML = visible.map(service => {
    const [origin,destination] = serviceNodes(service);
    return `<article class="service-card ${service.id===activeServiceId?'is-active':''}" data-service-id="${escapeHtml(service.id)}" tabindex="0">
      <h3>${escapeHtml(origin?.name || service.originNodeId)} → ${escapeHtml(destination?.name || service.destinationNodeId)}</h3>
      <div class="service-meta"><span>${escapeHtml(modeLabel(service.mode))}</span><span>${escapeHtml(geometryLabel(service.geometryConfidence))}</span></div>
    </article>`;
  }).join('');
  list.querySelectorAll('.service-card').forEach(card=>{
    const pick=()=>selectService(card.dataset.serviceId,true);
    card.addEventListener('click',pick);
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick();}});
  });
}

function renderDetail(service) {
  const panel = $('#detailPanel');
  const [origin,destination] = serviceNodes(service);
  const fare = Number.isFinite(service.fareTTD) ? `TT$${service.fareTTD.toLocaleString()}` : 'Not confirmed';
  const sourceHtml = (service.sources || []).map(source=>`<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.name)} ↗</a>`).join('');
  panel.innerHTML = `<p class="eyebrow">ROUTE DETAIL</p>
    <h2>${escapeHtml(origin?.name || service.originNodeId)} → ${escapeHtml(destination?.name || service.destinationNodeId)}</h2>
    <div class="detail-route">
      <span class="mode">${escapeHtml(modeLabel(service.mode))}</span>
      <div class="detail-grid">
        <div><span>Operator</span><strong>${escapeHtml(service.operator)}</strong></div>
        <div><span>Fare</span><strong>${escapeHtml(fare)}</strong></div>
        <div><span>Service</span><strong>${escapeHtml(confidenceLabel(service.serviceConfidence))}</strong></div>
        <div><span>Map path</span><strong>${escapeHtml(geometryLabel(service.geometryConfidence))}</strong></div>
        <div><span>Fare confidence</span><strong>${escapeHtml(String(service.fareConfidence || 'unknown').replaceAll('_',' '))}</strong></div>
        <div><span>Schedule confidence</span><strong>${escapeHtml(String(service.scheduleConfidence || 'unknown').replaceAll('_',' '))}</strong></div>
      </div>
      <div class="confidence"><strong>What this map means:</strong> ${service.geometryConfidence==='endpoints_only' ? 'we have verified the service endpoints, but the straight line shown is not a claim about the exact route taken.' : 'the displayed route geometry has supporting evidence.'}</div>
      <div class="source-list"><p class="eyebrow">SOURCES</p>${sourceHtml}</div>
    </div>`;
}

function selectService(id, zoom=false) {
  const service = services.find(item=>item.id===id);
  if (!service) return;
  activeServiceId = id;
  renderList();
  renderMap();
  renderDetail(service);
  if (zoom) {
    const [a,b]=serviceNodes(service);
    if (hasLocation(a)&&hasLocation(b)) {
      map.invalidateSize(false);
      map.fitBounds([[a.location.lat,a.location.lng],[b.location.lat,b.location.lng]],{padding:[70,70],maxZoom:10});
    }
  }
}

function setupModeTabs() {
  $('#modeTabs').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
    activeMode = button.dataset.mode;
    activeServiceId = null;
    $('#modeTabs').querySelectorAll('button').forEach(b=>b.classList.toggle('is-active',b===button));
    renderList();
    renderMap();
    requestAnimationFrame(fitAll);
    $('#detailPanel').innerHTML='<p class="eyebrow">ROUTE DETAIL</p><h2>Pick a service</h2><p class="detail-empty">Click a route or service card to inspect what we know, how confident we are, and where the information came from.</p>';
  }));
}

function setupMapResize() {
  let resizeTimer;
  const refresh = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => map?.invalidateSize(false), 80);
  };
  window.addEventListener('resize', refresh);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(refresh);
    observer.observe($('#map'));
  }
}

async function start() {
  if (typeof L === 'undefined') {
    $('#serviceList').innerHTML='<p class="loading error">Map library failed to load. Check your internet connection and refresh.</p>';
    $('#serviceCount').textContent='0';
    return;
  }

  map = L.map('map',{zoomControl:true,attributionControl:true,preferCanvas:true}).setView([10.45,-61.25],8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:18,
    attribution:'&copy; OpenStreetMap contributors'
  }).addTo(map);
  layerGroup=L.layerGroup().addTo(map);
  setupMapResize();

  try {
    const [nodesData,servicesData]=await Promise.all([getJson('./data/nodes.json'),getJson('./data/services.json')]);
    nodesData.forEach(node=>nodeIndex.set(node.id,node));
    services=servicesData;
    renderList();
    renderMap();
    setupModeTabs();
    requestAnimationFrame(()=>requestAnimationFrame(fitAll));
  } catch (error) {
    console.error(error);
    $('#serviceList').innerHTML=`<p class="loading error">Transport data failed to load: ${escapeHtml(error.message)}</p>`;
    $('#serviceCount').textContent='0';
  }
}

document.addEventListener('DOMContentLoaded',start);
