import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(new URL('..',import.meta.url).pathname);
const read=name=>readFile(resolve(root,'data',name),'utf8').then(JSON.parse);
const [nodes,services,transfers,schedules]=await Promise.all(['nodes.json','services.json','transfers.json','schedules.json'].map(read));
const byConfidence=Object.groupBy(services,service=>service.serviceConfidence||'unknown');
const byMode=Object.groupBy(services,service=>service.mode||'unknown');
const report={generatedAt:new Date().toISOString(),scope:'canonical data baseline; no routing facts are created',nodes:nodes.length,services:services.length,transfers:transfers.length,schedules:schedules.length,servicesByConfidence:Object.fromEntries(Object.entries(byConfidence).map(([key,value])=>[key,value.length])),servicesByMode:Object.fromEntries(Object.entries(byMode).map(([key,value])=>[key,value.length])),geometryByConfidence:Object.fromEntries(Object.entries(Object.groupBy(services,service=>service.geometryConfidence||'unknown')).map(([key,value])=>[key,value.length]))};
process.stdout.write(`${JSON.stringify(report,null,2)}\n`);
