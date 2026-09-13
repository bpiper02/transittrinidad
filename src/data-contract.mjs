export const MODES = new Set(['ptsc','maxi','route_taxi','water_taxi','ferry']);
export const SERVICE_CONFIDENCE = new Set(['verified_service','community_verified','reported_service','needs_review']);
export const GEOMETRY_CONFIDENCE = new Set(['verified_path','partial_path','endpoints_only','unknown']);
export const CLAIM_CONFIDENCE = new Set(['official_current','official_historical','community_verified','reported','unknown']);
export const LOCATION_CONFIDENCE = new Set(['verified_station','mapped_station','approximate_area']);
export const TRANSFER_CONFIDENCE = new Set(['verified_walk','estimated_walk']);
export const SCHEDULE_STATUS = new Set(['published_times','times_unavailable']);
export const SERVICE_DAYS = new Set(['mon','tue','wed','thu','fri','sat','sun']);
export const SOURCE_KINDS = new Set(['web','association_contact']);
export const BOARDING_POLICIES = new Set(['fixed_stop_only','terminal_or_stand_only','main_road_pass_through','hail_along_segment','unknown_do_not_assume','corridor_hail','corridor_request']);
export const ACCESS_SEGMENT_CONFIDENCE = new Set(['association_confirmed','community_verified','reported','inferred_from_route_shape','unknown']);
export const ACCESS_ROAD_CLASSES = new Set(['main_road','arterial','collector','local','highway','expressway','unknown']);
export const ACCESS_SAFETY_EVIDENCE = new Set(['terminal_or_stand','named_stop','junction','layby','wide_shoulder','association_confirmed','community_verified','unknown']);

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

function canonicalBoardingPolicy(policy) {
  return {
    corridor_hail: 'hail_along_segment',
    corridor_request: 'main_road_pass_through'
  }[policy] || policy;
}

