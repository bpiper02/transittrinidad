function key(value){
  return String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}

function slug(value){
  return key(value).replace(/\s+/g,'-');
}

function validLocation(value){
  return value&&Number.isFinite(value.lat)&&value.lat>=9.5&&value.lat<=11.8&&Number.isFinite(value.lng)&&value.lng>=-62.2&&value.lng<=-60.1;
}

function normalizeDays(days=[]){
  const aliases={monday:'mon',tuesday:'tue',wednesday:'wed',thursday:'thu',friday:'fri',saturday:'sat',sunday:'sun',mon:'mon',tue:'tue',wed:'wed',thu:'thu',fri:'fri',sat:'sat',sun:'sun'};
  const normalized=days.map(day=>aliases[key(day)]).filter(Boolean);
  return [...new Set(normalized)];
}

function normalizeClock(value){
  if(value==null||value==='')return null;
  const match=String(value).trim().match(/^(\d{1,2}):(\d{2})$/);
  if(!match)return null;
  const hour=Number(match[1]),minute=Number(match[2]);
  if(hour>23||minute>59)return null;
  return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
}

function distanceKm(a,b){
  const R=6371,rad=x=>x*Math.PI/180;
  const dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng);
  const q=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
}

function nodeLookup(nodes){
  const byId=new Map(nodes.map(node=>[node.id,node]));
  const byName=new Map();
  for(const node of nodes){
    const names=[node.name,...(node.aliases||[])];
    for(const name of names){
      const normalized=key(name);
      if(!normalized)continue;
      if(!byName.has(normalized))byName.set(normalized,[]);
      byName.get(normalized).push(node);
    }
  }
  return {byId,byName};
}

function resolvePoint(point,lookup){
  if(!point||typeof point!=='object')return {status:'missing',node:null};
  if(point.nodeId&&lookup.byId.has(point.nodeId))return {status:'matched_id',node:lookup.byId.get(point.nodeId)};
  const named=lookup.byName.get(key(point.name))||[];
  if(named.length===1)return {status:'matched_name',node:named[0]};
  if(named.length>1&&validLocation(point.location)){
    const ranked=named.filter(node=>validLocation(node.location)).map(node=>({node,km:distanceKm(point.location,node.location)})).sort((a,b)=>a.km-b.km);
    if(ranked[0]?.km<=0.4)return {status:'matched_name_location',node:ranked[0].node};
  }
  if(validLocation(point.location)){
    const nearby=[...lookup.byId.values()].filter(node=>validLocation(node.location)).map(node=>({node,km:distanceKm(point.location,node.location)})).sort((a,b)=>a.km-b.km);
    if(nearby[0]?.km<=0.12)return {status:'matched_location',node:nearby[0].node};
    return {status:'propose_node',node:null};
  }
  return {status:named.length>1?'ambiguous_name':'unmapped',node:null};
}

function proposedNode(point,submission,role,index){
  if(!validLocation(point?.location))return null;
  const name=String(point.name||`${role} ${index+1}`).trim();
  const id=`assoc-${slug(submission.id)}-${slug(name)||role}-${index+1}`;
  return {
    id,
    name,
    kind:point.kind||'stand',
    location:point.location,
    locationConfidence:'approximate_area',
    boardingNote:point.boardingNote||null,
    associationEvidence:{submissionId:submission.id,association:submission.association,role}
  };
}

function sourceSummary(submission){
  return {
    submissionId:submission.id,
    association:submission.association,
    contactName:submission.contact?.name||null,
    contactRole:submission.contact?.role||null,
    contactChannel:submission.contact?.channel||null,
    receivedAt:submission.receivedAt,
    evidenceUrl:submission.evidenceUrl||null
  };
}

function operationProposal(operation={}){
  const days=normalizeDays(operation.days);
  const firstService=normalizeClock(operation.firstService);
  const lastService=normalizeClock(operation.lastService);
  const headwayMin=Number.isFinite(operation.headwayMinutes?.min)?operation.headwayMinutes.min:null;
  const headwayMax=Number.isFinite(operation.headwayMinutes?.max)?operation.headwayMinutes.max:null;
  const departureTimes=(operation.departureTimes||[]).map(normalizeClock).filter(Boolean).sort();
  const exactTimes=[...new Set(departureTimes)];
  const hasWindow=Boolean(firstService||lastService||headwayMin||headwayMax||operation.note);
  return {
    days,
    firstService,
    lastService,
    headwayMinutes:headwayMin||headwayMax?{min:headwayMin,max:headwayMax}:null,
    departureTimes:exactTimes,
    note:operation.note||null,
    canonicalSchedule:days.length&&exactTimes.length?{
      timezone:'America/Port_of_Spain',
      serviceDays:days,
      departureTimes:exactTimes,
      status:'published_times',
      confidence:'community_verified'
    }:null,
    canonicalAvailability:hasWindow?{
      kind:'frequency_based',
      note:[
        days.length?`Runs ${days.join(', ')}.`:null,
        firstService||lastService?`Typical service window ${firstService||'?'}–${lastService||'?'}.`:null,
        headwayMin||headwayMax?`Reported headway ${headwayMin||'?'}–${headwayMax||'?'} minutes.`:null,
        operation.note||null
      ].filter(Boolean).join(' ')
    }:null
  };
}

function serviceLookup(services){
  const byPair=new Map();
  for(const service of services){
    const pair=`${service.mode}:${service.originNodeId}->${service.destinationNodeId}`;
    if(!byPair.has(pair))byPair.set(pair,[]);
    byPair.get(pair).push(service);
  }
  return byPair;
}

