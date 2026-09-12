export function kmBetween(a,b){
  const R=6371;
  const rad=x=>x*Math.PI/180;
  const dLat=rad(b.lat-a.lat);
  const dLng=rad(b.lng-a.lng);
  const q=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
}

export function nearestNodes(place,nodes,{limit=6,maxKm=Infinity,allowedNodeIds=null}={}){
  return [...nodes.values()]
    .filter(node=>!allowedNodeIds||allowedNodeIds.has(node.id))
    .filter(node=>node?.location&&Number.isFinite(node.location.lat)&&Number.isFinite(node.location.lng))
    .map(node=>({node,km:kmBetween(place,node.location)}))
    .filter(candidate=>candidate.km<=maxKm)
    .sort((a,b)=>a.km-b.km)
    .slice(0,limit);
}

const MODE_SPEED_KPH={ptsc:27,maxi:25,route_taxi:30,water_taxi:34,ferry:38};
const ROUTE_DISTANCE_FACTOR={ptsc:1.28,maxi:1.28,route_taxi:1.22,water_taxi:1.04,ferry:1.04};

export function estimateServiceMinutes(service,nodes){
  if(Number.isFinite(service.estimatedMinutes)&&service.estimatedMinutes>0)return service.estimatedMinutes;
  const origin=nodes.get(service.originNodeId),destination=nodes.get(service.destinationNodeId);
  if(!origin?.location||!destination?.location)return 60;
  const directKm=kmBetween(origin.location,destination.location);
  const routedKm=directKm*(ROUTE_DISTANCE_FACTOR[service.mode]||1.25);
  const speed=MODE_SPEED_KPH[service.mode]||27;
  return Math.max(3,(routedKm/speed)*60);
}

export function estimateAccess(km,{walkThresholdKm=1.5,walkKph=4.8,localKph=22,localWaitMinutes=5}={}){
  if(!Number.isFinite(km)||km<=0)return{mode:'none',minutes:0,km:0};
  if(km<=walkThresholdKm)return{mode:'walk',minutes:(km/walkKph)*60,km};
  return{mode:'local',minutes:localWaitMinutes+(km/localKph)*60,km};
}

function patternStops(service){
  return Array.isArray(service.stopNodeIds)&&service.stopNodeIds.length>=2
    ? service.stopNodeIds
    : [service.originNodeId,service.destinationNodeId];
}

export function estimateSegmentMinutes(service,fromNodeId,toNodeId,nodes){
  const stops=patternStops(service);
  const total=estimateServiceMinutes(service,nodes);
  if(stops.length===2)return total;
  const pieces=[];
  let totalKm=0;
  for(let i=0;i<stops.length-1;i++){
    const a=nodes.get(stops[i])?.location,b=nodes.get(stops[i+1])?.location;
    const km=a&&b?kmBetween(a,b):0;
    pieces.push({from:stops[i],to:stops[i+1],km});
    totalKm+=km;
  }
  const piece=pieces.find(item=>item.from===fromNodeId&&item.to===toNodeId);
  if(!piece)return total/Math.max(1,stops.length-1);
  if(totalKm<=0)return total/Math.max(1,stops.length-1);
  return Math.max(1,total*(piece.km/totalKm));
}

function buildGraph(services,nodes,transfers=[]){
  const graph=new Map();
  const add=(from,edge)=>{if(!graph.has(from))graph.set(from,[]);graph.get(from).push(edge);};
  for(const service of services){
    if(service.serviceConfidence==='needs_review')continue;
    const stops=patternStops(service);
    for(let i=0;i<stops.length-1;i++){
      const from=stops[i],to=stops[i+1];
      add(from,{kind:'transit',next:to,service,minutes:estimateSegmentMinutes(service,from,to,nodes)});
    }
  }
  for(const transfer of transfers){
    add(transfer.fromNodeId,{kind:'transfer',next:transfer.toNodeId,transfer,minutes:transfer.estimatedMinutes});
  }
  return graph;
}

