import assert from 'node:assert/strict';
import {buildUnresolvedGapReview,unresolvedGapSummary} from '../src/gap-review-core.mjs';

const laBrea={name:'La Brea',lat:10.247,lng:-61.624};
const pointFortin={name:'Point Fortin',lat:10.170,lng:-61.684};

const gap=buildUnresolvedGapReview({
  fromPlace:laBrea,
  toPlace:pointFortin,
  attemptedAt:'2026-09-13',
  reason:'directional_evidence_missing',
  nearbyStarts:[{nodeId:'ptsc-la-brea',name:'La Brea PTSC / main road area',km:0.4}],
  nearbyEnds:[{nodeId:'ptsc-point-fortin',name:'Point Fortin PTSC',km:0.7}],
  notes:'Known nearby nodes exist, but the planner should not assume a reverse or pass-through service without directional evidence.'
});

assert.equal(gap.type,'unresolved_route_gap');
assert.equal(gap.status,'needs_field_review');
assert.equal(gap.id,'gap-review-2026-09-13-la-brea-to-point-fortin');
assert.equal(gap.route.from.name,'La Brea');
assert.equal(gap.route.to.name,'Point Fortin');
assert.ok(gap.evidenceNeeded.includes('direction'));
assert.ok(gap.evidenceNeeded.includes('boarding_point'));
assert.ok(gap.evidenceNeeded.includes('drop_off_point'));
assert.ok(gap.evidenceNeeded.includes('fare'));
assert.ok(gap.reviewerQuestions.some(question=>question.includes('La Brea')));
assert.ok(gap.reviewerQuestions.some(question=>question.includes('Point Fortin')));
assert.match(gap.safetyRule,/Do not publish as routable/);
assert.match(unresolvedGapSummary(gap),/No trustworthy route yet for La Brea → Point Fortin/);

const crownToFerry=buildUnresolvedGapReview({
  fromPlace:{name:'Crown Point',lat:11.149,lng:-60.839},
  toPlace:{name:'Scarborough Ferry Terminal',lat:11.181,lng:-60.734},
  attemptedAt:'2026-09-13',
  reason:'terminal_link_evidence_missing',
  evidenceNeeded:['direction','terminal_link','operating_days_or_hours','source_or_contact','direction']
});
assert.deepEqual(crownToFerry.evidenceNeeded,['direction','terminal_link','operating_days_or_hours','source_or_contact']);
assert.equal(crownToFerry.id,'gap-review-2026-09-13-crown-point-to-scarborough-ferry-terminal');

assert.throws(()=>buildUnresolvedGapReview({fromPlace:laBrea}),/fromPlace and toPlace/);
assert.throws(()=>buildUnresolvedGapReview({fromPlace:laBrea,toPlace:pointFortin,attemptedAt:'09-13-2026'}),/YYYY-MM-DD/);
assert.throws(()=>unresolvedGapSummary({}),/unresolved route gap/);

console.log('gap review core tests passed');
