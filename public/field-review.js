import {buildFieldReviewSubmission,resolveReviewedStopIds} from './src/field-review-core.mjs';

const $=selector=>document.querySelector(selector);
const modeLabels={ptsc:'PTSC',maxi:'Maxi',route_taxi:'Route taxi',water_taxi:'Water Taxi',ferry:'Ferry'};
let nodes=[];
let services=[];
let visibleServices=[];
let activeService=null;
let activeQuery='';
let reviewPayload=null;

function escapeHtml(value=''){
  return String(value).replace(/[&<>'\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[char]));
}

function nodeMap(){return new Map(nodes.map(node=>[node.id,node]));}
function serviceStops(service){return service.stopNodeIds?.length?service.stopNodeIds:[service.originNodeId,service.destinationNodeId];}
function routeLabel(service,map=nodeMap()){
  const ids=serviceStops(service);
  const origin=map.get(ids[0])?.name||ids[0];
  const destination=map.get(ids.at(-1))?.name||ids.at(-1);
  return `${origin} → ${destination}`;
}
function confidenceLabel(value){
  if(value==='verified_service')return'Verified service';
  if(value==='community_verified')return'Community verified';
  if(value==='reported_service')return'Reported service';
  return'Route';
}
function filterText(service,map=nodeMap()){
  return [service.id,service.corridorId,service.operator,service.mode,modeLabels[service.mode],routeLabel(service,map),...serviceStops(service).map(id=>map.get(id)?.name||id)].join(' ').toLowerCase();
}
function optionLabel(service,map,query){
  const base=`${routeLabel(service,map)} · ${modeLabels[service.mode]||service.mode}`;
  const cleaned=String(query||'').trim();
  if(!cleaned||base.toLowerCase().includes(cleaned.toLowerCase()))return base;
  return `${base} · match: ${cleaned}`;
}

function setStatus(message,type=''){
  const status=$('#status');
  status.textContent=message;
  status.className=`status${type?` ${type}`:''}`;
}

function clearPreview(){
  reviewPayload=null;
  $('#jsonPreview').textContent='Complete the review, then preview it here.';
  $('#export').disabled=true;
  $('#copy').disabled=true;
}

function renderOptions(query=''){
  const map=nodeMap();
  activeQuery=String(query||'').trim();
  const needle=activeQuery.toLowerCase();
  visibleServices=services.filter(service=>!needle||filterText(service,map).includes(needle));
  const select=$('#serviceSelect');
  const previous=activeService?.id;
  select.innerHTML=visibleServices.map(service=>`<option value="${escapeHtml(service.id)}">${escapeHtml(optionLabel(service,map,activeQuery))}</option>`).join('');
  if(!visibleServices.length){
    activeService=null;
    renderService();
    setStatus('No matching route directions.','error');
    return;
  }
  const selected=visibleServices.find(service=>service.id===previous)||visibleServices[0];
  select.value=selected.id;
  activeService=selected;
  renderService();
}

function renderService(){
  const card=$('#routeCard');
  if(!activeService){
    card.innerHTML='<strong>No route selected</strong><span class="hint">Try another search.</span>';
    clearPreview();
    return;
  }
  const map=nodeMap();
  const ids=serviceStops(activeService);
  const names=ids.map(id=>map.get(id)?.name||id);
  const fare=activeService.fareTTD!=null?`TT$${activeService.fareTTD}`:'Fare not confirmed';
  const baseLabel=routeLabel(activeService,map);
  const matchChip=activeQuery&&!baseLabel.toLowerCase().includes(activeQuery.toLowerCase())?`<span class="chip">Matched: ${escapeHtml(activeQuery)}</span>`:'';
  card.innerHTML=`<strong>${escapeHtml(baseLabel)}</strong><div class="meta"><span class="chip">${escapeHtml(modeLabels[activeService.mode]||activeService.mode)}</span><span class="chip">${escapeHtml(confidenceLabel(activeService.serviceConfidence))}</span><span class="chip">${escapeHtml(fare)}</span>${matchChip}</div><p class="hint">${escapeHtml(activeService.operator||'Local operator')} · ${escapeHtml(activeService.id)}</p>`;
  $('#fare').value=activeService.fareTTD??'';
  $('#patternType').value=activeService.patternType||'';
  $('#boardingPolicy').value=activeService.boardingPolicy||'';
  $('#alightingPolicy').value=activeService.alightingPolicy||'';
  $('#stops').value=names.join('\n');
  $('#roads').value='';
  $('#notes').value='';
  document.querySelectorAll('input[name="accuracy"]').forEach(input=>{input.checked=false;});
  clearPreview();
  setStatus('');
}

function selectedAccuracy(){return document.querySelector('input[name="accuracy"]:checked')?.value||null;}
function reviewedRoute(){
  if(!activeService)throw new Error('Choose a route direction first.');
  const accuracy=selectedAccuracy();
  if(!accuracy)throw new Error('Mark the route as correct or needing correction.');
  const stopNodeIds=resolveReviewedStopIds($('#stops').value,nodes);
  const roads=$('#roads').value.split(/\r?\n/).map(value=>value.trim()).filter(Boolean);
  return buildFieldReviewSubmission({
    service:activeService,
    nodes,
    review:{
      accuracy,
      association:$('#association').value.trim()||'Field reviewer',
      reviewerName:$('#reviewerName').value.trim(),
      reviewerRole:$('#reviewerRole').value.trim(),
      contactChannel:$('#contactChannel').value.trim()||'field-review',
      fareTTD:$('#fare').value,
      patternType:$('#patternType').value||undefined,
      boardingPolicy:$('#boardingPolicy').value||undefined,
      alightingPolicy:$('#alightingPolicy').value||undefined,
      stopNodeIds,
      roads,
      notes:$('#notes').value.trim(),
      receivedAt:new Date().toISOString().slice(0,10)
    }
  });
}

function preview(){
  try{
    reviewPayload=reviewedRoute();
    $('#jsonPreview').textContent=JSON.stringify(reviewPayload,null,2);
    $('#export').disabled=false;
    $('#copy').disabled=false;
    setStatus('Review file is valid and ready to export. It still requires promotion review before any map change.','ok');
  }catch(error){
    reviewPayload=null;
    $('#jsonPreview').textContent='Fix the highlighted review issue, then preview again.';
    $('#export').disabled=true;
    $('#copy').disabled=true;
    setStatus(error.message,'error');
  }
}

function exportReview(){
  if(!reviewPayload)return;
  const body=`${JSON.stringify(reviewPayload,null,2)}\n`;
  const blob=new Blob([body],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=`${reviewPayload.id}.json`;
  link.click();
  URL.revokeObjectURL(url);
  setStatus(`Exported ${reviewPayload.id}.json`,'ok');
}

async function copyReview(){
  if(!reviewPayload)return;
  await navigator.clipboard.writeText(JSON.stringify(reviewPayload,null,2));
  setStatus('Review JSON copied.','ok');
}

function bind(){
  $('#serviceSearch').addEventListener('input',event=>renderOptions(event.target.value));
  $('#serviceSelect').addEventListener('change',event=>{
    activeService=services.find(service=>service.id===event.target.value)||null;
    renderService();
  });
  for(const selector of ['#fare','#patternType','#boardingPolicy','#alightingPolicy','#stops','#roads','#notes','#association','#reviewerName','#reviewerRole','#contactChannel']){
    $(selector).addEventListener('input',clearPreview);
    $(selector).addEventListener('change',clearPreview);
  }
  document.querySelectorAll('input[name="accuracy"]').forEach(input=>input.addEventListener('change',clearPreview));
  $('#preview').addEventListener('click',preview);
  $('#export').addEventListener('click',exportReview);
  $('#copy').addEventListener('click',()=>copyReview().catch(error=>setStatus(error.message,'error')));
}

async function load(){
  try{
    const responses=await Promise.all([fetch('./data/nodes.json',{cache:'no-cache'}),fetch('./data/services.json',{cache:'no-cache'})]);
    if(responses.some(response=>!response.ok))throw new Error('Could not load route data.');
    [nodes,services]=await Promise.all(responses.map(response=>response.json()));
    services=services.filter(service=>service.serviceConfidence!=='needs_review');
    services.sort((a,b)=>routeLabel(a).localeCompare(routeLabel(b))||a.mode.localeCompare(b.mode));
    renderOptions();
    bind();
  }catch(error){
    setStatus(error.message,'error');
    $('#preview').disabled=true;
    $('#routeCard').textContent='Route data unavailable.';
  }
}

load();
