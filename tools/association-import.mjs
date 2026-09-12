import {readFile,writeFile} from 'node:fs/promises';
import {buildAssociationCandidates} from '../src/association-import-core.mjs';

const [inputPath,outputPath]=process.argv.slice(2);
if(!inputPath)throw new Error('usage: node tools/association-import.mjs <submission.json> [candidates.json]');

const [submission,nodes,services]=await Promise.all([
  readFile(inputPath,'utf8').then(JSON.parse),
  readFile(new URL('../data/nodes.json',import.meta.url),'utf8').then(JSON.parse),
  readFile(new URL('../data/services.json',import.meta.url),'utf8').then(JSON.parse)
]);

const candidates={
  generatedAt:submission.receivedAt,
  submissionId:submission.id,
  association:submission.association,
  autoPromote:false,
  candidates:buildAssociationCandidates(submission,{nodes,services})
};

const output=`${JSON.stringify(candidates,null,2)}\n`;
if(outputPath)await writeFile(outputPath,output);
else process.stdout.write(output);
