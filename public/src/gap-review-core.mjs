function clean(value){return String(value||'').trim();}

function slug(value){
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'unknown';
}

function placeLabel(place,fallback){
  return clean(place?.name)||clean(place?.label)||fallback;
}

function placePoint(place,fallback){
  return {
    name:placeLabel(place,fallback),
    ...(Number.isFinite(place?.lat)&&Number.isFinite(place?.lng)?{location:{lat:place.lat,lng:place.lng}}:{}),
    ...(clean(place?.nodeId)?{nodeId:clean(place.nodeId)}:{})
  };
}

const DEFAULT_EVIDENCE_NEEDED=[
  'direction',
  'boarding_point',
  'drop_off_point',
  'fare',
  'operating_days_or_hours',
  'source_or_contact'
];

export function buildUnresolvedGapReview({fromPlace,toPlace,attemptedAt=null,reason='no_trustworthy_route',nearbyStarts=[],nearbyEnds=[],notes=null,evidenceNeeded=DEFAULT_EVIDENCE_NEEDED}={}){
  if(!fromPlace||!toPlace)throw new Error('fromPlace and toPlace are required');
  const from=placePoint(fromPlace,'Origin');
  const to=placePoint(toPlace,'Destination');
  const date=attemptedAt||new Date().toISOString().slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('attemptedAt must be YYYY-MM-DD');
  const id=`gap-review-${date}-${slug(from.name)}-to-${slug(to.name)}`;
  return {
    id,
    type:'unresolved_route_gap',
    status:'needs_field_review',
    attemptedAt:date,
    reason:clean(reason)||'no_trustworthy_route',
    route:{from,to},
    nearby:{
      starts:(nearbyStarts||[]).slice(0,5).map(item=>({nodeId:item.node?.id||item.nodeId,name:item.node?.name||item.name,km:item.km})).filter(item=>item.nodeId||item.name),
      ends:(nearbyEnds||[]).slice(0,5).map(item=>({nodeId:item.node?.id||item.nodeId,name:item.node?.name||item.name,km:item.km})).filter(item=>item.nodeId||item.name)
    },
    evidenceNeeded:[...new Set((evidenceNeeded||DEFAULT_EVIDENCE_NEEDED).map(clean).filter(Boolean))],
    reviewerQuestions:[
      `Where do people usually board when traveling from ${from.name} toward ${to.name}?`,
      `Where do people usually get off near ${to.name}?`,
      'Is this one continuous service, or does it require a transfer?',
      'What route name, color band, stand, main road, or landmark should riders ask for?',
      'What fare and operating days/hours are currently common?',
      'Who confirmed this: driver, association, passenger, official notice, or field observation?'
    ],
    notes:clean(notes)||null,
    safetyRule:'Do not publish as routable until direction, pickup/drop-off pattern, and safe stopping evidence are confirmed.'
  };
}

export function unresolvedGapSummary(gap){
  if(!gap||gap.type!=='unresolved_route_gap')throw new Error('unresolved route gap is required');
  const from=gap.route?.from?.name||'origin';
  const to=gap.route?.to?.name||'destination';
  return `No trustworthy route yet for ${from} → ${to}. Needs field review for: ${gap.evidenceNeeded.join(', ')}.`;
}
