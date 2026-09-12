const ISSUE_META={
  held_service:{severity:'critical',weight:35,label:'Held from routing'},
  place_disconnected:{severity:'critical',weight:35,label:'Place has no nearby routable node'},
  node_missing_location:{severity:'critical',weight:30,label:'Node has no coordinates'},
  approximate_boarding:{severity:'high',weight:18,label:'Approximate boarding location'},
  reported_service:{severity:'high',weight:16,label:'Reported service needs stronger confirmation'},
  fare_missing:{severity:'medium',weight:10,label:'Fare missing'},
  fare_weak:{severity:'medium',weight:7,label:'Fare confidence weak'},
  geometry_endpoints_only:{severity:'medium',weight:9,label:'Geometry is endpoints only'},
  geometry_unknown:{severity:'high',weight:15,label:'Geometry unknown'},
  operation_unknown:{severity:'medium',weight:8,label:'No timetable or frequency window'},
  reverse_unconfirmed:{severity:'low',weight:4,label:'Reverse direction not represented'},
  orphan_node:{severity:'low',weight:3,label:'Node is not used by the routable graph'}
};

function countBy(items,keyFn){
  const out={};
  for(const item of items){const key=keyFn(item)??'unknown';out[key]=(out[key]||0)+1;}
  return out;
}

function kmBetween(a,b){
  const R=6371,rad=value=>value*Math.PI/180;
  const dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng);
  const q=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
}

function validLocation(value){return value&&Number.isFinite(value.lat)&&Number.isFinite(value.lng);}
function addIssue(list,type,entityType,entityId,detail={}){
  const meta=ISSUE_META[type];
  list.push({type,entityType,entityId,severity:meta.severity,weight:meta.weight,label:meta.label,...detail});
}
function pairKey(mode,a,b){return`${mode}:${a}->${b}`;}

