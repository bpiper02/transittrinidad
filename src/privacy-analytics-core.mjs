const ALLOWED_EVENTS=new Set(['map_presentation_changed','planner_completed','feedback_draft_saved','route_studio_exported']);
const ALLOWED_KEYS={map_presentation_changed:new Set(['mode']),planner_completed:new Set(['outcome','mode','transferBand']),feedback_draft_saved:new Set(['kind']),route_studio_exported:new Set(['duplicateKind','reverseDetected'])};

export function privacyLightEvent(name,properties={}){
  if(!ALLOWED_EVENTS.has(name))throw new Error(`unsupported analytics event ${name}`);
  const output={event:name,properties:{}};
  for(const [key,value] of Object.entries(properties||{}))if(ALLOWED_KEYS[name].has(key)&&typeof value==='string'&&value.length<=40)output.properties[key]=value;
  return output;
}

export function recordPrivacyLightEvent(name,properties={},storage=null){
  const event={...privacyLightEvent(name,properties),at:new Date().toISOString()};
  try{storage?.setItem?.('trinimaps-privacy-light-events',JSON.stringify([...(JSON.parse(storage.getItem('trinimaps-privacy-light-events')||'[]')).slice(-49),event]));}catch{}
  return event;
}