export function routableNodeIds(services,transfers=[]){
  const ids=new Set();
  for(const service of services){
    if(service.serviceConfidence==='needs_review')continue;
    for(const id of patternStops(service))ids.add(id);
  }
  for(const transfer of transfers){
    ids.add(transfer.fromNodeId);
    ids.add(transfer.toNodeId);
  }
  return ids;
}

function stateKey(node,lastServiceId,usedRequiredMode=false){return`${node}::${lastServiceId||''}::${usedRequiredMode?'1':'0'}`;}

export function findJourney(startId,endId,services,nodes=new Map(),{transferPenaltyMinutes=10,transfers=[],requiredMode=null}={}){
  if(startId===endId)return[];
  const graph=buildGraph(services,nodes,transfers);
  const start={node:startId,lastServiceId:null,usedRequiredMode:false,cost:0,steps:[]};
  const best=new Map([[stateKey(startId,null,false),0]]);
  const queue=[start];

  while(queue.length){
    queue.sort((a,b)=>a.cost-b.cost);
    const current=queue.shift();
    if(current.cost!==best.get(stateKey(current.node,current.lastServiceId,current.usedRequiredMode)))continue;
    if(current.node===endId&&(!requiredMode||current.usedRequiredMode))return current.steps;

    for(const edge of graph.get(current.node)||[]){
      let nextLastServiceId=current.lastServiceId;
      let usedRequiredMode=current.usedRequiredMode;
      let edgeCost=edge.minutes;
      if(edge.kind==='transit'){
        if(current.lastServiceId&&current.lastServiceId!==edge.service.id)edgeCost+=transferPenaltyMinutes;
        nextLastServiceId=edge.service.id;
        if(edge.service.mode===requiredMode)usedRequiredMode=true;
      }
      const nextKey=stateKey(edge.next,nextLastServiceId,usedRequiredMode);
      const nextCost=current.cost+edgeCost;
      if(nextCost>=(best.get(nextKey)??Infinity))continue;
      const step=edge.kind==='transit'
        ? {kind:'transit',from:current.node,to:edge.next,service:edge.service,minutes:edge.minutes}
        : {kind:'transfer',from:current.node,to:edge.next,transfer:edge.transfer,minutes:edge.minutes};
      best.set(nextKey,nextCost);
      queue.push({node:edge.next,lastServiceId:nextLastServiceId,usedRequiredMode,cost:nextCost,steps:[...current.steps,step]});
    }
  }
  return null;
}

export function journeyMinutes(steps,nodes,{transferPenaltyMinutes=10}={}){
  if(!steps?.length)return 0;
  let total=0;
  let lastServiceId=null;
  for(const step of steps){
    if(step.kind==='transfer'){
      total+=Number.isFinite(step.minutes)?step.minutes:step.transfer?.estimatedMinutes||0;
      continue;
    }
    if(lastServiceId&&lastServiceId!==step.service.id)total+=transferPenaltyMinutes;
    total+=Number.isFinite(step.minutes)?step.minutes:estimateSegmentMinutes(step.service,step.from,step.to,nodes);
    lastServiceId=step.service.id;
  }
  return total;
}

export function countTransfers(steps){
  let boardings=0;
  let lastServiceId=null;
  for(const step of steps||[]){
    if(step.kind!=='transit')continue;
    if(step.service.id!==lastServiceId){boardings+=1;lastServiceId=step.service.id;}
  }
  return Math.max(0,boardings-1);
}

function compactTransitIds(steps){
  const ids=[];
  let last=null;
  for(const step of steps||[]){
    if(step.kind!=='transit')continue;
    if(step.service.id===last)continue;
    ids.push(step.service.id);
    last=step.service.id;
  }
  return ids;
}

function modeSequence(steps){
  const modes=[];
  let lastServiceId=null;
  for(const step of steps||[]){
    if(step.kind!=='transit'||step.service.id===lastServiceId)continue;
    modes.push(step.service.mode);
    lastServiceId=step.service.id;
  }
  return modes;
}

function journeySignature(candidate){
  return compactTransitIds(candidate.steps).join('>');
}

function hasJourneyLoop(startId,steps){
  const visited=new Set([startId]);
  for(const step of steps||[]){
    if(visited.has(step.to))return true;
    visited.add(step.to);
  }
  return false;
}

