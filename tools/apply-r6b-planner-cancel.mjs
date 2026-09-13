import {readFileSync,writeFileSync} from 'node:fs';

const path=new URL('../public/app-v2.js',import.meta.url);
let source=readFileSync(path,'utf8');

const before="function invalidatePlanner(){plannerRequestId+=1;}";
const after="function invalidatePlanner(){plannerRequestId+=1;const button=$('#planButton');if(button)button.disabled=false;}";
const first=source.indexOf(before);
if(first<0)throw new Error('planner invalidation function not found');
if(source.indexOf(before,first+before.length)>=0)throw new Error('planner invalidation function appears more than once');
source=source.replace(before,after);
writeFileSync(path,source);
console.log('R6b planner cancellation fix applied');
