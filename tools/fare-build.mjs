import fs from 'node:fs/promises';
import {validateFareDataset} from '../src/fare-core.mjs';

const [nodesText,servicesText,faresText]=await Promise.all([
  fs.readFile('data/nodes.json','utf8'),
  fs.readFile('data/services.json','utf8'),
  fs.readFile('data/fares.json','utf8')
]);
const nodes=JSON.parse(nodesText);
const services=JSON.parse(servicesText);
const fares=JSON.parse(faresText);

validateFareDataset(fares,{services,nodes});
await fs.mkdir('public/data',{recursive:true});
await fs.writeFile('public/data/fares.json',faresText,'utf8');
console.log(`Fare data valid. Published ${fares.length} explicit fare records to public/data/fares.json.`);
