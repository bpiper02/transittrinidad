export function kmBetween(a,b){
  const R=6371;
  const rad=x=>x*Math.PI/180;
  const dLat=rad(b.lat-a.lat);
  const dLng=rad(b.lng-a.lng);
  const q=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
}

export function nearestNodes(place,nodes,{limit=6}={}){
  return [...nodes.values()]
    .filter(node=>node?.location&&Number.isFinite(node.location.lat)&&Number.isFinite(node.location.lng))
    .map(node=>({node,km:kmBetween(place,node.location)}))
    .sort((a,b)=>a.km-b.km)
    .slice(0,limit);
}

export function findJourney(startId,endId,services){
  if(startId===endId)return[];
  const graph=new Map();
  for(const service of services){
    const directions = service.bidirectional===false
      ? [[service.originNodeId,service.destinationNodeId]]
      : [[service.originNodeId,service.destinationNodeId],[service.destinationNodeId,service.originNodeId]];
    for(const [from,to] of directions){
      if(!graph.has(from))graph.set(from,[]);
      graph.get(from).push({next:to,service});
    }
  }

  const queue=[startId];
  const seen=new Set([startId]);
  const previous=new Map();
  while(queue.length){
    const current=queue.shift();
    for(const edge of graph.get(current)||[]){
      if(seen.has(edge.next))continue;
      seen.add(edge.next);
      previous.set(edge.next,{node:current,service:edge.service});
      if(edge.next===endId){
        const legs=[];
        let at=endId;
        while(at!==startId){
          const prev=previous.get(at);
          legs.push({from:prev.node,to:at,service:prev.service});
          at=prev.node;
        }
        return legs.reverse();
      }
      queue.push(edge.next);
    }
  }
  return null;
}

export function chooseConnectedJourney({fromPlace,toPlace,nodes,services,knownFrom=null,knownTo=null,candidateLimit=6}){
  const starts=knownFrom?[{node:knownFrom,km:0}]:nearestNodes(fromPlace,nodes,{limit:candidateLimit});
  const ends=knownTo?[{node:knownTo,km:0}]:nearestNodes(toPlace,nodes,{limit:candidateLimit});
  let best=null;

  for(const start of starts){
    for(const end of ends){
      const legs=findJourney(start.node.id,end.node.id,services);
      if(legs===null)continue;
      const transferCount=Math.max(0,legs.length-1);
      // Access distance matters most. Transfers add a modest penalty so we do not
      // send someone much farther just to remove one transfer.
      const score=start.km+end.km+(transferCount*0.75);
      const candidate={fromNear:start,toNear:end,legs,score,transferCount};
      if(!best||candidate.score<best.score)best=candidate;
    }
  }
  return best;
}
