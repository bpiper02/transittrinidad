import {validateDataset,LOCATION_CONFIDENCE} from './data-contract.mjs';

function clone(value){return JSON.parse(JSON.stringify(value));}

function publicAssociationSource(candidate){
  const source=candidate?.source||{};
  if(!source.association||!source.submissionId||!source.receivedAt)throw new Error(`candidate ${candidate?.candidateId||'?'} is missing association provenance`);
  return {
    name:source.association,
    kind:'association_contact',
    referenceId:source.submissionId,
    checkedAt:source.receivedAt
  };
}

function dedupeSources(sources=[]){
  const seen=new Set();
  return sources.filter(source=>{
    const key=[source.kind||'web',source.url||'',source.referenceId||'',source.name,source.checkedAt].join('|');
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  });
}

export function validateReview(review,candidateBundle){
  if(!review||typeof review!=='object')throw new Error('review is required');
  if(!candidateBundle||typeof candidateBundle!=='object'||!Array.isArray(candidateBundle.candidates))throw new Error('candidate bundle is required');
  if(review.submissionId!==candidateBundle.submissionId)throw new Error('review.submissionId must match candidate bundle');
  if(!Array.isArray(review.decisions))throw new Error('review.decisions must be an array');
  const validIds=new Set(candidateBundle.candidates.map(candidate=>candidate.candidateId));
  const seen=new Set();
  for(const decision of review.decisions){
    if(!validIds.has(decision.candidateId))throw new Error(`unknown candidate ${decision.candidateId}`);
    if(seen.has(decision.candidateId))throw new Error(`duplicate review decision ${decision.candidateId}`);
    seen.add(decision.candidateId);
    if(!['accept','reject'].includes(decision.decision))throw new Error(`invalid decision for ${decision.candidateId}`);
    if(decision.locationConfidence!=null&&!LOCATION_CONFIDENCE.has(decision.locationConfidence))throw new Error(`invalid locationConfidence for ${decision.candidateId}`);
  }
  return true;
}

function upsertById(items,item){
  const index=items.findIndex(current=>current.id===item.id);
  if(index===-1){items.push(item);return 'created';}
  items[index]=item;
  return 'updated';
}

function sanitizeNode(node,candidate,decision){
  const copy=clone(node);
  delete copy.associationEvidence;
  copy.locationConfidence=decision.locationConfidence||copy.locationConfidence||'approximate_area';
  copy.sources=dedupeSources([...(copy.sources||[]),publicAssociationSource(candidate)]);
  return copy;
}

function sanitizeService(service,candidate,existing){
  const copy=clone(service);
  copy.sources=dedupeSources([...(existing?.sources||[]),...(copy.sources||[]),publicAssociationSource(candidate)]);
  return copy;
}

function sanitizeSchedule(schedule,candidate){
  const copy=clone(schedule);
  delete copy.associationEvidence;
  copy.sources=dedupeSources([...(copy.sources||[]),publicAssociationSource(candidate)]);
  return copy;
}

function candidateDecisionMap(review){return new Map(review.decisions.map(decision=>[decision.candidateId,decision]));}

export function promoteAssociationCandidates(candidateBundle,review,dataset){
  validateReview(review,candidateBundle);
  const working={
    nodes:clone(dataset.nodes||[]),
    services:clone(dataset.services||[]),
    transfers:clone(dataset.transfers||[]),
    schedules:clone(dataset.schedules||[])
  };
  validateDataset(working);
  const decisions=candidateDecisionMap(review);
  const report={
    submissionId:candidateBundle.submissionId,
    accepted:[],
    rejected:[],
    unreviewed:[],
    changes:{nodesCreated:[],nodesUpdated:[],servicesCreated:[],servicesUpdated:[],schedulesCreated:[],schedulesUpdated:[]}
  };

  for(const candidate of candidateBundle.candidates){
    const decision=decisions.get(candidate.candidateId);
    if(!decision){report.unreviewed.push(candidate.candidateId);continue;}
    if(decision.decision==='reject'){
      report.rejected.push({candidateId:candidate.candidateId,reason:decision.reason||null});
      continue;
    }
    if(candidate.reviewStatus==='needs_endpoint_mapping')throw new Error(`cannot promote unresolved candidate ${candidate.candidateId}`);
    const changeSet=candidate.changeSet;
    if(!changeSet||changeSet.serviceAction==='none'||!changeSet.proposedService)throw new Error(`candidate ${candidate.candidateId} has no promotable change set`);

    for(const proposedNode of changeSet.nodesToCreate||[]){
      const node=sanitizeNode(proposedNode,candidate,decision);
      const action=upsertById(working.nodes,node);
      report.changes[action==='created'?'nodesCreated':'nodesUpdated'].push(node.id);
    }

    const existingService=working.services.find(service=>service.id===changeSet.proposedService.id)||null;
    const service=sanitizeService(changeSet.proposedService,candidate,existingService);
    const serviceAction=upsertById(working.services,service);
    report.changes[serviceAction==='created'?'servicesCreated':'servicesUpdated'].push(service.id);

    if(changeSet.proposedSchedule){
      const schedule=sanitizeSchedule(changeSet.proposedSchedule,candidate);
      const scheduleAction=upsertById(working.schedules,schedule);
      report.changes[scheduleAction==='created'?'schedulesCreated':'schedulesUpdated'].push(schedule.id);
    }
    report.accepted.push(candidate.candidateId);
  }

  validateDataset(working);
  return {dataset:working,report};
}

export function buildPromotionAudit(candidateBundle,review,report){
  return {
    submissionId:candidateBundle.submissionId,
    association:candidateBundle.association||null,
    reviewedAt:review.reviewedAt||null,
    reviewer:review.reviewer||null,
    decisions:clone(review.decisions),
    report:clone(report)
  };
}