export function validateAssociationSubmission(submission){
  if(!submission||typeof submission!=='object')throw new Error('submission is required');
  if(!submission.id||!String(submission.id).trim())throw new Error('submission.id is required');
  if(!submission.association||!String(submission.association).trim())throw new Error('submission.association is required');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(submission.receivedAt||''))throw new Error('submission.receivedAt must be YYYY-MM-DD');
  if(!Array.isArray(submission.routes)||!submission.routes.length)throw new Error('submission.routes must contain at least one route');
  for(const [index,route] of submission.routes.entries()){
    if(!['maxi','route_taxi','ptsc','water_taxi','ferry'].includes(route.mode))throw new Error(`route ${index+1} has invalid mode`);
    if(!route.origin?.name||!route.destination?.name)throw new Error(`route ${index+1} needs named origin and destination`);
    if(route.origin.name===route.destination.name)throw new Error(`route ${index+1} origin and destination must differ`);
    if(route.fareTTD!=null&&(!Number.isFinite(route.fareTTD)||route.fareTTD<0))throw new Error(`route ${index+1} fareTTD is invalid`);
    if(route.geometry!=null&&(!Array.isArray(route.geometry)||route.geometry.length<2||route.geometry.some(point=>!validLocation(point))))throw new Error(`route ${index+1} geometry is invalid`);
  }
  return true;
}

export function buildAssociationCandidates(submission,{nodes=[],services=[]}={}){
  validateAssociationSubmission(submission);
  const lookup=nodeLookup(nodes);
  const servicesByPair=serviceLookup(services);
  const source=sourceSummary(submission);

  return submission.routes.map((route,index)=>{
    const points=[route.origin,...(route.stops||[]),route.destination];
    const resolutions=points.map(point=>resolvePoint(point,lookup));
    const proposedNodes=[];
    const stopNodeIds=[];
    let unresolved=false;

    points.forEach((point,pointIndex)=>{
      const resolution=resolutions[pointIndex];
      if(resolution.node){
        stopNodeIds.push(resolution.node.id);
        return;
      }
      if(resolution.status==='propose_node'){
        const proposed=proposedNode(point,submission,pointIndex===0?'origin':pointIndex===points.length-1?'destination':'stop',pointIndex);
        proposedNodes.push(proposed);
        stopNodeIds.push(proposed.id);
        return;
      }
      unresolved=true;
      stopNodeIds.push(null);
    });

    const originNodeId=stopNodeIds[0];
    const destinationNodeId=stopNodeIds.at(-1);
    const existing=!unresolved&&originNodeId&&destinationNodeId
      ?(servicesByPair.get(`${route.mode}:${originNodeId}->${destinationNodeId}`)||[])[0]||null
      :null;
    const operation=operationProposal(route.operation);
    const routeName=route.name||`${route.origin.name} → ${route.destination.name}`;
    const baseId=`${route.mode}-${slug(route.origin.name)}-to-${slug(route.destination.name)}`;
    const proposedService=!unresolved?{
      id:existing?.id||baseId,
      corridorId:existing?.corridorId||route.corridorId||`${route.mode}-${slug(route.origin.name)}-${slug(route.destination.name)}`,
      mode:route.mode,
      operator:route.operator||submission.association,
      originNodeId,
      destinationNodeId,
      stopNodeIds,
      serviceConfidence:'community_verified',
      geometryConfidence:route.geometry?.length?'verified_path':existing?.geometryConfidence||'endpoints_only',
      geometry:route.geometry?.length?route.geometry:existing?.geometry||null,
      fareTTD:route.fareTTD??existing?.fareTTD??null,
      fareConfidence:route.fareTTD!=null?'community_verified':existing?.fareConfidence||'unknown',
      scheduleConfidence:operation.canonicalSchedule||operation.canonicalAvailability?'community_verified':existing?.scheduleConfidence||'unknown',
      availability:operation.canonicalAvailability||existing?.availability||null,
      maxiRouteArea:route.maxiRouteArea??existing?.maxiRouteArea,
      bandColor:route.bandColor??existing?.bandColor,
      boardingNote:route.boardingNote||existing?.boardingNote||null
    }:null;

    const changeSet={
      nodesToCreate:proposedNodes,
      serviceAction:unresolved?'none':existing?'update_existing':'create_new',
      existingServiceId:existing?.id||null,
      proposedService,
      proposedSchedule:operation.canonicalSchedule&&!unresolved?{
        id:`assoc-${slug(submission.id)}-${slug(routeName)}-${index+1}`,
        serviceId:proposedService.id,
        ...operation.canonicalSchedule,
        associationEvidence:source
      }:null
    };

    let reviewStatus='ready_for_review';
    if(unresolved)reviewStatus='needs_endpoint_mapping';
    else if(proposedNodes.length)reviewStatus='new_nodes_and_service_review';
    else if(existing)reviewStatus='existing_service_upgrade_review';
    else reviewStatus='new_service_review';

    return {
      candidateId:`${submission.id}:${index+1}`,
      routeName,
      source,
      reviewStatus,
      recommendedAction:unresolved?'map_endpoints_before_promotion':'review_change_set',
      endpointResolution:points.map((point,i)=>({name:point.name,status:resolutions[i].status,nodeId:resolutions[i].node?.id||stopNodeIds[i]||null})),
      roads:route.roads||[],
      operation,
      changeSet
    };
  });
}