function pathDistanceKm(start,end,steps,nodes){
  let total=(start.km||0)+(end.km||0);
  for(const step of steps||[]){
    const a=nodes.get(step.from)?.location,b=nodes.get(step.to)?.location;
    if(a&&b)total+=kmBetween(a,b);
  }
  return total;
}

function backtrackKm(steps,nodes,toPlace){
  if(!toPlace)return 0;
  let total=0;
  for(const step of steps||[]){
    if(step.kind!=='transit')continue;
    const from=nodes.get(step.from)?.location,to=nodes.get(step.to)?.location;
    if(!from||!to)continue;
    const before=kmBetween(from,toPlace),after=kmBetween(to,toPlace);
    if(after>before+0.75)total+=after-before;
  }
  return total;
}

function confidencePenalty(steps,{reportedServicePenaltyMinutes=8}={}){
  const seen=new Set();
  let penalty=0;
  for(const step of steps||[]){
    if(step.kind!=='transit'||seen.has(step.service.id))continue;
    seen.add(step.service.id);
    if(step.service.serviceConfidence==='reported_service')penalty+=reportedServicePenaltyMinutes;
  }
  return penalty;
}

function schedulePenalty(steps,scheduledServiceIds,{unknownSchedulePenaltyMinutes=0}={}){
  if(!scheduledServiceIds||!unknownSchedulePenaltyMinutes)return 0;
  const seen=new Set();
  let penalty=0;
  for(const step of steps||[]){
    if(step.kind!=='transit'||seen.has(step.service.id))continue;
    seen.add(step.service.id);
    if(!scheduledServiceIds.has(step.service.id))penalty+=unknownSchedulePenaltyMinutes;
  }
  return penalty;
}

function candidateFor(start,end,steps,nodes,{transferPenaltyMinutes,accessOptions,toPlace,directKm,rankingOptions,scheduledServiceIds}){
  const transitSteps=steps.filter(step=>step.kind==='transit');
  const transferCount=countTransfers(steps);
  const networkMinutes=journeyMinutes(steps,nodes,{transferPenaltyMinutes});
  const fromAccess=estimateAccess(start.km,accessOptions);
  const toAccess=estimateAccess(end.km,accessOptions);
  const {
    unconfirmedAccessPenaltyMinutes=35,
    detourPenaltyMinutes=18,
    backtrackPenaltyMinutesPerKm=3,
    reportedServicePenaltyMinutes=8,
    unknownSchedulePenaltyMinutes=0
  }=rankingOptions;
  const accessPenalty=(fromAccess.mode==='local'?unconfirmedAccessPenaltyMinutes:0)+(toAccess.mode==='local'?unconfirmedAccessPenaltyMinutes:0);
  const travelledKm=pathDistanceKm(start,end,steps,nodes);
  const detourRatio=directKm>0.5?travelledKm/directKm:1;
  const detourPenalty=Math.max(0,detourRatio-1.45)*detourPenaltyMinutes;
  const awayKm=backtrackKm(steps,nodes,toPlace);
  const directionPenalty=awayKm*backtrackPenaltyMinutesPerKm;
  const servicePenalty=confidencePenalty(steps,{reportedServicePenaltyMinutes});
  const timetablePenalty=schedulePenalty(steps,scheduledServiceIds,{unknownSchedulePenaltyMinutes});
  const score=networkMinutes+fromAccess.minutes+toAccess.minutes+accessPenalty+detourPenalty+directionPenalty+servicePenalty+timetablePenalty;
  const modes=modeSequence(steps);
  return{
    fromNear:start,
    toNear:end,
    fromAccess,
    toAccess,
    steps,
    legs:transitSteps,
    modes,
    modeSignature:modes.join('>'),
    score,
    transferCount,
    networkMinutes:Math.round(networkMinutes),
    estimatedMinutes:Math.round(networkMinutes+fromAccess.minutes+toAccess.minutes),
    ranking:{accessPenalty,detourRatio,detourPenalty,backtrackKm:awayKm,directionPenalty,servicePenalty,timetablePenalty}
  };
}

