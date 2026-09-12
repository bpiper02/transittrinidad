import {readFileSync,writeFileSync} from 'node:fs';
import {validateDataset} from '../src/data-contract.mjs';

const read=name=>JSON.parse(readFileSync(new URL(`../data/${name}.json`,import.meta.url),'utf8'));
const write=(name,value)=>{
  const text=JSON.stringify(value,null,2)+'\n';
  writeFileSync(new URL(`../data/${name}.json`,import.meta.url),text);
  writeFileSync(new URL(`../public/data/${name}.json`,import.meta.url),text);
};
const nodes=read('nodes'),services=read('services'),transfers=read('transfers'),schedules=read('schedules');
const checkedAt='2026-09-12';
const src=(name,url,extra={})=>({name,url,checkedAt,...extra});
const uniqueSources=list=>[...new Map(list.map(item=>[item.url||`${item.kind}:${item.referenceId}`,item])).values()];
const upsert=(list,value)=>{const i=list.findIndex(item=>item.id===value.id);if(i>=0)list[i]=value;else list.push(value);};
const update=(list,id,fn)=>{const i=list.findIndex(item=>item.id===id);if(i<0)throw new Error(`missing ${id}`);list[i]=fn(list[i]);};

const ptscScarborough=src('PTSC Scarborough current routes','https://ptsc.co.tt/from/scarborough/');
const ptscGrande=src('PTSC Sangre Grande current routes','https://ptsc.co.tt/from/sangre-grande/');
const ptscSaturday=src('PTSC Saturday routes','https://ptsc.co.tt/periodical/saturday/');
const ptscSunday=src('PTSC Sunday routes','https://ptsc.co.tt/periodical/sunday/');
const ptscStops=src('PTSC Bus Stops and Depots','https://ptsc.co.tt/routes-and-schedules-2/schedules/');
const mowtGrande=src('MOWT Traffic Control (Sangre Grande): Toco and Mayaro Maxi stands','https://mowt.gov.tt/Divisions/Administrative-Supporting-Units/Legal-Service-Unit/Legal-Notices/Legal-Notice-410-Traffic-Control-%28Sangre-Grande-%29');
const guardianGrande=src('Guardian: Sangre Grande maxi hub operating from Brierley Street','https://www.guardian.co.tt/news/maxi-taxi-shut-down-leaves-sangre-grande-commuters-scrambling-6.2.2596990.938df5d0a9',{publishedAt:'2026-06-02'});
const route2NoIncrease=src('Newsday: Route 2 association reported no fare increase planned','https://newsday.co.tt/2026/01/04/ministry-toll-increase-will-not-affect-maxi-taxis-immediately/',{publishedAt:'2026-01-04'});
const route2GrandeFare=src('Newsday passenger report: direct City Gate to Sangre Grande Maxi fare was TT$15','https://newsday.co.tt/2022/08/24/yes-there-are-maxi-taxis-to-grande/',{publishedAt:'2022-08-24'});
const ptscCurrent=src('PTSC current Routes and Schedules','https://ptsc.co.tt/routes-and-schedules/');
const osm=n=>src(`OpenStreetMap contributors: ${n.name}`,`https://www.openstreetmap.org/node/${n.osmId}`);

// Strengthen exact/mapped public boarding evidence already represented in the graph.
update(nodes,'maxi-pos-western-hub',node=>({...node,name:'Port of Spain Route 1 Maxi-Taxi Association stand',location:{lat:10.64785,lng:-61.51115},locationConfidence:'mapped_station',boardingNote:'Mapped Route 1 Maxi-Taxi Association stand on Wrightson Road. Confirm the exact bay for your destination.',sources:uniqueSources([src('OpenStreetMap contributors: Route 1 Maxi-Taxi Association','https://www.openstreetmap.org/way/349610834'),...node.sources])}));
update(nodes,'grande-maxi-area',node=>({...node,name:'Sangre Grande Maxi hub — Brierley Street',boardingNote:'Brierley Street Maxi hub. MOWT places Toco and Mayaro route maxis on the southern side of Brierley Street facing east toward Railway Road No. 1. Individual bays can change.',sources:uniqueSources([guardianGrande,mowtGrande,...node.sources])}));

