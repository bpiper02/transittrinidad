const DAY_SETS = {
  'monday friday': ['mon','tue','wed','thu','fri'],
  saturday: ['sat'],
  sunday: ['sun']
};

const SCHEDULE_VARIANTS = {
  'monday friday': 'weekday',
  saturday: 'saturday',
  sunday: 'sunday'
};

const ENDPOINT_ALIASES = new Map([
  ['pos', 'Port of Spain'],
  ['port of spain', 'Port of Spain'],
  ['st helena via carapo', 'St. Helena via Carapo'],
  ['st. helena via carapo', 'St. Helena via Carapo']
]);

function key(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slug(value) {
  return key(value).replace(/\s+/g, '-');
}

export function normalizeEndpoint(value) {
  const cleaned = String(value || '').trim().replace(/\s+/g, ' ');
  return ENDPOINT_ALIASES.get(key(cleaned)) || cleaned;
}

export function parsePTSCClock(value, period) {
  const match = String(value || '').trim().match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!match || !['am','pm'].includes(period)) throw new Error(`invalid PTSC ${period} time: ${value}`);
  let hour = Number(match[1]);
  const minute = Number(match[2] || '0');
  if (hour < 1 || hour > 12 || minute > 59) throw new Error(`invalid PTSC ${period} time: ${value}`);
  if (period === 'am' && hour === 12) hour = 0;
  if (period === 'pm' && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function normalizeDepartureTimes({amTimes = [], pmTimes = []}) {
  return [...amTimes.map(time => parsePTSCClock(time, 'am')), ...pmTimes.map(time => parsePTSCClock(time, 'pm'))]
    .filter((time, index, list) => list.indexOf(time) === index)
    .sort();
}

export function daysFromPTSCLabel(label) {
  const days = DAY_SETS[key(label)];
  if (!days) throw new Error(`unsupported PTSC service-day label: ${label}`);
  return [...days];
}

function nodeLookup(nodes) {
  const lookup = new Map();
  for (const node of nodes) {
    lookup.set(key(node.name), node.id);
    lookup.set(key(node.name.replace(/\bPTSC\b|\bTransit Centre\b|\bTransit Hub\b|\bBus Terminal\b|\bBus Station\b|\bTerminus\b/gi, '')), node.id);
  }
  lookup.set('port of spain', 'ptsc-pos-transit-centre');
  return lookup;
}

function sourceFor(snapshot) {
  return {name: snapshot.source.name, url: snapshot.source.url, checkedAt: snapshot.source.checkedAt};
}

export function buildPTSCCandidates(snapshot, {nodes = [], services = [], schedules = []} = {}) {
  if (!snapshot || !snapshot.source || !Array.isArray(snapshot.records)) throw new Error('snapshot.source and snapshot.records are required');
  const nodeIds = nodeLookup(nodes);
  const serviceByPair = new Map(services.filter(service => service.mode === 'ptsc').map(service => [`${service.originNodeId}->${service.destinationNodeId}`, service]));
  const schedulesByService = new Map();
  for (const schedule of schedules) schedulesByService.set(schedule.serviceId, [...(schedulesByService.get(schedule.serviceId) || []), schedule]);

  return snapshot.records.map(record => {
    const from = normalizeEndpoint(record.from);
    const to = normalizeEndpoint(record.to);
    const originNodeId = nodeIds.get(key(from)) || null;
    const destinationNodeId = nodeIds.get(key(to)) || null;
    const service = originNodeId && destinationNodeId ? serviceByPair.get(`${originNodeId}->${destinationNodeId}`) : null;
    const serviceDays = daysFromPTSCLabel(record.serviceDays);
    const departureTimes = normalizeDepartureTimes(record);
    const scheduleId = `ptsc-${slug(from)}-${slug(to)}-${SCHEDULE_VARIANTS[key(record.serviceDays)] || key(record.serviceDays).replace(/\s+/g, '-')}`;
    const common = {
      sourceRecordId: record.officialId,
      title: record.title,
      from, to, originNodeId, destinationNodeId,
      fareTTD: record.fareTTD,
      source: sourceFor(snapshot),
      schedule: {id: scheduleId, serviceDays, departureTimes, timezone: 'America/Port_of_Spain', status: 'published_times', confidence: 'official_current'}
    };

    if (!originNodeId || !destinationNodeId) {
      return {...common, reviewStatus: 'needs_endpoint_mapping', recommendedAction: 'map_endpoints_before_promotion'};
    }
    if (service) {
      const currentSchedule = (schedulesByService.get(service.id) || []).find(item => item.serviceDays?.join('|') === serviceDays.join('|'));
      return {
        ...common,
        serviceId: service.id,
        reviewStatus: currentSchedule ? 'schedule_upgrade_review' : 'schedule_variant_review',
        recommendedAction: 'review_before_merge'
      };
    }
    return {
      ...common,
      serviceId: `ptsc-${slug(from)}-to-${slug(to)}`,
      reviewStatus: 'service_and_schedule_review',
      recommendedAction: 'create_after_review',
      proposedService: {
        corridorId: `ptsc-${slug(from)}-${slug(to)}`,
        mode: 'ptsc', operator: 'PTSC', originNodeId, destinationNodeId,
        stopNodeIds: [originNodeId, destinationNodeId], geometryConfidence: 'endpoints_only'
      }
    };
  });
}
