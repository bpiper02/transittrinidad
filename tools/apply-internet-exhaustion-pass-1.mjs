import {readFileSync,writeFileSync} from 'node:fs';
import {validateDataset} from '../src/data-contract.mjs';

const read=n=>JSON.parse(readFileSync(new URL(`../data/${n}.json`,import.meta.url),'utf8'));
const write=(n,v)=>{const t=JSON.stringify(v,null,2)+'\n';writeFileSync(new URL(`../data/${n}.json`,import.meta.url),t);writeFileSync(new URL(`../public/data/${n}.json`,import.meta.url),t);};
const nodes=read('nodes'),services=read('services'),transfers=read('transfers'),schedules=read('schedules');
const checkedAt='2026-09-12';
const src=(name,url,publishedAt)=>({name,url,checkedAt,...(publishedAt?{publishedAt}:{})});
const uniq=a=>[...new Map(a.map(x=>[x.url,x])).values()];
const upsert=(a,v)=>{const i=a.findIndex(x=>x.id===v.id);if(i>=0)a[i]=v;else a.push(v);};
const patchCorridor=(id,patch,source)=>{let count=0;for(let i=0;i<services.length;i++){if(services[i].corridorId===id){services[i]={...services[i],...patch,sources:uniq([source,...(services[i].sources||[])])};count++;}}return count;};
const patchId=(id,patch,source)=>{const i=services.findIndex(x=>x.id===id);if(i<0)throw new Error(`missing ${id}`);services[i]={...services[i],...patch,sources:uniq([source,...(services[i].sources||[])])};};

const route3Fare=src('Newsday: Route 3 Maxi fares after May 2022 adjustment','https://newsday.co.tt/2022/05/09/green-band-maxi-fares-increase-2/','2022-05-09');
const grandeFare=src('Newsday: PTSC passengers compare Grande public-transport fares','https://newsday.co.tt/2022/10/11/ptsc-passengers-want-more-than-a-cheaper-service/','2022-10-11');
const blackBandFare=src('Newsday: Route 4 Black Band fare adjustment','https://newsday.co.tt/2022/10/14/taxis-to-hike-fares-in-south-west-trinidad/','2022-10-14');
const pointFare=src('Newsday: Point Fortin/San Fernando taxi fare remains TT$20','https://newsday.co.tt/2023/10/16/pointt-fortin-san-fernando-taxis-glad-for-highway-but-fare-remains-20/','2023-10-16');
const penalFare=src('Guardian: San Fernando to Penal taxi fare TT$15','https://www.guardian.co.tt/news/penal-to-sando-drivers-criminals-coming-on-taxi-stand-6.2.2025186.1252bc1d8e','2024-05-01');
const maravalFare=src('Guardian: Maraval regular-route taxi fare TT$7','https://www.guardian.co.tt/news/higher-maraval-taxi-fares-from-monday-6.2.1653701.43930db90e','2023-03-10');
const diegoFare=src('Newsday: Diego Martin/Petit Valley taxi fare adjustment','https://newsday.co.tt/2022/10/14/taxis-to-hike-fares-in-south-west-trinidad/','2022-10-14');
const santaCruzFare=src('Newsday: Santa Cruz Taxi Drivers Association fare schedule','https://newsday.co.tt/2020/06/02/santa-cruz-taxi-fares-raised/','2020-06-02');
const mowtGrande=src('MOWT Traffic Control Sangre Grande taxi and maxi stands','https://www.mowt.gov.tt/Divisions/Administrative-Supporting-Units/Legal-Service-Unit/Legal-Notices/Legal-Notice-410-Traffic-Control-%28Sangre-Grande-%29');
const mayaroHub=src('MOWT Route Area 4 Mayaro Transport Hub lane assignments','https://www.mowt.gov.tt/Divisions/Administrative-Supporting-Units/Legal-Service-Unit/Legal-Notices/Legal-Notice-No-165-of-2015');
const rioHub=src('TriniGo: Rio Claro Transport Hub lane assignments','https://www.trinigo.com/trinidad-tobago/transport/rio-claro-mayaro/rio-claro/maxi-taxi-stand/rio-claro-transport-hub-rio-claro/');
const carenageStand=src('TnTIsland: Port of Spain route-taxi stands including Carenage','https://www.tntisland.com/routetaxis.html');
const carenageLegal=src('Government legal notice: Carenage taxi stand in Port of Spain','https://www.news.gov.tt/archive/E-Gazette/Gazette%202011/Legal%20Notice/Legal%20Notice%20No.%2032%20of%202011.pdf','2011-03-04');

