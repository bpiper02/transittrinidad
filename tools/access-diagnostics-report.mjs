import {readFileSync} from 'node:fs';
import {accessSummary} from '../src/access-diagnostics-core.mjs';
import {exactPlace,placeToPoint} from '../src/place-core.mjs';

const nodes=JSON.parse(readFileSync(new URL('../data/nodes.json',import.meta.url),'utf8'));
const services=JSON.parse(readFileSync(new URL('../data/services.json',import.meta.url),'utf8'));
const places=JSON.parse(readFileSync(new URL('../data/places.json',import.meta.url),'utf8'));

function resolvePlace(name){
  const place=exactPlace(name,places);
  if(place)return placeToPoint(place);
  const node=nodes.find(item=>item.name?.toLowerCase()===name.toLowerCase());
  if(node?.location)return{name:node.name,lat:node.location.lat,lng:node.location.lng};
  throw new Error(`Unknown place: ${name}`);
}

const targets=process.argv.slice(2);
const names=targets.length?targets:['San Juan','Port of Spain','Chaguanas','Couva','Arima'];
for(const name of names){
  const point=resolvePlace(name);
  const summary=accessSummary(point,nodes,services,{limit:5,maxKm:Math.max(4,point.routingRadiusKm||4)});
  console.log(`\n${summary.placeName} — ${summary.certainty} access confidence`);
  if(!summary.best){
    console.log('  No nearby access candidates.');
    continue;
  }
  for(const candidate of summary.candidates){
    console.log(`  ${candidate.name} · ${candidate.accessKind} · ${candidate.distanceKm.toFixed(2)} km · ${candidate.usedByCount} services · ${candidate.safetyLabel}`);
  }
}
