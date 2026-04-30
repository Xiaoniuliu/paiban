# Phase 2 Crew-Resource Module Stabilization Plan

## Goal

Stabilize the crew-resource module as the second closed loop in the new main path:

`crew profile -> qualification and role -> operational status -> forecast visibility`

This phase must work without depending on:

- legacy timeline state guessing,
- draft-rostering page-local assembly,
- task-module pages acting as a proxy for crew truth.

## Current baseline

Backend already provides:

- `GET /api/crew-members`
- `POST /api/crew-members`
- `PUT /api/crew-members/{crewId}`
- `DELETE /api/crew-members/{crewId}`
- `GET /api/crew-members/qualifications`
- `POST /api/crew-members/{crewId}/qualifications`
- `PUT /api/crew-members/{crewId}/qualifications/{qualificationId}`
- `DELETE /api/crew-members/{crewId}/qualifications/{qualificationId}`
- `GET /api/timeline-blocks`
- `POST /api/timeline-blocks/crew-status`
- `PUT /api/timeline-blocks/crew-status/{blockId}`
- `DELETE /api/timeline-blocks/crew-status/{blockId}`

Frontend already provides:

- crew information, qualification, limits, and duty-calendar views inside `CrewInformationPage`
- crew-status timeline page

Current structural problem:

- the whole crew-resource closed loop still lives inside the mixed `Pages.tsx` file,
- module boundaries are visible in the UI, but not yet clear in the code structure,
- later draft-rostering work would still depend on page-local crew assembly if this is left as-is.

## Phase 2 boundaries

Phase 2 includes:

- crew member list and edit surface
- qualification and role surface
- crew-status timeline surface
- crew limit / rolling-hours / FDP forecast visibility
- crew-module action gating and extraction from mixed page structure

Phase 2 excludes:

- draft rostering redesign
- task-module redesign
- timeline behavior changes outside crew-status maintenance
- replacing the existing calculation model with a new rule engine

## Phase 2 implementation order

### Step 1. Lock the crew-resource fact shape

Use the current crew entities and endpoints as the implementation baseline and explicitly map fields into:

- crew master profile fields
- qualification and role fields
- operational status fields
- derived calculation and forecast fields

Immediate follow-up:

- confirm which fields remain editable in ordinary crew maintenance
- confirm which fields are displayed as derived judgment aids only

Personnel-profile implementation rule:

- do not pre-create a large number of future blank business fields just to “reserve space”,
- instead, lock the personnel-profile boundary now and keep later growth absorbable by adding fields inside the correct sub-surface,
- first-stage work should separate:
  - profile fields,
  - qualification and role fields,
  - hours/limits fields,
  - duty-calendar fields,
- later new fields should be added to the correct part rather than forcing a whole-page redesign.

Current personnel-profile baseline from code:

- stable profile-like fields:
  - `crewCode`
  - `employeeNo`
  - `nameZh`
  - `nameEn`
  - `homeBase`
  - `status`
- currently editable but should be reviewed for later split:
  - `roleCode`
  - `rankCode`
  - `aircraftQualification`
  - `acclimatizationStatus`
  - `bodyClockTimezone`
  - `normalCommuteMinutes`
  - `externalEmploymentFlag`
  - `availabilityStatus`
- derived judgment fields that should not be treated as ordinary profile fields:
  - `rollingFlightHours28d`
  - `rollingDutyHours28d`
  - `rollingDutyHours7d`
  - `rollingDutyHours14d`
  - `rollingFlightHours12m`
  - `latestActualFdpHours`
  - `latestActualFdpSource`

Current frontend progress:

- the personnel-profile tab is now being tightened into a real profile surface rather than a mixed everything-table,
- the main profile table is reduced toward core identity/base/status visibility,
- role/rank/qualification/availability are still visible but have been pushed into secondary summary or grouped form sections,
- the profile edit form is now explicitly grouped into:
  - core profile
  - current related settings
- the qualification surface now explicitly states its own boundary,
- the qualification edit form is grouped into:
  - qualification definition
  - validity and status
