const BATCH_RULES=[
  {id:'manual-taxonomy-review',label:'Manual taxonomy review',matches:item=>item.blockers.includes('official_endpoint_taxonomy_missing')},
  {id:'tobago',label:'Tobago local services',matches:item=>/scarborough|black rock|courland|plymouth|arnos vale|mt\.?\s*thomas|montgomery|mason hall/i.test(item.title)},
  {id:'south-west',label:'South and south-west services',matches:item=>/san fernando|point fortin|icacos|siparia|penal|barrackpore|guapo|buenos ayres|fanny village|#6|#2|scale|tarouba|pleasantville/i.test(item.title)},
  {id:'central',label:'Central services',matches:item=>/chaguanas|tabaquite|carlsen|cashew|edinburgh|chandenagore|freeport|chickland|mamoral|montrose/i.test(item.title)},
  {id:'east-corridor',label:'East corridor services',matches:item=>/piarco|arima|sangre grande|valencia|malabar|santa rosa|pinto|greenvale|oropune/i.test(item.title)},
  {id:'pos-north-west',label:'POS and north-west services',matches:item=>/\bpos\b|port of spain|maraval|petit valley|blanchisseuse|blanchissuese|belmont|queen|savannah|st\.?\s*james|long circular|morne coco|round d/i.test(item.title)},
  {id:'unclassified',label:'Unclassified blocked records',matches:()=>true}
];

export function cleanPTSCBlockedTitle(title){
  return String(title||'')
    .replace(/&#8217;/g,'’')
    .replace(/&amp;/g,'&')
    .replace(/&nbsp;/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function titleParts(title){
  return cleanPTSCBlockedTitle(title).split(/\s*\/\s*/).map(part=>part.trim()).filter(Boolean);
}

function stripQualifier(value){
  return String(value||'')
    .replace(/\s*\([^)]*\)\s*$/,'')
    .replace(/^city service:\s*/i,'')
    .replace(/^pos city service:\s*/i,'')
    .replace(/^san fernando city service\s*:?\s*/i,'')
    .trim();
}

export function inferMissingEndpointName(blockedRecord){
  const blockers=blockedRecord.blockers||[];
  const parts=titleParts(blockedRecord.title);
  if(blockers.includes('origin_node_unresolved'))return stripQualifier(parts[0]||'');
  if(blockers.includes('destination_node_unresolved'))return stripQualifier(parts.at(-1)||'');
  return null;
}

export function classifyBlockedEndpointBatch(blockedRecord){
  const item={...blockedRecord,title:cleanPTSCBlockedTitle(blockedRecord.title),blockers:blockedRecord.blockers||[]};
  return BATCH_RULES.find(rule=>rule.matches(item));
}

export function summarizeBlockedEndpoint(blockedRecord){
  const cleaned={...blockedRecord,title:cleanPTSCBlockedTitle(blockedRecord.title),blockers:blockersFor(blockedRecord)};
  const missingEndpointName=inferMissingEndpointName(cleaned);
  const needsManualTaxonomy=cleaned.blockers.includes('official_endpoint_taxonomy_missing');
  return {
    officialId:cleaned.officialId,
    title:cleaned.title,
    blockers:cleaned.blockers,
    missingEndpointName,
    needsManualTaxonomy,
    needsFare:cleaned.blockers.includes('official_fare_unavailable'),
    action:needsManualTaxonomy
      ?'Inspect captured PTSC record before creating or mapping endpoints.'
      :'Resolve the missing endpoint against evidence, then map to an existing node or add a clearly sourced approximate node.'
  };
}

function blockersFor(record){
  return Array.isArray(record.blockers)?[...record.blockers]:[];
}

export function buildBlockedEndpointBatches(report){
  const batchMap=new Map(BATCH_RULES.map(rule=>[rule.id,{id:rule.id,label:rule.label,count:0,records:[]}]));
  const unresolvedEndpointCounts=new Map();

  for(const record of report.blocked||[]){
    const summary=summarizeBlockedEndpoint(record);
    const batch=classifyBlockedEndpointBatch(summary);
    const bucket=batchMap.get(batch.id);
    bucket.records.push(summary);
    bucket.count++;
    if(summary.missingEndpointName){
      unresolvedEndpointCounts.set(summary.missingEndpointName,(unresolvedEndpointCounts.get(summary.missingEndpointName)||0)+1);
    }
  }

  const batches=[...batchMap.values()]
    .filter(batch=>batch.count>0)
    .map(batch=>({...batch,records:batch.records.sort((a,b)=>a.title.localeCompare(b.title))}));
  const unresolvedEndpoints=[...unresolvedEndpointCounts.entries()]
    .map(([name,count])=>({name,count}))
    .sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));

  return {totalBlocked:(report.blocked||[]).length,batches,unresolvedEndpoints};
}
