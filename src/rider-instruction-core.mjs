const POLICY_ALIASES={fixed_only:'fixed_stop_only',corridor_hail:'hail_along_segment',corridor_request:'main_road_pass_through',mixed:'unknown_do_not_assume'};
const HAIL_POLICIES=new Set(['hail_along_segment','main_road_pass_through']);
const FIXED_POLICIES=new Set(['fixed_stop_only','terminal_or_stand_only']);
const PASS_THROUGH_SAFETY_COPY='Use a visible, legal, well-lit place to wait. Prefer a stand, marked stop, junction, lay-by, or locally known pickup point.';

function cleanPolicy(value){return POLICY_ALIASES[value]||value||'unknown_do_not_assume';}
function allowsHail(policy){return HAIL_POLICIES.has(cleanPolicy(policy));}
function isFixedPolicy(policy){return FIXED_POLICIES.has(cleanPolicy(policy));}
function isVirtualPlace(value){return /^virtual-/i.test(String(value||''))||/^estimated main-road/i.test(String(value||''));}
function displayPlaceName(value,purpose='boarding'){
  if(isVirtualPlace(value))return purpose==='alighting'?'estimated main-road drop-off area':'estimated main-road boarding area';
  return value;
}
function directionName(value){return displayPlaceName(value,'alighting')||'your destination';}
function hasVirtualAccess(virtualAccess,purpose){
  if(!virtualAccess)return false;
  return virtualAccess.purpose===purpose||virtualAccess.purpose==='both';
}

export function passThroughSafetyCopy(){return PASS_THROUGH_SAFETY_COPY;}

export function transitAction(service,{toward,bandLabel='Maxi',fromIsTerminal=false,fromName='',fromVirtualAccess=null}={}){
  const target=directionName(toward);
  const virtualBoarding=hasVirtualAccess(fromVirtualAccess,'boarding')||isVirtualPlace(fromName);
  if(service?.mode==='maxi'){
    if((virtualBoarding||allowsHail(service.boardingPolicy))&&!fromIsTerminal)return`Hail the ${bandLabel} toward ${target}`;
    if(service.patternType==='express'||service.patternType==='limited'||isFixedPolicy(service.boardingPolicy))return`Board the ${bandLabel} toward ${target}`;
    return`Take the ${bandLabel} toward ${target}`;
  }
  if(service?.mode==='route_taxi'){
    if((virtualBoarding||allowsHail(service.boardingPolicy))&&!fromIsTerminal)return`Hail a route taxi toward ${target}`;
    return`Take a route taxi toward ${target}`;
  }
  if(service?.mode==='ptsc')return`Board PTSC toward ${target}`;
  if(service?.mode==='water_taxi')return`Take the Water Taxi toward ${target}`;
  if(service?.mode==='ferry')return`Take the ferry toward ${target}`;
  return`Take transit toward ${target}`;
}

export function boardingGuidance(service,{fromName='the boarding point',toName='your stop',fromIsTerminal=false,toIsTerminal=false,fromVirtualAccess=null,toVirtualAccess=null}={}){
  const parts=[];
  const virtualBoarding=hasVirtualAccess(fromVirtualAccess,'boarding')||isVirtualPlace(fromName);
  const virtualAlighting=hasVirtualAccess(toVirtualAccess,'alighting')||isVirtualPlace(toName);
  const boardingName=displayPlaceName(fromName,'boarding');
  const alightingName=displayPlaceName(toName,'alighting');
  if(virtualBoarding){
    parts.push(`Hail at the ${boardingName} in the service direction`);
    parts.push(PASS_THROUGH_SAFETY_COPY);
  }else if(allowsHail(service?.boardingPolicy)&&!fromIsTerminal)parts.push(`Hail at ${boardingName} in the service direction`);
  else parts.push(`Board at ${boardingName}`);
  if(virtualAlighting)parts.push(`Tell the driver you’re getting off at the ${alightingName}`);
  else if(allowsHail(service?.alightingPolicy)&&!toIsTerminal)parts.push(`Tell the driver you’re getting off at ${alightingName}`);
  return parts.join(' · ');
}
