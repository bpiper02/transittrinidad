import {mkdir,readFile,rename,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPromotionAudit,promoteAssociationCandidates} from '../src/association-promotion-core.mjs';

const args=process.argv.slice(2);
const apply=args.includes('--apply');
const paths=args.filter(arg=>arg!=='--apply');
const [candidatesPath,reviewPath]=paths;
if(!candidatesPath||!reviewPath)throw new Error('usage: node tools/association-promote.mjs <candidates.json> <review.json> [--apply]');

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const readJson=path=>readFile(path,'utf8').then(JSON.parse);
const [candidateBundle,review,nodes,services,transfers,schedules]=await Promise.all([
  readJson(resolve(candidatesPath)),
  readJson(resolve(reviewPath)),
  readJson(resolve(root,'data/nodes.json')),
  readJson(resolve(root,'data/services.json')),
  readJson(resolve(root,'data/transfers.json')),
  readJson(resolve(root,'data/schedules.json'))
]);

const {dataset,report}=promoteAssociationCandidates(candidateBundle,review,{nodes,services,transfers,schedules});
const audit=buildPromotionAudit(candidateBundle,review,report);

process.stdout.write(`${JSON.stringify({mode:apply?'apply':'dry-run',report},null,2)}\n`);
if(!apply)process.exit(0);

async function atomicJson(path,value){
  await mkdir(dirname(path),{recursive:true});
  const temp=`${path}.tmp-${process.pid}`;
  await writeFile(temp,`${JSON.stringify(value,null,2)}\n`,'utf8');
  await rename(temp,path);
}

for(const name of ['nodes','services','transfers','schedules']){
  await atomicJson(resolve(root,`data/${name}.json`),dataset[name]);
  await atomicJson(resolve(root,`public/data/${name}.json`),dataset[name]);
}
await atomicJson(resolve(root,`data/promotions/${candidateBundle.submissionId}-promotion.json`),audit);
process.stdout.write(`Applied ${report.accepted.length} accepted candidate(s). Canonical and public mirrors updated.\n`);
