import assert from 'node:assert/strict';
import {promoteAssociationCandidates,validateReview} from '../src/association-promotion-core.mjs';
import {validateDataset,validateSource} from '../src/data-contract.mjs';

const webSource={name:'Baseline',url:'https://example.com/baseline',checkedAt:'2026-09-11'};
const nodes=[
  {id:'a',name:'A Stand',kind:'stand',location:{lat:10.4,lng:-61.4},locationConfidence:'mapped_station',sources:[webSource]},
  {id:'b',name:'B Stand',kind:'stand',location:{lat:10.5,lng:-61.3},locationConfidence:'mapped_station',sources:[webSource]}
];
const services=[{
  id:'maxi-a-to-b',corridorId:'maxi-a-b',mode:'maxi',operator:'Baseline',originNodeId:'a',destinationNodeId:'b',stopNodeIds:['a','b'],
  serviceConfidence:'reported_service',geometryConfidence:'endpoints_only',geometry:null,fareTTD:null,fareConfidence:'unknown',scheduleConfidence:'unknown',sources:[webSource]
}];
const dataset={nodes,services,transfers:[],schedules:[]};
const source={submissionId:'sub-1',association:'Test Maxi Association',contactName:'Private Person',contactRole:'Secretary',contactChannel:'+1 868 555 0101',receivedAt:'2026-09-12',evidenceUrl:null};

const bundle={submissionId:'sub-1',association:'Test Maxi Association',autoPromote:false,candidates:[
  {
    candidateId:'sub-1:1',source,reviewStatus:'existing_service_upgrade_review',changeSet:{nodesToCreate:[],serviceAction:'update_existing',existingServiceId:'maxi-a-to-b',proposedService:{...services[0],operator:'Test Maxi Association',fareTTD:10,fareConfidence:'community_verified',serviceConfidence:'community_verified'},proposedSchedule:null}
  },
  {
    candidateId:'sub-1:2',source,reviewStatus:'new_nodes_and_service_review',changeSet:{
      nodesToCreate:[
        {id:'assoc-sub-1-c-1',name:'C Stand',kind:'stand',location:{lat:10.6,lng:-61.2},locationConfidence:'approximate_area',associationEvidence:{contactChannel:'must-not-leak'}},
        {id:'assoc-sub-1-d-2',name:'D Stand',kind:'stand',location:{lat:10.7,lng:-61.1},locationConfidence:'approximate_area'}
      ],
      serviceAction:'create_new',existingServiceId:null,
      proposedService:{id:'route-taxi-c-to-d',corridorId:'route-taxi-c-d',mode:'route_taxi',operator:'Test Maxi Association',originNodeId:'assoc-sub-1-c-1',destinationNodeId:'assoc-sub-1-d-2',stopNodeIds:['assoc-sub-1-c-1','assoc-sub-1-d-2'],serviceConfidence:'community_verified',geometryConfidence:'endpoints_only',geometry:null,fareTTD:8,fareConfidence:'community_verified',scheduleConfidence:'community_verified'},
      proposedSchedule:{id:'assoc-sub-1-c-d-2',serviceId:'route-taxi-c-to-d',timezone:'America/Port_of_Spain',serviceDays:['sat'],departureTimes:['08:00','09:00'],status:'published_times',confidence:'community_verified',associationEvidence:source}
    }
  },
  {candidateId:'sub-1:3',source,reviewStatus:'needs_endpoint_mapping',changeSet:{nodesToCreate:[],serviceAction:'none',proposedService:null,proposedSchedule:null}}
]};

const review={submissionId:'sub-1',reviewedAt:'2026-09-12',reviewer:'local-review',decisions:[
  {candidateId:'sub-1:1',decision:'accept'},
  {candidateId:'sub-1:2',decision:'accept',locationConfidence:'verified_station'},
  {candidateId:'sub-1:3',decision:'reject',reason:'Need exact endpoint'}
]};

validateReview(review,bundle);
const first=promoteAssociationCandidates(bundle,review,dataset);
validateDataset(first.dataset);
assert.equal(first.dataset.services.find(service=>service.id==='maxi-a-to-b').fareTTD,10);
assert.equal(first.dataset.nodes.find(node=>node.id==='assoc-sub-1-c-1').locationConfidence,'verified_station');
assert.equal(first.dataset.schedules.length,1);
assert.deepEqual(first.report.rejected,[{candidateId:'sub-1:3',reason:'Need exact endpoint'}]);
assert.equal(first.report.unreviewed.length,0);

const serialized=JSON.stringify(first.dataset);
assert.equal(serialized.includes('Private Person'),false);
assert.equal(serialized.includes('555 0101'),false);
assert.equal(serialized.includes('must-not-leak'),false);
const publicSource=first.dataset.services.find(service=>service.id==='route-taxi-c-to-d').sources.at(-1);
assert.deepEqual(publicSource,{name:'Test Maxi Association',kind:'association_contact',referenceId:'sub-1',checkedAt:'2026-09-12'});
validateSource(publicSource);

const second=promoteAssociationCandidates(bundle,review,first.dataset);
validateDataset(second.dataset);
assert.equal(second.dataset.nodes.filter(node=>node.id==='assoc-sub-1-c-1').length,1);
assert.equal(second.dataset.services.filter(service=>service.id==='route-taxi-c-to-d').length,1);
assert.equal(second.dataset.schedules.filter(schedule=>schedule.id==='assoc-sub-1-c-d-2').length,1);

const partialReview={submissionId:'sub-1',decisions:[{candidateId:'sub-1:1',decision:'reject'}]};
const partial=promoteAssociationCandidates(bundle,partialReview,dataset);
assert.deepEqual(partial.report.unreviewed,['sub-1:2','sub-1:3']);
assert.deepEqual(partial.dataset,dataset);

assert.throws(()=>promoteAssociationCandidates(bundle,{submissionId:'sub-1',decisions:[{candidateId:'sub-1:3',decision:'accept'}]},dataset),/cannot promote unresolved candidate/);
assert.throws(()=>validateReview({submissionId:'wrong',decisions:[]},bundle),/must match/);
assert.throws(()=>validateReview({submissionId:'sub-1',decisions:[{candidateId:'sub-1:99',decision:'accept'}]},bundle),/unknown candidate/);

const overlapDataset={...dataset,schedules:[{id:'existing-sat',serviceId:'maxi-a-to-b',timezone:'America/Port_of_Spain',serviceDays:['sat'],departureTimes:['07:00'],status:'published_times',confidence:'reported',sources:[webSource]}]};
const overlapBundle={submissionId:'sub-1',association:'Test Maxi Association',candidates:[{...bundle.candidates[0],changeSet:{...bundle.candidates[0].changeSet,proposedSchedule:{id:'new-sat',serviceId:'maxi-a-to-b',timezone:'America/Port_of_Spain',serviceDays:['sat'],departureTimes:['08:00'],status:'published_times',confidence:'community_verified'}}}]};
assert.throws(()=>promoteAssociationCandidates(overlapBundle,{submissionId:'sub-1',decisions:[{candidateId:'sub-1:1',decision:'accept'}]},overlapDataset),/overlapping schedule day sat/);

console.log('association promotion tests passed');