export function validateSource(source) {
  if (!source || typeof source !== 'object') throw new Error('source is required');
  if (!isNonEmpty(source.name)) throw new Error('source.name is required');
  if (!isRealDate(source.checkedAt)) throw new Error('source.checkedAt must be a real YYYY-MM-DD date');
  const kind=source.kind||'web';
  if(!SOURCE_KINDS.has(kind))throw new Error(`invalid source.kind ${kind}`);
  if(kind==='web'){
    if (!isNonEmpty(source.url)) throw new Error('source.url is required');
    if (!/^https?:\/\//i.test(source.url)) throw new Error('source.url must be http(s)');
  }
  if(kind==='association_contact'&&!isNonEmpty(source.referenceId))throw new Error('association_contact source.referenceId is required');
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

export function validateAccessSegment(segment, service, index=0) {
  if (!segment || typeof segment !== 'object') throw new Error(`accessSegment ${index} is required`);
  if (!isNonEmpty(segment.id)) throw new Error(`accessSegment ${index} needs id`);
  if (!isNonEmpty(segment.fromNodeId) || !isNonEmpty(segment.toNodeId)) throw new Error(`accessSegment ${segment.id} needs fromNodeId and toNodeId`);
  if (segment.fromNodeId === segment.toNodeId) throw new Error(`accessSegment ${segment.id} cannot connect a node to itself`);
  if (!ACCESS_ROAD_CLASSES.has(segment.roadClass)) throw new Error(`invalid roadClass for accessSegment ${segment.id}`);
  if (!ACCESS_SEGMENT_CONFIDENCE.has(segment.confidence)) throw new Error(`invalid confidence for accessSegment ${segment.id}`);
  if (!Array.isArray(segment.safetyEvidence) || segment.safetyEvidence.length === 0 || segment.safetyEvidence.some(item => !ACCESS_SAFETY_EVIDENCE.has(item))) throw new Error(`invalid safetyEvidence for accessSegment ${segment.id}`);
  if (new Set(segment.safetyEvidence).size !== segment.safetyEvidence.length) throw new Error(`duplicate safetyEvidence for accessSegment ${segment.id}`);
  if (segment.boardingPolicy != null && !BOARDING_POLICIES.has(segment.boardingPolicy)) throw new Error(`invalid boardingPolicy for accessSegment ${segment.id}`);
  if (segment.alightingPolicy != null && !BOARDING_POLICIES.has(segment.alightingPolicy)) throw new Error(`invalid alightingPolicy for accessSegment ${segment.id}`);
  if (!Array.isArray(segment.sources) || segment.sources.length === 0) throw new Error(`accessSegment ${segment.id} needs at least one source`);
  segment.sources.forEach(validateSource);
  const stopNodeIds = service?.stopNodeIds || [];
  const fromIndex = stopNodeIds.indexOf(segment.fromNodeId);
  const toIndex = stopNodeIds.indexOf(segment.toNodeId);
  if (fromIndex < 0 || toIndex < 0) throw new Error(`accessSegment ${segment.id} endpoints must exist in ${service?.id || 'service'} stopNodeIds`);
  if (fromIndex >= toIndex) throw new Error(`accessSegment ${segment.id} must follow ${service?.id || 'service'} stop order`);
  const effectiveBoardingPolicy = segment.boardingPolicy || service?.boardingPolicy || 'unknown_do_not_assume';
  const effectiveAlightingPolicy = segment.alightingPolicy || service?.alightingPolicy || effectiveBoardingPolicy;
  const allowsVirtual = [effectiveBoardingPolicy,effectiveAlightingPolicy].map(canonicalBoardingPolicy).some(policy => ['main_road_pass_through','hail_along_segment'].includes(policy));
  if (allowsVirtual && segment.confidence === 'unknown') throw new Error(`virtual accessSegment ${segment.id} needs non-unknown confidence`);
  if (allowsVirtual && segment.safetyEvidence.length === 1 && segment.safetyEvidence[0] === 'unknown') throw new Error(`virtual accessSegment ${segment.id} needs safe stopping evidence`);
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
  if (service.boardingPolicy != null && !BOARDING_POLICIES.has(service.boardingPolicy)) throw new Error(`invalid boardingPolicy for ${service.id}`);
  if (service.alightingPolicy != null && !BOARDING_POLICIES.has(service.alightingPolicy)) throw new Error(`invalid alightingPolicy for ${service.id}`);
  if (service.fareTTD != null && (!Number.isFinite(service.fareTTD) || service.fareTTD < 0)) throw new Error(`invalid fare for ${service.id}`);
  if (service.estimatedMinutes != null && (!Number.isFinite(service.estimatedMinutes) || service.estimatedMinutes <= 0)) throw new Error(`invalid estimatedMinutes for ${service.id}`);
  if (service.geometry != null && (!Array.isArray(service.geometry) || service.geometry.length < 2 || service.geometry.some(point => !isLatLng(point)))) throw new Error(`invalid geometry for ${service.id}`);
  if (service.geometryConfidence === 'verified_path' && !service.geometry) throw new Error(`verified path ${service.id} must include geometry`);
  if (service.availability != null && (!service.availability || typeof service.availability !== 'object' || !['frequency_based'].includes(service.availability.kind) || !isNonEmpty(service.availability.note))) throw new Error(`invalid availability for ${service.id}`);
  if (service.accessSegments != null) {
    if (!Array.isArray(service.accessSegments)) throw new Error(`service ${service.id} accessSegments must be an array`);
    service.accessSegments.forEach((segment,index) => validateAccessSegment(segment, service, index));
  }
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

export function validateSchedule(schedule) {
  if (!schedule || typeof schedule !== 'object') throw new Error('schedule is required');
  if (!isNonEmpty(schedule.id)) throw new Error('schedule.id is required');
  if (!isNonEmpty(schedule.serviceId)) throw new Error(`schedule ${schedule.id} needs serviceId`);
  if (!isNonEmpty(schedule.timezone)) throw new Error(`schedule ${schedule.id} needs timezone`);
  if (!SCHEDULE_STATUS.has(schedule.status)) throw new Error(`invalid schedule status for ${schedule.id}`);
  if (!CLAIM_CONFIDENCE.has(schedule.confidence)) throw new Error(`invalid schedule confidence for ${schedule.id}`);
  if (!Array.isArray(schedule.serviceDays) || schedule.serviceDays.length === 0 || schedule.serviceDays.some(day => !SERVICE_DAYS.has(day))) throw new Error(`invalid serviceDays for ${schedule.id}`);
  if (new Set(schedule.serviceDays).size !== schedule.serviceDays.length) throw new Error(`duplicate serviceDays for ${schedule.id}`);
  if (!Array.isArray(schedule.departureTimes)) throw new Error(`schedule ${schedule.id} needs departureTimes`);
  if (schedule.departureTimes.some(time => !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))) throw new Error(`invalid departure time for ${schedule.id}`);
  if ([...schedule.departureTimes].sort().join('|') !== schedule.departureTimes.join('|')) throw new Error(`departureTimes must be sorted for ${schedule.id}`);
  if (new Set(schedule.departureTimes).size !== schedule.departureTimes.length) throw new Error(`duplicate departureTimes for ${schedule.id}`);
  for (const field of ['activeDates','excludedDates']) if (schedule[field] != null && (!Array.isArray(schedule[field]) || schedule[field].some(date => !isRealDate(date)) || new Set(schedule[field]).size !== schedule[field].length)) throw new Error(`invalid ${field} for ${schedule.id}`);
  if (schedule.status === 'published_times' && schedule.departureTimes.length === 0) throw new Error(`published schedule ${schedule.id} needs departureTimes`);
  if (schedule.status === 'times_unavailable' && schedule.departureTimes.length !== 0) throw new Error(`unavailable schedule ${schedule.id} cannot claim departureTimes`);
  if (!Array.isArray(schedule.sources) || schedule.sources.length === 0) throw new Error(`schedule ${schedule.id} needs at least one source`);
  schedule.sources.forEach(validateSource);
  return true;
}

export function validateDataset({nodes,services,transfers=[],schedules=[]}) {
  if (!Array.isArray(nodes) || !Array.isArray(services) || !Array.isArray(transfers) || !Array.isArray(schedules)) throw new Error('nodes, services, transfers and schedules must be arrays');
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
    for (const segment of service.accessSegments || []) {
      if (!nodeIds.has(segment.fromNodeId)) throw new Error(`unknown accessSegment origin node ${segment.fromNodeId} in ${service.id}`);
      if (!nodeIds.has(segment.toNodeId)) throw new Error(`unknown accessSegment destination node ${segment.toNodeId} in ${service.id}`);
    }
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
  const scheduleIds = new Set();
  const scheduleCoverage = new Map();
  for (const schedule of schedules) {
    validateSchedule(schedule);
    if (scheduleIds.has(schedule.id)) throw new Error(`duplicate schedule id ${schedule.id}`);
    scheduleIds.add(schedule.id);
    if (!serviceIds.has(schedule.serviceId)) throw new Error(`unknown scheduled service ${schedule.serviceId}`);
    const coverage = scheduleCoverage.get(schedule.serviceId) || {days:new Set(),dates:new Set()};
    if (!schedule.activeDates?.length) for (const day of schedule.serviceDays) {
      if (coverage.days.has(day)) throw new Error(`overlapping schedule day ${day} for ${schedule.serviceId}`);
      coverage.days.add(day);
    }
    for (const date of schedule.activeDates || []) {
      if (coverage.dates.has(date)) throw new Error(`overlapping schedule date ${date} for ${schedule.serviceId}`);
      coverage.dates.add(date);
    }
    scheduleCoverage.set(schedule.serviceId, coverage);
  }
  return true;
}