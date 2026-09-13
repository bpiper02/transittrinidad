import assert from 'node:assert/strict';
import {escapeHtml,formatMinutes,maxiBandLabel,modeLabel,routeColor,serviceConfidenceLabel} from '../src/presentation-core.mjs';

assert.equal(escapeHtml(`<a href="x">O'Brien & Co</a>`),'&lt;a href=&quot;x&quot;&gt;O&#039;Brien &amp; Co&lt;/a&gt;');
assert.equal(modeLabel('maxi'),'Maxi');
assert.equal(modeLabel('custom'),'custom');
assert.equal(routeColor({mode:'maxi',routeArea:3}),'#2E9B4B');
assert.equal(routeColor({mode:'maxi',bandColor:'blue'}),'#2F80ED');
assert.equal(routeColor({mode:'ptsc'}),'#C9252D');
assert.equal(routeColor({mode:'unknown'}),'#6E6E73');
assert.equal(maxiBandLabel({routeArea:4}),'Route 4 / Black Band');
assert.equal(maxiBandLabel({bandColor:'green'}),'Green Band');
assert.equal(maxiBandLabel({}),'Maxi');
assert.equal(formatMinutes(1),'~1 min');
assert.equal(formatMinutes(59.6),'~1h');
assert.equal(formatMinutes(75),'~1h 15m');
assert.equal(serviceConfidenceLabel({serviceConfidence:'verified_service'}),'Verified route');
assert.equal(serviceConfidenceLabel({serviceConfidence:'reported_service'}),'Reported route');
assert.equal(serviceConfidenceLabel({serviceConfidence:'needs_review'}),'Route');

console.log('presentation core tests passed');
