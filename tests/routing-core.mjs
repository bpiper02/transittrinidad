import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chooseConnectedJourney,chooseJourneyOptions,findJourney,nearestNodes,journeyMinutes,estimateAccess,countTransfers,passThroughAccessCandidates} from '../src/routing-core.mjs';

const nodesArray=JSON.parse(await readFile(new URL('../data/nodes.json',import.meta.url)));
const services=JSON.parse(await readFile(new URL('../data/services.json',import.meta.url)));
const transfers=JSON.parse(await readFile(new URL('../data/transfers.json',import.meta.url)));
const nodes=new Map(nodesArray.map(node=>[node.id,node]));
const ptscServices=services.filter(service=>service.mode==='ptsc');

assert.ok(findJourney('ptsc-chaguanas','ptsc-pos-transit-centre',services,nodes),'Chaguanas must connect to Port of Spain through a directed pattern');
assert.ok(findJourney('ptsc-pos-transit-centre','ptsc-chaguanas',services,nodes),'Port of Spain must connect back through its own directed pattern');
assert.deepEqual(findJourney('ptsc-chaguanas','ptsc-chaguanas',services,nodes),[],'same-node graph journey should need no network steps');
assert.equal(findJourney('ptsc-chaguanas','missing-node',services,nodes),null,'disconnected destination should return null');
assert.ok(findJourney('ptsc-pos-transit-centre','ptsc-point-fortin',services,nodes),'POS should connect to Point Fortin');
assert.ok(findJourney('ptsc-point-fortin','ptsc-san-fernando',services,nodes),'Point Fortin should connect back to San Fernando');
assert.ok(findJourney('ptsc-chaguanas','ptsc-curepe',services,nodes),'official Chaguanas to Curepe direction should route');
assert.equal(findJourney('ptsc-curepe','ptsc-chaguanas',ptscServices,nodes),null,'reverse Curepe to Chaguanas must not be invented within the PTSC data without a reverse pattern');
assert.ok(findJourney('ptsc-san-fernando','ptsc-uwi-st-augustine',services,nodes),'official San Fernando to UWI direction should route');
assert.equal(findJourney('ptsc-uwi-st-augustine','ptsc-san-fernando',services,nodes),null,'reverse UWI to San Fernando must not be invented without a reverse pattern');

const maxiOnly=services.filter(service=>service.mode==='maxi');
const eastMaxiJourney=findJourney('ptsc-pos-transit-centre','grande-maxi-area',maxiOnly,nodes);
assert.ok(eastMaxiJourney,'the Red Band corridor must be usable as a transit journey');
assert.ok(eastMaxiJourney.every(step=>step.service.mode==='maxi'));
assert.ok(findJourney('maxi-diego-martin','ptsc-pos-transit-centre',maxiOnly,nodes,{transfers}),'the Yellow Band hub must connect into the wider network through its walking transfer');
assert.equal(findJourney('maxi-mayaro','ptsc-san-fernando',maxiOnly.filter(s=>s.id.startsWith('maxi-black-')),nodes,{transfers}),null,'unsupported reverse Princes Town service must not manufacture a Mayaro–SF journey');
assert.ok(findJourney('maxi-couva','ptsc-san-fernando',maxiOnly,nodes,{transfers}),'Couva service should connect to SF through an explicit terminal walk');
assert.ok(findJourney('ptsc-san-fernando','maxi-couva',maxiOnly,nodes,{transfers}),'SF should connect to its Couva stand through an explicit walk');
const localSouthOnly=services.filter(service=>service.mode==='route_taxi');
assert.ok(findJourney('ptsc-san-fernando','c3-centre',localSouthOnly,nodes,{transfers}),'SF terminal should reach C3 through its separate taxi boarding area');
assert.ok(findJourney('gulf-city-mall','ptsc-san-fernando',localSouthOnly,nodes,{transfers}),'Gulf City should connect back through the La Romaine taxi area walk');

