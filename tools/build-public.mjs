import {copyFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PUBLIC_DATA_FILES,PUBLIC_MODULE_FILES} from './public-artifacts.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));

function copyFiles(files,sourceDir,targetDir){
  mkdirSync(targetDir,{recursive:true});
  for(const file of files)copyFileSync(join(sourceDir,file),join(targetDir,file));
}

copyFiles(PUBLIC_MODULE_FILES,join(root,'src'),join(root,'public','src'));
copyFiles(PUBLIC_DATA_FILES,join(root,'data'),join(root,'public','data'));

console.log(`public artifacts built: ${PUBLIC_MODULE_FILES.length} modules, ${PUBLIC_DATA_FILES.length} data files`);
