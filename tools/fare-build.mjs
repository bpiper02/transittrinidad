import fs from 'node:fs/promises';
import {validateFareDataset} from '../src/fare-core.mjs';

const readJson=async path=>JSON.parse(await fs.readFile(path,'utf8'));
const [nodes,services,fares]=await Promise.all([
  readJson('data/nodes.json'),
  readJson('data/services.json'),
  readJson('data/fares.json')
]);

validateFareDataset(fares,{services,nodes});
await fs.mkdir('public/data',{recursive:true});
await fs.writeFile('public/data/fares.json',`${JSON.stringify(fares,null,2)}\n`,'utf8');
console.log(`Fare data valid. Published ${fares.length} explicit fare records to public/data/fares.json.`);
