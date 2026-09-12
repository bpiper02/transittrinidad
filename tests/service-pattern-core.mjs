import assert from 'node:assert/strict';
import {canUsePattern,deriveTrips,validateServicePattern} from '../src/service-pattern-core.mjs';

const localSouth={
  stopNodeIds:['chaguanas','chase-village','couva','california','claxton-bay','san-fernando'],
  patternType:'local',
  boardingPolicy:'corridor_hail',
  alightingPolicy:'corridor_request'
};
validateServicePattern(localSouth);
assert.equal(canUsePattern(localSouth,'california','claxton-bay'),true);
assert.equal(canUsePattern(localSouth,'couva','san-fernando'),true);
assert.equal(canUsePattern(localSouth,'claxton-bay','california'),false,'direction must remain ordered');
assert.equal(canUsePattern(localSouth,'chaguanas','gasparillo'),false,'off-pattern places must not be inferred');
assert.equal(deriveTrips(localSouth).length,15,'six ordered corridor points generate 15 valid forward trips');

const expressSouth={
  stopNodeIds:['chaguanas','san-fernando'],
  patternType:'express',
  boardingPolicy:'fixed_only',
  alightingPolicy:'fixed_only'
};
assert.equal(canUsePattern(expressSouth,'chaguanas','san-fernando'),true);
assert.equal(canUsePattern(expressSouth,'california','san-fernando'),false,'express must not inherit local stops');

const limited={
  stopNodeIds:['chaguanas','couva','california','claxton-bay','san-fernando'],
  patternType:'limited',
  boardingPolicy:'mixed',
  alightingPolicy:'mixed',
  boardableNodeIds:['chaguanas','couva','california'],
  alightableNodeIds:['couva','claxton-bay','san-fernando']
};
assert.equal(canUsePattern(limited,'california','claxton-bay'),true);
assert.equal(canUsePattern(limited,'claxton-bay','san-fernando'),false,'non-boardable intermediate points stay unavailable');
assert.equal(canUsePattern(limited,'chaguanas','california'),false,'non-alightable intermediate points stay unavailable');

assert.throws(()=>validateServicePattern({...localSouth,stopNodeIds:['a','b','a']}),/unique/);
console.log('service pattern core tests passed');
