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
    id:'tunapuna-area',name:'Tunapuna',kind:'stop_zone',location:{lat:10.64362,lng:-61.39072},locationConfidence:'approximate_area',
    boardingNote:'Route 2 corridor community marker; confirm the current PBR roadside pickup point and direction locally.',
    sources:[{name:'OpenStreetMap contributors: Tunapuna',url:'https://www.openstreetmap.org/node/477483943',checkedAt:'2026-09-12'}]
  },
  {
    id:'five-rivers-area',name:'Five Rivers',kind:'stop_zone',location:{lat:10.64178,lng:-61.34458},locationConfidence:'approximate_area',
    boardingNote:'Route 2 corridor community marker; confirm the current PBR roadside pickup point and direction locally.',
    sources:[{name:'OpenStreetMap contributors: Five Rivers',url:'https://www.openstreetmap.org/node/1049296379',checkedAt:'2026-09-12'}]
  },
  {
    id:'dabadie-area',name:"D'Abadie",kind:'stop_zone',location:{lat:10.62899,lng:-61.31091},locationConfidence:'approximate_area',
    boardingNote:'Route 2 corridor community marker; confirm the current PBR roadside pickup point and direction locally.',
    sources:[{name:"OpenStreetMap contributors: D'Abadie",url:'https://www.openstreetmap.org/node/1453546938',checkedAt:'2026-09-12'}]
  }
])upsertNode(node);

const east=services.find(item=>item.id==='maxi-pos-arima-out');
const west=services.find(item=>item.id==='maxi-pos-arima-back');
if(!east||!west)throw new Error('POS-Arima directional maxi services not found');
const eastStops=['ptsc-pos-transit-centre','ptsc-curepe','tunapuna-area','five-rivers-area','dabadie-area','arima-pbr-maxi'];
const westStops=[...eastStops].reverse();
for(const [service,stops,direction] of [[east,eastStops,'eastbound'],[west,westStops,'westbound']]){
  service.stopNodeIds=stops;
  service.serviceConfidence='community_verified';
  service.patternType='local';
  service.boardingPolicy='mixed';
  service.alightingPolicy='corridor_request';
  service.boardingNote=`Route 2 PBR ${direction} pattern with supported short-drop markets. Confirm the exact current pickup point within each community.`;
  for(const source of [
    {name:'Newsday: Route 2 fare ladder names Curepe, Tunapuna/Cane Farm, Five Rivers, D’Abadie and Arima',url:'https://newsday.co.tt/2021/11/01/busy-monday-in-tt-as-bars-reopen-full-public-service-back-out-to-work/',checkedAt:'2026-09-12',publishedAt:'2021-11-01'},
    {name:'Newsday: Route 2 destination services and short drops',url:'https://newsday.co.tt/2021/10/07/route-two-maxi-taxi-fares-to-increase-on-nov-1/',checkedAt:'2026-09-12',publishedAt:'2021-10-07'}
  ])if(!service.sources.some(item=>item.url===source.url))service.sources.push(source);
}

const eastPattern=manifest.find(item=>item.id==='route2-pos-arima-pbr-eastbound');
if(!eastPattern)throw new Error('eastbound POS-Arima manifest pattern missing');
eastPattern.anchors=[
  {name:'Port of Spain',nodeId:'ptsc-pos-transit-centre'},
  {name:'Curepe',nodeId:'ptsc-curepe'},
  {name:'Tunapuna',nodeId:'tunapuna-area'},
  {name:'Five Rivers',nodeId:'five-rivers-area'},
  {name:"D'Abadie",nodeId:'dabadie-area'},
  {name:'Arima',nodeId:'arima-pbr-maxi'}
];
eastPattern.status='ready';
if(!manifest.some(item=>item.id==='route2-arima-pos-pbr-westbound'))manifest.push({
  id:'route2-arima-pos-pbr-westbound',region:'east',mode:'maxi',patternType:'local',boardingPolicy:'mixed',alightingPolicy:'corridor_request',status:'ready',sourceReview:'data/source/east-corridor-pattern-review-2026-09-12.json',
  anchors:[...eastPattern.anchors].reverse(),notes:'Separately supported westbound service and short-drop fare ladder; not auto-synthesized from eastbound.'
});

await write('data/nodes.json',nodes);
await write('public/data/nodes.json',nodes);
await write('data/services.json',services);
await write('public/data/services.json',services);
await write(manifestPath,manifest);
console.log('East A3 applied: directional POS ↔ Arima PBR local patterns promoted.');