export function buildNetworkQA({nodes=[],services=[],transfers=[],schedules=[],places=[]}={}){
  const issues=[];
  const nodesById=new Map(nodes.map(node=>[node.id,node]));
  const scheduleServices=new Set(schedules.map(schedule=>schedule.serviceId));
  const usedNodes=new Set();
  const servicePairs=new Set();
  const routableServices=services.filter(service=>service.serviceConfidence!=='needs_review');
  for(const service of routableServices){
    for(const nodeId of service.stopNodeIds||[])usedNodes.add(nodeId);
    usedNodes.add(service.originNodeId);usedNodes.add(service.destinationNodeId);
    servicePairs.add(pairKey(service.mode,service.originNodeId,service.destinationNodeId));
  }
  for(const transfer of transfers){usedNodes.add(transfer.fromNodeId);usedNodes.add(transfer.toNodeId);}

  const serviceRows=services.map(service=>{
    const rowIssues=[];
    const emit=(type,detail={})=>{addIssue(issues,type,'service',service.id,detail);rowIssues.push(type);};
    if(service.serviceConfidence==='needs_review')emit('held_service');
    else if(service.serviceConfidence==='reported_service')emit('reported_service');
    if(service.fareTTD==null)emit('fare_missing');
    else if(['reported','unknown','official_historical'].includes(service.fareConfidence))emit('fare_weak');
    if(service.geometryConfidence==='unknown')emit('geometry_unknown');
    else if(service.geometryConfidence==='endpoints_only')emit('geometry_endpoints_only');
    if(!scheduleServices.has(service.id)&&service.availability?.kind!=='frequency_based')emit('operation_unknown');
    const origin=nodesById.get(service.originNodeId),destination=nodesById.get(service.destinationNodeId);
    if(origin?.locationConfidence==='approximate_area'||destination?.locationConfidence==='approximate_area')emit('approximate_boarding');
    const reverse=servicePairs.has(pairKey(service.mode,service.destinationNodeId,service.originNodeId));
    if(service.serviceConfidence!=='needs_review'&&!reverse)emit('reverse_unconfirmed');
    const penalty=rowIssues.reduce((sum,type)=>sum+ISSUE_META[type].weight,0);
    return {
      id:service.id,corridorId:service.corridorId,mode:service.mode,operator:service.operator||null,
      originNodeId:service.originNodeId,destinationNodeId:service.destinationNodeId,
      serviceConfidence:service.serviceConfidence,fareTTD:service.fareTTD??null,fareConfidence:service.fareConfidence,
      geometryConfidence:service.geometryConfidence,hasSchedule:scheduleServices.has(service.id),hasFrequency:service.availability?.kind==='frequency_based',
      reverseRepresented:reverse,issues:rowIssues,score:Math.max(0,100-penalty)
    };
  });

  const nodeRows=nodes.map(node=>{
    const rowIssues=[];
    if(!validLocation(node.location)){addIssue(issues,'node_missing_location','node',node.id);rowIssues.push('node_missing_location');}
    if(node.locationConfidence==='approximate_area'){addIssue(issues,'approximate_boarding','node',node.id);rowIssues.push('approximate_boarding');}
    if(!usedNodes.has(node.id)){addIssue(issues,'orphan_node','node',node.id);rowIssues.push('orphan_node');}
    return {id:node.id,name:node.name,kind:node.kind,locationConfidence:node.locationConfidence||null,used:usedNodes.has(node.id),issues:rowIssues};
  });

  const routableNodeList=nodes.filter(node=>usedNodes.has(node.id)&&validLocation(node.location));
  const placeRows=places.map(place=>{
    const radius=Number.isFinite(place.routingRadiusKm)?place.routingRadiusKm:4;
    const nearby=routableNodeList.map(node=>({node,km:kmBetween(place.location,node.location)})).filter(item=>item.km<=radius).sort((a,b)=>a.km-b.km);
    const modes=new Set();
    for(const service of routableServices){
      if(nearby.some(item=>(service.stopNodeIds||[]).includes(item.node.id)))modes.add(service.mode);
    }
    const rowIssues=[];
    if(!nearby.length){addIssue(issues,'place_disconnected','place',place.id,{name:place.name,radiusKm:radius});rowIssues.push('place_disconnected');}
    return {id:place.id,name:place.name,routingRadiusKm:radius,nearbyNodeCount:nearby.length,nearestNodeKm:nearby[0]?.km??null,modes:[...modes].sort(),issues:rowIssues};
  });

  const corridorMap=new Map();
  for(const row of serviceRows){
    if(!corridorMap.has(row.corridorId))corridorMap.set(row.corridorId,[]);
    corridorMap.get(row.corridorId).push(row);
  }
  const corridorRows=[...corridorMap.entries()].map(([corridorId,patterns])=>{
    const issueTypes=[...new Set(patterns.flatMap(pattern=>pattern.issues))];
    return {
      corridorId,modes:[...new Set(patterns.map(pattern=>pattern.mode))],directionCount:patterns.length,
      reverseComplete:patterns.some(a=>patterns.some(b=>a.originNodeId===b.destinationNodeId&&a.destinationNodeId===b.originNodeId&&a.mode===b.mode)),
      score:Math.round(patterns.reduce((sum,row)=>sum+row.score,0)/patterns.length),issues:issueTypes,
      serviceIds:patterns.map(pattern=>pattern.id)
    };
  }).sort((a,b)=>a.score-b.score||a.corridorId.localeCompare(b.corridorId));

  const severityOrder={critical:0,high:1,medium:2,low:3};
  issues.sort((a,b)=>severityOrder[a.severity]-severityOrder[b.severity]||b.weight-a.weight||a.entityId.localeCompare(b.entityId));
  const eligibleServices=routableServices.length;
  const fareKnown=routableServices.filter(service=>service.fareTTD!=null).length;
  const geometryKnown=routableServices.filter(service=>['verified_path','partial_path'].includes(service.geometryConfidence)).length;
  const operationKnown=routableServices.filter(service=>scheduleServices.has(service.id)||service.availability?.kind==='frequency_based').length;

  return {
    generatedFrom:'canonical-network',
    summary:{
      nodes:nodes.length,places:places.length,services:services.length,routableServices:eligibleServices,corridors:corridorRows.length,transfers:transfers.length,schedules:schedules.length,
      fareCoveragePct:eligibleServices?Math.round(fareKnown/eligibleServices*100):0,
      geometryCoveragePct:eligibleServices?Math.round(geometryKnown/eligibleServices*100):0,
      operationCoveragePct:eligibleServices?Math.round(operationKnown/eligibleServices*100):0,
      disconnectedPlaces:placeRows.filter(place=>place.issues.includes('place_disconnected')).length,
      issueCount:issues.length,
      issuesBySeverity:countBy(issues,issue=>issue.severity),
      servicesByMode:countBy(services,service=>service.mode),
      servicesByConfidence:countBy(services,service=>service.serviceConfidence),
      nodesByLocationConfidence:countBy(nodes,node=>node.locationConfidence||'unknown')
    },
    issueCatalog:ISSUE_META,
    issues,services:serviceRows,nodes:nodeRows,places:placeRows,corridors:corridorRows
  };
}

export function formatNetworkQASummary(report){
  const s=report.summary;
  return [
    `Network QA: ${s.routableServices}/${s.services} routable services across ${s.corridors} corridors`,
    `Coverage: fares ${s.fareCoveragePct}% · geometry ${s.geometryCoveragePct}% · operation ${s.operationCoveragePct}%`,
    `Places: ${s.places} tracked · ${s.disconnectedPlaces} disconnected`,
    `Issues: ${s.issueCount} total · ${s.issuesBySeverity.critical||0} critical · ${s.issuesBySeverity.high||0} high · ${s.issuesBySeverity.medium||0} medium · ${s.issuesBySeverity.low||0} low`
  ].join('\n');
}
