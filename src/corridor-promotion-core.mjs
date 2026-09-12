export const PROMOTION_STATUSES=new Set(['ready','needs_node_mapping','staged']);
export const PATTERN_TYPES=new Set(['local','limited','express','fixed_route','branch']);
export const STOP_POLICIES=new Set(['fixed_only','corridor_hail','corridor_request','mixed']);

function nonEmpty(value){return typeof value==='string'&&value.trim().length>0;}

export function validatePromotionPattern(pattern,{nodes=[]}={}){
  if(!pattern||typeof pattern!=='object')throw new Error('promotion pattern is required');
  if(!nonEmpty(pattern.id))throw new Error('promotion pattern id is required');
  if(!nonEmpty(pattern.region))throw new Error(`pattern ${pattern.id} needs region`);
  if(!nonEmpty(pattern.mode))throw new Error(`pattern ${pattern.id} needs mode`);
  if(!PATTERN_TYPES.has(pattern.patternType))throw new Error(`pattern ${pattern.id} has invalid patternType`);
  if(!STOP_POLICIES.has(pattern.boardingPolicy))throw new Error(`pattern ${pattern.id} has invalid boardingPolicy`);
  if(!STOP_POLICIES.has(pattern.alightingPolicy))throw new Error(`pattern ${pattern.id} has invalid alightingPolicy`);
  if(!PROMOTION_STATUSES.has(pattern.status))throw new Error(`pattern ${pattern.id} has invalid status`);
  if(!Array.isArray(pattern.anchors)||pattern.anchors.length<2)throw new Error(`pattern ${pattern.id} needs at least two anchors`);
  const names=new Set();
  const nodeIds=new Set(nodes.map(node=>node.id));
  for(const anchor of pattern.anchors){
    if(!nonEmpty(anchor.name))throw new Error(`pattern ${pattern.id} has unnamed anchor`);
    if(names.has(anchor.name))throw new Error(`pattern ${pattern.id} has duplicate anchor ${anchor.name}`);
    names.add(anchor.name);
    if(anchor.nodeId!=null&&!nodeIds.has(anchor.nodeId))throw new Error(`pattern ${pattern.id} references unknown node ${anchor.nodeId}`);
  }
  if(pattern.status==='ready'&&pattern.anchors.some(anchor=>!anchor.nodeId))throw new Error(`ready pattern ${pattern.id} has unmapped anchors`);
  return true;
}

export function validatePromotionManifest(manifest,{nodes=[]}={}){
  if(!Array.isArray(manifest))throw new Error('promotion manifest must be an array');
  const ids=new Set();
  for(const pattern of manifest){
    validatePromotionPattern(pattern,{nodes});
    if(ids.has(pattern.id))throw new Error(`duplicate promotion pattern ${pattern.id}`);
    ids.add(pattern.id);
  }
  return true;
}

export function promotionReport(manifest,{nodes=[]}={}){
  validatePromotionManifest(manifest,{nodes});
  const counts={ready:0,needs_node_mapping:0,staged:0,total:manifest.length};
  const unresolved=[];
  for(const pattern of manifest){
    counts[pattern.status]+=1;
    const missing=pattern.anchors.filter(anchor=>!anchor.nodeId).map(anchor=>anchor.name);
    if(missing.length)unresolved.push({id:pattern.id,missing});
  }
  return {counts,unresolved};
}
