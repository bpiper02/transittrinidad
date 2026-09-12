import assert from 'node:assert/strict';
import {summarizePilotReviews,validatePilotReview} from '../src/pilot-review-core.mjs';

const core=['c1-california-claxton','c1-couva-marabella','c1-chase-sando','c1-chag-california'];
const reverse='c1-claxton-chag-reverse-probe';
const makeReview=(role,overrides={})=>({
  type:'transittrinidad_field_pilot_review',pilotId:'c1-central-south-2026-09',submittedAt:'2026-09-12T00:00:00Z',reviewer:{role},
  reviews:[...core,reverse].map(id=>({journeyId:id,routeTruth:'correct',boardingTruth:'correct',fareTruth:'correct',instructionTruth:'correct',actualFareTTD:id===core[0]?5:null,severity:'none',...overrides[id]}))
});

const reviews=[makeReview('driver'),makeReview('dispatcher'),makeReview('regular rider')];
reviews.forEach(review=>assert.equal(validatePilotReview(review,{pilotId:'c1-central-south-2026-09'}),true));
let summary=summarizePilotReviews(reviews,{pilotId:'c1-central-south-2026-09',coreJourneyIds:core,reverseJourneyId:reverse});
assert.equal(summary.reviewerCount,3);
assert.equal(summary.readyForPromotionReview,true);
assert.equal(summary.threshold.reverseStatus,'confirmed');
assert.equal(summary.journeys['c1-california-claxton'].currentFareMedianTTD,5);

const disputed=[...reviews.slice(0,2),makeReview('rider',{[reverse]:{routeTruth:'wrong',boardingTruth:'wrong',instructionTruth:'wrong',severity:'major'}})];
summary=summarizePilotReviews(disputed,{pilotId:'c1-central-south-2026-09',coreJourneyIds:core,reverseJourneyId:reverse});
assert.equal(summary.threshold.reverseStatus,'disputed');
assert.equal(summary.readyForPromotionReview,true,'reverse disagreement should not invalidate already confirmed core southbound journeys');

const critical=[...reviews.slice(0,2),makeReview('driver',{[core[0]]:{routeTruth:'wrong',boardingTruth:'wrong',instructionTruth:'wrong',severity:'severity1'}})];
summary=summarizePilotReviews(critical,{pilotId:'c1-central-south-2026-09',coreJourneyIds:core,reverseJourneyId:reverse});
assert.equal(summary.severity1,1);
assert.equal(summary.readyForPromotionReview,false);

assert.throws(()=>validatePilotReview({...reviews[0],pilotId:'other'},{pilotId:'c1-central-south-2026-09'}),/expected/);
console.log('pilot review summary tests passed');
