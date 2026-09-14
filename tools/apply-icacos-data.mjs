import {readFile,writeFile} from 'node:fs/promises';

const readJson=path=>readFile(path,'utf8').then(JSON.parse);
const writeJson=(path,value)=>writeFile(path,`${JSON.stringify(value,null,2)}\n`);

const checkedAt='2026-09-14';
const icacosNode={
  id:'icacos-area',
  name:'Icacos',
  kind:'stop_zone',
  location:{lat:10.04564,lng:-61.91404},
  locationConfidence:'approximate_area',
  sources:[
    {
      name:'Mapcarta: Icacos village OpenStreetMap node 1186091819',
      url:'https://mapcarta.com/19494458',
      checkedAt
    },
    {
      name:'Geographic.org / NGA geographic names: Icacos populated place',
      url:'https://geographic.org/geographic_names/name.php?c=trinidad_and_tobago&fid=6033&uni=-1958347',
      checkedAt
    }
  ],
  boardingNote:'Area marker only; confirm the actual PTSC pickup/drop-off point locally.'
};

const icacosService={
  id:'ptsc-official-san-fernando-to-icacos',
  corridorId:'ptsc-ptsc-san-fernando-icacos-area',
  mode:'ptsc',
  operator:'PTSC',
  originNodeId:'ptsc-san-fernando',
  destinationNodeId:'icacos-area',
  stopNodeIds:['ptsc-san-fernando','icacos-area'],
  serviceConfidence:'verified_service',
  geometryConfidence:'endpoints_only',
  geometry:null,
  fareTTD:null,
  fareConfidence:'unknown',
  scheduleConfidence:'unknown',
  officialRouteTitle:'San Fernando / Icacos',
  officialRecordId:'ptsc-route-san-fernando-icacos',
  sources:[
    {
      name:'PTSC San Fernando routes',
      url:'https://ptsc.co.tt/from/sanfernando/',
      checkedAt
    },
    {
      name:'PTSC San Fernando / Icacos route',
      url:'https://ptsc.co.tt/routes/san-fernando-icacos/',
      checkedAt
    }
  ]
};

function upsertById(items,item){
  const index=items.findIndex(existing=>existing.id===item.id);
  if(index===-1)return [...items,item];
  const copy=[...items];
  copy[index]=item;
  return copy;
}

function updateLedger(ledger){
  return {
    ...ledger,
    gaps:ledger.gaps.map(gap=>{
      if(gap.id!=='ptsc-san-fernando-icacos')return gap;
      const {missingEndpoint,...rest}=gap;
      return {
        ...rest,
        status:'promoted_directional_service',
        endpointNodeId:'icacos-area',
        promotedServiceId:'ptsc-official-san-fernando-to-icacos',
        nextAction:'Field-check the exact Icacos boarding/drop-off point and add the reverse Icacos → San Fernando service only if a source supports that direction.'
      };
    })
  };
}

for(const path of ['data/nodes.json','public/data/nodes.json']){
  const nodes=await readJson(path);
  await writeJson(path,upsertById(nodes,icacosNode));
}

for(const path of ['data/services.json','public/data/services.json']){
  const services=await readJson(path);
  await writeJson(path,upsertById(services,icacosService));
}

const ledgerPath='data/source/southwest-official-edge-gaps-2026-09-14.json';
const ledger=await readJson(ledgerPath);
await writeJson(ledgerPath,updateLedger(ledger));

console.log('Applied Icacos PTSC endpoint/service patch.');
