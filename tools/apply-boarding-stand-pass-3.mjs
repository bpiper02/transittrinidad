import {readFileSync,writeFileSync} from 'node:fs';
import {validateDataset} from '../src/data-contract.mjs';

const read=n=>JSON.parse(readFileSync(new URL(`../data/${n}.json`,import.meta.url),'utf8'));
const write=(n,v)=>{const t=JSON.stringify(v,null,2)+'\n';writeFileSync(new URL(`../data/${n}.json`,import.meta.url),t);writeFileSync(new URL(`../public/data/${n}.json`,import.meta.url),t);};
const nodes=read('nodes'),services=read('services'),transfers=read('transfers'),schedules=read('schedules');
const checkedAt='2026-09-12';
const src=(name,url,publishedAt)=>({name,url,checkedAt,...(publishedAt?{publishedAt}:{})});
const uniq=a=>[...new Map(a.map(x=>[x.url,x])).values()];
const nodeById=id=>{const n=nodes.find(x=>x.id===id);if(!n)throw new Error(`missing node ${id}`);return n;};
const patchNode=(id,patch,source)=>{const i=nodes.findIndex(x=>x.id===id);if(i<0)throw new Error(`missing node ${id}`);nodes[i]={...nodes[i],...patch,sources:uniq([source,...(nodes[i].sources||[])])};console.log(`node ${id}`);};
const patchServices=(label,pred,patch,source,{min=1,max=20}={})=>{let n=0;for(let i=0;i<services.length;i++)if(pred(services[i])){services[i]={...services[i],...patch,sources:uniq([source,...(services[i].sources||[])])};n++;}if(n<min||n>max)throw new Error(`${label}: expected ${min}-${max}, got ${n}`);console.log(`${label}: ${n}`);};

const posLaw=src('Motor Vehicles and Road Traffic Act: Port-of-Spain Transit Centre Taxi Stand Order','https://www.mowt.gov.tt/MOWT/media/General/Legislation/48-50.pdf');
const grandeLaw=src('MOWT Traffic Control (Sangre Grande): Toco and Mayaro Maxi stands','https://mowt.gov.tt/Divisions/Administrative-Supporting-Units/Legal-Service-Unit/Legal-Notices/Legal-Notice-410-Traffic-Control-%28Sangre-Grande-%29');
const mayaroLaw=src('Traffic Control (Experimental Scheme) Route Area 4 Maxi-Taxi and Taxi Stand (Mayaro) Regulations, 2016','https://news.gov.tt/sites/default/files/E-Gazette/Gazette%202016/Legal%20Notice/Legal%20Notice%20No.%2035%20of%202016.pdf','2016-03-11');
const mayaro2021=src('MOWT Traffic Control (Mayaro/Mafeking Taxi Stand) Order, 2021','https://www.mowt.gov.tt/Divisions/Administrative-Supporting-Units/Legal-Service-Unit/Legal-Notices/Legal-Notice-263','2021-10-21');

// The Grande hub is a named, legally designated boarding facility rather than a town centroid.
patchNode('grande-maxi-area',{
  name:'Sangre Grande Maxi-Taxi Hub — Brierley Street',
  kind:'stand',
  locationConfidence:'mapped_station',
  boardingNote:'Board at the Brierley Street Maxi-Taxi Hub. MOWT designates Toco/Mayaro maxis on the southern side of Brierley Street facing east toward Railway Road No. 1; confirm the individual bay for Port of Spain/Arima services.'
},grandeLaw);

// POS Transit Centre has legally designated loading bays for these routes. Keep one shared node but make boarding instructions route-specific.
patchServices('POS-origin Arima maxi bay',s=>s.mode==='maxi'&&s.originNodeId==='ptsc-pos-transit-centre'&&`${s.id} ${s.corridorId}`.includes('arima'),{
  boardingNote:'At the Port of Spain Transit Centre Maxi-Taxi facility, use Platform 2, Bays A–D for the Arima Priority Bus Route service.'
},posLaw,{min:1,max:4});
patchServices('POS-origin Chaguanas maxi bay',s=>s.mode==='maxi'&&s.originNodeId==='ptsc-pos-transit-centre'&&`${s.id} ${s.corridorId}`.includes('chaguanas'),{
  boardingNote:'At the Port of Spain Transit Centre Maxi-Taxi facility, use Platform 3, Bay C for the Chaguanas service.'
},posLaw,{min:1,max:4});
patchServices('POS-origin San Fernando maxi bay',s=>s.mode==='maxi'&&s.originNodeId==='ptsc-pos-transit-centre'&&`${s.id} ${s.corridorId}`.includes('san-fernando'),{
  boardingNote:'At the Port of Spain Transit Centre Maxi-Taxi facility, use Platform 3, Bays A–B for the San Fernando service.'
},posLaw,{min:1,max:4});

// Grande outbound rural services get the legally designated side of the hub where the canonical pattern exists.
patchServices('Grande-origin Toco/Mayaro maxi boarding',s=>s.mode==='maxi'&&s.originNodeId==='grande-maxi-area'&&(/toco|mayaro/.test(`${s.id} ${s.corridorId}`)),{
  boardingNote:'Board on the southern side of Brierley Street at the Sangre Grande Maxi-Taxi Hub, facing east toward Railway Road No. 1.'
},grandeLaw,{min:1,max:6});

// Mayaro evidence is strong enough to improve instructions, but not to guess a coordinate/bay if the graph only has an area node.
patchServices('Mayaro-origin Rio Claro/Guayaguayare maxi stand evidence',s=>s.mode==='maxi'&&/mayaro/.test(s.originNodeId)&&(/rio-claro|guayaguayare/.test(`${s.id} ${s.corridorId}`)),{
  boardingNote:'Use the Mayaro Transport Hub. The published stand scheme assigns Rio Claro maxis to Lane 4 and Guayaguayare maxis to Lane 5; verify the current lane on arrival.'
},mayaroLaw,{min:1,max:6});
patchServices('Mayaro/Mafeking taxi stand evidence',s=>s.mode==='route_taxi'&&/mayaro/.test(s.originNodeId)&&/mafeking/.test(`${s.id} ${s.corridorId}`),{
  boardingNote:'The Mayaro/Mafeking taxi stand is on the southern side of Naparima-Mayaro Road, beginning about 15 m west of the Guayaguayare-Mayaro Road intersection, with taxis facing west.'
},mayaro2021,{min:0,max:4});

validateDataset({nodes,services,transfers,schedules});
write('nodes',nodes);write('services',services);write('transfers',transfers);write('schedules',schedules);
console.log(`boarding pass 3 applied: ${nodes.length} nodes, ${services.length} directed services`);
