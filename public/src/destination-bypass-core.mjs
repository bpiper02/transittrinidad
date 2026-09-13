const EARTH_KM=6371;
const INTERMODAL_MODES=new Set(['water_taxi','ferry']);
const FORMAL_INTERMODAL_NODE_KINDS=new Set(['water_taxi_terminal','ferry_terminal']);

function validLocation(location){
  return location&&Number.isFinite(location.lat)&&Number.isFinite(location.lng);
}

export function kmBetween(a,b){
  if(!validLocation(a)||!validLocation(b))return Infinity;
  const rad=x=>x*Math.PI/180;
  const dLat=rad(b.lat-a.lat);
  const dLng=rad(b.lng-a.lng);
  const q=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return 2*EARTH_KM*Math.asin(Math.sqrt(q));
}

function nodeForStepPoint(nodes,nodeId){
  const node=nodes?.get?.(nodeId);
  return node&&validLocation(node.location)?node:null;
}

function journeyNodeSequence(steps,nodes){
  const sequence=[];
  for(const step of steps||[]){
    if(!sequence.length){
      const from=nodeForStepPoint(nodes,step.from);
      if(from)sequence.push(from);
    }
    const to=nodeForStepPoint(nodes,step.to);
    if(to&&sequence.at(-1)?.id!==to.id)sequence.push(to);
  }
  return sequence;
}

function usesFormalIntermodal(steps,nodes){
  for(const step of steps||[]){
    if(step.kind==='transit'&&INTERMODAL_MODES.has(step.service?.mode))return true;
    const from=nodes?.get?.(step.from),to=nodes?.get?.(step.to);
    if(FORMAL_INTERMODAL_NODE_KINDS.has(from?.kind)||FORMAL_INTERMODAL_NODE_KINDS.has(to?.kind))return true;
  }
  return false;
}

export function destinationBypassDiagnostic({
  steps,
  nodes,
  toPlace,
  toNear=null,
  destinationCatchmentKm=2.5,
  maxDestinationBypassKm=4,
  allowFormalIntermodalException=true
}={}){
  const destination=validLocation(toPlace)?toPlace:toNear?.node?.location;
  const sequence=journeyNodeSequence(steps,nodes);
  if(!validLocation(destination)||sequence.length<2){
    return{
      evaluated:false,
      rejected:false,
      closestDistanceToDestinationKm:Infinity,
      distanceAtFinalTransitStopKm:Infinity,
      destinationBypassKm:0,
      movesAwayAfterNearDestination:false,
      returnsTowardDestination:false,
      formalIntermodalException:false
    };
  }

  const distances=sequence.map((node,index)=>({
    index,
    nodeId:node.id,
    nodeKind:node.kind||null,
    distanceKm:kmBetween(node.location,destination)
  }));
  const closest=distances.reduce((best,item)=>item.distanceKm<best.distanceKm?item:best,distances[0]);
  const afterClosest=distances.slice(closest.index+1);
  const farthestAfter=afterClosest.reduce((best,item)=>!best||item.distanceKm>best.distanceKm?item:best,null);
  const final=distances.at(-1);
  const finalAccessKm=Number.isFinite(toNear?.km)?toNear.km:final.distanceKm;
  const destinationBypassKm=farthestAfter?Math.max(0,farthestAfter.distanceKm-closest.distanceKm):0;
  const movesAwayAfterNearDestination=closest.distanceKm<=destinationCatchmentKm&&destinationBypassKm>=maxDestinationBypassKm;
  const returnsTowardDestination=final.distanceKm<=destinationCatchmentKm||finalAccessKm<=destinationCatchmentKm;
  const formalIntermodalException=allowFormalIntermodalException&&usesFormalIntermodal(steps,nodes);
  const rejected=movesAwayAfterNearDestination&&returnsTowardDestination&&!formalIntermodalException;

  return{
    evaluated:true,
    rejected,
    closestDistanceToDestinationKm:closest.distanceKm,
    closestNodeId:closest.nodeId,
    distanceAtFinalTransitStopKm:final.distanceKm,
    finalTransitNodeId:final.nodeId,
    destinationBypassKm,
    farthestAfterClosestNodeId:farthestAfter?.nodeId||null,
    movesAwayAfterNearDestination,
    returnsTowardDestination,
    formalIntermodalException
  };
}
