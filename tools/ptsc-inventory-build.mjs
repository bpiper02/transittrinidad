import {readFile,writeFile} from 'node:fs/promises';

const [snapshotPath='data/source/ptsc-directory-2026-09-13.json',farePath='data/source/ptsc-fares-2026-09-13.json',outputPath='data/source/ptsc-route-review-2026-09-13.json']=process.argv.slice(2);
const [snapshot,fareCapture,nodes,services]=await Promise.all([
  readFile(snapshotPath,'utf8').then(JSON.parse),readFile(farePath,'utf8').then(JSON.parse),
  readFile(new URL('../data/nodes.json',import.meta.url),'utf8').then(JSON.parse),
  readFile(new URL('../data/services.json',import.meta.url),'utf8').then(JSON.parse)
]);

const aliases={
  'port of spain':'ptsc-pos-transit-centre','san fernando':'ptsc-san-fernando','chaguanas':'ptsc-chaguanas',
  arima:'ptsc-arima','sangre grande':'ptsc-sangre-grande','point fortin':'ptsc-point-fortin',curepe:'ptsc-curepe',
  'university of the west indies uwi':'ptsc-uwi-st-augustine','la horquetta':'ptsc-la-horquetta',aripo:'ptsc-aripo',
  wallerfield:'ptsc-wallerfield','st helena':'ptsc-st-helena-carapo',scarborough:'ptsc-scarborough-shaw-park',
  charlotteville:'ptsc-charlotteville-area','l anse fourmi':'ptsc-lanse-fourmi-area',toco:'ptsc-toco-area',
  'crown point':'crown-point-area',buccoo:'buccoo-area',fyzabad:'fyzabad-area',erin:'erin-area',
  guayaguayare:'guayaguayare-area',moruga:'moruga-area','princes town':'princes-town-local-area','rio claro':'rio-claro-hub',
  'la brea':'la-brea-area',tunapuna:'tunapuna-area',maloney:'maloney-area',chaguaramas:'chaguaramas-area',
  maraval:'maraval-area','san juan':'san-juan-area','santa cruz':'santa-cruz-area','diego martin':'maxi-diego-martin',
  couva:'maxi-couva',mayaro:'maxi-mayaro'
};
const key=value=>String(value||'').toLowerCase().replace(/[’']/g,' ').replace(/[^a-z0-9]+/g,' ').trim();
const nodeIds=new Set(nodes.map(node=>node.id));
const resolve=name=>{const id=aliases[key(name)];return id&&nodeIds.has(id)?id:null;};
const officialUrlToService=new Map();
for(const service of services.filter(service=>service.mode==='ptsc'))for(const source of service.sources||[])if(source.url)officialUrlToService.set(source.url.replace(/\/$/,''),service.id);
const fareSource={...fareCapture.source};
const candidates=snapshot.catalog.map(record=>{
  const officialId=record.officialId.replace('ptsc-card-','');
  const from=record.from?.[0]?.name||null,to=record.to?.at(-1)?.name||null;
  const originNodeId=resolve(from),destinationNodeId=resolve(to);
  const existingServiceId=officialUrlToService.get(record.url.replace(/\/$/,''))||null;
  const fareTTD=fareCapture.faresByOfficialId[officialId]??null;
  const blockers=[];
  if(!from||!to)blockers.push('official_endpoint_taxonomy_missing');
  if(from&&!originNodeId)blockers.push('origin_node_unresolved');
  if(to&&!destinationNodeId)blockers.push('destination_node_unresolved');
  if(fareTTD==null)blockers.push('official_fare_unavailable');
  return{officialId:record.officialId,title:record.title,url:record.url,from,to,originNodeId,destinationNodeId,
    serviceDays:(record.serviceDays||[]).map(item=>item.name),fareTTD,
    fareConfidence:fareTTD==null?'unknown':'official_current',fareSource:fareTTD==null?null:fareSource,
    existingServiceId,status:existingServiceId?'already_represented':blockers.some(item=>item.includes('node')||item.includes('endpoint'))?'needs_endpoint_mapping':'ready_for_service_review',blockers};
});
const counts=candidates.reduce((out,item)=>(out[item.status]=(out[item.status]||0)+1,out),{});
const output={generatedAt:new Date().toISOString(),source:snapshot.source,total:candidates.length,counts,candidates};
await writeFile(outputPath,`${JSON.stringify(output,null,2)}\n`);
console.log(`PTSC review inventory: ${candidates.length} records · ${Object.entries(counts).map(([key,value])=>`${key} ${value}`).join(' · ')}`);
