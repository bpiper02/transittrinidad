# Recovered product and design decisions

Status labels: CONFIRMED = explicit product-owner direction or repeatedly accepted behavior; INFERRED = strongly implied; UNKNOWN = unresolved. When historical instructions conflict, the latest explicit decision wins.

## Brand and shell
CONFIRMED:
- Product naming direction changed from “Transit Trinidad” toward lowercase “trinimaps.”
- The experience should feel distinctive, civic, Trinidadian/Caribbean, and useful rather than generic AI-generated software.
- A Trinidad logo/mark was requested; the September 19 investigative branch did not find an approved logo asset, so the final asset remains UNKNOWN.
- A mascot was discussed as optional, not required.

## Map modes
CONFIRMED latest direction:
- Transit-first/default map mode.
- Standard and Satellite alternatives.
- Transit mode must preserve the maxi-association band color system. It must not collapse all maxi services into a single generic category color or invent route colors.
- Map geometry shown for a planned journey must be bounded to the rider’s actual boarding-to-alighting portion. Never draw an irrelevant trailing full-route leg.
- Estimated geometry must be visibly distinguishable from verified route geometry.

## Planner
CONFIRMED:
- The product is a journey planner, not merely a route directory.
- “All” plus PTSC / Maxi / Taxi / marine-mode affordances are useful, but selecting a mode is a journey preference/requirement, not necessarily a ban on connector modes.
- The planner should return multiple meaningful options when the data supports them.
- Origin and destination access are independent; do not make both endpoints snap to one hub and call that a zero-transit journey.
- Current location is supported when permission is available, with accuracy metadata/warning.
- Missing data must produce an honest gap state rather than an invented route.

REJECTED:
- Proximity-created internal transfers as a way to make the network “connect.”
- Generic unsurveyed local movement represented as if it were a canonical route-taxi service.
- Route identity derived from geometry.
- Service/direction/corridor counts presented as interchangeable.

## Route display and directions
CONFIRMED:
- Directions should be compact and practical: where to board, what to take, where to get off, what to walk, what to board next.
- Walking/interchange must be explicit as its own journey step.
- Local instructions may say to hail/request a stop only when that service/pattern has evidence for that behavior.
- One expandable evidence/data area is preferable to repeated defensive disclaimers on every card.
- Static schedules must not say “On time”; no real-time punctuality claim without live data.
- Show confidence in a human-readable way: verified/reported/estimated/unknown where material.
- Fare output should show exact values only when justified and ranges/estimate labels otherwise.

## Information density
CONFIRMED:
- Avoid repeated notices and clutter. Consolidate network limitations and evidence detail.
- Trust users with concise primary directions and let them expand supporting data.
- Do not hide uncertainty that changes a travel decision.

## Search and terminology
CONFIRMED:
- People should be able to search towns/places/landmarks, not only formal stop IDs.
- Formal stands/terminals must remain searchable for riders who know them.
- Rider copy should use locally understandable terms (maxi, route taxi, Water Taxi, stand/terminal) and explain unfamiliar terms in context rather than forcing internal data vocabulary.
- Internal IDs and virtual-node IDs must never leak into rider instructions.

## Mobile
CONFIRMED:
- Mobile is a primary usage mode, often one-handed and outdoors.
- Core controls require touch-friendly targets.
- Planner result and map must not force horizontal overflow.
- The route choice and next action should be legible without requiring precise gestures or dense evidence reading.
- Historical audit found misplaced controls on mobile; source-level responsive CSS is not sufficient proof. Rendered QA on representative phone widths is required.

## Safety / practical reality
INFERRED from repeated product decisions:
- Boarding guidance should prefer precise known stands/terminals; for corridor hail, use visible/legal/safe-location guidance without pretending a precise stop exists.
- Do not optimize the route score so aggressively that it recommends physically dubious access or a technically connected but unrealistic itinerary.

## Admin/editor
CONFIRMED:
- Field reviewers/associations should be able to mark a route correct/incorrect, ordered points, fare, boarding/alighting behavior, operation notes, and identity.
- A field-review action must create a review artifact/proposal, not directly alter the public network.
- Promotion needs normal evidence, validation, and review gates.
- Stronger verified truth must not be silently downgraded by a weaker new submission.

## Historical decisions explicitly superseded
- Early “atlas first, journey planning later” README framing is superseded by the current journey-planner product.
- Any test or code that treats nearby corridor fragments as routably connected is superseded by the explicit recovery invariant forbidding proximity-only transfers.
- Any prior implementation convenience that uses a single legacy “service” record for service + direction + pattern is superseded by docs/DOMAIN.md.
