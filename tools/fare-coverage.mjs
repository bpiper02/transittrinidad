import fs from 'node:fs/promises';
import {coverageReport,validateFareDataset} from '../src/fare-core.mjs';

const readJson=async path=>JSON.parse(await fs.readFile(path,'utf8'));
const [nodes,services,fares]=await Promise.all([
  readJson('data/nodes.json'),
  readJson('data/services.json'),
  readJson('data/fares.json')
]);
validateFareDataset(fares,{services,nodes});
const report=coverageReport(services,{fares,nodes});
const c=report.counts;
console.log(`Fare display coverage: ${report.displayCoveragePct}%`);
console.log(`Segments: ${c.total}`);
console.log(`Official current: ${c.official_current}`);
console.log(`Community verified: ${c.community_verified}`);
console.log(`Reported current: ${c.reported_current}`);
console.log(`Legacy current: ${c.legacy_current}`);
console.log(`Estimated: ${c.estimated}`);
console.log(`Missing: ${c.missing}`);
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
if(c.missing>0)process.exitCode=1;
