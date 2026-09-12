const VERDICTS=['correct','wrong','unsure'];

function emptyVerdicts(){return {correct:0,wrong:0,unsure:0,missing:0};}
function countVerdict(bucket,value){if(VERDICTS.includes(value))bucket[value]+=1;else bucket.missing+=1;}
function median(values){
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b),mid=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
}

export function validatePilotReview(payload,{pilotId}={}){
  if(!payload||payload.type!=='transittrinidad_field_pilot_review')throw new Error('invalid pilot review type');
  if(pilotId&&payload.pilotId!==pilotId)throw new Error(`pilot review belongs to ${payload.pilotId}, expected ${pilotId}`);
  if(!Array.isArray(payload.reviews)||!payload.reviews.length)throw new Error('pilot review has no journey reviews');
  return true;
}

export function summarizePilotReviews(payloads,{pilotId,coreJourneyIds=[],reverseJourneyId,minReviewers=3,minConfirmations=2}={}){
  const reviews=payloads||[];
  reviews.forEach(payload=>validatePilotReview(payload,{pilotId}));
  const journeyIds=[...new Set(reviews.flatMap(payload=>payload.reviews.map(review=>review.journeyId)))];
  const journeys={};
  let severity1=0;
  for(const journeyId of journeyIds){
    const rows=reviews.map(payload=>payload.reviews.find(review=>review.journeyId===journeyId)).filter(Boolean);
    const routeTruth=emptyVerdicts(),boardingTruth=emptyVerdicts(),fareTruth=emptyVerdicts(),instructionTruth=emptyVerdicts();
    const fares=[];let fullyConfirmed=0;
    for(const row of rows){
      countVerdict(routeTruth,row.routeTruth);countVerdict(boardingTruth,row.boardingTruth);countVerdict(fareTruth,row.fareTruth);countVerdict(instructionTruth,row.instructionTruth);
      if(Number.isFinite(row.actualFareTTD))fares.push(row.actualFareTTD);
      if(row.severity==='severity1')severity1+=1;
      if(row.routeTruth==='correct'&&row.boardingTruth==='correct'&&row.instructionTruth==='correct')fullyConfirmed+=1;
    }
    journeys[journeyId]={reviewCount:rows.length,routeTruth,boardingTruth,fareTruth,instructionTruth,fullyConfirmed,currentFareSamples:fares,currentFareMedianTTD:median(fares)};
  }
  const reviewerCount=reviews.length;
  const coreReady=coreJourneyIds.every(id=>(journeys[id]?.fullyConfirmed||0)>=minConfirmations);
  const reverse=journeys[reverseJourneyId];
  const reverseStatus=!reverse||reverse.reviewCount<minConfirmations?'unresolved':reverse.routeTruth.wrong>0||reverse.boardingTruth.wrong>0?'disputed':reverse.fullyConfirmed>=minConfirmations?'confirmed':'unresolved';
  return {
    pilotId,reviewerCount,severity1,journeys,
    threshold:{minReviewers,minConfirmations,reviewerThresholdMet:reviewerCount>=minReviewers,coreConfirmationThresholdMet:coreReady,zeroSeverity1:severity1===0,reverseStatus},
    readyForPromotionReview:reviewerCount>=minReviewers&&coreReady&&severity1===0
  };
}
