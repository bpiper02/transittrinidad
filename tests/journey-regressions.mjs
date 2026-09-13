import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chooseJourneyOptions,routableNodeIds} from '../src/routing-core.mjs';

const nodesArray=JSON.parse(await readFile(new URL('../data/nodes.json',import.meta.url)));
const services=JSON.parse(await readFile(new URL('../data/services.json',import.meta.url)));
const transfers=JSON.parse(await readFile(new URL('../data/transfers.json',import.meta.url)));
const nodes=new Map(nodesArray.map(node=>[node.id,node]));

function location(id){
  const node=nodes.get(id);
  assert.ok(node?.location,`missing fixture node ${id}`);
  return node.location;
}

function assertSensible(option,label){
  assert.ok(option,`${label}: expected a journey`);
  const visited=[option.fromNear.node.id,...option.steps.map(step=>step.to)];
  assert.equal(new Set(visited).size,visited.length,`${label}: journey must not repeat nodes`);
  assert.ok(option.fromNear.km<=4,`${label}: boarding point must be within the planner access radius`);
  assert.ok(option.toNear.km<=4,`${label}: final network point must be within the planner access radius`);
  assert.ok(option.steps.some(step=>step.kind==='transit'),`${label}: journey must contain transit`);
  for(let i=1;i<option.steps.length;i++){
    const previous=option.steps[i-1],current=option.steps[i];
    if(previous.kind==='transit'&&current.kind==='transit'&&previous.service.id!==current.service.id){
      assert.equal(previous.to,current.from,`${label}: mode/service changes must occur at a common node or explicit transfer`);
    }
  }
  assert.ok(option.ranking.detourRatio<=2.5,`${label}: excessive detours must be rejected`);
  const directKm=locationDistance(option.fromNear.node.location,option.toNear.node.location);
  assert.ok(option.ranking.backtrackKm<=Math.max(3,directKm*.35)+.01,`${label}: material backtracking must be rejected`);
}

function locationDistance(a,b){
  const radians=value=>value*Math.PI/180,R=6371,dLat=radians(b.lat-a.lat),dLng=radians(b.lng-a.lng);
  const q=Math.sin(dLat/2)**2+Math.cos(radians(a.lat))*Math.cos(radians(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
}

function options(fromId,toId,extra={}){
  return chooseJourneyOptions({
    fromPlace:location(fromId),
    toPlace:location(toId),
    nodes,
    services,
    transfers,
    candidateLimit:10,
    maxAccessKm:4,
    transferPenaltyMinutes:10,
    accessOptions:{localWaitMinutes:30,localKph:18},
    maxOptions:3,
    ...extra
  });
}

const couvaChag=options('maxi-couva','chag-maxi-area');
assertSensible(couvaChag[0],'Couva → Chaguanas');
assert.equal(couvaChag[0].steps.filter(step=>step.kind==='transit').some(step=>step.service.mode==='maxi'),true,'Couva → Chaguanas should use the known Maxi corridor');

const chagCouva=options('chag-maxi-area','maxi-couva');
assertSensible(chagCouva[0],'Chaguanas → Couva');

const couvaC3=options('maxi-couva','c3-centre');
assertSensible(couvaC3[0],'Couva → C3');
assert.deepEqual(couvaC3[0].modes,['maxi','route_taxi'],'Couva → C3 should prefer the known Maxi + route-taxi connection');

const chagSiparia=options('chag-maxi-area','siparia-sf-taxi');
assertSensible(chagSiparia[0],'Chaguanas → Siparia');

const sfGulf=options('ptsc-san-fernando','gulf-city-mall');
assertSensible(sfGulf[0],'San Fernando → Gulf City');

const sfPrinces=options('ptsc-san-fernando','maxi-princes-town');
assertSensible(sfPrinces[0],'San Fernando → Princes Town');

const penalChag=chooseJourneyOptions({
  fromPlace:location('penal-siparia-taxi'),
  toPlace:location('chag-maxi-area'),
  nodes,services,transfers,candidateLimit:10,maxAccessKm:4,transferPenaltyMinutes:10,
  accessOptions:{localWaitMinutes:30,localKph:18},maxOptions:3
});
assertSensible(penalChag[0],'Penal → Chaguanas');

const mayaroSf=options('maxi-mayaro','ptsc-san-fernando');
if(mayaroSf.length)assertSensible(mayaroSf[0],'Mayaro → San Fernando');
else assert.equal(mayaroSf.length,0,'Mayaro → San Fernando must remain unavailable rather than inventing an unsupported reverse service');

const scarboroughCrown=options('scarborough-ferry-terminal','crown-point-area');
assertSensible(scarboroughCrown[0],'Scarborough Ferry Terminal → Crown Point');

const maxiFiltered=options('penal-siparia-taxi','chag-maxi-area',{requiredMode:'maxi'});
assertSensible(maxiFiltered[0],'Penal → Chaguanas (Maxi filter)');
assert.ok(maxiFiltered[0].modes.includes('maxi'),'Maxi filter must require a Maxi leg while permitting connector modes');

const pointFortin=nodes.get('ptsc-point-fortin'),fyzabad=nodes.get('fyzabad-area');
const misleadingPTSC=chooseJourneyOptions({
  fromPlace:pointFortin.location,toPlace:fyzabad.location,knownFrom:pointFortin,knownTo:fyzabad,
  nodes,services,transfers,requiredMode:'ptsc'
});
assert.equal(misleadingPTSC.length,0,'Point Fortin → Fyzabad must not satisfy the PTSC filter via a San Fernando/Siparia detour');

const eligible=routableNodeIds(services,transfers);
assert.equal(services.filter(service=>service.serviceConfidence==='needs_review').some(service=>eligible.has(service.originNodeId)&&eligible.has(service.destinationNodeId)&&!services.some(other=>other!==service&&other.serviceConfidence!=='needs_review'&&([other.originNodeId,other.destinationNodeId,...(other.stopNodeIds||[])].includes(service.originNodeId)||[other.originNodeId,other.destinationNodeId,...(other.stopNodeIds||[])].includes(service.destinationNodeId)))),false,'held-only service nodes must not become eligible merely because the held service exists');

console.log('journey regression tests passed');