const noTransferFerry=findJourney('ptsc-chaguanas','scarborough-ferry-terminal',services,nodes);
assert.equal(noTransferFerry,null,'ferry should remain disconnected from PTSC if walking transfer links are absent');
const ferryJourney=findJourney('ptsc-chaguanas','scarborough-ferry-terminal',services,nodes,{transfers,transferPenaltyMinutes:10});
assert.ok(ferryJourney,'Chaguanas to Scarborough should connect through POS PTSC, a terminal walk, and the ferry');
assert.ok(ferryJourney.some(step=>step.kind==='transfer'&&step.to==='pos-ferry-terminal'),'ferry itinerary must explicitly include the POS terminal walk');
assert.deepEqual(ferryJourney.filter(step=>step.kind==='transit').map(step=>step.service.mode),['ptsc','ferry'],'ferry itinerary should combine PTSC and ferry');
assert.equal(countTransfers(ferryJourney),1,'PTSC to ferry should count as one transit transfer');

const ferryOnly=services.filter(service=>service.mode==='ferry');
const ferryFromPosTransit=findJourney('ptsc-pos-transit-centre','scarborough-ferry-terminal',ferryOnly,nodes,{transfers});
assert.ok(ferryFromPosTransit,'ferry-only routing should still permit a walking connector from the nearby POS transit centre');
assert.equal(ferryFromPosTransit[0].kind,'transfer');
assert.equal(ferryFromPosTransit.at(-1).service.mode,'ferry');

const waterTaxiOnly=services.filter(service=>service.mode==='water_taxi');
const waterTaxiFromPosTransit=findJourney('ptsc-pos-transit-centre','san-fernando-water-taxi-terminal',waterTaxiOnly,nodes,{transfers});
assert.ok(waterTaxiFromPosTransit,'water-taxi-only routing should permit terminal walking access');
assert.ok(waterTaxiFromPosTransit.some(step=>step.kind==='transfer'));
assert.equal(waterTaxiFromPosTransit.at(-1).service.mode,'water_taxi');

const portOfSpain={lat:10.6500,lng:-61.5140};
const nearestToPos=nearestNodes(portOfSpain,nodes,{limit:1})[0];
assert.notEqual(nearestToPos.node.id,'ptsc-pos-transit-centre','fixture must reproduce the nearby-terminal problem');

const sanJuan=nodes.get('san-juan-area').location;
const sanJuanAccess=passThroughAccessCandidates(sanJuan,nodes,services,{purpose:'boarding',limit:8,maxKm:1});
assert.ok(sanJuanAccess.some(candidate=>candidate.virtualAccess.service.id==='maxi-pos-arima-back'),'San Juan should expose westbound Route 2 pass-through access instead of only exact-node routing');
const sanJuanToPos=chooseConnectedJourney({fromPlace:sanJuan,toPlace:portOfSpain,nodes,services,transfers,candidateLimit:10,maxAccessKm:4,rankingOptions:{passThroughAccessLimitKm:1,passThroughCandidateLimit:8}});
assert.ok(sanJuanToPos,'San Juan to Port of Spain should route through eligible pass-through access instead of returning no route');
assert.equal(sanJuanToPos.fromNear.node.virtual,true,'San Juan boarding should use an explicitly labeled estimated main-road access point');
assert.ok(sanJuanToPos.steps.some(step=>step.kind==='transit'&&step.service.id==='maxi-pos-arima-back'),'San Juan to POS should use the westbound Route 2 pattern, not invent a reverse taxi route');
assert.equal(sanJuanToPos.ranking.fromAccessTrusted,true,'pass-through evaluation should satisfy access trust without disabling safety gates');

