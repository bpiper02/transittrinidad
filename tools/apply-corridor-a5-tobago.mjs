import fs from 'node:fs/promises';

const read=async path=>JSON.parse(await fs.readFile(path,'utf8'));
const write=async(path,value)=>fs.writeFile(path,`${JSON.stringify(value,null,2)}\n`,'utf8');
const nodes=await read('data/nodes.json');
const services=await read('data/services.json');
const manifestPath='data/source/corridor-promotion-manifest-2026-09-12.json';
const manifest=await read(manifestPath);

function upsertNode(node){
  const index=nodes.findIndex(item=>item.id===node.id);
  if(index>=0)nodes[index]={...nodes[index],...node};else nodes.push(node);
}

for(const node of [
  {id:'moriah-area',name:'Moriah',kind:'stop_zone',location:{lat:11.24941,lng:-60.71544},locationConfidence:'approximate_area',boardingNote:'North Side Road community marker for PTSC routing; use the current PTSC stop/roadside boarding point locally.',sources:[{name:'OpenStreetMap contributors: Moriah',url:'https://www.openstreetmap.org/node/1816584246',checkedAt:'2026-09-12'}]},
  {id:'castara-area',name:'Castara',kind:'stop_zone',location:{lat:11.281,lng:-60.6934},locationConfidence:'approximate_area',boardingNote:'North Side Road community marker for PTSC routing; use the current PTSC stop/roadside boarding point locally.',sources:[{name:'OpenStreetMap contributors: Castara',url:'https://www.openstreetmap.org/node/1816584137',checkedAt:'2026-09-12'}]},
  {id:'parlatuvier-area',name:'Parlatuvier',kind:'stop_zone',location:{lat:11.29803,lng:-60.65109},locationConfidence:'approximate_area',boardingNote:'North Side Road community marker for PTSC routing; use the current PTSC stop/roadside boarding point locally.',sources:[{name:'OpenStreetMap contributors: Parlatuvier',url:'https://www.openstreetmap.org/node/1816584263',checkedAt:'2026-09-12'}]},
  {id:'bloody-bay-area',name:'Bloody Bay',kind:'stop_zone',location:{lat:11.29311,lng:-60.62943},locationConfidence:'approximate_area',boardingNote:'North Side Road community marker for PTSC routing; use the current PTSC stop/roadside boarding point locally.',sources:[{name:'OpenStreetMap contributors: Bloody Bay village',url:'https://www.openstreetmap.org/node/1816584117',checkedAt:'2026-09-12'}]},
  {id:'roxborough-area',name:'Roxborough',kind:'stop_zone',location:{lat:11.24951,lng:-60.57622},locationConfidence:'approximate_area',boardingNote:'Windward Road community marker for PTSC routing; use the current PTSC stop/roadside boarding point locally.',sources:[{name:'OpenStreetMap contributors: Roxborough',url:'https://www.openstreetmap.org/node/1816584295',checkedAt:'2026-09-12'}]},
  {id:'speyside-area',name:'Speyside',kind:'stop_zone',location:{lat:11.29694,lng:-60.53795},locationConfidence:'approximate_area',boardingNote:'Windward Road community marker for PTSC routing; use the current PTSC stop/roadside boarding point locally.',sources:[{name:'Wikidata: Speyside coordinate location',url:'https://www.wikidata.org/wiki/Q7576463',checkedAt:'2026-09-12'}]}
])upsertNode(node);

const north=services.find(item=>item.id==='ptsc-scarborough-to-lanse-fourmi');
if(!north)throw new Error('Scarborough → L’Anse Fourmi PTSC service not found');
north.stopNodeIds=['ptsc-scarborough-shaw-park','moriah-area','castara-area','parlatuvier-area','bloody-bay-area','ptsc-lanse-fourmi-area'];
north.patternType='fixed_route';
north.boardingPolicy='fixed_only';
north.alightingPolicy='fixed_only';
const northEvidence={name:'PTSC North Side Road disruption notice names Moriah, Castara, Parlatuvier, Bloody Bay and L’Anse Fourmi service communities',url:'https://www.loopnews.com/content/ptsc-adjusts-service-in-lanse-fourmi-after-landslip/',checkedAt:'2026-09-12'};
if(!north.sources.some(item=>item.url===northEvidence.url))north.sources.push(northEvidence);

const windEast=services.find(item=>item.id==='ptsc-scarborough-to-charlotteville');
const windWest=services.find(item=>item.id==='ptsc-charlotteville-to-scarborough');
if(!windEast||!windWest)throw new Error('directional Scarborough ↔ Charlotteville PTSC services not found');
const windStops=['ptsc-scarborough-shaw-park','roxborough-area','speyside-area','ptsc-charlotteville-area'];
for(const [service,stops] of [[windEast,windStops],[windWest,[...windStops].reverse()]]){
  service.stopNodeIds=stops;
  service.patternType='fixed_route';
  service.boardingPolicy='fixed_only';
  service.alightingPolicy='fixed_only';
}

const northPattern=manifest.find(item=>item.id==='tobago-scarborough-lanse-fourmi-ptsc');
if(!northPattern)throw new Error('Northside Tobago manifest pattern missing');
northPattern.anchors=[
  {name:'Scarborough PTSC',nodeId:'ptsc-scarborough-shaw-park'},
  {name:'Moriah',nodeId:'moriah-area'},
  {name:'Castara',nodeId:'castara-area'},
  {name:'Parlatuvier',nodeId:'parlatuvier-area'},
  {name:'Bloody Bay',nodeId:'bloody-bay-area'},
  {name:"L'Anse Fourmi",nodeId:'ptsc-lanse-fourmi-area'}
];
northPattern.status='ready';
if(!manifest.some(item=>item.id==='tobago-scarborough-charlotteville-ptsc-windward'))manifest.push({
  id:'tobago-scarborough-charlotteville-ptsc-windward',region:'tobago-windward',mode:'ptsc',patternType:'fixed_route',boardingPolicy:'fixed_only',alightingPolicy:'fixed_only',status:'ready',sourceReview:'data/source/tobago-pattern-review-2026-09-12.json',
  anchors:[{name:'Scarborough PTSC',nodeId:'ptsc-scarborough-shaw-park'},{name:'Roxborough',nodeId:'roxborough-area'},{name:'Speyside',nodeId:'speyside-area'},{name:'Charlotteville',nodeId:'ptsc-charlotteville-area'}],
  notes:'PTSC Windward family kept distinct from the Northside L’Anse Fourmi corridor. Reverse is separately represented by an existing directional PTSC service.'
});

await write('data/nodes.json',nodes);
await write('public/data/nodes.json',nodes);
await write('data/services.json',services);
await write('public/data/services.json',services);
await write(manifestPath,manifest);
console.log('A5 Tobago applied: Northside and Windward PTSC corridor families promoted.');
