import {chooseJourneyOptions} from './src/routing-core.mjs';
import {fareForJourney,fareForSegment,formatFare} from './src/fare-core.mjs';
import {boardingGuidance,transitAction} from './src/rider-instruction-core.mjs';

const $=selector=>document.querySelector(selector);
const STORAGE_KEY='transittrinidad-c1-central-south-review';
const BAND_LABELS={1:'Route 1 / Yellow Band',2:'Route 2 / Red Band',3:'Route 3 / Green Band',4:'Route 4 / Black Band',5:'Route 5 / Brown Band',6:'Route 6 / Blue Band'};
let pilot,nodesArray,services,transfers,fares;
let nodes;
let generatedPlans=new Map();
let exportPayload=null;

function escapeHtml(value=''){
  return String(value).replace(/[&<>'\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[char]));
}
function nodeName(id){return nodes.get(id)?.name||id;}
function isTerminal(node){return ['terminal','stand','hub','station'].includes(node?.kind);}
function bandLabel(service){return BAND_LABELS[Number(service?.routeArea||service?.maxiRouteArea||service?.bandRouteArea)]||'Maxi';}
function fareLabel(fare){
  if(!fare)return'Fare unavailable';
  return formatFare({...fare,confidence:fare.confidence==='includes_estimate'?'estimated':fare.confidence});
}
function setStatus(message,isError=false){const el=$('#status');el.textContent=message;el.style.color=isError?'#8b2d24':'#285e3d';}

function planJourney(fixture){
  const from=nodes.get(fixture.fromNodeId),to=nodes.get(fixture.toNodeId);
  if(!from?.location||!to?.location)return null;
  const options=chooseJourneyOptions({
    fromPlace:{name:from.name,...from.location},toPlace:{name:to.name,...to.location},knownFrom:from,knownTo:to,
    nodes,services,transfers,candidateLimit:14,maxAccessKm:4,transferPenaltyMinutes:10,
    accessOptions:{localWaitMinutes:30,localKph:18},maxOptions:3,requiredMode:fixture.expectedMode||null
  });
  return options[0]||null;
}

function transitStepHtml(step){
  const service=step.service;
  const from=nodes.get(step.from),to=nodes.get(step.to);
  const serviceDestination=nodes.get(service.destinationNodeId);
  const action=transitAction(service,{toward:serviceDestination?.name||to?.name,bandLabel:bandLabel(service),fromIsTerminal:isTerminal(from)});
  const guide=boardingGuidance(service,{fromName:from?.name||step.from,toName:to?.name||step.to,fromIsTerminal:isTerminal(from),toIsTerminal:isTerminal(to)});
  const fare=fareForSegment({service,fromNodeId:step.from,toNodeId:step.to,fares,nodes:nodesArray});
  return `<div class="step"><strong>${escapeHtml(action)}</strong><span>${escapeHtml(guide)}</span><div class="fare">${escapeHtml(fareLabel(fare))}</div></div>`;
}
function genericStepHtml(step){
  const from=nodeName(step.from),to=nodeName(step.to);
  if(step.kind==='transfer')return `<div class="step"><strong>Transfer</strong><span>${escapeHtml(from)} → ${escapeHtml(to)}</span></div>`;
  if(step.kind==='access')return `<div class="step"><strong>Get to boarding point</strong><span>${escapeHtml(to)}</span></div>`;
  return `<div class="step"><strong>${escapeHtml(step.kind||'Journey step')}</strong><span>${escapeHtml(from)} → ${escapeHtml(to)}</span></div>`;
}
function planSummary(fixture,option){
  if(!option)return {journeyId:fixture.id,status:'no_route',serviceIds:[],transferCount:null,fare:null,steps:[]};
  const fare=fareForJourney(option.steps,{fares,nodes:nodesArray});
  return {
    journeyId:fixture.id,status:'routed',serviceIds:[...new Set(option.steps.filter(step=>step.kind==='transit').map(step=>step.service.id))],
    transferCount:option.transferCount,fare:fare?{minTTD:fare.minTTD,maxTTD:fare.maxTTD,confidence:fare.confidence}:null,
    steps:option.steps.map(step=>({kind:step.kind,from:step.from,to:step.to,serviceId:step.service?.id||null}))
  };
}
function criterion(name,label){
  return `<div class="criterion"><b>${escapeHtml(label)}</b><div class="choices">${['correct','wrong','unsure'].map(value=>`<label><input type="radio" name="${escapeHtml(name)}" value="${value}"> ${value[0].toUpperCase()+value.slice(1)}</label>`).join('')}</div></div>`;
}

function renderFareBaseline(){
  const baseline=pilot.fareBaseline;
  const last=baseline.southboundFromChaguanas.at(-1);
  $('#fareBaseline').innerHTML=`<div class="kicker">Fare check</div><h2 style="margin:6px 0">Historical baseline — verify, don’t assume</h2><p>The latest route-specific ladder we found says short drops were TT$${escapeHtml(baseline.shortDropTTD)} and Chaguanas → San Fernando was TT$${escapeHtml(last.fareTTD)}, effective ${escapeHtml(baseline.effectiveDate)}. We need the reviewer to tell us what is true now.</p><p class="historical">This is deliberately not treated as a 2026 confirmed fare.</p>`;
}

function renderJourney(fixture,index){
  const option=planJourney(fixture);
  const summary=planSummary(fixture,option);
  generatedPlans.set(fixture.id,summary);
  const from=nodeName(fixture.fromNodeId),to=nodeName(fixture.toNodeId);
  let planHtml;
  if(!option){
    planHtml=`<div class="plan"><div class="warning">Current planner does not produce a usable ${escapeHtml(fixture.expectedMode||'transit')} journey for this probe.</div><p>That is useful pilot information. Tell us what the real northbound behavior should be.</p></div>`;
  }else{
    const fare=fareForJourney(option.steps,{fares,nodes:nodesArray});
    const mismatch=option.transferCount>fixture.expectedTransfersMax?`<div class="warning">Planner currently uses ${option.transferCount} transfer(s); pilot expectation is at most ${escapeHtml(fixture.expectedTransfersMax)}.</div>`:'';
    planHtml=`<div class="plan">${mismatch}<div class="route-meta">Current planner · ${option.transferCount} transfer(s) · ${escapeHtml(fareLabel(fare))}</div>${option.steps.map(step=>step.kind==='transit'?transitStepHtml(step):genericStepHtml(step)).join('')}</div>`;
  }
  return `<section class="journey" data-journey-id="${escapeHtml(fixture.id)}">
    <div class="kicker">Journey ${index+1} of ${pilot.journeys.length}${fixture.reverseProbe?' · reverse-direction probe':''}</div>
    <h2>${escapeHtml(from)} → ${escapeHtml(to)}</h2>
    <div class="route-meta">${escapeHtml(fixture.expectedMode||'transit')} · expected ≤ ${escapeHtml(fixture.expectedTransfersMax)} transfer(s)</div>
    <p class="question">${escapeHtml(fixture.question)}</p>
    ${planHtml}
    <div class="review-grid">
      ${criterion(`${fixture.id}-routeTruth`,'Route / vehicle is correct')}
      ${criterion(`${fixture.id}-boardingTruth`,'Boarding / drop-off behavior is correct')}
      ${criterion(`${fixture.id}-fareTruth`,'Fare or estimate is reasonable')}
      ${criterion(`${fixture.id}-instructionTruth`,'A new rider could follow these instructions')}
    </div>
    <div class="notes">
      <label>Current actual fare, if you know it <input type="number" min="0" step="0.5" data-field="actualFareTTD" placeholder="TT$" /></label>
      <label>Correct boarding point / side / landmark <input type="text" data-field="boardingCorrection" placeholder="Where should the rider actually stand or hail?" /></label>
      <label>Severity if something is wrong <select data-field="severity"><option value="none">None</option><option value="minor">Minor wording/detail</option><option value="major">Major — likely to confuse rider</option><option value="severity1">Severity 1 — could make rider take wrong vehicle/direction or fail the trip</option></select></label>
      <label>What should we change? <textarea rows="3" data-field="notes" placeholder="Missing stop, road used, local vs express, reverse behavior, time-of-day difference…"></textarea></label>
    </div>
  </section>`;
}

function answerFor(card,fixture){
  const radio=key=>card.querySelector(`input[name="${fixture.id}-${key}"]:checked`)?.value||null;
  const field=key=>card.querySelector(`[data-field="${key}"]`)?.value?.trim?.()??'';
  return {
    journeyId:fixture.id,routeTruth:radio('routeTruth'),boardingTruth:radio('boardingTruth'),fareTruth:radio('fareTruth'),instructionTruth:radio('instructionTruth'),
    actualFareTTD:field('actualFareTTD')===''?null:Number(field('actualFareTTD')),boardingCorrection:field('boardingCorrection')||null,
    severity:field('severity')||'none',notes:field('notes')||null,generatedPlan:generatedPlans.get(fixture.id)
  };
}
function collect(){
  const reviews=pilot.journeys.map(fixture=>answerFor(document.querySelector(`[data-journey-id="${fixture.id}"]`),fixture));
  return {
    schemaVersion:1,type:'transittrinidad_field_pilot_review',pilotId:pilot.pilotId,submittedAt:new Date().toISOString(),
    reviewer:{name:$('#reviewerName').value.trim()||null,role:$('#reviewerRole').value.trim()||null,association:$('#association').value.trim()||null,contact:$('#contact').value.trim()||null},
    reviews
  };
}
function reviewedCount(payload=collect()){return payload.reviews.filter(review=>review.routeTruth&&review.boardingTruth&&review.fareTruth&&review.instructionTruth).length;}
function updateCompletion(){const count=reviewedCount();$('#completion').textContent=`${count} of ${pilot.journeys.length} journeys fully reviewed.`;saveDraft();}
function saveDraft(){
  if(!pilot)return;
  const draft={reviewer:{name:$('#reviewerName').value,role:$('#reviewerRole').value,association:$('#association').value,contact:$('#contact').value},reviews:{}};
  for(const fixture of pilot.journeys){
    const card=document.querySelector(`[data-journey-id="${fixture.id}"]`);if(!card)continue;
    draft.reviews[fixture.id]={
      routeTruth:card.querySelector(`input[name="${fixture.id}-routeTruth"]:checked`)?.value||null,
      boardingTruth:card.querySelector(`input[name="${fixture.id}-boardingTruth"]:checked`)?.value||null,
      fareTruth:card.querySelector(`input[name="${fixture.id}-fareTruth"]:checked`)?.value||null,
      instructionTruth:card.querySelector(`input[name="${fixture.id}-instructionTruth"]:checked`)?.value||null,
      actualFareTTD:card.querySelector('[data-field="actualFareTTD"]').value,
      boardingCorrection:card.querySelector('[data-field="boardingCorrection"]').value,
      severity:card.querySelector('[data-field="severity"]').value,
      notes:card.querySelector('[data-field="notes"]').value
    };
  }
  localStorage.setItem(STORAGE_KEY,JSON.stringify(draft));
}
function restoreDraft(){
  try{
    const draft=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(!draft)return;
    $('#reviewerName').value=draft.reviewer?.name||'';$('#reviewerRole').value=draft.reviewer?.role||'';$('#association').value=draft.reviewer?.association||'';$('#contact').value=draft.reviewer?.contact||'';
    for(const fixture of pilot.journeys){
      const saved=draft.reviews?.[fixture.id],card=document.querySelector(`[data-journey-id="${fixture.id}"]`);if(!saved||!card)continue;
      for(const key of ['routeTruth','boardingTruth','fareTruth','instructionTruth']){const input=card.querySelector(`input[name="${fixture.id}-${key}"][value="${saved[key]}"]`);if(input)input.checked=true;}
      for(const key of ['actualFareTTD','boardingCorrection','severity','notes'])if(saved[key]!=null)card.querySelector(`[data-field="${key}"]`).value=saved[key];
    }
  }catch{}
}
function preview(){
  const payload=collect(),count=reviewedCount(payload);
  if(!$('#reviewerRole').value.trim())return setStatus('Add the reviewer role so we know whether this came from a driver, dispatcher or rider.',true);
  if(!count)return setStatus('Review at least one journey before exporting.',true);
  exportPayload=payload;$('#jsonPreview').hidden=false;$('#jsonPreview').textContent=JSON.stringify(payload,null,2);$('#download').disabled=false;$('#copy').disabled=false;
  setStatus(`Feedback is ready: ${count}/${pilot.journeys.length} journeys fully reviewed. Unanswered items remain null rather than being guessed.`);
}
function download(){
  if(!exportPayload)return;const blob=new Blob([`${JSON.stringify(exportPayload,null,2)}\n`],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');
  link.href=url;link.download=`${pilot.pilotId}-${Date.now()}.json`;link.click();URL.revokeObjectURL(url);
}
async function copy(){if(!exportPayload)return;await navigator.clipboard.writeText(JSON.stringify(exportPayload,null,2));setStatus('Feedback JSON copied.');}

async function load(){
  try{
    const paths=['./data/pilot-central-south-c1.json','./data/nodes.json','./data/services.json','./data/transfers.json','./data/fares.json'];
    const responses=await Promise.all(paths.map(path=>fetch(path,{cache:'no-cache'})));if(responses.some(response=>!response.ok))throw new Error('Could not load pilot data.');
    [pilot,nodesArray,services,transfers,fares]=await Promise.all(responses.map(response=>response.json()));nodes=new Map(nodesArray.map(node=>[node.id,node]));services=services.filter(service=>service.serviceConfidence!=='needs_review');
    renderFareBaseline();$('#journeys').innerHTML=pilot.journeys.map(renderJourney).join('');restoreDraft();updateCompletion();
    document.body.addEventListener('input',()=>{exportPayload=null;$('#download').disabled=true;$('#copy').disabled=true;updateCompletion();});
    document.body.addEventListener('change',()=>{exportPayload=null;$('#download').disabled=true;$('#copy').disabled=true;updateCompletion();});
    $('#preview').addEventListener('click',preview);$('#download').addEventListener('click',download);$('#copy').addEventListener('click',()=>copy().catch(error=>setStatus(error.message,true)));
  }catch(error){$('#journeys').innerHTML=`<div class="notice warning">${escapeHtml(error.message)}</div>`;setStatus(error.message,true);}
}
load();
