import {MODES,validateService} from './data-contract.mjs';

const clean=value=>String(value??'').trim();
const slug=value=>clean(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'route';
const clone=value=>JSON.parse(JSON.stringify(value));
const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')?value:null;

export function classifyDuplicate(draft,services=[]){
  const sameMode=services.filter(service=>service.mode===draft.mode);
  const exact=sameMode.find(service=>service.id===draft.existingServiceId)||sameMode.find(service=>service.originNodeId===draft.originNodeId&&service.destinationNodeId===draft.destinationNodeId);
  if(exact)return {kind:'exact',serviceId:exact.id,reason:'same directional endpoints and mode'};
  const probable=sameMode.find(service=>(service.originNodeId===draft.originNodeId&&service.destinationNodeId===draft.destinationNodeId)||(service.corridorId&&service.corridorId===draft.corridorId)||(service.originNodeId===draft.destinationNodeId&&service.destinationNodeId===draft.originNodeId));
  if(probable)return {kind:'probable',serviceId:probable.id,reason:probable.originNodeId===draft.destinationNodeId?'opposite direction exists; reverse is not assumed':'shared corridor or endpoints'};
  return {kind:'new',serviceId:null,reason:'no matching published directional service'};
}

export function approximateStopZone({name,lat,lng,submissionId,checkedAt}){
  if(!clean(name))throw new Error('approximate stop-zone name is required');
  if(!Number.isFinite(Number(lat))||!Number.isFinite(Number(lng)))throw new Error('approximate stop-zone needs latitude and longitude');
  if(!clean(submissionId)||!date(checkedAt))throw new Error('approximate stop-zone needs draft provenance');
  return {id:`studio-${slug(submissionId)}-${slug(name)}`,name:clean(name),kind:'stop_zone',location:{lat:Number(lat),lng:Number(lng)},locationConfidence:'approximate_area',sources:[{name:'Route Studio draft',kind:'association_contact',referenceId:clean(submissionId),checkedAt}]};
}

export function validateRouteDraft(draft,{services=[]}={}){
  if(!draft||typeof draft!=='object')throw new Error('route draft is required');
  if(!clean(draft.submissionId))throw new Error('submission ID is required');
  if(!date(draft.receivedAt))throw new Error('receivedAt must be YYYY-MM-DD');
  if(!MODES.has(draft.mode))throw new Error('choose a valid transport mode');
  if(!clean(draft.originNodeId)||!clean(draft.destinationNodeId)||draft.originNodeId===draft.destinationNodeId)throw new Error('choose distinct origin and destination points');
  if(!Array.isArray(draft.stopNodeIds)||draft.stopNodeIds.length<2||draft.stopNodeIds[0]!==draft.originNodeId||draft.stopNodeIds.at(-1)!==draft.destinationNodeId)throw new Error('stops must begin at the origin and end at the destination');
  if(new Set(draft.stopNodeIds).size!==draft.stopNodeIds.length)throw new Error('stops cannot repeat');
  if(draft.fareTTD!==null&&draft.fareTTD!==undefined&&(!Number.isFinite(Number(draft.fareTTD))||Number(draft.fareTTD)<0))throw new Error('reported fare must be blank or a non-negative number');
  const duplicate=classifyDuplicate(draft,services);
  if(draft.existingServiceId&&duplicate.kind!=='exact')throw new Error('selected existing service no longer matches this draft');
  return {...clone(draft),fareTTD:draft.fareTTD===''||draft.fareTTD==null?null:Number(draft.fareTTD),duplicate};
}

export function buildStudioCandidate(draft,{services=[]}={}){
  const checked=validateRouteDraft(draft,{services});
  const opposite=services.find(service=>service.mode===checked.mode&&service.originNodeId===checked.destinationNodeId&&service.destinationNodeId===checked.originNodeId);
  const reverseOfExisting=Boolean(opposite)&&checked.duplicate.kind!=='exact';
  const evidenceConfirmsReverse=checked.evidence?.confirmsReverse===true;
  const serviceConfidence=reverseOfExisting&&!evidenceConfirmsReverse?'reported_service':(checked.serviceConfidence||'reported_service');
  const id=checked.existingServiceId||`studio-${slug(checked.submissionId)}-${slug(checked.originNodeId)}-to-${slug(checked.destinationNodeId)}`;
  const source={submissionId:checked.submissionId,association:clean(checked.association)||'Route Studio reviewer',receivedAt:checked.receivedAt};
  const proposedService={
    id,corridorId:clean(checked.corridorId)||`studio-${slug(checked.originNodeId)}-${slug(checked.destinationNodeId)}`,mode:checked.mode,operator:clean(checked.operator)||source.association,
    originNodeId:checked.originNodeId,destinationNodeId:checked.destinationNodeId,stopNodeIds:[...checked.stopNodeIds],serviceConfidence,
    geometryConfidence:'endpoints_only',geometry:null,fareTTD:checked.fareTTD,fareConfidence:checked.fareTTD===null?'unknown':'reported',scheduleConfidence:'unknown',
    boardingPolicy:checked.boardingPolicy||'unknown_do_not_assume',alightingPolicy:checked.alightingPolicy||'unknown_do_not_assume',sources:[]
  };
  validateService({...proposedService,sources:[{name:source.association,kind:'association_contact',referenceId:source.submissionId,checkedAt:source.receivedAt}]});
  const nodesToCreate=(checked.nodesToCreate||[]).map(node=>approximateStopZone({...node,submissionId:source.submissionId,checkedAt:source.receivedAt}));
  return {submissionId:source.submissionId,association:source.association,autoPromote:false,candidates:[{candidateId:`${source.submissionId}:route-studio-1`,source,reviewStatus:'route_studio_review',notes:clean(checked.notes)||null,duplicate:checked.duplicate,reverseDraft:{detected:reverseOfExisting,confirmedByEvidence:evidenceConfirmsReverse},changeSet:{nodesToCreate,serviceAction:checked.existingServiceId?'update_existing':'create_new',existingServiceId:checked.existingServiceId||null,proposedService,proposedSchedule:null}}]};
}

export function previewStudioCandidate(draft,options){return JSON.stringify(buildStudioCandidate(draft,options),null,2);}
