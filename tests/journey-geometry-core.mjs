import assert from 'node:assert/strict';
import {coordinatesForJourneyLeg,lineDistanceKm,projectOntoLine,sliceLineBetween} from '../src/journey-geometry-core.mjs';

const line=[[-61.6,10.2],[-61.5,10.2],[-61.4,10.2],[-61.3,10.2]];
const projected=projectOntoLine(line,[-61.45,10.21]);
assert.equal(projected.segmentIndex,1);
assert.ok(Math.abs(projected.point[0]+61.45)<0.0001);
const middle=sliceLineBetween(line,[-61.55,10.2],[-61.35,10.2]);
assert.equal(middle.length,4);
assert.ok(Math.abs(middle[0][0]+61.55)<0.000001);
assert.ok(Math.abs(middle.at(-1)[0]+61.35)<0.000001);
assert.equal(sliceLineBetween(line,[-61.35,10.2],[-61.55,10.2]),null,'reverse slicing must not manufacture reverse service');
assert.deepEqual(coordinatesForJourneyLeg({coordinates:line,from:line[0],to:line.at(-1),isWholeService:true}),line);

const tailedLine=[[-61.7,10.2],[-61.6,10.2],[-61.5,10.2],[-61.4,10.2]];
const clippedWholeService=coordinatesForJourneyLeg({coordinates:tailedLine,from:tailedLine[0],to:tailedLine[2],isWholeService:true});
assert.deepEqual(clippedWholeService,tailedLine.slice(0,3),'whole-service journey geometry must still clip at the actual alighting node');
assert.ok(lineDistanceKm(clippedWholeService)<lineDistanceKm(tailedLine),'clipped journey geometry must not keep a trailing service tail');
assert.equal(clippedWholeService.some(point=>point[0]===tailedLine.at(-1)[0]&&point[1]===tailedLine.at(-1)[1]),false,'clipped journey geometry must not include points past alighting');

assert.deepEqual(coordinatesForJourneyLeg({coordinates:line,from:[-60,11],to:[-59,11]}),[[-60,11],[-59,11]],'off-route nodes fall back to the travelled connector only');
console.log('journey geometry core tests passed');
