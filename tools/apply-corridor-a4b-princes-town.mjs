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
  {
    id:'palmyra-area',name:'Palmyra Village',kind:'stop_zone',location:{lat:10.28546,lng:-61.42362},locationConfidence:'approximate_area',
    boardingNote:'Naparima-Mayaro Road community marker for the local San Fernando–Princes Town service; confirm the safest current roadside pickup point locally.',
    sources:[{name:'OpenStreetMap contributors: Palmyra Village',url:'https://www.openstreetmap.org/node/1453289591',checkedAt:'2026-09-12'}]
  },
  {
    id:'mount-stewart-area',name:'Mount Stewart Village',kind:'stop_zone',location:{lat:10.29034,lng:-61.4109},locationConfidence:'approximate_area',
    boardingNote:'Naparima-Mayaro Road community marker for the local San Fernando–Princes Town service; confirm the safest current roadside pickup point locally.',
    sources:[{name:'OpenStreetMap contributors: Mount Stewart Village',url:'https://www.openstreetmap.org/node/1453289590',checkedAt:'2026-09-12'}]
  },
  {
    id:'cleghorn-area',name:'Cleghorn Village',kind:'stop_zone',location:{lat:10.29115,lng:-61.40192},locationConfidence:'approximate_area',
    boardingNote:'Naparima-Mayaro Road community marker for the local San Fernando–Princes Town service; confirm the safest current roadside pickup point locally.',
    sources:[{name:'OpenStreetMap contributors: Cleghorn Village',url:'https://www.openstreetmap.org/node/1453289586',checkedAt:'2026-09-12'}]
  },
  {
    id:'iere-area',name:'Iere Village',kind:'stop_zone',location:{lat:10.29199,lng:-61.38536},locationConfidence:'approximate_area',
    boardingNote:'Naparima-Mayaro Road community marker for the local San Fernando–Princes Town service; confirm the safest current roadside pickup point locally.',
    sources:[{name:'OpenStreetMap contributors: Iere Village',url:'https://www.openstreetmap.org/node/1453289588',checkedAt:'2026-09-12'}]
  }
])upsertNode(node);

const service=services.find(item=>item.id==='maxi-black-san-fernando-to-princes-town');
if(!service)throw new Error('San Fernando → Princes Town black-band service not found');
service.stopNodeIds=['sf-princes-town-maxi','palmyra-area','mount-stewart-area','cleghorn-area','iere-area','princes-town-local-area'];
service.serviceConfidence='community_verified';
service.patternType='local';
service.boardingPolicy='corridor_hail';
service.alightingPolicy='corridor_request';
service.boardingNote='Local Route 4 service along Naparima-Mayaro Road. Supported communities are corridor markers; confirm the exact safe roadside pickup point and tell the driver where you are getting off.';
const evidence={name:'Newsday: Princes Town–San Fernando Main Road route serves Iere, Mt Stewart, Cleghorn and Palmyra fare stages',url:'https://newsday.co.tt/2022/10/04/main-road-fares-to-go-up-by-1-on-princes-town-san-fernando-route/',checkedAt:'2026-09-12',publishedAt:'2022-10-04'};
if(!service.sources.some(item=>item.url===evidence.url))service.sources.push(evidence);

const pattern=manifest.find(item=>item.id==='san-fernando-princes-town-local');
if(!pattern)throw new Error('San Fernando → Princes Town manifest pattern missing');
pattern.anchors=[
  {name:'San Fernando',nodeId:'sf-princes-town-maxi'},
  {name:'Palmyra',nodeId:'palmyra-area'},
  {name:'Mount Stewart',nodeId:'mount-stewart-area'},
  {name:'Cleghorn',nodeId:'cleghorn-area'},
  {name:'Iere',nodeId:'iere-area'},
  {name:'Princes Town',nodeId:'princes-town-local-area'}
];
pattern.status='ready';
pattern.notes='Local Naparima-Mayaro Road pattern. Off-route paid deviations remain excluded. Directional promotion only; reverse endpoint service remains unchanged.';

await write('data/nodes.json',nodes);
await write('public/data/nodes.json',nodes);
await write('data/services.json',services);
await write('public/data/services.json',services);
await write(manifestPath,manifest);
console.log('A4b applied: San Fernando → Princes Town local corridor promoted.');