// Official PTSC endpoints where the exact boarding platform is not yet surveyed are intentionally stop_zones.
for(const node of [
  {id:'ptsc-scarborough-shaw-park',name:'PTSC Scarborough depot area — Shaw Park',kind:'terminal',location:{lat:11.1776,lng:-60.7475},locationConfidence:'approximate_area',boardingNote:'PTSC lists its Scarborough depot at Old Government Farm Road, Shaw Park. Coordinate is a Shaw Park area anchor, not a surveyed bus bay.',sources:[ptscStops,src('Tobago public infrastructure address: Old Government Farm Road, Shaw Park','https://www.infrastructuretha.gov.tt/contact/')]},
  {id:'ptsc-charlotteville-area',name:'Charlotteville PTSC service area',kind:'stop_zone',location:{lat:11.3223399,lng:-60.5473352},locationConfidence:'approximate_area',boardingNote:'Town-area endpoint for the official PTSC Charlotteville service; exact boarding point requires local confirmation.',sources:[ptscScarborough,ptscSaturday,ptscSunday,osm({name:'Charlotteville',osmId:1816584141})]},
  {id:'ptsc-lanse-fourmi-area',name:"L'Anse Fourmi PTSC service area",kind:'stop_zone',location:{lat:11.3106249,lng:-60.6159008},locationConfidence:'approximate_area',boardingNote:"Village-area endpoint for the official PTSC L'Anse Fourmi service; exact boarding point requires local confirmation.",sources:[ptscScarborough,ptscSaturday,ptscSunday,osm({name:"L'Anse Fourmi",osmId:1816584200})]},
  {id:'ptsc-toco-area',name:'Toco PTSC service area',kind:'stop_zone',location:{lat:10.8368357,lng:-60.9376753},locationConfidence:'approximate_area',boardingNote:'Town-area waypoint/end point on PTSC’s current Sangre Grande / Toco / Matelot coach service; exact Toco boarding point requires local confirmation.',sources:[ptscGrande,osm({name:'Toco',osmId:1128895911})]}
]) upsert(nodes,node);

