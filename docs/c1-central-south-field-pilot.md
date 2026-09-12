# C1 — Central–South Field Validation Pilot

## Goal
Validate whether a person who does not already know the corridor could actually follow TransitTrinidad from Chaguanas through Central to San Fernando using the current Route 3 / Green Band model.

This is a controlled field validation sprint, not a public launch.

## Pilot journeys
Use `/pilot-central-south.html` and review these five cases:

1. California → Claxton Bay
2. Couva → Marabella
3. Chase Village → San Fernando
4. Chaguanas → California
5. Claxton Bay → Chaguanas — reverse-direction probe

The fifth journey is intentionally a probe. We have stronger evidence for the promoted southbound local pattern than for the exact northbound boarding behavior. Do not infer reverse behavior from the southbound pattern.

## What each reviewer must check
For every journey, independently answer:

- Route / vehicle: Is this the right service and direction?
- Boarding / drop-off: Can the rider really board where we say and request this drop?
- Fare: Is the displayed fare or range reasonable today?
- Instructions: Could a newcomer follow this without local knowledge?

If something is wrong, capture the actual boarding point or landmark, current fare if known, severity, and the correction.

## Reviewer target order

### 1. Route 3 Unified Maxi Taxi Association — primary
Why: this is the operator association directly responsible for the Green Band corridor. Newsday identified the association's public Facebook page as **Route 3 Unified Maxi-Taxi Association**, and the association explicitly invited feedback on the Chaguanas–San Fernando route in 2022.

Current relevance: Vickash Kissoondath remained publicly active around the Route 3 / Green Band operation in 2025 and as secretary of the national maxi association in 2026.

Best channel: Facebook page first; if possible, ask for a driver or route coordinator who works the Chaguanas–San Fernando zone.

### 2. Chaguanas Maxi Taxi hub — direct driver validation
Why: Guardian reporting in July 2025 documents Route 3 drivers actively working the San Fernando–Chaguanas route from the Chaguanas hub.

Best channel: in-person reviewer recruited from the actual stand/hub. One driver who regularly works the full Chaguanas–San Fernando corridor is more useful than a large generic rider survey.

### 3. Association of Maxi Taxis Trinidad and Tobago — umbrella referral
Why: the national association was active in 2026 and represented in current Ministry discussions. Vickash Kissoondath was publicly identified as an association secretary in May/June 2026.

Best use: ask for a Route 3 contact or a second independent Route 3 operator, not for a national endorsement.

### 4. Chaguanas to San Fernando Taxi Drivers' Association — independent corridor check
Why: route-taxi drivers know the same Central–South travel market and can flag stand locations, local landmarks, fare norms and transfer assumptions even where the vehicle mode differs. Newsday identified Kevon Philbert as association president in October 2024.

Use this as a cross-check, not as authority for Maxi-specific operating rules.

### 5. Trinidad and Tobago Taxi Drivers' Network — referral / third perspective
Why: Adrian Acosta was still publicly identified as president in May 2025. The network can help identify knowledgeable Central/South route-taxi reviewers.

## Outreach message

Hi, I’m working on Transit Trinidad, a free journey planner for PTSC, maxis, route taxis and ferries. We have built the Chaguanas to San Fernando Green Band corridor into the planner, but before we put it in front of the public we want drivers and regular operators to correct us.

I have five short example journeys such as California to Claxton Bay and Couva to Marabella. The review takes about 10 to 15 minutes and is only asking whether the route, boarding point, fare and instructions match what happens in real life. Nothing you enter automatically changes the public map.

Could someone who regularly works the Chaguanas to San Fernando route review it with me?

## Session protocol

Target 10–15 minutes per person.

1. Record role: driver, dispatcher/association rep, or regular rider.
2. Do not explain the expected answer.
3. Show Journey 1 exactly as the app presents it.
4. Ask: “If somebody who never travelled this route followed this, would they get there?”
5. Record route, boarding, fare and instruction verdicts separately.
6. Repeat for all five journeys.
7. If the reviewer says something is wrong, ask for the exact replacement: road, side, landmark, stand, fare or service behavior.
8. Do not resolve disagreements during the interview. Store both accounts.
9. Export the review JSON.

## Success threshold

C1 is complete when:

- at least 3 knowledgeable reviewers participate;
- each of the four core southbound journeys has at least 2 independent confirmations;
- the reverse-direction probe is either independently confirmed and modelled or explicitly left uncertain;
- there are zero unresolved Severity 1 errors;
- current fare information is confirmed or remains visibly estimated;
- all accepted corrections pass normal canonical promotion review and automated QA.

## Severity rules

**Severity 1:** wrong vehicle, wrong direction, impossible boarding point, nonexistent connection, or instruction likely to cause a failed trip.

**Major:** journey probably works but a stand, local-vs-express distinction, fare, landmark or service behavior is materially wrong.

**Minor:** wording, small landmark clarification, or non-blocking fare-range refinement.

## Fare question

The pilot page includes the June 2022 Route 3 fare ladder only as a historical comparison. It must not be treated as current until reviewers confirm it.

Published 2022 baseline from Chaguanas:
- short drop: TT$5
- through St. Mary's Junction: TT$5
- through Exchange Junction: TT$6
- through BC Roundabout: TT$7
- through Savonetta Junction: TT$8
- through Pranz Gardens Recreation Ground: TT$9
- through St. Margaret's Police Station: TT$10
- through TECU: TT$11
- through Bay Road: TT$12
- San Fernando: TT$13

## Sources used to identify pilot contacts / baseline

- Trinidad and Tobago Newsday, Green-band maxi fares increase, 2022-05-09: https://newsday.co.tt/2022/05/09/green-band-maxi-fares-increase-2/
- Ian Alleyne, Route 3 fare announcement effective 2022-06-21: https://ianalleyne.org/the-chaguanas-to-san-fernando-maxi-taxi-fares-will-be-increased-with-effect-from-tuesday-21st-june-2022
- Trinidad Guardian, Chaguanas maxi drivers want better security as robberies rise, 2025-07-08: https://www.guardian.co.tt/news/chaguanas-maxi-drivers-want-better-security-as-robberies-rise-6.2.2350220.4934d668b3
- Trinidad Guardian, Maxi taxi operators confirm shutdown from Monday, 2026-05-30: https://www.guardian.co.tt/news/maxi-taxi-operators-confirm-shutdown-from-monday-6.2.2595609.3d65d472a2
- Trinidad and Tobago Newsday, Taxi drivers' network: Relook demerit points, 2025-05-23: https://newsday.co.tt/2025/05/23/taxi-drivers-network-relook-demerit-points-dont-scrap-the-system/
- Trinidad and Tobago Newsday, Gricklock fear..., 2024-10-22: https://newsday.co.tt/2024/10/22/gricklock-fear-nagar-circus-roadworks-prompt-emergency-meeting/

## After each pilot batch

Field feedback → compare independent accounts → convert supported corrections to normal association intake / promotion candidates → review → promote → rerun fare coverage, golden journeys, pilot readiness and browser QA.
