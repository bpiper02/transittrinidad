import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PUBLIC_DATA_FILES,PUBLIC_MODULE_FILES} from './public-artifacts.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const failures=[];

function sortedFiles(dir){return readdirSync(dir).filter(name=>!name.startsWith('.')).sort();}
function compareDirectory(label,files,sourceDir,targetDir){
  const expected=[...files].sort();
  const actual=sortedFiles(targetDir);
  if(JSON.stringify(actual)!==JSON.stringify(expected))failures.push(`${label} file set differs: expected ${expected.join(', ')}, found ${actual.join(', ')}`);
  for(const file of files){
    const source=join(sourceDir,file),target=join(targetDir,file);
    if(!existsSync(source)){failures.push(`missing canonical source: ${source}`);continue;}
    if(!existsSync(target)){failures.push(`missing generated artifact: ${target}`);continue;}
    if(!readFileSync(source).equals(readFileSync(target)))failures.push(`stale generated artifact: ${target} <- ${source}`);
  }
}

compareDirectory('public/src',PUBLIC_MODULE_FILES,join(root,'src'),join(root,'public','src'));
compareDirectory('public/data',PUBLIC_DATA_FILES,join(root,'data'),join(root,'public','data'));

if(failures.length){
  console.error('Generated public artifacts are stale or inconsistent:');
  for(const failure of failures)console.error(`- ${failure}`);
  console.error('Run `npm run build:public` and commit the generated changes.');
  process.exitCode=1;
}else{
  console.log(`public artifact check passed: ${PUBLIC_MODULE_FILES.length} modules, ${PUBLIC_DATA_FILES.length} data files`);
}