const verified=(value)=>({serviceConfidence:'verified_service',geometryConfidence:'endpoints_only',geometry:null,fareTTD:null,fareConfidence:'unknown',scheduleConfidence:'unknown',...value});
for(const service of [
  verified({id:'ptsc-scarborough-to-charlotteville',corridorId:'ptsc-scarborough-charlotteville',mode:'ptsc',operator:'PTSC',originNodeId:'ptsc-scarborough-shaw-park',destinationNodeId:'ptsc-charlotteville-area',stopNodeIds:['ptsc-scarborough-shaw-park','ptsc-charlotteville-area'],sources:[ptscScarborough,ptscSaturday,ptscSunday],boardingNote:'Official current PTSC route. Exact Charlotteville stop and departure times are not claimed until published route details are captured.'}),
  verified({id:'ptsc-charlotteville-to-scarborough',corridorId:'ptsc-scarborough-charlotteville',mode:'ptsc',operator:'PTSC',originNodeId:'ptsc-charlotteville-area',destinationNodeId:'ptsc-scarborough-shaw-park',stopNodeIds:['ptsc-charlotteville-area','ptsc-scarborough-shaw-park'],sources:[ptscSaturday,ptscSunday],boardingNote:'PTSC currently lists Charlotteville / Scarborough weekend service. Exact departure times are not claimed.'}),
  verified({id:'ptsc-scarborough-to-lanse-fourmi',corridorId:'ptsc-scarborough-lanse-fourmi',mode:'ptsc',operator:'PTSC',originNodeId:'ptsc-scarborough-shaw-park',destinationNodeId:'ptsc-lanse-fourmi-area',stopNodeIds:['ptsc-scarborough-shaw-park','ptsc-lanse-fourmi-area'],sources:[ptscScarborough,ptscSaturday,ptscSunday],boardingNote:"Official current PTSC Scarborough / L'Anse Fourmi service. Reverse service is not synthesized without independent directional evidence."}),
  verified({id:'ptsc-sangre-grande-to-toco',corridorId:'ptsc-sangre-grande-toco',mode:'ptsc',operator:'PTSC',originNodeId:'ptsc-sangre-grande',destinationNodeId:'ptsc-toco-area',stopNodeIds:['ptsc-sangre-grande','ptsc-toco-area'],sources:[ptscGrande],boardingNote:'Toco is explicitly named on PTSC’s current Sangre Grande / Toco / Matelot coach route. This models the Sangre Grande → Toco usable segment only; no reverse is inferred.'}),
  verified({id:'ptsc-scarborough-to-buccoo',corridorId:'ptsc-scarborough-buccoo',mode:'ptsc',operator:'PTSC',originNodeId:'ptsc-scarborough-shaw-park',destinationNodeId:'buccoo-area',stopNodeIds:['ptsc-scarborough-shaw-park','buccoo-area'],fareTTD:3,fareConfidence:'official_current',sources:[ptscScarborough,src('PTSC current homepage: Scarborough to Buccoo TT$3','https://ptsc.co.tt/')],boardingNote:'PTSC currently advertises Scarborough → Buccoo for TT$3. Reverse is not inferred.'}),
  verified({id:'ptsc-sangre-grande-to-guayaguayare',corridorId:'ptsc-sangre-grande-guayaguayare',mode:'ptsc',operator:'PTSC',originNodeId:'ptsc-sangre-grande',destinationNodeId:'guayaguayare-area',stopNodeIds:['ptsc-sangre-grande','guayaguayare-area'],sources:[ptscGrande],boardingNote:'Official current PTSC directional route listing; exact times/fare not claimed here.'}),
  verified({id:'ptsc-sangre-grande-to-rio-claro',corridorId:'ptsc-sangre-grande-rio-claro',mode:'ptsc',operator:'PTSC',originNodeId:'ptsc-sangre-grande',destinationNodeId:'rio-claro-hub',stopNodeIds:['ptsc-sangre-grande','rio-claro-hub'],sources:[ptscGrande],boardingNote:'Official current PTSC directional route listing; exact times/fare not claimed here.'}),
  verified({id:'ptsc-pos-to-chaguaramas',corridorId:'ptsc-pos-chaguaramas',mode:'ptsc',operator:'PTSC',originNodeId:'ptsc-pos-transit-centre',destinationNodeId:'chaguaramas-area',stopNodeIds:['ptsc-pos-transit-centre','chaguaramas-area'],sources:[ptscSaturday],boardingNote:'PTSC currently lists POS / Chaguaramas weekend service. Reverse is not inferred.'})
]) upsert(services,service);

// Upgrade current PTSC fare confidence where the live 2026 route index itself displays the fare.
for(const id of ['ptsc-arima-to-la-horquetta','ptsc-arima-to-st-helena-carapo','ptsc-arima-to-aripo']) update(services,id,service=>({...service,fareConfidence:'official_current',sources:uniqueSources([ptscCurrent,...service.sources])}));

// Strengthen current Route 2 and Sangre Grande evidence without pretending we have a 2026 tariff card.
for(const id of ['maxi-red-pos-to-sangre-grande','maxi-red-sangre-grande-to-pos']) update(services,id,service=>({...service,sources:uniqueSources([guardianGrande,route2NoIncrease,route2GrandeFare,...service.sources])}));
for(const id of ['maxi-mayaro-to-grande','taxi-mayaro-to-grande']) update(services,id,service=>({...service,sources:uniqueSources([mowtGrande,guardianGrande,...service.sources])}));

validateDataset({nodes,services,transfers,schedules});
write('nodes',nodes);write('services',services);write('transfers',transfers);write('schedules',schedules);
console.log(`web depth applied: ${nodes.length} nodes, ${services.length} directed services`);
