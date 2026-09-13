import {writeFile} from 'node:fs/promises';

const DIRECTORY_URL = 'https://ptsc.co.tt/routes-and-schedules/';
const API_ROOT = 'https://ptsc.co.tt/wp-json/wp/v2';
const CATALOG_URL = `${API_ROOT}/routes?per_page=100&_fields=id,date,modified,link,title,from,to,periodical,route`;
const outputPath = process.argv[2] || `data/source/ptsc-directory-${new Date().toISOString().slice(0, 10)}.json`;

function text(value) { return String(value || '').replace(/&#0*38;|&amp;/g, '&').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim(); }
function listAfter(html, marker) {
  const match = html.match(new RegExp(`${marker}[\\s\\S]{0,1600}?<ul>([\\s\\S]*?)<\\/ul>`, 'i'));
  return match ? [...match[1].matchAll(/<li[^>]*>(.*?)<\/li>/gi)].map(item => text(item[1])).filter(Boolean) : [];
}
function cards(html) {
  return [...html.matchAll(/<article id="post-(\d+)" class="[^"]*\broutes\b[\s\S]*?<\/article>/gi)].map(match => {
    const card = match[0];
    const title = text(card.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1]);
    const [from = '', to = ''] = title.split(/\s*\/\s*/);
    const fare = Number(text(card.match(/elementor-element-995b2cc[\s\S]{0,500}?elementor-widget-container">\s*\$?([\d.]+)/i)?.[1]));
    return {officialId:`ptsc-card-${match[1]}`, title, from, to, serviceDays: /periodical-monday-friday/i.test(card) ? 'Monday-Friday' : /periodical-saturday/i.test(card) ? 'Saturday' : /periodical-sunday/i.test(card) ? 'Sunday' : 'Unknown', fareTTD:Number.isFinite(fare) ? fare : null, amTimes:listAfter(card, 'a\.m\.'), pmTimes:listAfter(card, 'p\.m\.')};
  });
}

async function taxonomyMap(name) {
  const result = await fetch(`${API_ROOT}/${name}?per_page=100&_fields=id,name,slug`, {headers:{'user-agent':'TransitTrinidad source verifier/1.0 (+https://github.com/bpiper02/transittrinidad)'}});
  if (!result.ok) throw new Error(`PTSC ${name} taxonomy returned ${result.status}`);
  return new Map((await result.json()).map(term => [term.id, {id:term.id,name:text(term.name),slug:term.slug}]));
}

const response = await fetch(DIRECTORY_URL, {headers:{
  'user-agent':'TransitTrinidad source verifier/1.0 (+https://github.com/bpiper02/transittrinidad)',
  accept:'text/html,application/xhtml+xml',
  'accept-encoding':'gzip, deflate, br'
}});
if (!response.ok) throw new Error(`PTSC directory returned ${response.status}`);
const html = await response.text();
const catalogResponse = await fetch(CATALOG_URL, {headers:{'user-agent':'TransitTrinidad source verifier/1.0 (+https://github.com/bpiper02/transittrinidad)'}});
if (!catalogResponse.ok) throw new Error(`PTSC route catalog returned ${catalogResponse.status}`);
const firstCatalogPage = await catalogResponse.json();
const totalCatalogPages = Number(catalogResponse.headers.get('x-wp-totalpages') || 1);
const catalogPages = await Promise.all([...Array(totalCatalogPages - 1)].map((_, index) => fetch(`${CATALOG_URL}&page=${index + 2}`, {headers:{'user-agent':'TransitTrinidad source verifier/1.0 (+https://github.com/bpiper02/transittrinidad)'}}).then(async result => {
  if (!result.ok) throw new Error(`PTSC route catalog page ${index + 2} returned ${result.status}`);
  return result.json();
})));
const [fromTerms,toTerms,periodTerms,routeTerms] = await Promise.all(['from','to','periodical','route'].map(taxonomyMap));
const termNames = (ids, terms) => (ids || []).map(id => terms.get(id)).filter(Boolean);
const catalog = [firstCatalogPage, ...catalogPages].flat().map(route => ({
  officialId:`ptsc-card-${route.id}`,
  title:text(route.title?.rendered),
  from:termNames(route.from,fromTerms),
  to:termNames(route.to,toTerms),
  serviceDays:termNames(route.periodical,periodTerms),
  routeTags:termNames(route.route,routeTerms),
  url:route.link,
  publishedAt:route.date,
  sourceModifiedAt:route.modified
}));
const sourceModifiedAt = html.match(/"dateModified":"([^"]+)"/)?.[1] || null;
const records = cards(html);
const timetableById = new Map(records.map(record => [record.officialId,record]));
for (const route of catalog) {
  const timetable = timetableById.get(route.officialId);
  route.fareTTD = timetable?.fareTTD ?? null;
  route.amTimes = timetable?.amTimes || [];
  route.pmTimes = timetable?.pmTimes || [];
  route.timetableCaptured = Boolean(timetable);
}
if (!records.length) throw new Error('PTSC capture found no route cards; do not replace a prior snapshot.');
const snapshot = {source:{name:'PTSC Routes and Schedules directory', url:DIRECTORY_URL, checkedAt:new Date().toISOString().slice(0, 10), sourceModifiedAt}, captureScope:'Full official route catalog plus timetable cards exposed on the public directory page. Only records with known service days and departures are eligible for schedule promotion.', catalog, records};
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Captured ${catalog.length} official PTSC route records and ${records.length} timetable cards to ${outputPath}`);
