import fs from 'node:fs/promises';
import {validateFareDataset} from '../src/fare-core.mjs';

function argsToObject(args){
  const out={};
  for(let i=0;i<args.length;i++){
    const token=args[i];
    if(!token.startsWith('--'))continue;
    const key=token.slice(2);
    const value=args[i+1]&&!args[i+1].startsWith('--')?args[++i]:true;
    out[key]=value;
  }
  return out;
}
function slug(value){return String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}

const input=argsToObject(process.argv.slice(2));
for(const key of ['service','from','to','min','max','confidence','method'])if(input[key]==null)throw new Error(`Missing --${key}`);
const minTTD=Number(input.min),maxTTD=Number(input.max);
if(!Number.isFinite(minTTD)||!Number.isFinite(maxTTD))throw new Error('--min and --max must be numbers');

const [nodesText,servicesText,faresText]=await Promise.all([
  fs.readFile('data/nodes.json','utf8'),
  fs.readFile('data/services.json','utf8'),
  fs.readFile('data/fares.json','utf8')
]);
const nodes=JSON.parse(nodesText),services=JSON.parse(servicesText),fares=JSON.parse(faresText);
const service=services.find(item=>item.id===input.service);
if(!service)throw new Error(`Unknown service: ${input.service}`);
const nodeIds=new Set(nodes.map(node=>node.id));
if(!nodeIds.has(input.from))throw new Error(`Unknown from node: ${input.from}`);
if(!nodeIds.has(input.to))throw new Error(`Unknown to node: ${input.to}`);
if(!service.stopNodeIds.includes(input.from)||!service.stopNodeIds.includes(input.to))throw new Error('from/to nodes must belong to the selected service pattern');
const fromIndex=service.stopNodeIds.indexOf(input.from),toIndex=service.stopNodeIds.indexOf(input.to);
if(toIndex<=fromIndex)throw new Error('Fare direction must follow the service stop order; choose the reverse service for the reverse trip');

const sources=[];
if(input['source-name'])sources.push({
  name:String(input['source-name']),
  ...(input['source-url']?{url:String(input['source-url'])}:{}),
  checkedAt:new Date().toISOString().slice(0,10)
});
if(input.confidence!=='estimated'&&!sources.length)throw new Error('Confirmed/reported fare edits require --source-name');

const existingIndex=fares.findIndex(record=>record.serviceId===input.service&&record.fromNodeId===input.from&&record.toNodeId===input.to);
const previous=existingIndex>=0?fares[existingIndex]:null;
const record={
  id:previous?.id||`manual-${slug(input.service)}-${slug(input.from)}-${slug(input.to)}`,
  serviceId:input.service,
  fromNodeId:input.from,
  toNodeId:input.to,
  minTTD,
  maxTTD,
  confidence:String(input.confidence),
  method:String(input.method),
  sources:sources.length?sources:(previous?.sources||[])
};
if(existingIndex>=0)fares[existingIndex]=record;else fares.push(record);
validateFareDataset(fares,{services,nodes});
const output=`${JSON.stringify(fares,null,2)}\n`;
await fs.writeFile('data/fares.json',output,'utf8');
await fs.writeFile('public/data/fares.json',output,'utf8');
console.log(`${existingIndex>=0?'Updated':'Added'} fare ${record.id}: TT$${record.minTTD}${record.maxTTD===record.minTTD?'':`–${record.maxTTD}`} (${record.confidence}).`);
