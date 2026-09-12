import {readFileSync,writeFileSync} from 'node:fs';
import {validateDataset} from '../src/data-contract.mjs';

const read=n=>JSON.parse(readFileSync(new URL(`../data/${n}.json`,import.meta.url),'utf8'));
const write=(n,v)=>{const t=JSON.stringify(v,null,2)+'\n';writeFileSync(new URL(`../data/${n}.json`,import.meta.url),t);writeFileSync(new URL(`../public/data/${n}.json`,import.meta.url),t);};
const nodes=read('nodes'),services=read('services'),transfers=read('transfers'),schedules=read('schedules');
const checkedAt='2026-09-12';
const src=(name,url,publishedAt)=>({name,url,checkedAt,...(publishedAt?{publishedAt}:{})});
const uniq=a=>[...new Map(a.map(x=>[x.url,x])).values()];
const text=s=>`${s.id} ${s.corridorId} ${s.originNodeId} ${s.destinationNodeId}`.toLowerCase();
const patchMatching=(label,predicate,patch,source,{min=1,max=99}={})=>{
  let count=0;
  for(let i=0;i<services.length;i++) if(predicate(services[i])) {services[i]={...services[i],...patch,sources:uniq([source,...(services[i].sources||[])])};count++;}
  if(count<min||count>max) throw new Error(`${label}: expected ${min}-${max} matches, got ${count}`);
  console.log(`${label}: ${count}`);
};
const pair=(a,b,modes=[])=>s=>{const t=text(s);return t.includes(a)&&t.includes(b)&&(!modes.length||modes.includes(s.mode));};
const patchIfPresent=(label,predicate,patch,source,max=4)=>{const count=services.filter(predicate).length;if(!count){console.log(`${label}: 0 (retained as research evidence only)`);return;}patchMatching(label,predicate,patch,source,{min:1,max});};

const route2=src('Newsday: Route Two maxi fares effective November 2021','https://newsday.co.tt/2021/11/01/busy-monday-in-tt-as-bars-reopen-full-public-service-back-out-to-work/','2021-11-01');
const route1=src('Newsday: Route One yellow-band maxi fares effective January 2022','https://newsday.co.tt/2022/01/24/yellow-band-maxi-fares-go-up/','2022-01-24');
const route3=src('Newsday: Route Three green-band maxi fares and unaffected south fares','https://newsday.co.tt/2022/05/09/green-band-maxi-fares-increase-2/','2022-05-09');
const blackBand=src('Newsday: Route Four Black Band fare schedule effective November 2022','https://newsday.co.tt/2022/10/14/taxis-to-hike-fares-in-south-west-trinidad/','2022-10-14');
const ptscCompare=src('Newsday: commuter fare comparison across PTSC, taxi and maxi routes','https://newsday.co.tt/2022/10/11/ptsc-passengers-want-more-than-a-cheaper-service/','2022-10-11');
const maraval=src('Trinidad Guardian: Maraval regular-route taxi fare increases to TT$7','https://www.guardian.co.tt/news/higher-maraval-taxi-fares-from-monday-6.2.1653701.43930db90e','2023-03-10');
const carenage=src('Trinidad Guardian: Carenage Taxi Drivers Association fare increase','https://www.guardian.co.tt/news/pos-to-carenage-taxi-fare-to-rise-diego-martin-drivers-feel-unsafe-6.2.1842043.43be95556c','2023-11-02');
const santaCruz=src('Newsday: Santa Cruz Taxi Drivers Association destination fare schedule','https://newsday.co.tt/2020/06/02/santa-cruz-taxi-fares-raised/','2020-06-02');
const sandoStand=src('Trinidad Guardian: San Fernando Route 3/4/5 maxi stand traffic scheme','https://www.guardian.co.tt/news/new-test-scheme-for-maxi-taxis-in-san-fernando-activates-on-monday-6.2.1543778.61e26dd301','2022-08-13');

patchMatching('POS-Arima maxi fare',pair('pos','arima',['maxi']),{fareTTD:10,fareConfidence:'community_verified',serviceConfidence:'community_verified'},route2,{min:1,max:4});
patchMatching('POS-Maloney maxi fare',pair('pos','maloney',['maxi']),{fareTTD:10,fareConfidence:'community_verified',serviceConfidence:'community_verified'},route2,{min:1,max:4});
patchMatching('POS-La Horquetta maxi fare',pair('pos','la-horquetta',['maxi']),{fareTTD:11,fareConfidence:'community_verified',serviceConfidence:'community_verified'},route2,{min:1,max:4});

patchIfPresent('POS-Chaguaramas maxi fare',pair('pos','chaguaramas',['maxi']),{fareTTD:7,fareConfidence:'community_verified',serviceConfidence:'community_verified'},route1);
for(const west of ['diego-martin','petit-valley']) patchIfPresent(`POS-${west} maxi fare`,pair('pos',west,['maxi']),{fareTTD:6,fareConfidence:'community_verified',serviceConfidence:'community_verified'},route1);

for(const [label,a,b,fare] of [
  ['Chaguanas-San Fernando maxi fare','chaguanas','san-fernando',11],
  ['POS-San Fernando maxi fare','pos','san-fernando',12],
  ['Chaguanas-Curepe maxi fare','chaguanas','curepe',10],
]) patchIfPresent(label,pair(a,b,['maxi']),{fareTTD:fare,fareConfidence:'community_verified',serviceConfidence:'community_verified'},route3);

patchIfPresent('San Fernando-Princes Town maxi fare',pair('san-fernando','princes-town',['maxi']),{fareTTD:9,fareConfidence:'community_verified',serviceConfidence:'community_verified'},blackBand);

patchIfPresent('POS-Maraval route taxi fare',pair('pos','maraval',['route_taxi']),{fareTTD:7,fareConfidence:'community_verified',serviceConfidence:'community_verified'},maraval);
patchMatching('POS-Carenage route taxi fare',pair('pos','carenage',['route_taxi']),{fareTTD:7,fareConfidence:'community_verified',serviceConfidence:'community_verified'},carenage,{min:1,max:4});
patchIfPresent('Sangre Grande-Toco route taxi fare',pair('sangre-grande','toco',['route_taxi']),{fareTTD:18,fareConfidence:'community_verified',serviceConfidence:'community_verified'},ptscCompare);

for(let i=0;i<services.length;i++) {
  const t=text(services[i]);
  if(t.includes('san-fernando')&&(services[i].mode==='maxi')) services[i]={...services[i],sources:uniq([sandoStand,...(services[i].sources||[])])};
  if(t.includes('santa-cruz')&&services[i].mode==='route_taxi') services[i]={...services[i],sources:uniq([santaCruz,...(services[i].sources||[])]),boardingNote:services[i].boardingNote||'Santa Cruz Taxi Drivers Association publishes destination-specific fares; do not treat the route as one flat fare unless the exact destination segment is known.'};
}

validateDataset({nodes,services,transfers,schedules});
write('nodes',nodes);write('services',services);write('transfers',transfers);write('schedules',schedules);
console.log(`internet exhaustion pass 2 applied: ${nodes.length} nodes, ${services.length} directed services`);
