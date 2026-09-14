import assert from 'node:assert/strict';
import {destinationAccessSupported,estimateAccess,localAccessSupported} from '../src/routing-core.mjs';

const formalFar={node:{id:'formal-far',kind:'terminal'},km:6};
const formalNear={node:{id:'formal-near',kind:'stand'},km:3.8};
const informalFar={node:{id:'informal-far',kind:'stop_zone',locationConfidence:'approximate_area'},km:3.2};
const walkableStop={node:{id:'walkable-stop',kind:'stop_zone'},km:1};
const virtualFar={node:{id:'virtual-far',kind:'stop_zone'},virtualAccess:{evaluation:{eligible:true}},km:7};

assert.equal(localAccessSupported(formalFar,estimateAccess(formalFar.km)),true,'origin-side formal access remains uncapped for intermodal starts');
assert.equal(destinationAccessSupported(formalFar,estimateAccess(formalFar.km)),false,'destination egress should reject far formal nodes');
assert.equal(destinationAccessSupported(formalNear,estimateAccess(formalNear.km)),true,'near formal destination egress should remain trusted');
assert.equal(destinationAccessSupported(informalFar,estimateAccess(informalFar.km)),false,'informal destination local access should stay tightly capped');
assert.equal(destinationAccessSupported(walkableStop,estimateAccess(walkableStop.km)),true,'walking destination egress remains trusted');
assert.equal(destinationAccessSupported(virtualFar,estimateAccess(virtualFar.km)),true,'eligible virtual alighting keeps its own safety-gated trust');
assert.equal(destinationAccessSupported(formalFar,estimateAccess(formalFar.km),{maxFormalDestinationLocalAccessKm:6.5}),true,'destination formal egress cap should be configurable');
