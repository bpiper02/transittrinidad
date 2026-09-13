import {readFile,writeFile} from 'node:fs/promises';
import {promotePTSCReview} from '../src/ptsc-promotion-core.mjs';

const readJson=path=>readFile(path,'utf8').then(JSON.parse);
const [review,snapshot,services,schedules,fares]=await Promise.all([
  readJson('data/source/ptsc-route-review-2026-09-13.json'),readJson('data/source/ptsc-directory-2026-09-13.json'),
  readJson('data/services.json'),readJson('data/schedules.json'),readJson('data/fares.json')
]);
const promoted=promotePTSCReview({review,snapshot,services,schedules,fares});
const output=value=>`${JSON.stringify(value,null,2)}\n`;
await Promise.all([
  writeFile('data/services.json',output(promoted.services)),writeFile('public/data/services.json',output(promoted.services)),
  writeFile('data/schedules.json',output(promoted.schedules)),writeFile('public/data/schedules.json',output(promoted.schedules)),
  writeFile('data/fares.json',output(promoted.fares)),writeFile('public/data/fares.json',output(promoted.fares)),
  writeFile('data/source/ptsc-promotion-2026-09-13.json',output({generatedAt:new Date().toISOString(),source:review.source,...promoted.report}))
]);
console.log(`PTSC promotion: ${promoted.report.promoted.length} promoted · ${promoted.report.upgraded.length} upgraded · ${promoted.report.blocked.length} blocked · ${promoted.report.missingFare.length} missing fare`);