const couva={lat:10.422,lng:-61.462};
const journey=chooseConnectedJourney({fromPlace:couva,toPlace:portOfSpain,nodes,services,transfers,candidateLimit:8});
assert.ok(journey,'Couva to Port of Spain should find a connected nearby-node journey');
assert.ok(journey.steps.some(step=>step.kind==='transit'),'route-aware snapping should use a connected service, including newly mapped taxi stands');
assert.ok(journey.legs.length>=1,'connected journey should include transit');
assert.ok(Number.isFinite(journey.estimatedMinutes)&&journey.estimatedMinutes>0,'journey should expose an estimated duration for ranking');
assert.equal(journey.fromAccess.mode,estimateAccess(journey.fromAccess.km).mode,'access mode must reflect the selected stand distance');

const couvaOptions=chooseJourneyOptions({fromPlace:couva,toPlace:portOfSpain,nodes,services,transfers,candidateLimit:10,maxOptions:3});
assert.ok(couvaOptions.length>=2,'Couva to Port of Spain should expose more than one reasonable itinerary');
assert.ok(couvaOptions.some(option=>option.modes.includes('water_taxi')),'Couva to Port of Spain alternatives should surface the San Fernando Water Taxi option');
assert.equal(couvaOptions[0].score<=couvaOptions[1].score,true,'best estimate should remain first even when mode-diverse alternatives are surfaced');
const rideSignature=option=>{
  const ids=[];
  for(const step of option.steps){
    if(step.kind!=='transit'||ids.at(-1)===step.service.id)continue;
    ids.push(step.service.id);
  }
  return ids.join('>');
};
assert.equal(new Set(couvaOptions.map(rideSignature)).size,couvaOptions.length,'rider-facing alternatives must represent distinct transit ride sequences');
const waterTaxiCouvaOptions=chooseJourneyOptions({fromPlace:couva,toPlace:portOfSpain,nodes,services:waterTaxiOnly,transfers,candidateLimit:10,maxOptions:3});
assert.equal(waterTaxiCouvaOptions.length,1,'Water Taxi-only mode should show one option when every candidate boards the same Water Taxi service');
assert.deepEqual(waterTaxiCouvaOptions[0].modes,['water_taxi']);

const shortAccess=estimateAccess(0.8);
assert.equal(shortAccess.mode,'walk');
assert.ok(shortAccess.minutes>5&&shortAccess.minutes<20,'short access should use realistic walking time');
const longAccess=estimateAccess(10);
assert.equal(longAccess.mode,'local');
assert.ok(longAccess.minutes<60,'long access should use a local connection estimate rather than hours of walking');

const oneWayNodes=new Map([['a',{id:'a',location:{lat:10,lng:-61}}],['b',{id:'b',location:{lat:10.1,lng:-61}}]]);
const oneWay=[{id:'a-to-b',corridorId:'a-b',mode:'ptsc',originNodeId:'a',destinationNodeId:'b',stopNodeIds:['a','b']}];
assert.ok(findJourney('a','b',oneWay,oneWayNodes),'directed pattern should work in its declared direction');
assert.equal(findJourney('b','a',oneWay,oneWayNodes),null,'router must never synthesize the reverse direction');

const segmentNodes=new Map([
  ['a',{id:'a',location:{lat:10.00,lng:-61.00}}],
  ['b',{id:'b',location:{lat:10.02,lng:-61.00}}],
  ['c',{id:'c',location:{lat:10.04,lng:-61.00}}]
]);
const throughService=[{id:'a-through-c',corridorId:'a-c',mode:'ptsc',originNodeId:'a',destinationNodeId:'c',stopNodeIds:['a','b','c'],estimatedMinutes:30}];
const throughJourney=findJourney('a','c',throughService,segmentNodes,{transferPenaltyMinutes:10});
assert.equal(throughJourney.length,2,'ordered stop patterns should create traversable stop-to-stop segments');
assert.equal(countTransfers(throughJourney),0,'staying on the same service across intermediate stops must not count as a transfer');
assert.ok(findJourney('b','c',throughService,segmentNodes),'riders must be able to board at an intermediate stop');

