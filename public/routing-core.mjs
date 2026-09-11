export function kmBetween(a,b){
  const R=6371;
  const rad=x=>x*Math.PI/180;
  const dLat=rad(b.lat-a.lat);
  const dLng=rad(b.lng-a.lng);
  const q=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
}

export function nearestNodes(place,nodes,{limit=6,maxKm=Infinity}={}){
  return [...nodes.values()]
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

function stateKey(node,lastServiceId){return`${node}::${lastServiceId||''}`;}

export function findJourney(startId,endId,services,nodes=new Map(),{transferPenaltyMinutes=10,transfers=[]}={}){
  if(startId===endId)return[];
  const graph=buildGraph(services,nodes,transfers);
  const start={node:startId,lastServiceId:null,cost:0,steps:[]};
  const best=new Map([[stateKey(startId,null),0]]);
  const queue=[start];

  while(queue.length){
    queue.sort((a,b)=>a.cost-b.cost);
    const current=queue.shift();
    if(current.cost!==best.get(stateKey(current.node,current.lastServiceId)))continue;
    if(current.node===endId)return current.steps;

    for(const edge of graph.get(current.node)||[]){
      let nextLastServiceId=current.lastServiceId;
      let edgeCost=edge.minutes;
      if(edge.kind==='transit'){
        if(current.lastServiceId&&current.lastServiceId!==edge.service.id)edgeCost+=transferPenaltyMinutes;
        nextLastServiceId=edge.service.id;
      }
      const nextKey=stateKey(edge.next,nextLastServiceId);
      const nextCost=current.cost+edgeCost;
      if(nextCost>=(best.get(nextKey)??Infinity))continue;
      const step=edge.kind==='transit'
        ? {kind:'transit',from:current.node,to:edge.next,service:edge.service,minutes:edge.minutes}
        : {kind:'transfer',from:current.node,to:edge.next,transfer:edge.transfer,minutes:edge.minutes};
      best.set(nextKey,nextCost);
      queue.push({node:edge.next,lastServiceId:nextLastServiceId,cost:nextCost,steps:[...current.steps,step]});
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
  // Rider-facing alternatives are distinct rides, not different hidden access-node choices.
  // If two candidates board the same ordered transit services, keep only the better one.
  return compactTransitIds(candidate.steps).join('>');
}

function candidateFor(start,end,steps,nodes,{transferPenaltyMinutes,accessOptions}){
  const transitSteps=steps.filter(step=>step.kind==='transit');
  const transferCount=countTransfers(steps);
  const networkMinutes=journeyMinutes(steps,nodes,{transferPenaltyMinutes});
  const fromAccess=estimateAccess(start.km,accessOptions);
  const toAccess=estimateAccess(end.km,accessOptions);
  const score=networkMinutes+fromAccess.minutes+toAccess.minutes;
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
    estimatedMinutes:Math.round(score)
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
  transferPenaltyMinutes=10,
  accessOptions={},
  maxOptions=3,
  maxAlternativeRatio=2.5,
  maxAlternativeExtraMinutes=120
}){
  const starts=knownFrom?[{node:knownFrom,km:0}]:nearestNodes(fromPlace,nodes,{limit:candidateLimit,maxKm:maxAccessKm});
  const ends=knownTo?[{node:knownTo,km:0}]:nearestNodes(toPlace,nodes,{limit:candidateLimit,maxKm:maxAccessKm});
  const unique=new Map();

  for(const start of starts){
    for(const end of ends){
      const steps=findJourney(start.node.id,end.node.id,services,nodes,{transferPenaltyMinutes,transfers});
      if(steps===null)continue;
      if(steps.length===0&&!(knownFrom&&knownTo&&knownFrom.id===knownTo.id))continue;
      const candidate=candidateFor(start,end,steps,nodes,{transferPenaltyMinutes,accessOptions});
      const signature=journeySignature(candidate);
      if(!signature)continue;
      const existing=unique.get(signature);
      if(!existing||candidate.score<existing.score)unique.set(signature,candidate);
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
