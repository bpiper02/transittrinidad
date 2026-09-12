# Transit Trinidad Pilot Pack

## Pilot goal

Test whether the current planner is useful enough for a real rider and accurate enough for a knowledgeable local operator to correct without needing to understand the underlying data model.

This is **not** a national accuracy sign-off. The pilot is designed to expose the highest-value errors before wider beta distribution.

## Recommended first pilot

Use 3–5 knowledgeable reviewers across different service types or corridors. Prefer people who directly drive, dispatch or coordinate the route they review.

Suggested starting coverage:

1. Route 3 / Central–South local Maxi corridor.
2. Route 2 / East corridor.
3. Route 4 / San Fernando–Princes Town corridor.
4. One Southwest route family where highway/local behavior matters.
5. One Tobago reviewer if accessible.

## 15-minute reviewer session

### 1. Rider test — 5 minutes

Give the reviewer the normal planner. Do not explain the expected answer first.

Ask them to plan two trips they personally know:

- one endpoint-to-endpoint trip;
- one intermediate trip where a person would normally hail/get off along the route.

Observe whether they understand:

- which vehicle to take;
- where/how to board;
- where/how to get off;
- whether a transfer is required;
- the fare shown;
- whether the route feels locally believable.

### 2. Correction test — 7 minutes

Open `/field-review.html`.

Ask them to select one direction they know and correct anything wrong. Do not translate their answer into database language for them unless necessary. The form should be understandable on its own.

Prioritize:

- service existence and direction;
- ordered route points;
- local vs express/limited behavior;
- roadside hail vs fixed boarding;
- requested drop-off behavior;
- fare;
- major road used.

### 3. Debrief — 3 minutes

Ask only these questions:

1. **Would you trust this enough to tell someone unfamiliar with the route to use it? Why or why not?**
2. **What is the most dangerous or annoying thing that is wrong or missing?**
3. **What route or destination should we add/fix next?**

## Pilot scorecard

Record one row per tested journey.

| Measure | Pass condition |
| --- | --- |
| Route exists | Planner returns a route when reviewer says a normal rider can make the trip |
| Direction correct | No invented reverse or wrong-direction service |
| Vehicle/mode correct | First meaningful transit leg matches local expectation |
| Boarding useful | Reviewer says the boarding instruction is actionable |
| Transfer logic | No unnecessary or impossible transfer |
| Fare | Correct or within a reviewer-accepted estimate/range |
| Stop order | Intermediate points occur in a believable order |
| Route variant | Local/highway/express behavior is not conflated |
| Review form | Reviewer can submit a correction without developer assistance |

## Go / fix criteria

### Ready for a small public beta

- At least 90% of tested known journeys return a usable route.
- Zero high-severity invented services, impossible directions or impossible transfers.
- At least 80% of boarding instructions are judged usable without verbal explanation.
- All high-severity reviewer corrections are promoted or explicitly held with a documented reason.
- A non-developer reviewer can complete the field-review form and generate valid intake JSON.

### Hold beta and fix first

Any one of these is a blocker:

- a planner result tells a rider to take a service that the reviewer says does not exist;
- the planner reverses a one-way/direction-specific service;
- local and highway/express variants are mixed in a way that changes where someone can board or get off;
- a transfer requires a rider to move between places that are not actually co-located or walkable;
- the reviewer form can silently publish or bypass promotion review;
- a known corridor repeatedly chooses a clearly inferior route because of access/ranking logic.

## Feedback severity

**P0 — unsafe/misleading:** invented service, wrong direction, impossible transfer, materially wrong boarding point.

**P1 — journey-breaking:** missing common service, wrong service variant, incorrect stop order, unusable boarding instruction.

**P2 — trust/quality:** stale fare, weak wording, poor ranking, incomplete intermediate coverage.

**P3 — polish:** visual, naming or low-impact copy issue.

## After each session

1. Export the field-review JSON.
2. Run the normal association candidate import.
3. Compare the proposed change with canonical service data.
4. Accept/reject explicitly in the association review tool.
5. Promote only accepted corrections.
6. Run unit/data QA, golden journeys and browser QA.
7. Add any newly discovered critical journey to the golden-journey suite before closing the issue.

The pilot is successful when it improves both sides of the product loop: riders can understand the route, and knowledgeable locals can cheaply correct the network without editing code.