const passThroughNodes=new Map([
  ['start',{id:'start',kind:'stand',location:{lat:10.00,lng:-61.00}}],
  ['end',{id:'end',kind:'stand',location:{lat:10.00,lng:-61.10}}]
]);
const passThroughService=[{
  id:'stand-to-stand-hail',corridorId:'stand-to-stand',mode:'maxi',originNodeId:'start',destinationNodeId:'end',stopNodeIds:['start','end'],estimatedMinutes:20,serviceConfidence:'community_verified',boardingPolicy:'hail_along_segment',alightingPolicy:'main_road_pass_through',accessSegments:[{id:'stand-end-main-road',fromNodeId:'start',toNodeId:'end',roadClass:'main_road',boardingPolicy:'hail_along_segment',alightingPolicy:'main_road_pass_through',safetyEvidence:['junction','community_verified'],confidence:'community_verified',sources:[{name:'test',url:'https://example.com',checkedAt:'2026-09-13'}]}]
}];
const passAccess=passThroughAccessCandidates({lat:10.0005,lng:-61.05},passThroughNodes,passThroughService,{purpose:'boarding',maxKm:1,limit:2});
assert.equal(passAccess.length,1,'explicit accessSegments should produce virtual boarding candidates near a corridor');
const passEnd=passThroughAccessCandidates({lat:10.0005,lng:-61.06},passThroughNodes,passThroughService,{purpose:'alighting',maxKm:1,limit:2});
const augmented=new Map(passThroughNodes);
for(const item of [...passAccess,...passEnd])augmented.set(item.node.id,item.node);
const passRide=findJourney(passAccess[0].node.id,passEnd[0].node.id,passThroughService,augmented,{virtualAccessPoints:[passAccess[0].virtualAccess,passEnd[0].virtualAccess]});
assert.equal(passRide.length,1,'same-segment virtual boarding and drop-off should become one transit leg, not fake walking');
assert.equal(passRide[0].service.id,'stand-to-stand-hail');

const weightedNodes=new Map([
  ['a',{id:'a',location:{lat:10.00,lng:-61.00}}],['b',{id:'b',location:{lat:10.02,lng:-61.00}}],['c',{id:'c',location:{lat:10.04,lng:-61.00}}],['d',{id:'d',location:{lat:10.06,lng:-61.00}}],['far',{id:'far',location:{lat:10.90,lng:-61.00}}]
]);
const weightedServices=[
  {id:'long-direct',corridorId:'long',mode:'ptsc',originNodeId:'a',destinationNodeId:'d',estimatedMinutes:90,stopNodeIds:['a','d']},
  {id:'short-1',corridorId:'short-1',mode:'ptsc',originNodeId:'a',destinationNodeId:'b',estimatedMinutes:8,stopNodeIds:['a','b']},
  {id:'short-2',corridorId:'short-2',mode:'ptsc',originNodeId:'b',destinationNodeId:'c',estimatedMinutes:8,stopNodeIds:['b','c']},
  {id:'short-3',corridorId:'short-3',mode:'ptsc',originNodeId:'c',destinationNodeId:'d',estimatedMinutes:8,stopNodeIds:['c','d']}
];
const weighted=findJourney('a','d',weightedServices,weightedNodes,{transferPenaltyMinutes:5});
assert.deepEqual(weighted.filter(step=>step.kind==='transit').map(step=>step.service.id),['short-1','short-2','short-3'],'weighted routing should prefer a much faster multi-leg path over a slow direct service');
assert.ok(journeyMinutes(weighted,weightedNodes,{transferPenaltyMinutes:5})<90,'weighted path estimate should beat the long direct trip');
assert.equal(nearestNodes({lat:10,lng:-61},weightedNodes,{limit:10,maxKm:20}).some(item=>item.node.id==='far'),false,'access radius should exclude absurdly distant snap nodes');

