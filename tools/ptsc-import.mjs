import {readFile, writeFile} from 'node:fs/promises';
import {buildPTSCCandidates} from '../src/ptsc-import-core.mjs';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath) throw new Error('usage: node tools/ptsc-import.mjs <snapshot.json> [candidates.json]');

const [snapshot, nodes, services, schedules] = await Promise.all([
  readFile(inputPath, 'utf8').then(JSON.parse),
  readFile(new URL('../data/nodes.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../data/services.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../data/schedules.json', import.meta.url), 'utf8').then(JSON.parse)
]);
const candidates = {
  generatedAt: snapshot.source.checkedAt,
  source: snapshot.source,
  autoPromote: false,
  candidates: buildPTSCCandidates(snapshot, {nodes, services, schedules})
};
const output = `${JSON.stringify(candidates, null, 2)}\n`;
if (outputPath) await writeFile(outputPath, output);
else process.stdout.write(output);
