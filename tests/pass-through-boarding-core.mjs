import assert from 'node:assert/strict';
import {
  classifyAccessLeg,
  evaluatePassThroughAccess,
  policyAllowsVirtualAccess,
  serviceAccessPolicy
} from '../src/pass-through-boarding-core.mjs';

const sourceTaggedMaxi = {
  id: 'maxi-east-west',
  mode: 'maxi',
  boardingPolicy: 'main_road_pass_through',
  alightingPolicy: 'main_road_pass_through'
};

assert.equal(serviceAccessPolicy({ mode: 'maxi' }), 'unknown_do_not_assume', 'informal modes must not become pass-through by default');
assert.equal(policyAllowsVirtualAccess('main_road_pass_through'), true);
assert.equal(policyAllowsVirtualAccess('fixed_stop_only'), false);
assert.equal(serviceAccessPolicy({ mode: 'maxi', boardingPolicy: 'corridor_hail' }), 'hail_along_segment', 'legacy corridor_hail should normalize to canonical hail access');
assert.equal(serviceAccessPolicy({ mode: 'maxi', alightingPolicy: 'corridor_request' }, 'alighting'), 'main_road_pass_through', 'legacy corridor_request should normalize to canonical request access');
assert.equal(serviceAccessPolicy({ mode: 'maxi', boardingPolicy: 'mixed' }), 'unknown_do_not_assume', 'mixed boarding should be accepted but never treated as blanket roadside access');
assert.equal(serviceAccessPolicy({ mode: 'ptsc', boardingPolicy: 'fixed_only' }), 'fixed_stop_only', 'legacy fixed_only should normalize to canonical fixed-stop access');

const closeMainRoad = evaluatePassThroughAccess({
  service: sourceTaggedMaxi,
  accessKm: 0.35,
  segment: {
    roadClass: 'main_road',
    boardingPolicy: 'main_road_pass_through',
    safetyEvidence: ['junction', 'community_verified'],
    confidence: 'community_verified'
  }
});
assert.equal(closeMainRoad.eligible, true, 'known main-road segments can become virtual access points');
assert.equal(closeMainRoad.accessLeg.mode, 'walk');
assert.equal(closeMainRoad.displayLabel, 'Estimated main-road boarding area');
assert.match(closeMainRoad.safetyCopy, /Prefer a stand/);

const localLeg = classifyAccessLeg(1.7);
assert.equal(localLeg.eligible, true, 'nearby main-road access can be a short local access leg, not fake transit');
assert.equal(localLeg.mode, 'short_local_access');

const untagged = evaluatePassThroughAccess({
  service: { id: 'untagged-maxi', mode: 'maxi' },
  accessKm: 0.2,
  segment: { roadClass: 'main_road', safetyEvidence: ['junction'], confidence: 'reported' }
});
assert.equal(untagged.eligible, false, 'route shape alone must not imply hail/pass-through access');
assert.match(untagged.reasons.join(' '), /unknown_do_not_assume/);

const terminalOnly = evaluatePassThroughAccess({
  service: { id: 'water-taxi', mode: 'water_taxi', boardingPolicy: 'terminal_or_stand_only' },
  accessKm: 0.1,
  segment: { roadClass: 'main_road', safetyEvidence: ['junction'], confidence: 'community_verified' }
});
assert.equal(terminalOnly.eligible, false, 'water/ferry style services stay terminal-only unless explicitly changed');

const unsafeHighway = evaluatePassThroughAccess({
  service: sourceTaggedMaxi,
  accessKm: 0.3,
  segment: { roadClass: 'highway', safetyEvidence: ['unknown'], confidence: 'reported' }
});
assert.equal(unsafeHighway.eligible, false, 'do not snap riders to unsafe highway/expressway shoulders');
assert.match(unsafeHighway.reasons.join(' '), /safe stopping/);

const alightingLocked = evaluatePassThroughAccess({
  service: { id: 'one-way-access', boardingPolicy: 'main_road_pass_through', alightingPolicy: 'fixed_stop_only' },
  purpose: 'alighting',
  accessKm: 0.3,
  segment: { roadClass: 'main_road', safetyEvidence: ['junction'], confidence: 'community_verified' }
});
assert.equal(alightingLocked.eligible, false, 'boarding and alighting policy must stay separate');
assert.match(alightingLocked.reasons.join(' '), /fixed_stop_only/);

const inferred = evaluatePassThroughAccess({
  service: sourceTaggedMaxi,
  accessKm: 0.3,
  segment: { roadClass: 'main_road', safetyEvidence: ['junction'], confidence: 'inferred_from_route_shape' }
});
assert.equal(inferred.eligible, true, 'shape-inferred pass-through can be modelled but must warn');
assert.match(inferred.warnings.join(' '), /not proof/);

console.log('pass-through boarding policy tests passed');