const sameHubNodes=new Map([['hub',{id:'hub',location:{lat:10.5,lng:-61.4}}],['other',{id:'other',location:{lat:10.7,lng:-61.3}}]]);
const sameHubServices=[{id:'hub-to-other',corridorId:'hub-other',mode:'ptsc',originNodeId:'hub',destinationNodeId:'other',stopNodeIds:['hub','other']}];
const falseZeroLeg=chooseConnectedJourney({fromPlace:{lat:10.40,lng:-61.46},toPlace:{lat:10.42,lng:-61.45},nodes:sameHubNodes,services:sameHubServices,candidateLimit:1,maxAccessKm:20});
assert.equal(falseZeroLeg,null,'two arbitrary places must not become a fake zero-transit journey merely because they snap to the same hub');
const shortLocalFallback=chooseConnectedJourney({fromPlace:{lat:10.40,lng:-61.46},toPlace:{lat:10.42,lng:-61.45},nodes:new Map(sameHubNodes),services:sameHubServices,candidateLimit:1,maxAccessKm:20,rankingOptions:{allowDirectLocalFallback:true,maxDirectLocalFallbackKm:5}});
assert.ok(shortLocalFallback,'short-distance fallback should prevent a no-route result when explicitly enabled');
assert.equal(shortLocalFallback.modes[0],'route_taxi','short-distance fallback should be labeled as an estimated local route-taxi connector');
assert.equal(shortLocalFallback.ranking.directLocalFallback.estimated,true,'fallback must be machine-readable as estimated, not verified');
const farLocalFallback=chooseConnectedJourney({fromPlace:{lat:10.00,lng:-61.00},toPlace:{lat:10.30,lng:-61.00},nodes:new Map(),services:[],rankingOptions:{allowDirectLocalFallback:true,maxDirectLocalFallbackKm:5}});
assert.equal(farLocalFallback,null,'direct local fallback must not create long-distance imaginary routes');
const mediumBridgeNodes=new Map([
  ['origin-stand',{id:'origin-stand',kind:'stand',name:'Origin Stand',location:{lat:10.000,lng:-61.000}}],
  ['near-gap-west',{id:'near-gap-west',kind:'stand',name:'Near Gap West',location:{lat:10.020,lng:-61.000}}],
  ['near-gap-east',{id:'near-gap-east',kind:'stand',name:'Near Gap East',location:{lat:10.035,lng:-61.000}}],
  ['destination-stand',{id:'destination-stand',kind:'stand',name:'Destination Stand',location:{lat:10.055,lng:-61.000}}]
]);
const mediumBridgeServices=[
  {id:'origin-to-gap',corridorId:'origin-gap',mode:'maxi',originNodeId:'origin-stand',destinationNodeId:'near-gap-west',stopNodeIds:['origin-stand','near-gap-west'],estimatedMinutes:10},
  {id:'gap-to-destination',corridorId:'gap-destination',mode:'route_taxi',originNodeId:'near-gap-east',destinationNodeId:'destination-stand',stopNodeIds:['near-gap-east','destination-stand'],estimatedMinutes:10}
];
assert.equal(chooseConnectedJourney({fromPlace:mediumBridgeNodes.get('origin-stand').location,toPlace:mediumBridgeNodes.get('destination-stand').location,nodes:new Map(mediumBridgeNodes),services:mediumBridgeServices,knownFrom:mediumBridgeNodes.get('origin-stand'),knownTo:mediumBridgeNodes.get('destination-stand')}),null,'disconnected corridor fragments should still fail without bridge fallback');
const mediumBridge=chooseConnectedJourney({fromPlace:mediumBridgeNodes.get('origin-stand').location,toPlace:mediumBridgeNodes.get('destination-stand').location,nodes:new Map(mediumBridgeNodes),services:mediumBridgeServices,knownFrom:mediumBridgeNodes.get('origin-stand'),knownTo:mediumBridgeNodes.get('destination-stand'),rankingOptions:{allowCorridorBridgeFallback:true,maxBridgeConnectorKm:3,maxBridgeConnectorsPerNode:2}});
assert.ok(mediumBridge,'medium-distance bridge fallback should connect nearby corridor fragments');
assert.ok(mediumBridge.steps.some(step=>step.kind==='transfer'&&step.transfer?.isEstimatedConnector),'bridge fallback must be machine-readable as an estimated connector, not verified transit');
assert.deepEqual(mediumBridge.modes,['maxi','route_taxi'],'bridge fallback should preserve the real transit legs around the estimated connector');
const multiBridgeNodes=new Map([
  ['a',{id:'a',kind:'stand',location:{lat:10.000,lng:-61.000}}],
  ['b',{id:'b',kind:'stand',location:{lat:10.020,lng:-61.000}}],
  ['c',{id:'c',kind:'stand',location:{lat:10.040,lng:-61.000}}],
  ['d',{id:'d',kind:'stand',location:{lat:10.060,lng:-61.000}}],
  ['e',{id:'e',kind:'stand',location:{lat:10.080,lng:-61.000}}]
]);
const multiBridgeServices=[
  {id:'a-b',corridorId:'a-b',mode:'maxi',originNodeId:'a',destinationNodeId:'b',stopNodeIds:['a','b'],estimatedMinutes:5},
  {id:'c-d',corridorId:'c-d',mode:'route_taxi',originNodeId:'c',destinationNodeId:'d',stopNodeIds:['c','d'],estimatedMinutes:5}
];
const noMultiBridge=chooseConnectedJourney({fromPlace:multiBridgeNodes.get('a').location,toPlace:multiBridgeNodes.get('e').location,nodes:new Map(multiBridgeNodes),services:multiBridgeServices,knownFrom:multiBridgeNodes.get('a'),knownTo:multiBridgeNodes.get('e'),rankingOptions:{allowCorridorBridgeFallback:true,maxBridgeConnectorKm:3,maxBridgeConnectorsPerNode:3,maxEstimatedConnectorsPerJourney:1}});
assert.equal(noMultiBridge,null,'bridge fallback must not stitch journeys together with multiple unsurveyed connectors by default');

