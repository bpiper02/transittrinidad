import {readFile} from 'node:fs/promises';
import {buildNetworkQA,formatNetworkQASummary} from '../src/network-qa-core.mjs';

const json=process.argv.includes('--json');
const read=path=>readFile(new URL(`../data/${path}`,import.meta.url),'utf8').then(JSON.parse);
const [nodes,services,transfers,schedules,places]=await Promise.all([
  read('nodes.json'),read('services.json'),read('transfers.json'),read('schedules.json'),read('places.json')
]);
const report=buildNetworkQA({nodes,services,transfers,schedules,places});
if(json)process.stdout.write(`${JSON.stringify(report,null,2)}\n`);
else{
  console.log(formatNetworkQASummary(report));
  console.log('\nTop priorities:');
  for(const issue of report.issues.slice(0,20))console.log(`- [${issue.severity}] ${issue.label}: ${issue.entityType} ${issue.entityId}`);
}
