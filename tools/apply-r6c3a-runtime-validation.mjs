import {readFileSync,writeFileSync} from 'node:fs';

const path=new URL('../public/app-v2.js',import.meta.url);
let source=readFileSync(path,'utf8');

function replaceOnce(label,before,after){
  const first=source.indexOf(before);
  if(first<0)throw new Error(`${label}: expected source block not found`);
  if(source.indexOf(before,first+before.length)>=0)throw new Error(`${label}: source block appears more than once`);
  source=source.replace(before,after);
}

replaceOnce(
  'runtime validator import',
  "import {parseNominatimPlace,parseOsrmRoute,parsePhotonFeatures} from './src/external-data-core.mjs';\n",
  "import {parseNominatimPlace,parseOsrmRoute,parsePhotonFeatures} from './src/external-data-core.mjs';\nimport {validateRuntimeData} from './src/runtime-data-core.mjs';\n"
);

replaceOnce(
  'atomic runtime dataset assignment',
  "    const[nodesData,servicesData,transfersData,schedulesData,placesData,faresData]=await Promise.all([getJson('./data/nodes.json'),getJson('./data/services.json'),getJson('./data/transfers.json'),getJson('./data/schedules.json'),getJson('./data/places.json'),getJson('./data/fares.json')]);\n    nodesData.forEach(node=>nodeIndex.set(node.id,node));services=servicesData;transfers=transfersData;schedules=schedulesData;places=placesData;fares=faresData;",
  "    const[nodesData,servicesData,transfersData,schedulesData,placesData,faresData]=await Promise.all([getJson('./data/nodes.json'),getJson('./data/services.json'),getJson('./data/transfers.json'),getJson('./data/schedules.json'),getJson('./data/places.json'),getJson('./data/fares.json')]);\n    const runtimeData=validateRuntimeData({nodes:nodesData,services:servicesData,transfers:transfersData,schedules:schedulesData,places:placesData,fares:faresData});\n    runtimeData.nodes.forEach(node=>nodeIndex.set(node.id,node));services=runtimeData.services;transfers=runtimeData.transfers;schedules=runtimeData.schedules;places=runtimeData.places;fares=runtimeData.fares;"
);

writeFileSync(path,source);
console.log('R6c3a runtime validation integration applied');
