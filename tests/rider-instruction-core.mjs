import assert from 'node:assert/strict';
import {boardingGuidance,transitAction} from '../src/rider-instruction-core.mjs';

const localMaxi={mode:'maxi',patternType:'local',boardingPolicy:'corridor_hail',alightingPolicy:'corridor_request'};
assert.equal(transitAction(localMaxi,{toward:'San Fernando',bandLabel:'Route 3 / Green Band',fromIsTerminal:false}),'Hail the Route 3 / Green Band toward San Fernando');
assert.equal(transitAction(localMaxi,{toward:'San Fernando',bandLabel:'Route 3 / Green Band',fromIsTerminal:true}),'Take the Route 3 / Green Band toward San Fernando');
assert.equal(boardingGuidance(localMaxi,{fromName:'California',toName:'Claxton Bay',fromIsTerminal:false,toIsTerminal:false}),'Hail at California in the service direction · Tell the driver you’re getting off at Claxton Bay');
assert.equal(boardingGuidance(localMaxi,{fromName:'Chaguanas Maxi Stand',toName:'San Fernando',fromIsTerminal:true,toIsTerminal:true}),'Board at Chaguanas Maxi Stand');

const fixed={mode:'ptsc',patternType:'fixed_route',boardingPolicy:'fixed_only',alightingPolicy:'fixed_only'};
assert.equal(transitAction(fixed,{toward:'Charlotteville'}),'Board PTSC toward Charlotteville');
assert.equal(boardingGuidance(fixed,{fromName:'Roxborough',toName:'Charlotteville'}),'Board at Roxborough');

const limited={mode:'maxi',patternType:'limited',boardingPolicy:'fixed_only',alightingPolicy:'fixed_only'};
assert.equal(transitAction(limited,{toward:'Point Fortin',bandLabel:'Route 5 / Brown Band'}),'Board the Route 5 / Brown Band toward Point Fortin');

console.log('rider instruction core tests passed');