- the hours-and-limits surface is explicitly treated as a display/prediction surface for backend-derived values rather than as a calculation owner.
- the four `机组信息` domains are now also split at file/component level:
  - `CrewProfileSection.tsx`
  - `CrewQualificationSection.tsx`
  - `CrewLimitsSection.tsx`
  - `CrewDutyCalendarSection.tsx`
- `CrewInformationPage.tsx` now acts as the module shell and dialog owner instead of keeping all four tab bodies inline.

### Step 2. Isolate the frontend crew-resource surface

Refactor the current crew experience so the crew closed loop is readable and maintainable on its own.

Target outcome:

- crew information, qualification, external work, and status pages become separable from the mixed `Pages.tsx`
- crew-module behavior is understandable without reading unrelated workbench, task, or archive code

This does not require redesigning the crew UI in Phase 2.
It does require establishing a dedicated crew-module page file boundary.

Current progress:

- `CrewStatusPage` already routes through a dedicated dispatcher file instead of reading directly from the mixed `Pages.tsx` entry,
- `CrewInformationPage` has been extracted into its own page file and is now the active route target,
- `CrewExternalWorkPage` has been extracted into its own page file and is now the active route target,
- `CrewStatusTimelinePage` has been extracted into its own page file and is now the active route target,
- external work has been removed from the main crew-resource path because it currently overlaps with status-timeline intent without feeding the same timeline truth,
- legacy implementations still remain inside `Pages.tsx` where needed as temporary extraction residue and can be removed in a later cleanup pass after Phase 2 behavior is verified.

Follow-up decision intentionally deferred:

- backend `CrewExternalWork` model and APIs are preserved for now,
- later work must explicitly decide whether external work is mapped into crew-status timeline truth or fully retired,
- this decision should be made before Phase 3 depends on crew-side availability semantics.

### Step 3. Preserve four-layer crew truth

Crew-resource display and editing should continue to respect the agreed four layers:

- master profile
- qualification and role
- operational status
- derived calculation and forecast

Notes:

- rolling hours and FDP-derived fields remain dispatcher-facing
- they should not be collapsed into a single generic availability badge

### Step 4. Enforce crew-module action gates

At the end of Phase 2, crew actions must be explicit and consistent with backend write permissions.

Minimum action expectations:

- ordinary crew profile edit is limited to dispatcher/admin
- qualifications can be viewed broadly enough for operations, but edited only through the crew-resource module
- external work can be viewed from the crew side without entering draft rostering
- crew-status timeline maintenance remains separate from assignment editing

### Step 5. Add Phase 2 verification coverage

Add or extend verification around:

- create crew member
- update crew member
- disable crew member
- create/update/disable qualification
- create/update/disable external work
- create/update/delete crew-status block

## Required code decisions

### Decision A. Backend baseline

Keep `CrewMemberController` and `TimelineBlockController` as the initial Phase 2 backend baseline rather than redesigning crew APIs in the same phase.

Reason:

- they already cover the CRUD surface needed for the crew closed loop
- replacing them now adds risk without increasing business clarity

### Decision B. Frontend baseline

Use the existing crew pages inside `Pages.tsx` as the extraction baseline rather than redesigning the crew UI first.

Reason:

- the current views already reflect the four-layer crew model in usable form
- the main risk is mixed-file coupling, not lack of functionality

### Decision C. Existing forecast fields remain first-stage truth

Current rolling-hours and FDP-related fields remain the first-stage baseline for dispatcher pre-judgment.

Reason:

- they already exist in code and in the current UI
- replacing them during Phase 2 would expand scope beyond crew stabilization

## Deliverables

Phase 2 should produce:

- a clear crew-resource frontend surface
- crew-resource action boundaries that do not depend on legacy workbench state guessing
- crew-resource backend behavior documented by verification
- a code path that Phase 3 draft rostering can safely depend on

## Completion gate

Phase 2 is complete when:

- dispatchers can manage crew facts without entering legacy workbench pages
- crew information, qualification, status, and external work no longer depend on mixed page-local assembly
- existing limit and forecast visibility remains available
- crew-module code can be understood separately from task, workbench, and archive administration
