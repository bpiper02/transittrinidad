function slug(value){return String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}

function pointFromNode(node){
  if(!node)throw new Error('review route references an unknown node');
  return {
    name:node.name,
    nodeId:node.id,
    ...(node.location?{location:node.location}:{}),
    ...(node.kind?{kind:node.kind}:{}),
    ...(node.boardingNote?{boardingNote:node.boardingNote}:{})
  };
}

function optionalNumber(value,fallback=null){
  if(value==null||value==='')return fallback;
  const parsed=Number(value);
  if(!Number.isFinite(parsed)||parsed<0)throw new Error('fare must be a non-negative number');
  return parsed;
}

export function resolveReviewedStopIds(lines,nodes=[]){
  const byId=new Map(nodes.map(node=>[node.id,node]));
  const byName=new Map();
  for(const node of nodes){
    const name=String(node.name||'').trim().toLowerCase();
    if(!name)continue;
    if(!byName.has(name))byName.set(name,[]);
    byName.get(name).push(node);
  }
  const values=Array.isArray(lines)?lines:String(lines||'').split(/\r?\n/);
  const ids=[];
  for(const raw of values){
    const value=String(raw||'').trim();
    if(!value)continue;
    if(byId.has(value)){ids.push(value);continue;}
    const matches=byName.get(value.toLowerCase())||[];
    if(matches.length===1){ids.push(matches[0].id);continue;}
    if(matches.length>1)throw new Error(`“${value}” matches more than one network point; use its node ID.`);
    throw new Error(`“${value}” is not a known network point.`);
  }
  if(ids.length<2)throw new Error('a reviewed route needs at least an origin and destination');
  if(new Set(ids).size!==ids.length)throw new Error('reviewed stop order cannot contain duplicate points');
  return ids;
}

export function buildFieldReviewSubmission({service,nodes=[],review={}}){
  if(!service?.id)throw new Error('service is required');
  if(!['correct','needs_correction'].includes(review.accuracy))throw new Error('choose whether the route is correct or needs correction');
  const nodeMap=new Map(nodes.map(node=>[node.id,node]));
  const stopNodeIds=review.stopNodeIds?.length?review.stopNodeIds:[...(service.stopNodeIds||[service.originNodeId,service.destinationNodeId])];
  if(stopNodeIds.length<2)throw new Error('service needs at least two ordered points');
  if(new Set(stopNodeIds).size!==stopNodeIds.length)throw new Error('reviewed stop order cannot contain duplicate points');
  const routeNodes=stopNodeIds.map(id=>{
    const node=nodeMap.get(id);
    if(!node)throw new Error(`unknown network point ${id}`);
    return node;
  });
  const receivedAt=review.receivedAt||new Date().toISOString().slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(receivedAt))throw new Error('receivedAt must be YYYY-MM-DD');
  const association=String(review.association||'Field reviewer').trim();
  if(!association)throw new Error('association / reviewer group is required');
  const id=review.submissionId||`field-review-${receivedAt}-${slug(service.id)}`;
  const fareTTD=optionalNumber(review.fareTTD,service.fareTTD??null);
  const route={
    name:`${routeNodes[0].name} → ${routeNodes.at(-1).name}`,
    mode:service.mode,
    operator:service.operator||association,
    corridorId:service.corridorId,
    ...(service.maxiRouteArea!=null?{maxiRouteArea:service.maxiRouteArea}:{}),
    ...(service.bandColor?{bandColor:service.bandColor}:{}),
    origin:pointFromNode(routeNodes[0]),
    stops:routeNodes.slice(1,-1).map(pointFromNode),
    destination:pointFromNode(routeNodes.at(-1)),
    roads:Array.isArray(review.roads)?review.roads:[],
    geometry:null,
    fareTTD,
    ...(review.patternType||service.patternType?{patternType:review.patternType||service.patternType}:{}),
    ...(review.boardingPolicy||service.boardingPolicy?{boardingPolicy:review.boardingPolicy||service.boardingPolicy}:{}),
    ...(review.alightingPolicy||service.alightingPolicy?{alightingPolicy:review.alightingPolicy||service.alightingPolicy}:{}),
    boardingNote:review.boardingNote||service.boardingNote||null,
    operation:review.operation||{},
    fieldReview:{
      accuracy:review.accuracy,
      serviceId:service.id,
      notes:String(review.notes||'').trim()||null
    }
  };
  return {
    id,
    association,
    receivedAt,
    contact:{
      name:String(review.reviewerName||'').trim()||null,
      role:String(review.reviewerRole||'').trim()||null,
      channel:String(review.contactChannel||'field-review').trim()||'field-review'
    },
    notes:String(review.submissionNotes||'').trim()||null,
    routes:[route]
  };
}
