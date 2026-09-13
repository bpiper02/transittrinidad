const EARTH_KM=6371;

function validCoordinate(point){
  return Array.isArray(point)&&point.length>=2&&Number.isFinite(point[0])&&Number.isFinite(point[1]);
}

function localPoint([lng,lat],referenceLat){
  const radians=Math.PI/180;
  return{x:EARTH_KM*lng*radians*Math.cos(referenceLat*radians),y:EARTH_KM*lat*radians};
}

function distanceKm(a,b){
  const referenceLat=(a[1]+b[1])/2;
  const p=localPoint(a,referenceLat),q=localPoint(b,referenceLat);
  return Math.hypot(q.x-p.x,q.y-p.y);
}

export function lineDistanceKm(coordinates){
  if(!Array.isArray(coordinates)||coordinates.length<2||!coordinates.every(validCoordinate))return 0;
  let total=0;
  for(let index=0;index<coordinates.length-1;index++)total+=distanceKm(coordinates[index],coordinates[index+1]);
  return total;
}

export function projectOntoLine(coordinates,point){
  if(!Array.isArray(coordinates)||coordinates.length<2||!coordinates.every(validCoordinate)||!validCoordinate(point))return null;
  let best=null,cumulativeKm=0;
  for(let index=0;index<coordinates.length-1;index++){
    const a=coordinates[index],b=coordinates[index+1];
    const referenceLat=(a[1]+b[1]+point[1])/3;
    const p=localPoint(point,referenceLat),start=localPoint(a,referenceLat),end=localPoint(b,referenceLat);
    const dx=end.x-start.x,dy=end.y-start.y,lengthSquared=dx*dx+dy*dy;
    const t=lengthSquared?Math.max(0,Math.min(1,((p.x-start.x)*dx+(p.y-start.y)*dy)/lengthSquared)):0;
    const projected=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
    const segmentKm=distanceKm(a,b),candidate={point:projected,segmentIndex:index,t,distanceKm:distanceKm(point,projected),positionKm:cumulativeKm+segmentKm*t};
    if(!best||candidate.distanceKm<best.distanceKm)best=candidate;
    cumulativeKm+=segmentKm;
  }
  return best;
}

export function sliceLineBetween(coordinates,from,to,{maxSnapKm=5,maxSliceDetourRatio=4,maxSliceExtraKm=5}={}){
  const start=projectOntoLine(coordinates,from),end=projectOntoLine(coordinates,to);
  if(!start||!end||start.distanceKm>maxSnapKm||end.distanceKm>maxSnapKm||end.positionKm+0.01<start.positionKm)return null;
  const sliced=[start.point];
  for(let index=start.segmentIndex+1;index<=end.segmentIndex;index++)sliced.push(coordinates[index]);
  sliced.push(end.point);
  const compact=sliced.filter((point,index,list)=>index===0||point[0]!==list[index-1][0]||point[1]!==list[index-1][1]);
  if(compact.length<2)return null;
  const directKm=distanceKm(from,to);
  const slicedKm=lineDistanceKm(compact);
  if(directKm>0.05&&slicedKm>directKm*maxSliceDetourRatio+maxSliceExtraKm)return null;
  return compact;
}

export function coordinatesForJourneyLeg({coordinates,from,to,isWholeService=false,maxSnapKm=5,maxSliceDetourRatio=4,maxSliceExtraKm=5}){
  void isWholeService;
  if(!validCoordinate(from)||!validCoordinate(to))return null;
  const sliced=sliceLineBetween(coordinates,from,to,{maxSnapKm,maxSliceDetourRatio,maxSliceExtraKm});
  return sliced?.length>=2?sliced:[from,to];
}