export function chooseJourneyOptions({
  fromPlace,
  toPlace,
  nodes,
  services,
  transfers=[],
  knownFrom=null,
  knownTo=null,
  candidateLimit=8,
  maxAccessKm=20,
  requiredMode=null,
  transferPenaltyMinutes=10,
  accessOptions={},
  maxOptions=3,
  maxAlternativeRatio=2.5,
  maxAlternativeExtraMinutes=120,
  maxDetourRatio=4,
  scheduledServiceIds=null,
  rankingOptions={}
}){
  const eligibleNodeIds=routableNodeIds(services,transfers);
  const starts=knownFrom?[{node:knownFrom,km:0}]:nearestNodes(fromPlace,nodes,{limit:candidateLimit,maxKm:maxAccessKm,allowedNodeIds:eligibleNodeIds});
  const ends=knownTo?[{node:knownTo,km:0}]:nearestNodes(toPlace,nodes,{limit:candidateLimit,maxKm:maxAccessKm,allowedNodeIds:eligibleNodeIds});
  const unique=new Map();
  const availableModes=[...new Set(services.filter(service=>service.serviceConfidence!=='needs_review').map(service=>service.mode))];
  const directKm=fromPlace&&toPlace?kmBetween(fromPlace,toPlace):0;

  for(const start of starts){
    for(const end of ends){
      const modeVariants=requiredMode?[requiredMode]:[null,...availableModes];
      for(const routeMode of modeVariants){
        const steps=findJourney(start.node.id,end.node.id,services,nodes,{transferPenaltyMinutes,transfers,requiredMode:routeMode});
        if(steps===null||hasJourneyLoop(start.node.id,steps))continue;
        if(steps.length===0&&!(knownFrom&&knownTo&&knownFrom.id===knownTo.id))continue;
        const candidate=candidateFor(start,end,steps,nodes,{transferPenaltyMinutes,accessOptions,toPlace,directKm,rankingOptions,scheduledServiceIds});
        if(candidate.ranking.detourRatio>maxDetourRatio)continue;
        const signature=journeySignature(candidate);
        if(!signature)continue;
        const existing=unique.get(signature);
        if(!existing||candidate.score<existing.score)unique.set(signature,candidate);
      }
    }
  }

  const sorted=[...unique.values()].sort((a,b)=>a.score-b.score);
  if(!sorted.length)return[];
  const best=sorted[0];
  const ceiling=Math.min(best.score*maxAlternativeRatio,best.score+maxAlternativeExtraMinutes);
  const eligible=sorted.filter((candidate,index)=>index===0||candidate.score<=ceiling);
  const chosen=[best];
  const chosenSignatures=new Set([journeySignature(best)]);
  const chosenModes=new Set([best.modeSignature]);

  const waterAlternative=eligible.find(candidate=>
    !chosenSignatures.has(journeySignature(candidate))&&
    candidate.modes.some(mode=>mode==='water_taxi'||mode==='ferry')&&
    !best.modes.some(mode=>mode==='water_taxi'||mode==='ferry')
  );
  if(waterAlternative&&chosen.length<maxOptions){
    chosen.push(waterAlternative);
    chosenSignatures.add(journeySignature(waterAlternative));
    chosenModes.add(waterAlternative.modeSignature);
  }

  for(const candidate of eligible){
    if(chosen.length>=maxOptions)break;
    const signature=journeySignature(candidate);
    if(chosenSignatures.has(signature)||chosenModes.has(candidate.modeSignature))continue;
    chosen.push(candidate);
    chosenSignatures.add(signature);
    chosenModes.add(candidate.modeSignature);
  }
  for(const candidate of eligible){
    if(chosen.length>=maxOptions)break;
    const signature=journeySignature(candidate);
    if(chosenSignatures.has(signature))continue;
    chosen.push(candidate);
    chosenSignatures.add(signature);
  }
  return chosen;
}

export function chooseConnectedJourney(options){
  return chooseJourneyOptions({...options,maxOptions:1})[0]||null;
}
