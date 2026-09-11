export const MODES = new Set(['ptsc','maxi','route_taxi','water_taxi','ferry']);
export const SERVICE_CONFIDENCE = new Set(['verified_service','community_verified','needs_review']);
export const GEOMETRY_CONFIDENCE = new Set(['verified_path','partial_path','endpoints_only','unknown']);
export const CLAIM_CONFIDENCE = new Set(['official_current','official_historical','community_verified','reported','unknown']);
export const LOCATION_CONFIDENCE = new Set(['verified_station','mapped_station','approximate_area']);
export const TRANSFER_CONFIDENCE = new Set(['verified_walk','estimated_walk']);

function isNonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isLatLng(value) {
  return value && Number.isFinite(value.lat) && value.lat >= -90 && value.lat <= 90 && Number.isFinite(value.lng) && value.lng >= -180 && value.lng <= 180;
}

function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const [y,m,d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y,m-1,d));
  return date.getUTCFullYear()===y && date.getUTCMonth()===m-1 && date.getUTCDate()===d;
}

export function validateSource(source) {
  if (!source || typeof source !== 'object') throw new Error('source is required');
  if (!isNonEmpty(source.name)) throw new Error('source.name is required');
  if (!isNonEmpty(source.url)) throw new Error('source.url is required');
  if (!/^https?:\/\//i.test(source.url)) throw new Error('source.url must be http(s)');
  if (!isRealDate(source.checkedAt)) throw new Error('source.checkedAt must be a real YYYY-MM-DD date');
  return true;
}

export function validateNode(node) {
  if (!node || typeof node !== 'object') throw new Error('node is required');
  if (!isNonEmpty(node.id)) throw new Error('node.id is required');
  if (!isNonEmpty(node.name)) throw new Error('node.name is required');
  if (!['hub','terminal','stand','stop_zone','ferry_terminal','water_taxi_terminal'].includes(node.kind)) throw new Error(`invalid node.kind for ${node.id}`);
  if (node.location != null && !isLatLng(node.location)) throw new Error(`invalid node.location for ${node.id}`);
  if (node.locationConfidence != null && !LOCATION_CONFIDENCE.has(node.locationConfidence)) throw new Error(`invalid locationConfidence for ${node.id}`);
  if (!Array.isArray(node.sources) || node.sources.length === 0) throw new Error(`node ${node.id} needs at least one source`);
  node.sources.forEach(validateSource);
  return true;
}

export function validateService(service) {
  if (!service || typeof service !== 'object') throw new Error('service is required');
  if (!isNonEmpty(service.id)) throw new Error('service.id is required');
  if (!isNonEmpty(service.corridorId)) throw new Error(`service ${service.id} needs corridorId`);
  if (!MODES.has(service.mode)) throw new Error(`invalid mode for ${service.id}`);
  if (!isNonEmpty(service.originNodeId) || !isNonEmpty(service.destinationNodeId)) throw new Error(`service ${service.id} needs origin and destination nodes`);
  if (service.originNodeId === service.destinationNodeId) throw new Error(`service ${service.id} cannot have the same origin and destination`);
  if ('bidirectional' in service) throw new Error(`service ${service.id} must be directional; bidirectional is not allowed`);
  if (!Array.isArray(service.stopNodeIds) || service.stopNodeIds.length < 2) throw new Error(`service ${service.id} needs ordered stopNodeIds`);
  if (service.stopNodeIds[0] !== service.originNodeId || service.stopNodeIds.at(-1) !== service.destinationNodeId) throw new Error(`service ${service.id} stopNodeIds must start at origin and end at destination`);
  if (!SERVICE_CONFIDENCE.has(service.serviceConfidence)) throw new Error(`invalid service confidence for ${service.id}`);
  if (!GEOMETRY_CONFIDENCE.has(service.geometryConfidence)) throw new Error(`invalid geometry confidence for ${service.id}`);
  if (!CLAIM_CONFIDENCE.has(service.fareConfidence)) throw new Error(`invalid fare confidence for ${service.id}`);
  if (!CLAIM_CONFIDENCE.has(service.scheduleConfidence)) throw new Error(`invalid schedule confidence for ${service.id}`);
  if (service.fareTTD != null && (!Number.isFinite(service.fareTTD) || service.fareTTD < 0)) throw new Error(`invalid fare for ${service.id}`);
  if (service.estimatedMinutes != null && (!Number.isFinite(service.estimatedMinutes) || service.estimatedMinutes <= 0)) throw new Error(`invalid estimatedMinutes for ${service.id}`);
  if (service.geometry != null && (!Array.isArray(service.geometry) || service.geometry.length < 2 || service.geometry.some(point => !isLatLng(point)))) throw new Error(`invalid geometry for ${service.id}`);
  if (service.geometryConfidence === 'verified_path' && !service.geometry) throw new Error(`verified path ${service.id} must include geometry`);
  if (!Array.isArray(service.sources) || service.sources.length === 0) throw new Error(`service ${service.id} needs at least one source`);
  service.sources.forEach(validateSource);
  return true;
}

export function validateTransfer(transfer) {
  if (!transfer || typeof transfer !== 'object') throw new Error('transfer is required');
  if (!isNonEmpty(transfer.id)) throw new Error('transfer.id is required');
  if (!isNonEmpty(transfer.fromNodeId) || !isNonEmpty(transfer.toNodeId)) throw new Error(`transfer ${transfer.id} needs fromNodeId and toNodeId`);
  if (transfer.fromNodeId === transfer.toNodeId) throw new Error(`transfer ${transfer.id} cannot connect a node to itself`);
  if (transfer.mode !== 'walk') throw new Error(`invalid transfer mode for ${transfer.id}`);
  if (!Number.isFinite(transfer.distanceKm) || transfer.distanceKm <= 0) throw new Error(`invalid distanceKm for ${transfer.id}`);
  if (!Number.isFinite(transfer.estimatedMinutes) || transfer.estimatedMinutes <= 0) throw new Error(`invalid estimatedMinutes for ${transfer.id}`);
  if (!TRANSFER_CONFIDENCE.has(transfer.confidence)) throw new Error(`invalid transfer confidence for ${transfer.id}`);
  if (!Array.isArray(transfer.sources) || transfer.sources.length === 0) throw new Error(`transfer ${transfer.id} needs at least one source`);
  transfer.sources.forEach(validateSource);
  return true;
}

export function validateDataset({nodes,services,transfers=[]}) {
  if (!Array.isArray(nodes) || !Array.isArray(services) || !Array.isArray(transfers)) throw new Error('nodes, services and transfers must be arrays');
  const nodeIds = new Set();
  for (const node of nodes) {
    validateNode(node);
    if (nodeIds.has(node.id)) throw new Error(`duplicate node id ${node.id}`);
    nodeIds.add(node.id);
  }
  const serviceIds = new Set();
  for (const service of services) {
    validateService(service);
    if (serviceIds.has(service.id)) throw new Error(`duplicate service id ${service.id}`);
    serviceIds.add(service.id);
    if (!nodeIds.has(service.originNodeId)) throw new Error(`unknown origin node ${service.originNodeId}`);
    if (!nodeIds.has(service.destinationNodeId)) throw new Error(`unknown destination node ${service.destinationNodeId}`);
    for (const stopNodeId of service.stopNodeIds) if (!nodeIds.has(stopNodeId)) throw new Error(`unknown stop node ${stopNodeId} in ${service.id}`);
  }
  const transferIds = new Set();
  const transferPairs = new Set();
  for (const transfer of transfers) {
    validateTransfer(transfer);
    if (transferIds.has(transfer.id)) throw new Error(`duplicate transfer id ${transfer.id}`);
    transferIds.add(transfer.id);
    if (!nodeIds.has(transfer.fromNodeId)) throw new Error(`unknown transfer origin node ${transfer.fromNodeId}`);
    if (!nodeIds.has(transfer.toNodeId)) throw new Error(`unknown transfer destination node ${transfer.toNodeId}`);
    const pair=`${transfer.fromNodeId}->${transfer.toNodeId}`;
    if (transferPairs.has(pair)) throw new Error(`duplicate transfer pair ${pair}`);
    transferPairs.add(pair);
  }
  return true;
}
