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

upsertNode({
  id:'claxton-bay-area',name:'Claxton Bay',kind:'stop_zone',
  location:{lat:10.35344,lng:-61.45694},locationConfidence:'approximate_area',
  boardingNote:'Southern Main Road community marker for the local Chaguanas–San Fernando maxi pattern; hail roadside in the service direction and confirm with the driver.',
  sources:[{name:'OpenStreetMap contributors: Claxton Bay',url:'https://www.openstreetmap.org/node/1383960097',checkedAt:'2026-09-12'}]
});
upsertNode({
  id:'marabella-area',name:'Marabella',kind:'stop_zone',
  location:{lat:10.30735,lng:-61.45187},locationConfidence:'approximate_area',
  boardingNote:'Marabella community marker on the local Southern Main Road corridor; confirm the safest current roadside pickup point locally.',
  sources:[{name:'OpenStreetMap contributors: Marabella',url:'https://www.openstreetmap.org/node/1270405996',checkedAt:'2026-09-12'}]
});

const service=services.find(item=>item.id==='maxi-chag-san-fernando-out');
if(!service)throw new Error('maxi-chag-san-fernando-out not found');
service.stopNodeIds=['chag-maxi-area','chase-village-area','maxi-couva','california-area','claxton-bay-area','marabella-area','sf-chag-maxi'];
service.serviceConfidence='community_verified';
service.patternType='local';
service.boardingPolicy='corridor_hail';
service.alightingPolicy='corridor_request';
service.boardingNote='Local southbound Route 3 pattern via Southern Main Road. Riders may hail along supported corridor communities; confirm the exact safe roadside pickup point and destination with the driver.';
for(const source of [
  {name:'Guardian: Route 3 riders drop out in Southern Main Road communities between Chaguanas and San Fernando',url:'https://www.guardian.co.tt/article-6.2.365128.7ddda70ddb',checkedAt:'2026-09-12',publishedAt:'2015-01-23'},
  {name:'Newsday: Chaguanas-San Fernando maxi driver operating through Claxton Bay',url:'https://newsday.co.tt/2022/01/22/claxton-bay-residents-maxi-taxi-drivers-hold-fiery-protest/',checkedAt:'2026-09-12',publishedAt:'2022-01-22'}
])if(!service.sources.some(item=>item.url===source.url))service.sources.push(source);

const pattern=manifest.find(item=>item.id==='route3-chaguanas-san-fernando-local-southbound');
if(!pattern)throw new Error('central-south promotion pattern missing');
for(const anchor of pattern.anchors){
  if(anchor.name==='Claxton Bay')anchor.nodeId='claxton-bay-area';
  if(anchor.name==='Marabella')anchor.nodeId='marabella-area';
}
pattern.status='ready';

await write('data/nodes.json',nodes);
await write('public/data/nodes.json',nodes);
await write('data/services.json',services);
await write('public/data/services.json',services);
await write(manifestPath,manifest);
console.log('Central-South A2 applied: southbound local Chaguanas → San Fernando corridor promoted.');
