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

function serviceDirections(service){
  return service.bidirectional===false
    ? [[service.originNodeId,service.destinationNodeId]]
    : [[service.originNodeId,service.destinationNodeId],[service.destinationNodeId,service.originNodeId]];
}

const MODE_SPEED_KPH={ptsc:32,bus:32,maxi:30,route_taxi:34,water_taxi:38,ferry:42};

export function estimateServiceMinutes(service,nodes){
  if(Number.isFinite(service.estimatedMinutes)&&service.estimatedMinutes>0)return service.estimatedMinutes;
  const origin=nodes.get(service.originNodeId),destination=nodes.get(service.destinationNodeId);
  if(!origin?.location||!destination?.location)return 60;
  const km=kmBetween(origin.location,destination.location);
  const speed=MODE_SPEED_KPH[service.mode]||30;
  return Math.max(3,(km/speed)*60);
}

export function findJourney(startId,endId,services,nodes=new Map(),{transferPenaltyMinutes=10}={}){
  if(startId===endId)return[];
  const graph=new Map();
  for(const service of services){
    for(const [from,to] of serviceDirections(service)){
      if(!graph.has(from))graph.set(from,[]);
      graph.get(from).push({next:to,service});
    }
  }

  const best=new Map([[startId,0]]);
  const previous=new Map();
  const queue=[{node:startId,cost:0}];
  while(queue.length){
    queue.sort((a,b)=>a.cost-b.cost);
    const current=queue.shift();
    if(current.cost!==best.get(current.node))continue;
    if(current.node===endId)break;
    for(const edge of graph.get(current.node)||[]){
      const edgeCost=estimateServiceMinutes(edge.service,nodes)+transferPenaltyMinutes;
      const nextCost=current.cost+edgeCost;
      if(nextCost>=(best.get(edge.next)??Infinity))continue;
      best.set(edge.next,nextCost);
      previous.set(edge.next,{node:current.node,service:edge.service});
      queue.push({node:edge.next,cost:nextCost});
    }
  }
  if(!previous.has(endId))return null;
  const legs=[];
  let at=endId;
  while(at!==startId){
    const prev=previous.get(at);
    if(!prev)return null;
    legs.push({from:prev.node,to:at,service:prev.service});
    at=prev.node;
  }
  return legs.reverse();
}

export function journeyMinutes(legs,nodes,{transferPenaltyMinutes=10}={}){
  if(!legs?.length)return 0;
  const travel=legs.reduce((sum,leg)=>sum+estimateServiceMinutes(leg.service,nodes),0);
  return travel+Math.max(0,legs.length-1)*transferPenaltyMinutes;
}

export function chooseConnectedJourney({fromPlace,toPlace,nodes,services,knownFrom=null,knownTo=null,candidateLimit=6,maxAccessKm=25,transferPenaltyMinutes=10,walkKph=4.8}){
  const starts=knownFrom?[{node:knownFrom,km:0}]:nearestNodes(fromPlace,nodes,{limit:candidateLimit,maxKm:maxAccessKm});
  const ends=knownTo?[{node:knownTo,km:0}]:nearestNodes(toPlace,nodes,{limit:candidateLimit,maxKm:maxAccessKm});
  let best=null;

  for(const start of starts){
    for(const end of ends){
      const legs=findJourney(start.node.id,end.node.id,services,nodes,{transferPenaltyMinutes});
      if(legs===null)continue;
      const transferCount=Math.max(0,legs.length-1);
      const transitMinutes=journeyMinutes(legs,nodes,{transferPenaltyMinutes});
      const accessMinutes=((start.km+end.km)/walkKph)*60;
      const score=transitMinutes+accessMinutes;
      const candidate={fromNear:start,toNear:end,legs,score,transferCount,estimatedMinutes:Math.round(score)};
      if(!best||candidate.score<best.score)best=candidate;
    }
  }
  return best;
}
