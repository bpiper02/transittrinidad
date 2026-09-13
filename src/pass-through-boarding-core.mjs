export const BOARDING_POLICIES = new Set([
  'fixed_stop_only',
  'terminal_or_stand_only',
  'main_road_pass_through',
  'hail_along_segment',
  'unknown_do_not_assume'
]);

export const POLICY_ALIASES = new Map([
  ['corridor_hail', 'hail_along_segment'],
  ['corridor_request', 'main_road_pass_through'],
  ['mixed', 'unknown_do_not_assume']
]);
export const VIRTUAL_ACCESS_POLICIES = new Set(['main_road_pass_through', 'hail_along_segment']);
export const TERMINAL_ONLY_POLICIES = new Set(['fixed_stop_only', 'terminal_or_stand_only', 'unknown_do_not_assume']);
export const ROAD_CLASSES = new Set(['main_road', 'arterial', 'collector', 'local', 'highway', 'expressway', 'unknown']);
export const UNSAFE_VIRTUAL_ROAD_CLASSES = new Set(['highway', 'expressway']);
export const SAFE_STOP_EVIDENCE = new Set([
  'terminal_or_stand',
  'named_stop',
  'junction',
  'layby',
  'wide_shoulder',
  'association_confirmed',
  'community_verified',
  'unknown'
]);
export const ACCESS_CONFIDENCE = new Set(['association_confirmed', 'community_verified', 'reported', 'inferred_from_route_shape', 'unknown']);

const DEFAULTS = {
  walkThresholdKm: 0.8,
  maxShortLocalAccessKm: 2.5,
  requireSafetyEvidence: true,
  allowHighwayWithEvidence: true
};

function cleanPolicy(value) {
  if (typeof value !== 'string') return 'unknown_do_not_assume';
  const canonical = POLICY_ALIASES.get(value) || value;
  return BOARDING_POLICIES.has(canonical) ? canonical : 'unknown_do_not_assume';
}

function evidenceList(segment = {}) {
  if (Array.isArray(segment.safetyEvidence)) return segment.safetyEvidence.filter(Boolean);
  if (typeof segment.safetyEvidence === 'string') return [segment.safetyEvidence];
  return ['unknown'];
}

function confidenceRank(value) {
  return {
    association_confirmed: 4,
    community_verified: 3,
    reported: 2,
    inferred_from_route_shape: 1,
    unknown: 0
  }[value] ?? 0;
}

function lowestConfidence(...values) {
  const ranked = values
    .map(value => ACCESS_CONFIDENCE.has(value) ? value : 'unknown')
    .sort((a, b) => confidenceRank(a) - confidenceRank(b));
  return ranked[0] || 'unknown';
}

export function serviceAccessPolicy(service = {}, purpose = 'boarding') {
  const accessPolicy = service.accessPolicy || {};
  if (purpose === 'alighting') return cleanPolicy(service.alightingPolicy || accessPolicy.alighting || service.boardingPolicy || accessPolicy.boarding);
  return cleanPolicy(service.boardingPolicy || accessPolicy.boarding);
}

export function policyAllowsVirtualAccess(policy) {
  return VIRTUAL_ACCESS_POLICIES.has(cleanPolicy(policy));
}

export function classifyAccessLeg(accessKm, options = {}) {
  const { walkThresholdKm, maxShortLocalAccessKm } = { ...DEFAULTS, ...options };
  if (!Number.isFinite(accessKm) || accessKm < 0) return { eligible: false, mode: 'invalid_access_distance', reason: 'access distance must be a non-negative number' };
  if (accessKm <= walkThresholdKm) return { eligible: true, mode: 'walk', label: 'walk to boarding area' };
  if (accessKm <= maxShortLocalAccessKm) return { eligible: true, mode: 'short_local_access', label: 'short local access to main-road boarding area' };
  return { eligible: false, mode: 'too_far', reason: `access distance exceeds ${maxShortLocalAccessKm} km short-local threshold` };
}

export function evaluatePassThroughAccess({ service = {}, segment = {}, accessKm = 0, purpose = 'boarding', options = {} } = {}) {
  const config = { ...DEFAULTS, ...options };
  const basePolicy = serviceAccessPolicy(service, purpose);
  const segmentPolicy = cleanPolicy(purpose === 'alighting' ? segment.alightingPolicy || segment.boardingPolicy : segment.boardingPolicy || segment.alightingPolicy);
  const policy = segmentPolicy !== 'unknown_do_not_assume' ? segmentPolicy : basePolicy;
  const roadClass = ROAD_CLASSES.has(segment.roadClass) ? segment.roadClass : 'unknown';
  const confidence = ACCESS_CONFIDENCE.has(segment.confidence) ? segment.confidence : 'unknown';
  const evidence = evidenceList(segment);
  const validEvidence = evidence.filter(item => SAFE_STOP_EVIDENCE.has(item));
  const hasKnownSafetyEvidence = validEvidence.some(item => item !== 'unknown');
  const reasons = [];
  const warnings = [];

  if (!policyAllowsVirtualAccess(policy)) {
    reasons.push(`policy ${policy} does not allow virtual roadside access`);
  }

  if (config.requireSafetyEvidence && !hasKnownSafetyEvidence) {
    reasons.push('missing safe stopping evidence');
  }

  if (UNSAFE_VIRTUAL_ROAD_CLASSES.has(roadClass)) {
    if (!config.allowHighwayWithEvidence || !hasKnownSafetyEvidence) reasons.push(`${roadClass} segment is not safe enough for virtual access`);
    else warnings.push(`${roadClass} access needs field/association confirmation before public promotion`);
  }

  const accessLeg = classifyAccessLeg(accessKm, config);
  if (!accessLeg.eligible) reasons.push(accessLeg.reason);

  if (confidence === 'inferred_from_route_shape') warnings.push('route-shape inference is not proof that vehicles safely stop here');
  if (confidence === 'reported') warnings.push('reported pass-through access should be verified with drivers or associations');

  const eligible = reasons.length === 0;
  const userFacingConfidence = eligible ? lowestConfidence(confidence, hasKnownSafetyEvidence ? confidence : 'unknown') : 'unknown';

  return {
    eligible,
    purpose,
    policy,
    roadClass,
    confidence,
    userFacingConfidence,
    accessLeg: eligible ? accessLeg : { ...accessLeg, eligible: false },
    displayLabel: eligible ? (purpose === 'alighting' ? 'Estimated main-road drop-off area' : 'Estimated main-road boarding area') : 'No safe pass-through access',
    safetyCopy: eligible ? 'Use a visible, legal, well-lit place to wait. Prefer a stand, marked stop, junction, lay-by, or locally known pickup point.' : 'Do not route riders to roadside boarding unless the segment policy and safety evidence support it.',
    reasons,
    warnings
  };
}
