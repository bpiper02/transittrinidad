import {readFile,writeFile} from 'node:fs/promises';

const path=new URL('../public/app-v2.js',import.meta.url);
let source=await readFile(path,'utf8');

function replaceOnce(oldText,newText,label){
  const count=source.split(oldText).length-1;
  if(count!==1)throw new Error(`${label}: expected exactly one match, found ${count}`);
  source=source.replace(oldText,newText);
}

replaceOnce(
  "import {fareForJourney,fareForSegment,formatFare} from './src/fare-core.mjs';",
  "import {fareForJourney,fareForSegment,formatFare} from './src/fare-core.mjs';\nimport {boardingGuidance,transitAction} from './src/rider-instruction-core.mjs';",
  'rider instruction import'
);

replaceOnce(
`function transitInstruction(step){
  const destination=nodeIndex.get(step.to);
  const toward=destination?.name||step.to;
  if(step.service.mode==='maxi')return\`Take the \${maxiBandLabel(step.service)} toward \${toward}\`;
  if(step.service.mode==='route_taxi')return\`Take a route taxi toward \${toward}\`;
  if(step.service.mode==='ptsc')return\`Take PTSC toward \${toward}\`;
  if(step.service.mode==='water_taxi')return\`Take the Water Taxi toward \${toward}\`;
  if(step.service.mode==='ferry')return\`Take the ferry toward \${toward}\`;
  return\`Take \${modeLabel(step.service.mode)} toward \${toward}\`;
}
function boardingDetail(step){
  const origin=nodeIndex.get(step.from);
  const fare=fareForService(step.service,step.from,step.to);
  const parts=[\`Board at \${origin?.name||step.from}\`,formatFare(fare)];
  const variants=serviceSchedules(step.service.id);
  const departures=nextDepartures(variants,selectedScheduleDate,1);
  if(departures.length)parts.push(\`scheduled \${departures[0].label}\`);
  return parts.join(' · ');
}`,
`function isFormalBoardingNode(node){return['terminal','stand','ferry_terminal','water_taxi_terminal'].includes(node?.kind);}
function transitInstruction(step){
  const origin=nodeIndex.get(step.from);
  const destination=nodeIndex.get(step.to);
  return transitAction(step.service,{
    toward:destination?.name||step.to,
    bandLabel:step.service.mode==='maxi'?maxiBandLabel(step.service):'Maxi',
    fromIsTerminal:isFormalBoardingNode(origin)
  });
}
function boardingDetail(step){
  const origin=nodeIndex.get(step.from);
  const destination=nodeIndex.get(step.to);
  const fare=fareForService(step.service,step.from,step.to);
  const guidance=boardingGuidance(step.service,{
    fromName:origin?.name||step.from,
    toName:destination?.name||step.to,
    fromIsTerminal:isFormalBoardingNode(origin),
    toIsTerminal:isFormalBoardingNode(destination)
  });
  const parts=[guidance,formatFare(fare)];
  const variants=serviceSchedules(step.service.id);
  const departures=nextDepartures(variants,selectedScheduleDate,1);
  if(departures.length)parts.push(\`scheduled \${departures[0].label}\`);
  return parts.join(' · ');
}`,
  'transit and boarding copy'
);

await writeFile(path,source);
console.log('B2 rider instruction integration applied');