const corridorIds=new Set(services.map(service=>service.corridorId));
assert.ok(corridorIds.size>26,'regional sprint must expand the original 26 corridors');
const chagCouva=findJourney('chag-maxi-area','maxi-couva',maxiOnly,nodes,{transfers});
assert.equal(new Set(chagCouva.filter(step=>step.kind==='transit').map(step=>step.service.id)).size,1,'Chaguanas–Couva must stay on one Maxi service even across intermediate graph segments');
assert.equal(countTransfers(chagCouva),0,'Chaguanas–Couva must require no transit transfer');
const couvaChag=findJourney('maxi-couva','chag-maxi-area',maxiOnly,nodes,{transfers});
assert.equal(new Set(couvaChag.filter(step=>step.kind==='transit').map(step=>step.service.id)).size,1,'northbound SF–Chaguanas Maxi must serve Couva on one service');
assert.equal(countTransfers(couvaChag),0,'northbound Couva–Chaguanas must require no transit transfer');
const chagC3=findJourney('chag-maxi-area','c3-centre',services.filter(s=>s.mode==='maxi'||s.id==='route-taxi-san-fernando-to-c3'),nodes,{transfers});
assert.ok(chagC3.some(step=>step.kind==='transit'&&step.service.mode==='maxi'));
assert.ok(chagC3.some(step=>step.kind==='transit'&&step.service.mode==='route_taxi'));
assert.ok(chagC3.some(step=>step.kind==='transfer'),'Maxi to C3 taxi must include an explicit stand transfer');
const couvaToC3Options=chooseJourneyOptions({fromPlace:nodes.get('maxi-couva').location,toPlace:nodes.get('c3-centre').location,nodes,services,transfers,candidateLimit:10,maxAccessKm:4,accessOptions:{localWaitMinutes:30,localKph:18}});
assert.deepEqual(couvaToC3Options[0].modes,['maxi','route_taxi'],'a known taxi connection from the Maxi stand must rank ahead of an unsourced final access gap');
assert.equal(findJourney('a','b',[{...oneWay[0],serviceConfidence:'needs_review'}],oneWayNodes),null,'held service must never enter the graph');
const requiredModeNodes=new Map([
  ['a',{id:'a',location:{lat:10,lng:-61}}],['b',{id:'b',location:{lat:10.01,lng:-61}}],['c',{id:'c',location:{lat:10.02,lng:-61}}]
]);
const requiredModeServices=[
  {id:'taxi-a-b',corridorId:'taxi-a-b',mode:'route_taxi',originNodeId:'a',destinationNodeId:'b',stopNodeIds:['a','b'],estimatedMinutes:5},
  {id:'maxi-b-c',corridorId:'maxi-b-c',mode:'maxi',originNodeId:'b',destinationNodeId:'c',stopNodeIds:['b','c'],estimatedMinutes:5},
  {id:'taxi-a-c',corridorId:'taxi-a-c',mode:'route_taxi',originNodeId:'a',destinationNodeId:'c',stopNodeIds:['a','c'],estimatedMinutes:4}
];
const requiredMaxi=findJourney('a','c',requiredModeServices,requiredModeNodes,{requiredMode:'maxi',transferPenaltyMinutes:1});
assert.deepEqual(requiredMaxi.filter(step=>step.kind==='transit').map(step=>step.service.mode),['route_taxi','maxi'],'a Maxi-filtered journey may use a taxi connector but must include a Maxi leg');
const noLoopOption=chooseJourneyOptions({fromPlace:requiredModeNodes.get('a').location,toPlace:requiredModeNodes.get('c').location,nodes:requiredModeNodes,services:requiredModeServices,knownFrom:requiredModeNodes.get('a'),knownTo:requiredModeNodes.get('c'),requiredMode:'maxi'});
assert.ok(noLoopOption.every(option=>new Set([option.fromNear.node.id,...option.steps.map(step=>step.to)]).size===option.steps.length+1),'mode filtering must reject routes that loop back through a visited node');
assert.ok(findJourney('fyzabad-area','ptsc-san-fernando',services,nodes,{transfers}),'Fyzabad should connect to San Fernando through the reported local taxi connector');
assert.ok(findJourney('fyzabad-area','ptsc-point-fortin',services,nodes,{transfers}),'Fyzabad should reach Point Fortin through San Fernando/Point Fortin services after the local connector');
assert.ok(findJourney('penal-siparia-taxi','siparia-penal-taxi',localSouthOnly,nodes));
assert.ok(findJourney('maxi-mayaro','guayaguayare-area',maxiOnly,nodes));
assert.equal(findJourney('guayaguayare-area','maxi-mayaro',maxiOnly,nodes),null,'a destination label must not invent a return service');
assert.ok(findJourney('scarborough-ferry-terminal','crown-point-area',services,nodes,{transfers}),'Tobago route taxi must connect to a ferry journey through a stand walk');
assert.ok(nodes.get('maxi-mayaro').location.lng>-61.02,'Mayaro must be on the east coast');
assert.ok(nodes.get('c3-centre').location.lat>10.27&&nodes.get('c3-centre').location.lng>-61.45,'C3 must be in Corinth');
assert.ok(nodes.get('gulf-city-mall').location.lng<-61.46,'Gulf City must be at Gulf View');
assert.ok(nodes.get('ptsc-la-horquetta').location.lat<10.61,'La Horquetta must not be north of Arima');
for(const s of services.filter(s=>s.serviceConfidence==='reported_service')){
  assert.equal(s.fareTTD,null,'historical fares cannot be presented as current');
  assert.equal(s.scheduleConfidence,'unknown');
  assert.ok(s.boardingNote&&s.sources.length,'reported routes need boarding caveats and evidence');
}

console.log(`routing core tests passed: ${nodesArray.length} nodes, ${corridorIds.size} corridors, ${services.length} directed patterns, ${transfers.length} transfers`);
