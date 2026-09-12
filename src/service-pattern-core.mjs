export const STOP_POLICIES = new Set(['fixed_only','corridor_hail','corridor_request','mixed']);
export const SERVICE_PATTERN_TYPES = new Set(['local','limited','express']);

function orderedIndex(pattern,nodeId){
  return pattern.stopNodeIds.indexOf(nodeId);
}

export function validateServicePattern(pattern){
  if(!pattern||typeof pattern!=='object')throw new Error('pattern is required');
  if(!Array.isArray(pattern.stopNodeIds)||pattern.stopNodeIds.length<2)throw new Error('pattern needs ordered stopNodeIds');
  if(new Set(pattern.stopNodeIds).size!==pattern.stopNodeIds.length)throw new Error('pattern stopNodeIds must be unique');
  if(!SERVICE_PATTERN_TYPES.has(pattern.patternType))throw new Error(`invalid patternType ${pattern.patternType}`);
  if(!STOP_POLICIES.has(pattern.boardingPolicy))throw new Error(`invalid boardingPolicy ${pattern.boardingPolicy}`);
  if(!STOP_POLICIES.has(pattern.alightingPolicy))throw new Error(`invalid alightingPolicy ${pattern.alightingPolicy}`);
  for(const field of ['boardableNodeIds','alightableNodeIds']){
    if(pattern[field]!=null){
      if(!Array.isArray(pattern[field]))throw new Error(`${field} must be an array`);
      for(const id of pattern[field])if(!pattern.stopNodeIds.includes(id))throw new Error(`${field} contains node outside pattern: ${id}`);
    }
  }
  return true;
}

function allowedSet(pattern,kind){
  const explicit=kind==='board'?pattern.boardableNodeIds:pattern.alightableNodeIds;
  if(Array.isArray(explicit))return new Set(explicit);
  const policy=kind==='board'?pattern.boardingPolicy:pattern.alightingPolicy;
  if(policy==='fixed_only')return new Set([pattern.stopNodeIds[0],pattern.stopNodeIds.at(-1)]);
  return new Set(pattern.stopNodeIds);
}

export function canUsePattern(pattern,fromNodeId,toNodeId){
  validateServicePattern(pattern);
  const from=orderedIndex(pattern,fromNodeId),to=orderedIndex(pattern,toNodeId);
  if(from<0||to<0)return false;
  if(from>=to)return false;
  if(!allowedSet(pattern,'board').has(fromNodeId))return false;
  if(!allowedSet(pattern,'alight').has(toNodeId))return false;
  return true;
}

export function deriveTrips(pattern){
  validateServicePattern(pattern);
  const trips=[];
  for(let i=0;i<pattern.stopNodeIds.length;i++){
    for(let j=i+1;j<pattern.stopNodeIds.length;j++){
      const fromNodeId=pattern.stopNodeIds[i],toNodeId=pattern.stopNodeIds[j];
      if(canUsePattern(pattern,fromNodeId,toNodeId))trips.push({fromNodeId,toNodeId});
    }
  }
  return trips;
}
