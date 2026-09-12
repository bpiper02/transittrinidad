export function transitAction(service,{toward,bandLabel='Maxi',fromIsTerminal=false}={}){
  const target=toward||'your destination';
  if(service?.mode==='maxi'){
    if(service.boardingPolicy==='corridor_hail'&&!fromIsTerminal)return`Hail the ${bandLabel} toward ${target}`;
    if(service.patternType==='express'||service.patternType==='limited'||service.boardingPolicy==='fixed_only')return`Board the ${bandLabel} toward ${target}`;
    return`Take the ${bandLabel} toward ${target}`;
  }
  if(service?.mode==='route_taxi'){
    if(service.boardingPolicy==='corridor_hail'&&!fromIsTerminal)return`Hail a route taxi toward ${target}`;
    return`Take a route taxi toward ${target}`;
  }
  if(service?.mode==='ptsc')return`Board PTSC toward ${target}`;
  if(service?.mode==='water_taxi')return`Take the Water Taxi toward ${target}`;
  if(service?.mode==='ferry')return`Take the ferry toward ${target}`;
  return`Take transit toward ${target}`;
}

export function boardingGuidance(service,{fromName='the boarding point',toName='your stop',fromIsTerminal=false,toIsTerminal=false}={}){
  const parts=[];
  if(service?.boardingPolicy==='corridor_hail'&&!fromIsTerminal)parts.push(`Hail at ${fromName} in the service direction`);
  else parts.push(`Board at ${fromName}`);
  if(service?.alightingPolicy==='corridor_request'&&!toIsTerminal)parts.push(`Tell the driver you’re getting off at ${toName}`);
  return parts.join(' · ');
}