patchCorridor('maxi-chaguanas--pos',{fareTTD:9,fareConfidence:'community_verified',serviceConfidence:'community_verified'},route3Fare);
patchCorridor('taxi-point-fortin-san-fernando',{fareTTD:20,fareConfidence:'community_verified',serviceConfidence:'community_verified'},pointFare);
patchCorridor('maxi-san-fernando-la-brea',{fareTTD:15,fareConfidence:'community_verified',serviceConfidence:'community_verified'},pointFare);
patchId('taxi-penal-to-san-fernando',{fareTTD:15,fareConfidence:'community_verified',serviceConfidence:'community_verified'},penalFare);
for(const id of ['maxi-princes-town-to-rio-claro']) patchId(id,{fareTTD:12,fareConfidence:'community_verified',serviceConfidence:'community_verified'},blackBandFare);
for(const id of ['maxi-princes-town-to-moruga']) patchId(id,{fareTTD:13,fareConfidence:'community_verified',serviceConfidence:'community_verified'},blackBandFare);
for(const id of ['maxi-princes-town-to-new-grant']) patchId(id,{fareTTD:8,fareConfidence:'community_verified',serviceConfidence:'community_verified'},blackBandFare);
for(const id of ['maxi-rio-claro-to-mayaro']) if(services.some(x=>x.id===id)) patchId(id,{fareTTD:10,fareConfidence:'community_verified',serviceConfidence:'community_verified'},blackBandFare);
for(const id of ['maxi-mayaro-to-guayaguayare']) if(services.some(x=>x.id===id)) patchId(id,{fareTTD:9,fareConfidence:'community_verified',serviceConfidence:'community_verified'},blackBandFare);
for(const id of ['maxi-red-pos-to-sangre-grande','maxi-red-sangre-grande-to-pos']) if(services.some(x=>x.id===id)) patchId(id,{fareTTD:15,fareConfidence:'community_verified',serviceConfidence:'community_verified'},grandeFare);

for(const id of ['san-juan-santa-cruz-taxi-to-santa-cruz-area']) if(services.some(x=>x.id===id)) patchId(id,{serviceConfidence:'community_verified',boardingNote:'San Juan to Santa Cruz association route. Fare varies by destination within Santa Cruz; use the displayed fare only when a specific segment is confirmed.'},santaCruzFare);
for(const s of services){if(/maraval/i.test(s.id)||/maraval/i.test(s.corridorId)) s.sources=uniq([maravalFare,...(s.sources||[])]);if(/diego-martin|petit-valley/i.test(s.id)||/diego-martin|petit-valley/i.test(s.corridorId)) s.sources=uniq([diegoFare,...(s.sources||[])]);}

for(const id of ['maxi-mayaro-to-rio-claro','maxi-rio-claro-to-mayaro','taxi-mayaro-to-rio-claro','taxi-rio-claro-to-mayaro','maxi-mayaro-to-guayaguayare','taxi-mayaro-to-guayaguayare']) if(services.some(x=>x.id===id)) patchId(id,{},mayaroHub);
for(const s of services){if(/rio-claro/i.test(s.id)||/rio-claro/i.test(s.corridorId)) s.sources=uniq([rioHub,...(s.sources||[])]);if(/grande|sangre/i.test(s.id)||/grande|sangre/i.test(s.corridorId)) s.sources=uniq([mowtGrande,...(s.sources||[])]);}

upsert(nodes,{id:'carenage-route-taxi-area',name:'Carenage route-taxi service area',kind:'stop_zone',location:{lat:10.6881668,lng:-61.5928155},locationConfidence:'approximate_area',boardingNote:'Carenage town-area endpoint for the documented Port of Spain/Carenage route. Exact Carenage-side stand or turnaround still needs local confirmation.',sources:[carenageStand,carenageLegal,src('OpenStreetMap contributors: Carenage','https://www.openstreetmap.org/node/1822868093')]});
upsert(services,{id:'taxi-pos-to-carenage',corridorId:'taxi-pos-carenage',mode:'route_taxi',operator:'Local route taxis',originNodeId:'maxi-pos-western-hub',destinationNodeId:'carenage-route-taxi-area',stopNodeIds:['maxi-pos-western-hub','carenage-route-taxi-area'],serviceConfidence:'reported_service',geometryConfidence:'endpoints_only',geometry:null,fareTTD:null,fareConfidence:'unknown',scheduleConfidence:'unknown',sources:[carenageStand,carenageLegal],boardingNote:'Documented Port of Spain/Carenage route. POS-side stand evidence is stronger than the Carenage-side endpoint, which remains an approximate service area. Reverse service is not inferred.'});

validateDataset({nodes,services,transfers,schedules});
write('nodes',nodes);write('services',services);write('transfers',transfers);write('schedules',schedules);
console.log(`internet exhaustion pass 1 applied: ${nodes.length} nodes, ${services.length} directed services`);
