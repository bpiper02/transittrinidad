import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {summarizePilotReviews} from '../src/pilot-review-core.mjs';

const args=process.argv.slice(2);
const json=args.includes('--json');
const dirIndex=args.indexOf('--dir');
let paths=args.filter(arg=>!['--json','--dir'].includes(arg));
if(dirIndex>=0){
  const dir=args[dirIndex+1];
  if(!dir)throw new Error('Usage: node tools/pilot-review-summary.mjs --dir data/reviews/c1-central-south [--json]');
  const names=(await readdir(resolve(dir))).filter(name=>name.endsWith('.json')).sort();
  paths=names.map(name=>resolve(dir,name));
}
if(!paths.length)throw new Error('Provide review JSON files or --dir data/reviews/c1-central-south');
const payloads=await Promise.all(paths.map(path=>readFile(resolve(path),'utf8').then(JSON.parse)));
const coreJourneyIds=['c1-california-claxton','c1-couva-marabella','c1-chase-sando','c1-chag-california'];
const summary=summarizePilotReviews(payloads,{pilotId:'c1-central-south-2026-09',coreJourneyIds,reverseJourneyId:'c1-claxton-chag-reverse-probe'});
if(json){process.stdout.write(`${JSON.stringify(summary,null,2)}\n`);process.exit(0);}
console.log(`C1 Central–South pilot: ${summary.reviewerCount} reviewer(s)`);
console.log(`Severity 1 issues: ${summary.severity1}`);
console.log(`Reviewer threshold: ${summary.threshold.reviewerThresholdMet?'PASS':'WAIT'}`);
console.log(`Core journey confirmations: ${summary.threshold.coreConfirmationThresholdMet?'PASS':'WAIT'}`);
console.log(`Reverse probe: ${summary.threshold.reverseStatus}`);
for(const [id,row] of Object.entries(summary.journeys)){
  const fare=row.currentFareMedianTTD==null?'—':`TT$${row.currentFareMedianTTD}`;
  console.log(`- ${id}: ${row.fullyConfirmed} full confirmation(s) / ${row.reviewCount} review(s) · fare median ${fare}`);
}
console.log(`Promotion review gate: ${summary.readyForPromotionReview?'READY':'NOT READY'}`);
