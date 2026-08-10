 CareFlow - July 2026 Client Delivery Report

**Period covered:** 1 July 2026 - 31 July 2026  
**Repositories:** `careflow-admin` (frontend), `careflow-api` (backend + carer/employee app APIs)  
**How this was measured:** Git history with  
`git log --since="2026-07-01" --until="2026-08-01"`  
plus a current code audit of what is finished vs still pending.

> **Note:** Work continued in **August 2026** (ECM CQC report pack, graph chart pack, HMRC RTI submissions, etc.). That is called out separately so July delivery is not overstated.

---

## 1. Executive summary

In July 2026 the team delivered a large, multi-module release:

| Metric | Volume |
|--------|--------|
| Frontend commits (`careflow-admin`) | **53** |
| Backend commits (`careflow-api`) | **37** |
| Approx. frontend lines added (feature folders) | **~50,000+** across major modules |
| Database migrations introduced in July commits | **~35+** (billing, payroll, learning, ECM attendance, hours, absences, payouts, ...) |

**Contributors**

| Role | Name |
|------|------|
| Project Manager | Zeeshan Nawaz |
| Frontend | Hamza |
| Backend | Tufail Khan |
| App Developer | Saqib |
| Mobile App Designer | Arfa |
| QA | Abeeha Ali |
| DevOps | Ali |

**Largest July themes (by commit density):**

1. **Billing & finance** (charge/pay cards, invoices, reconciliation, payments)  
2. **Employees** (hours, absences, pay cards, salary UI)  
3. **Service users** (portal, initial assessment, tasks planner, visit plan)  
4. **ECM + Carer app APIs** (live monitoring, graphs, exceptions, mobile visit APIs)  
5. **UK Payroll core** (employer/runs/calc - HMRC filing mainly August)  
6. **Learning (LMS)**  
7. **Scheduling / double-up visits**  
8. **Employee payouts**

**Bottom line for the client:** July established the commercial and operational backbone (billing, payroll foundation, workforce hours, learning, ECM/carer monitoring). Several modules are **ops-ready**; several still need **exports, PDF/email delivery, and "coming soon" UI** completed before calling the whole product "finished."

**Start here for the client:** **Section 2** is the detailed feature register — for each feature: who/what/status, **Frontend/Admin tasks done**, **Backend/API tasks done**, and **Remaining** (broken into small tasks). Later sections are screens, commit volume, and a short module rollup.

**Important:** Most of what managers and office staff use daily is the **CareAdmin frontend** (`careflow-admin`). July delivered **53 frontend commits** and large new UI surfaces (screens, dialogs, sidebars, dashboards)-not only APIs.

---

## 2. Functional features — detailed delivery (client + FE/BE tasks)

This is the **main client section**. For every feature you get:

1. **Who / what / status** (business view)  
2. **Frontend / Admin tasks done** (small tasks staff can click)  
3. **Backend / API tasks done** (small tasks that power it)  
4. **Remaining** (small tasks still open)

**Status legend:** **Ready to use** | **Usable with gaps** | **Started / limited**

**Note on carer mobile:** This workspace ships **APIs + CareAdmin**. Native carer app UI QA is outside these repos (called out under Remaining where relevant).

---

### 2.1 Care delivery & monitoring (ECM)

#### Feature: Live visit monitoring
| | |
|--|--|
| **Who** | Coordinators / on-call |
| **What they can do** | See planned visits for a day/period; spot missing check-ins, late/outstanding visits; open a visit and act |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Live monitoring page (`/ecm/live`)
- [x] Operational period control (day / week / custom)
- [x] Location / org scope on the board
- [x] Summary tiles (counts for late, missed, outstanding, etc.)
- [x] Visit list / queue table with refresh
- [x] Open visit detail from a row
- [x] Health / monitoring banner on the page

**Backend / API — done**
- [x] Live dashboard endpoint (visits + summary for period)
- [x] Visit detail endpoint for a single visit
- [x] Health / status payload for the board
- [x] Evaluate / re-evaluate visit against ECM rules (on demand)

**Remaining**
- [ ] Optional dedicated exceptions-only page (queue already lives on Live)
- [ ] Deeper “identity / continuity” analytics (not required for day ops)

---

#### Feature: Exception handling
| | |
|--|--|
| **Who** | Coordinators / quality |
| **What they can do** | Work a queue of problem visits (late, missed, short, etc.); open detail and act |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Exception queue panel on Live
- [x] Filter / triage problem visits from the queue
- [x] Open visit detail from an exception row
- [x] Ops actions UI (acknowledge / resolve / close style actions)
- [x] Reason-code selection in ops flows where required

**Backend / API — done**
- [x] List exceptions API
- [x] Acknowledge exception API
- [x] Resolve / close exception API
- [x] Reason-code catalog / lookup for exceptions

**Remaining**
- [ ] Optional standalone `/ecm/exceptions` route (nice-to-have; not blocking)

---

#### Feature: Visit punctuality & duration assessment
| | |
|--|--|
| **Who** | System + office |
| **What they can do** | Automatically classify arrival/duration against plan using ECM rules/thresholds |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Show punctuality / duration classification on visit detail
- [x] Show applied settings / threshold badge where relevant
- [x] Surface late / early / short outcomes on Live tiles & rows

**Backend / API — done**
- [x] Evaluation engine (arrival vs plan)
- [x] Evaluation engine (duration vs plan)
- [x] Persist evaluation / attendance classification
- [x] Resolve org thresholds when evaluating
- [x] Schedule version awareness for “what was planned”

**Remaining**
- [ ] None material for core assessment path

---

#### Feature: Missed-visit detection
| | |
|--|--|
| **Who** | System (+ office triage) |
| **What they can do** | Background check flags visits that look missed so office can triage |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Show missed / outstanding visits on Live
- [x] Missed-triage actions on visit ops UI

**Backend / API — done**
- [x] Missed-visit detection job (scheduled)
- [x] Missed-triage update API
- [x] Feed missed outcomes into exceptions / live dashboard

**Remaining**
- [ ] None material for core detection path

---

#### Feature: Manual attendance / office completion
| | |
|--|--|
| **Who** | Office |
| **What they can do** | Record attendance when the carer could not use the app normally |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Manual attendance action in visit ops
- [x] Amend attendance action where supported
- [x] Capture reason / evidence fields in the form

**Backend / API — done**
- [x] Manual attendance create API
- [x] Amend attendance API
- [x] Store notification / evidence linkage for office-recorded attendance
- [x] Re-run evaluation after manual attendance

**Remaining**
- [ ] None material for core office path

---

#### Feature: ECM graphs & trends
| | |
|--|--|
| **Who** | Managers |
| **What they can do** | See late/missed/short rates, branch comparison, arrival/duration mixes, reasons, heatmaps |
| **Status** | Ready to use *(chart pack strengthened further in Aug)* |

**Frontend / Admin — done**
- [x] Graphs page (`/ecm/graph`)
- [x] Shared operational period + schedule-area filters
- [x] Rate-based exception trend charts
- [x] Branch risk / compare board
- [x] Arrival band mix chart
- [x] Duration band mix chart
- [x] Reasons breakdown
- [x] Heatmap + drill into supporting detail
- [x] Status-by-hour (single-day view where applicable)

**Backend / API — done**
- [x] Graph dashboard aggregate API
- [x] Analytics for exception rates over period
- [x] Branch / area aggregation for risk compare
- [x] Arrival / duration band aggregates
- [x] Reason aggregates
- [x] Heatmap aggregates

**Remaining**
- [ ] Deeper continuity / identity analytics beyond current chart set
- [ ] When a single schedule area is selected, clarify “select All areas” for branch compare (UX edge)

---

#### Feature: ECM compliance snapshot
| | |
|--|--|
| **Who** | Managers / quality |
| **What they can do** | See electronic vs manual attendance and geofence breach counts |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Compliance overview panel (method cards / KPIs)
- [x] Wire panel to shared ECM period filters
- [x] Link users toward Reports for period pack detail

**Backend / API — done**
- [x] Compliance report API (electronic vs manual)
- [x] Geofence breach counts in compliance payload

**Remaining**
- [ ] None material for snapshot KPIs (full pack = Reports feature)

---

#### Feature: ECM period reports / export
| | |
|--|--|
| **Who** | Quality / commissioners |
| **What they can do** | Produce a period pack with n/d rates and CSV (PDF pack still pending) |
| **Status** | Usable with gaps |

**Frontend / Admin — done**
- [x] Reports page (`/ecm/reports`)
- [x] Period / location / schedule-area header context
- [x] n/d summary tiles for the period
- [x] Classification tables
- [x] Verification mix display
- [x] Exception register table
- [x] CSV download (permission-gated)

**Backend / API — done**
- [x] Daily / period operations report API
- [x] Compliance KPI feed for the pack
- [x] Exception register data for export
- [x] CSV generation path for summary / register

**Remaining**
- [ ] PDF inspection pack generation
- [ ] Branded PDF layout for commissioners / CQC-style pack
- [ ] Optional email / download-of-PDF delivery

---

#### Feature: Configure ECM thresholds
| | |
|--|--|
| **Who** | Admin |
| **What they can do** | Set organisation rules for late/early/short windows used in assessment |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] ECM threshold lookups settings panel
- [x] Edit late / early / short window values
- [x] Save thresholds from Settings

**Backend / API — done**
- [x] Get threshold lookups API
- [x] Patch threshold lookups API
- [x] Settings resolver used by evaluation

**Remaining**
- [ ] None material for core threshold config

---

### 2.2 Carer mobile / field app (APIs + office hub)

> Native mobile UI is **not** in this monorepo. July delivered the **APIs** carers need, plus the **CareAdmin Carer Visit Hub**.

#### Feature: Carer login & session
| | |
|--|--|
| **Who** | Carers |
| **What they can do** | Sign in / refresh / sign out securely |
| **Status** | Ready to use (API) |

**Frontend / Admin — done**
- [x] N/A for mobile login (mobile app outside repo)
- [x] Office staff continue to use CareAdmin auth separately

**Backend / API — done**
- [x] Carer login endpoint
- [x] Token refresh endpoint
- [x] Logout endpoint
- [x] `me` / current-user endpoint

**Remaining**
- [ ] Mobile client UAT / sign-off against these APIs (outside repo)

---

#### Feature: Today's schedule
| | |
|--|--|
| **Who** | Carers |
| **What they can do** | See their visits for the day |
| **Status** | Ready to use (API) |

**Frontend / Admin — done**
- [x] Office can view related jobs on schedule board / visit hub

**Backend / API — done**
- [x] Carer schedule list API
- [x] Carer “my visits” list API
- [x] Home feed API (today context)

**Remaining**
- [ ] Mobile client UAT for schedule screens

---

#### Feature: Client information at point of care
| | |
|--|--|
| **Who** | Carers |
| **What they can do** | Open client profile, care plan, meds, documents, consent/capacity context |
| **Status** | Ready to use (API) |

**Frontend / Admin — done**
- [x] Carer Visit Hub shows client context for the open visit

**Backend / API — done**
- [x] Client list / detail APIs
- [x] Client documents API
- [x] Client medications API
- [x] Assessments / history APIs
- [x] Consent / capacity context APIs
- [x] Care plan read APIs for carer

**Remaining**
- [ ] Mobile client UAT for client dossier screens

---

#### Feature: Check in to a visit
| | |
|--|--|
| **Who** | Carers |
| **What they can do** | Start a visit (with location/attendance evidence where configured) |
| **Status** | Ready to use (API) |

**Frontend / Admin — done**
- [x] Office can see check-in outcome on Live / visit detail after carer starts

**Backend / API — done**
- [x] Check-in API
- [x] Arrival reason support on check-in
- [x] Location / attendance evidence capture on check-in path
- [x] Trigger ECM evaluation after check-in

**Remaining**
- [ ] Mobile geofence / device edge-case hardening (ops)
- [ ] Mobile client UAT

---

#### Feature: Unable to start visit
| | |
|--|--|
| **Who** | Carers |
| **What they can do** | Record that a visit could not be started, with reason |
| **Status** | Ready to use (API) |

**Frontend / Admin — done**
- [x] Office complete / outcomes UI can reflect unable-to-start style outcomes

**Backend / API — done**
- [x] Unable-to-start API
- [x] Reason capture on unable-to-start
- [x] Feed outcome into visit / ECM state

**Remaining**
- [ ] Mobile client UAT

---

#### Feature: Complete care tasks on visit
| | |
|--|--|
| **Who** | Carers (+ office oversight) |
| **What they can do** | View/update visit tasks |
| **Status** | Ready to use (API + admin checklist) |

**Frontend / Admin — done**
- [x] Visit job tasks checklist on visit workspace / hub
- [x] Update task completion from admin where supported

**Backend / API — done**
- [x] List visit tasks API
- [x] Patch visit tasks API
- [x] Update single task API

**Remaining**
- [ ] Harden multi-carer / partial-save edge cases
- [ ] Mobile client UAT

---

#### Feature: Medication administration on visit
| | |
|--|--|
| **Who** | Carers (+ office oversight) |
| **What they can do** | Record medication administrations |
| **Status** | Ready to use (API + admin panels) |

**Frontend / Admin — done**
- [x] Medication panels on visit workspace / hub

**Backend / API — done**
- [x] Visit medication list API
- [x] Record administration API

**Remaining**
- [ ] Mobile client UAT
- [ ] Schedule “Meds Administration” report type still unsupported (separate Scheduling reports feature)

---

#### Feature: Observations
| | |
|--|--|
| **Who** | Carers (+ office oversight) |
| **What they can do** | Capture observations during the visit |
| **Status** | Ready to use (API + admin panel) |

**Frontend / Admin — done**
- [x] Visit observations panel on workspace / hub

**Backend / API — done**
- [x] List / create / patch observations APIs
- [x] Observations catalog API

**Remaining**
- [ ] Mobile client UAT

---

#### Feature: Notes, handover, concerns, incidents
| | |
|--|--|
| **Who** | Carers (+ office oversight) |
| **What they can do** | Log notes; raise concerns/incidents with attachments |
| **Status** | Ready to use (API + admin panels) |

**Frontend / Admin — done**
- [x] Visit log / notes panels on hub / workspace
- [x] Concerns / incidents surfaces on visit workspace
- [x] Attachment handling in admin visit flows where wired

**Backend / API — done**
- [x] Notes APIs
- [x] Handover APIs
- [x] Concerns APIs
- [x] Incidents APIs + attachments
- [x] Identity / body-map related visit APIs (as shipped in visit workspace)

**Remaining**
- [ ] Mobile client UAT for attachments / offline edge cases

---

#### Feature: Complete the visit
| | |
|--|--|
| **Who** | Carers (+ office) |
| **What they can do** | Finish the visit with completion options |
| **Status** | Ready to use (API + admin complete dialog) |

**Frontend / Admin — done**
- [x] Schedule job complete dialog
- [x] Completion options UI
- [x] Double-up completion guards in dialog

**Backend / API — done**
- [x] Completion options API
- [x] Complete visit API
- [x] Co-carer / multi-carer awareness on complete path

**Remaining**
- [ ] Mobile client UAT for complete flow
- [ ] Ops edge cases only

---

#### Feature: View own salary info (carer)
| | |
|--|--|
| **Who** | Carers |
| **What they can do** | See salary-related information in-app |
| **Status** | Ready to use (API) |

**Frontend / Admin — done**
- [x] Office salary overview under Billing (separate office feature)
- [x] N/A carer mobile salary screen in this repo

**Backend / API — done**
- [x] `me/salary` API for carer app

**Remaining**
- [ ] Mobile client UAT for salary screen

---

#### Feature: Office Carer Visit Hub
| | |
|--|--|
| **Who** | Office |
| **What they can do** | Open the same visit from CareAdmin for support/oversight |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Carer Visit Hub page (`/scheduling/visits/$jobId`)
- [x] Client context, tasks, meds, obs, notes on one office screen
- [x] Link from schedule board into the hub

**Backend / API — done**
- [x] Job detail / visit APIs used by hub
- [x] Reuse employee-app / scheduling visit endpoints for office oversight

**Remaining**
- [ ] None material for hub core path

---

### 2.3 Scheduling & rota

#### Feature: Schedule board / Gantt
| | |
|--|--|
| **Who** | Coordinators |
| **What they can do** | Plan and view jobs across carers and time |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Schedule jobs board page
- [x] Gantt visualisation
- [x] Filters (area / carer / status as shipped)
- [x] Hover / drill into job workspace

**Backend / API — done**
- [x] Scheduled jobs list / timeline APIs
- [x] Job detail APIs for board drill-in
- [x] Housekeeping / sync jobs supporting the board

**Remaining**
- [ ] None material for core board

---

#### Feature: Allocate carers to jobs
| | |
|--|--|
| **Who** | Coordinators |
| **What they can do** | Assign staff to visits |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Allocate carer actions on board / workspace
- [x] Show current allocations on job
- [x] Lead-carer selection where multi-carer

**Backend / API — done**
- [x] Create / update job allocations API
- [x] Set lead carer API
- [x] Allocation actual-time fields where used by ECM/billing

**Remaining**
- [ ] None material for core allocate path

---

#### Feature: Double-up (2+ carer) visits
| | |
|--|--|
| **Who** | Coordinators |
| **What they can do** | Plan visits needing more than one carer; see under/over allocation; lead carer; Gantt cues |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Required-carers field / display
- [x] Under-allocation / over-allocation cues on Gantt
- [x] Lead carer label on multi-carer jobs
- [x] Filters for double-up style jobs
- [x] Complete-dialog guards when allocation incomplete

**Backend / API — done**
- [x] Multi-carer allocation model / APIs
- [x] Lead carer persistence
- [x] Employee-app co-carer awareness
- [x] Multi-carer funder / charge mode support (where migrated)

**Remaining**
- [ ] None material as a stub; ops edge UAT only

---

#### Feature: Complete / manage job outcomes from office
| | |
|--|--|
| **Who** | Coordinators |
| **What they can do** | Complete or adjust visit delivery from admin |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Complete job dialog
- [x] Visit delivery status panel
- [x] Office outcome / completion options

**Backend / API — done**
- [x] Job complete endpoints
- [x] Delivery assessment / outcome APIs
- [x] Guards for double-up completion rules

**Remaining**
- [ ] None material for core office complete path

---

#### Feature: Service user visit plan
| | |
|--|--|
| **Who** | Coordinators / care planners |
| **What they can do** | Maintain the planned pattern of visits for a service user |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Visit plan page on service user (`/service-users/$id/visit-plan`)
- [x] Edit planned visits / pattern UI
- [x] Generate-rota style actions where shipped
- [x] Carer suggest UX where shipped

**Backend / API — done**
- [x] Visit plans CRUD / list APIs
- [x] Generate / apply plan support APIs
- [x] Carer suggest support APIs

**Remaining**
- [ ] None material for core visit plan

---

#### Feature: Schedule reports (file export)
| | |
|--|--|
| **Who** | Managers |
| **What they can do** | Run/export some schedule reports |
| **Status** | Usable with gaps |

**Frontend / Admin — done**
- [x] Schedule reports page (`/scheduling/report`)
- [x] Report type picker
- [x] Generate supported reports (on-screen / JSON path)
- [x] Show “coming soon” for unsupported types

**Backend / API — done**
- [x] Supported generators: call-off, daily allocation, time analysis, SU visit, visit detail, capacity, jobs status
- [x] Report catalog marking supported vs unsupported

**Remaining**
- [ ] Implement unsupported types: Adjustment, GeoFence, Housepack, Meds Administration, Template schedule, Spoof, etc.
- [ ] File export hook for generated report files (still TODO)
- [ ] Long-running “report ready” notifications (currently stubbed)

---

### 2.4 Service users, assessment & portal

#### Feature: Initial Assessment (enterprise)
| | |
|--|--|
| **Who** | Assessors / care managers |
| **What they can do** | Capture a structured initial assessment (incl. social history / secure fields) |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Initial Assessment enterprise page
- [x] Holistic / enterprise section panels
- [x] Social history fields
- [x] Secure-field capture UI
- [x] Submit / review actions in UI

**Backend / API — done**
- [x] Create / update / submit IA APIs
- [x] Review workflow APIs
- [x] Secure fields storage
- [x] Social history persistence

**Remaining**
- [ ] Wire IA review notification hooks fully (flash / reminders)

---

#### Feature: Export assessment (HTML/PDF)
| | |
|--|--|
| **Who** | Assessors |
| **What they can do** | Produce assessment output for records |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Export actions on IA UI

**Backend / API — done**
- [x] HTML export util / endpoint
- [x] PDF export util / endpoint

**Remaining**
- [ ] None material for core export path

---

#### Feature: Tasks planner
| | |
|--|--|
| **Who** | Care planners |
| **What they can do** | Plan care tasks for a service user |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Tasks planner page (`/service-users/$id/tasks-planner`)
- [x] Add / edit / order care tasks UI

**Backend / API — done**
- [x] Service-user visit tasks APIs
- [x] Seeder support for demo / setup data

**Remaining**
- [ ] None material for core planner

---

#### Feature: Enable Service User Portal
| | |
|--|--|
| **Who** | Admin |
| **What they can do** | Turn on portal access for a service user |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Service User Portal admin enablement UI
- [x] Link portal access from service-user record / admin section

**Backend / API — done**
- [x] Portal account create / enable APIs
- [x] Portal account status on service user

**Remaining**
- [ ] None material for enablement path

---

#### Feature: Service User Portal login
| | |
|--|--|
| **Who** | Service user / family |
| **What they can do** | Sign in to their portal |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Portal login page
- [x] Post-login dashboard entry

**Backend / API — done**
- [x] Portal auth / session endpoints
- [x] Portal auth guard

**Remaining**
- [ ] None material for login path

---

#### Feature: Portal — profile, about me, contacts, allergies, meds
| | |
|--|--|
| **Who** | Service user / family |
| **What they can do** | View/maintain personal care information (within portal permissions) |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Portal profile page
- [x] About me page
- [x] Contacts page
- [x] Allergies page
- [x] Medications page

**Backend / API — done**
- [x] GET/PATCH profile
- [x] GET/PATCH about-me
- [x] GET/PATCH contacts
- [x] GET/PATCH allergies
- [x] GET/PATCH medications

**Remaining**
- [ ] Expand write scope if client wants full care management in portal (currently limited)

---

#### Feature: Portal — calendar, visit plans, completed visits, photos
| | |
|--|--|
| **Who** | Service user / family |
| **What they can do** | See schedule/history and photos |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Portal calendar page
- [x] Portal visit plans page
- [x] Portal completed visits page
- [x] Portal photos page

**Backend / API — done**
- [x] Calendar API
- [x] Visit plans API for portal
- [x] Completed visits API
- [x] Photos upload / list API

**Remaining**
- [ ] Calendar reminder notifications not fully wired
- [ ] Keep portal scope honest (not full care management)

---

#### Feature: Care Plan / Comms / Alerts modules
| | |
|--|--|
| **Who** | Office |
| **What they can do** | Full care-plan & messaging workspace *(intended)* |
| **Status** | Started / limited |

**Frontend / Admin — done**
- [x] Care Plan route shell exists
- [x] Nav tabs visible for Comms / Alerts (placeholders)
- [x] Dashboard tiles exist (some disabled)

**Backend / API — done**
- [x] Partial care-plan rules from IA exist
- [x] No full Comms / Alerts product API surface for office workspace

**Remaining**
- [ ] Implement Comms module (real routes + APIs)
- [ ] Implement Alerts module (real routes + APIs)
- [ ] Finish Care Plan “Add” + Consent/MCA / Risk / Monitor accordions
- [ ] Remove or implement fake CTAs (`/in-progress`: Create Session, Care summary, Detailed Care report, House pack history)
- [ ] Enable History tile on dashboard when backed by real data

---

### 2.5 Workforce (employees)

#### Feature: Employee hours (weekly/monthly)
| | |
|--|--|
| **Who** | Managers / payroll prep |
| **What they can do** | Review worked hours; monthly review workflow |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Employee hours page (`/employee/hours`)
- [x] Weekly summary view
- [x] Monthly panel
- [x] Hours detail dialog
- [x] Monthly review action in UI

**Backend / API — done**
- [x] Weekly summary API
- [x] Monthly summary API
- [x] Hours detail API
- [x] Monthly-review patch API

**Remaining**
- [ ] None material for core hours path

---

#### Feature: Record absences
| | |
|--|--|
| **Who** | Managers / HR |
| **What they can do** | Create and manage absence records |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Absences page (`/employee/absences`)
- [x] Create / edit absence form dialog
- [x] List / filter absences

**Backend / API — done**
- [x] Absences create API
- [x] Absences update API
- [x] Absences list / get APIs
- [x] Absences delete / cancel where shipped

**Remaining**
- [ ] None material for core absences path

---

#### Feature: Assign pay cards to staff
| | |
|--|--|
| **Who** | Finance / HR |
| **What they can do** | Link employees to pay rate cards |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Pay card panel on employee edit
- [x] Assign / change pay card UI

**Backend / API — done**
- [x] Pay-card assign APIs
- [x] Resolve employee → pay card for calculations

**Remaining**
- [ ] None material for assign path

---

#### Feature: Edit salary / visit / learning / holidays on employee
| | |
|--|--|
| **Who** | HR / managers |
| **What they can do** | Maintain staff pay and related panels in one place |
| **Status** | Ready to use *(some unused sections still placeholders)* |

**Frontend / Admin — done**
- [x] Employee edit salary panel
- [x] Employee edit visits panel
- [x] Employee edit learning panel
- [x] Employee edit holidays panel
- [x] Staff list filters / branch cell UX

**Backend / API — done**
- [x] Salary / deduction related APIs
- [x] Visits-related employee APIs used by panel
- [x] Learning assignment hooks used by panel
- [x] Holidays related APIs used by panel

**Remaining**
- [ ] Replace remaining `EmployeeEditPlaceholderPanel` sections with real panels or hide them

---

#### Feature: Carer app access on employee record
| | |
|--|--|
| **Who** | Admin |
| **What they can do** | Control whether staff can use the carer app |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Employee app access section on employee edit

**Backend / API — done**
- [x] Employee portal / app account enable APIs
- [x] Persist app access flag / account state

**Remaining**
- [ ] None material for access control path

---

#### Feature: Employee management reports
| | |
|--|--|
| **Who** | HR / managers |
| **What they can do** | Run staff analysis / compliance / holiday reports from Employee → Reports |
| **Status** | Started / limited |

**Frontend / Admin — done**
- [x] Reports tab listing report titles
- [x] Buttons rendered for each report name

**Backend / API — done**
- [x] Partial dashboard / staff-summary only
- [x] Several report endpoints still return “Not implemented yet”

**Remaining**
- [ ] Wire FE buttons to real handlers
- [ ] Implement analysis report API
- [ ] Implement compliance report API
- [ ] Implement leaving / details / holidays report APIs
- [ ] Or hide the Reports tab until ready

---

### 2.6 Billing & finance

#### Feature: Configure pay cards & charge cards
| | |
|--|--|
| **Who** | Finance |
| **What they can do** | Define rate/charge rules and assign them |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Pay cards panel + form dialog
- [x] Charge cards panel + form dialog
- [x] Assign-to-target dialogs
- [x] Billing section navigation / home layout

**Backend / API — done**
- [x] Pay cards CRUD
- [x] Charge cards CRUD
- [x] Assignment / matching APIs
- [x] Rate framework migrations supporting cards

**Remaining**
- [ ] None material for core card config

---

#### Feature: Funding contract billing fields
| | |
|--|--|
| **Who** | Finance |
| **What they can do** | Capture contract fields that drive charging |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Funding contracts billing panel
- [x] Contract fields on service-user finance area where shipped

**Backend / API — done**
- [x] Funding contracts list / summary APIs
- [x] Persist billing fields used by invoice / charge calc

**Remaining**
- [ ] None material for core contract fields

---

#### Feature: Visit reconciliation
| | |
|--|--|
| **Who** | Finance / ops |
| **What they can do** | Review visit exceptions, approve/reject, handle overruns, set payable amounts |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Visit reconciliation page
- [x] Exception queue for finance visits
- [x] Detail dialog (approve / reject / overrun / payable)
- [x] Refresh / filter reconciled vs open items

**Backend / API — done**
- [x] Reconciliation exception queue API
- [x] Approve / reject APIs
- [x] Overrun handling API
- [x] Set payable amount API

**Remaining**
- [ ] None material for core reconciliation path

---

#### Feature: Visit pay runs
| | |
|--|--|
| **Who** | Finance |
| **What they can do** | Calculate visit-based pay for a period (with export path) |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Visit pay runs (payroll-runs) list page
- [x] Create / open run detail dialog
- [x] Calculate / approve / lock actions in UI
- [x] Export action wired to API path

**Backend / API — done**
- [x] Create pay run API
- [x] Calculate pay run API
- [x] Approve / lock APIs
- [x] Export endpoint for run results

**Remaining**
- [ ] None material for core pay-run path

---

#### Feature: Invoice templates
| | |
|--|--|
| **Who** | Finance |
| **What they can do** | Design/validate/preview invoice layouts |
| **Status** | Usable with gaps |

**Frontend / Admin — done**
- [x] Invoice templates panel
- [x] Layout preset selection
- [x] Validate action UI
- [x] Preview UI

**Backend / API — done**
- [x] Templates CRUD
- [x] Layout presets
- [x] Validate template API

**Remaining**
- [ ] Preview should use live calculated invoice data (currently often placeholders)

---

#### Feature: Invoice runs
| | |
|--|--|
| **Who** | Finance |
| **What they can do** | Create, calculate, approve, lock invoice runs; mark sent |
| **Status** | Usable with gaps |

**Frontend / Admin — done**
- [x] Invoice runs list page
- [x] Invoice run detail page
- [x] Create / calculate / approve / lock actions
- [x] Mark-sent / send action in UI
- [x] Preview invoice from run

**Backend / API — done**
- [x] Create / calculate invoice run APIs
- [x] Approve / lock APIs
- [x] `send` endpoint currently **marks status SENT** (status flip)

**Remaining**
- [ ] True invoice PDF generation
- [ ] Email delivery pipeline (not status-only)
- [ ] Confirm preview uses calculated line items end-to-end

---

#### Feature: Record & match payments
| | |
|--|--|
| **Who** | Finance |
| **What they can do** | Post payments and allocate to invoices |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Payments page
- [x] Record payment dialog
- [x] Match / allocate payment dialog

**Backend / API — done**
- [x] Payments create API
- [x] Payment allocations APIs
- [x] List / get payments

**Remaining**
- [ ] None material for core payments path

---

#### Feature: Travel time / mileage / distance rules
| | |
|--|--|
| **Who** | Finance |
| **What they can do** | Apply travel and distance calculations to pay/charge logic |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Travel / mileage fields on rate / card configuration
- [x] Surface travel impacts in reconciliation / pay where applicable

**Backend / API — done**
- [x] Inter-visit travel calculation
- [x] Mileage utilities
- [x] Pay-policy travel mode rules
- [x] Distance rule persistence / use in calc

**Remaining**
- [ ] None material as a stub

---

#### Feature: Salary overview
| | |
|--|--|
| **Who** | Finance / managers |
| **What they can do** | See salary-oriented overview |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Billing salary overview page (`/billing/salary`)

**Backend / API — done**
- [x] Employee salaries / earnings feeds from payroll-runs / billing APIs

**Remaining**
- [ ] None material for overview path

---

#### Feature: Employee payout batches
| | |
|--|--|
| **Who** | Finance |
| **What they can do** | Create/approve/mark-paid payout batches (e.g. net pay runs) |
| **Status** | Usable with gaps |

**Frontend / Admin — done**
- [x] Employee payouts page
- [x] Create batch UI
- [x] Batch detail dialog
- [x] Approve / mark-paid / cancel actions

**Backend / API — done**
- [x] Create payout batch API
- [x] Approve / mark-paid / cancel APIs
- [x] Eligible UK net-run tie-in

**Remaining**
- [ ] BACS / bank-file export
- [ ] Downloadable payment file for bank upload

---

#### Feature: Billing audit export
| | |
|--|--|
| **Who** | Finance / audit |
| **What they can do** | Export audit job packs *(intended)* |
| **Status** | Started / limited |

**Frontend / Admin — done**
- [x] Audit export page shell
- [x] List UI for export jobs (currently mock-backed)
- [x] New export job / Download buttons present

**Backend / API — done**
- [x] No real billing audit-export job controller found

**Remaining**
- [ ] Remove mock data (`MOCK_AUDIT_EXPORTS`)
- [ ] Implement create-export-job API
- [ ] Implement list-export-jobs API
- [ ] Implement download-export API
- [ ] Or hide the page until wired

---

### 2.7 UK Payroll

#### Feature: Set up employer payroll
| | |
|--|--|
| **Who** | Payroll admin |
| **What they can do** | Employer settings, tax years, schedules |
| **Status** | Ready to use (July core) |

**Frontend / Admin — done**
- [x] Payroll overview page
- [x] Employer settings page
- [x] Tax years page
- [x] Schedules page
- [x] Taxes / statutory rates UI where shipped

**Backend / API — done**
- [x] Employer settings APIs
- [x] Tax years APIs
- [x] Schedules / periods APIs
- [x] Statutory rates foundation

**Remaining**
- [ ] Production gateway credentials / env for live filing (see HMRC feature)

---

#### Feature: Maintain payroll employees / agreements
| | |
|--|--|
| **Who** | Payroll admin |
| **What they can do** | Enrol staff into payroll setup |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Payroll employees page
- [x] Employee payroll profile UI
- [x] Pay agreement UI

**Backend / API — done**
- [x] Payroll employee profile APIs
- [x] Pay agreements APIs
- [x] YTD support APIs

**Remaining**
- [ ] None material for core enrolment path

---

#### Feature: Run payroll calculate & close
| | |
|--|--|
| **Who** | Payroll admin |
| **What they can do** | Create a run, calculate gross/statutory foundations, close |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Payroll runs list
- [x] Run detail page
- [x] Enrol employees into run
- [x] Calculate actions in UI
- [x] Close / cancel / reactivate actions

**Backend / API — done**
- [x] Create run API
- [x] Enrol API
- [x] Calculate gross API
- [x] Calculate statutory API
- [x] Close / cancel / reactivate APIs

**Remaining**
- [ ] Broader UAT of statutory edge cases
- [ ] Ops sign-off on closed-run corrections process

---

#### Feature: Deduction elections / catalogs
| | |
|--|--|
| **Who** | Payroll admin |
| **What they can do** | Configure deductions |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Deductions catalog / elections UI in payroll area

**Backend / API — done**
- [x] Deduction elections APIs
- [x] Employee salary deduction APIs (payroll + billing salary linkage)

**Remaining**
- [ ] None material for core deductions path

---

#### Feature: Submit FPS/EPS to HMRC
| | |
|--|--|
| **Who** | Payroll admin |
| **What they can do** | Electronic filing to HMRC |
| **Status** | Mostly **August** (not July); needs config/UAT |

**Frontend / Admin — done** *(mainly Aug)*
- [x] FPS submission panels
- [x] EPS submission panels
- [x] Dual-control approve / reject UI

**Backend / API — done** *(mainly Aug)*
- [x] FPS submit API
- [x] EPS submit API
- [x] Submissions approve / reject APIs
- [x] GovTalk / dry-run / LIVE dual-control foundations

**Remaining**
- [ ] Enable `HMRC_RTI_HTTP_ENABLED` (and related flags) per environment
- [ ] Configure Test vs Live gateway credentials
- [ ] Complete sandbox UAT
- [ ] Complete live UAT with dual-control process

---

### 2.8 Learning & compliance training

#### Feature: Learning dashboard
| | |
|--|--|
| **Who** | Training lead |
| **What they can do** | See training overview |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Learning dashboard page (`/learning/dashboard`)
- [x] Learning section layout / nav

**Backend / API — done**
- [x] Learning dashboard API

**Remaining**
- [ ] None material for dashboard

---

#### Feature: Build courses (sections, content, assessments)
| | |
|--|--|
| **Who** | Training lead |
| **What they can do** | Create and version training content |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Courses list / new / detail pages
- [x] Course builder (sections)
- [x] Content editor
- [x] Assessment builder
- [x] Categories management

**Backend / API — done**
- [x] Courses CRUD + versions
- [x] Sections / content APIs
- [x] Assessments APIs
- [x] Categories APIs

**Remaining**
- [ ] None material for admin builder

---

#### Feature: Assign training (including bulk)
| | |
|--|--|
| **Who** | Training lead / managers |
| **What they can do** | Assign courses to staff |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Assignments page
- [x] Assignment wizard
- [x] Bulk assign flow

**Backend / API — done**
- [x] Assignments create API
- [x] Bulk assignment API
- [x] List / manage assignments

**Remaining**
- [ ] None material for assign path

---

#### Feature: Compliance matrix
| | |
|--|--|
| **Who** | Managers / CQC prep |
| **What they can do** | See who is compliant; export CSV |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Compliance matrix page
- [x] CSV export button

**Backend / API — done**
- [x] Compliance list API
- [x] Compliance CSV export API

**Remaining**
- [ ] None material for matrix path

---

#### Feature: Issue / revoke / print certificates
| | |
|--|--|
| **Who** | Training lead |
| **What they can do** | Manage certificates |
| **Status** | Usable with gaps |

**Frontend / Admin — done**
- [x] Certificates page
- [x] Issue certificate dialog
- [x] View certificate dialog
- [x] Browser print (`window.print`)

**Backend / API — done**
- [x] Issue certificate API
- [x] Verify certificate API
- [x] Revoke certificate API
- [x] Get certificate API

**Remaining**
- [ ] Server-generated PDF file service (not browser-print only)

---

#### Feature: Training events & external training
| | |
|--|--|
| **Who** | Training lead |
| **What they can do** | Classroom events; verify external evidence |
| **Status** | Ready to use |

**Frontend / Admin — done**
- [x] Training events page
- [x] External training page
- [x] Verify / reject external evidence UI

**Backend / API — done**
- [x] Training events APIs
- [x] External training verify / reject APIs

**Remaining**
- [ ] None material for core events / external path

---

#### Feature: Staff take course in CareAdmin
| | |
|--|--|
| **Who** | Learners |
| **What they can do** | Complete modules inside CareAdmin *(intended)* |
| **Status** | Started / limited |

**Frontend / Admin — done**
- [x] Admin LMS only (no full learner take-course UI under CareAdmin learning)

**Backend / API — done**
- [x] `learning/me/*` progress APIs
- [x] Complete content API
- [x] Start / submit assessment APIs
- [x] Learner certificates API

**Remaining**
- [ ] Build learner take-course UI in CareAdmin (or mobile) against existing APIs
- [ ] Wire assessment submit UX end-to-end in that surface
- [ ] Wire learner progress screens

---

#### Feature: Learning reports & settings
| | |
|--|--|
| **Who** | Training lead |
| **What they can do** | View learning reports and configure LMS settings |
| **Status** | Ready to use *(some CSV paths may still be incomplete)* |

**Frontend / Admin — done**
- [x] Learning reports page
- [x] Learning settings page

**Backend / API — done**
- [x] Learning reports APIs
- [x] Learning settings APIs

**Remaining**
- [ ] Wire every on-screen report table to CSV export where promised

---

### 2.9 One-page “July outcomes” for the client

By end of July, CareFlow could support this end-to-end story:

1. **Plan care** — visit plans, tasks planner, double-up scheduling  
2. **Deliver care in the field** — carer app check-in, tasks, meds, observations, complete  
3. **Monitor quality** — ECM live board, exceptions, graphs, thresholds  
4. **Engage the service user** — portal for profile/schedule/history  
5. **Assess & onboard** — initial assessment capture/export  
6. **Pay carers & invoice funders** — reconciliation, pay runs, invoice runs, payments, payouts  
7. **Run UK payroll calculations** — employer/run lifecycle (HMRC submit mainly Aug)  
8. **Train & prove compliance** — LMS courses, assignments, matrix, certificates  

**How to read the rest of this document**
- **Section 3** = screen inventory / demo path  
- **Section 4–5** = API volume + week narrative  
- **Section 6** = short module rollup (points back here for task detail)  
- **Section 8** = consolidated remaining backlog  

---

## 3. CareAdmin frontend / admin UI (screens delivered)

**Repository:** `careflow-admin`  
**July commits:** **53**  
**Approx. UI code added in feature folders:** **~50,000+ lines**  

This is the **web admin application** used by office staff, coordinators, finance, and quality. Below is what was built or substantially extended in July, organised by menu area.

### 3.1 Frontend volume by module

| Admin module | July commits (approx.) | Approx. lines added | What the client sees |
|--------------|------------------------|---------------------|----------------------|
| **Billing** | 29 | ~19,600 | Full finance workspace: cards, reconciliation, invoice/pay runs, payments, payouts, salary |
| **Employees** | 21 | ~10,200 | Hours, absences, pay card, salary/visits panels, app access, staff list UX |
| **Service users** | 14 | ~5,000 | Portal admin, IA enterprise UI, visit plan, hours, funding/charge/invoice panels |
| **ECM** | 7 | ~5,400 | Live monitoring, exceptions, visit detail, Graphs, Reports, Compliance |
| **Learning** | 4 | ~5,400 | Entire LMS admin area (dashboard → courses → compliance → certificates...) |
| **Payroll (UK)** | 6 | ~5,100 | Payroll overview, tax years, schedules, employees, runs + run detail |
| **Scheduling** | 8 | ~2,600 | Job board/Gantt/double-up, visit workspace, carer visit hub, complete dialog |
| **Service User Portal (FE)** | (within SU / portal feature) | large early-July drop | Login + portal pages for the service user |
| **Auth / nav** | 8 | ~300 | Permissions + sidebar entries for new modules |

### 3.2 New / major admin screens delivered in July

#### A) ECM (Electronic Call Monitoring) - office monitoring UI
| Screen / UI | Role for the client |
|-------------|---------------------|
| **Live monitoring** page | Day/period visit board, summary tiles, exception queue, refresh |
| **Visit detail** dialog/panel | Drill into a visit; ops actions (e.g. outcomes / triage) |
| **Graphs** page | Chart-first dashboard + compliance overview on the same journey |
| **Reports** page | Period reporting entry (later hardened in Aug as audit pack) |
| Supporting UI | Status badges, health banner, applied settings badge, schedule history, audit trail |

#### B) Billing & finance - largest admin UI delivery
| Screen / UI | Role for the client |
|-------------|---------------------|
| **Billing management** dashboard | Finance home / section layout |
| **Pay cards** & **Charge cards** panels + assign/form dialogs | Rate card configuration & assignment |
| **Funding contracts** panel | Contract billing fields |
| **Visit reconciliation** page + detail dialog | Approve/reject / overrun / payable amounts |
| **Visit pay runs (payroll-runs)** page + detail dialog | Calculate / export path for visit pay |
| **Invoice templates** + validate/preview/branded document UI | Template design & check |
| **Invoice runs** list + **invoice run detail** + preview | Run invoices for a period |
| **Payments** + record/match payment dialogs | Cash allocation |
| **Salary overview** | Staff cost / salary view |
| **Employee payouts** page + batch detail dialog | Batch approve / mark paid |
| **Audit export** page | Intended audit jobs UI (**still mock-backed - pending**) |

#### C) UK Payroll - admin payroll workspace
| Screen / UI | Role for the client |
|-------------|---------------------|
| Payroll **overview** | Entry & navigation |
| **Tax years**, **schedules**, **employees** | Setup |
| **UK payroll runs** list + **run detail** | Enrol / calculate / close run lifecycle |
| Deductions catalog panel | Statutory/deduction configuration UI |

*(HMRC submission panels were extended further in August.)*

#### D) Employees - workforce admin UI
| Screen / UI | Role for the client |
|-------------|---------------------|
| **Employee hours** page + monthly panel + detail dialog | Hours review |
| **Employee absences** page + form dialog | Absence recording |
| Employee edit: **salary**, **visits**, **pay card**, **learning**, **holidays**, **app access** | Full staff edit experience |
| Staff list filters / branches cell | Faster staff ops |
| Employee **Reports** tab | Listed (**buttons still stub - pending**) |

#### E) Learning - full LMS admin UI (late July)
| Screen / UI | Role for the client |
|-------------|---------------------|
| Learning **dashboard** | Overview |
| **Courses** list / new / detail + **course builder** | Build training content |
| **Assignments** + wizard | Assign training |
| **Compliance matrix** | Who is compliant (+ CSV) |
| **Certificates** + issue/view dialogs | Issue / revoke / print |
| **Training events**, **external training** | Classroom / external evidence |
| **Learning reports** & **settings** | Reporting & config |

#### F) Scheduling & visit delivery - coordinator UI
| Screen / UI | Role for the client |
|-------------|---------------------|
| Schedule jobs board / **Gantt** (incl. double-up cues) | Rota visualisation |
| Allocate / complete / hover / visit workspace | Day-to-day job control |
| **Carer Visit Hub** page | Office view of a carer's visit |
| Visit delivery status panel + task checklist / extra tasks | Delivery quality on the board |
| Visit plan page updates (service user) | Plan editing UX |

#### G) Service users & portal - care office + family-facing UI
| Screen / UI | Role for the client |
|-------------|---------------------|
| **Initial Assessment (enterprise)** page | Structured IA capture |
| **Tasks planner** (service user) | Plan care tasks |
| **Visit plan** page | Planned visits / carers |
| Service user **hours**, funding, charge card, invoices panels | Care + finance on the SU record |
| **Portal access** admin section | Enable portal for a SU |
| **Service User Portal** pages: login, dashboard, profile, about me, contacts, allergies, medications, calendar, photos, visit plans, completed visits | What the service user / family can open |

### 3.3 Frontend UX / product shell work (July)
- Sidebar & routing for **ECM**, **Billing**, **Learning**, **Payroll**, **Employee hours/absences**, **Portal**, **Payouts**
- Permission gates (`requirePermission` / roles) for new finance and learning areas
- Shared layouts (billing section layout, learning section layout, payroll section layout)
- Design / icons / double-up visit presentation polish (late July)

### 3.4 How to demo admin work to the client
Walk the **CareAdmin sidebar** in this order (July story):

1. **Service Users** → Initial Assessment, Tasks planner, Visit plan, Portal access  
2. **Service User Portal** (login as portal user) → dashboard & profile areas  
3. **Scheduling** → jobs/Gantt double-up, open a visit workspace / Carer Visit Hub  
4. **ECM** → Live → Graphs → Reports  
5. **Employee** → Hours, Absences, edit Pay card / Salary / App access  
6. **Billing** → Pay/Charge cards → Visit reconciliation → Pay runs → Invoice runs → Payments → Payouts  
7. **UK Payroll** → Runs  
8. **Learning** → Courses → Assignments → Compliance → Certificates  

---

## 4. Backend / API volume (supports the admin UI)

Backend July path activity (commit counts) - these **power** the screens above:

| API area | July commits (approx.) |
|----------|------------------------|
| Billing | 17 |
| Employee-app (carer APIs) | 7 |
| Scheduled-jobs housekeeping | 7 |
| Employees | 6 |
| ECM | 4 |
| Learning | 3 |
| Payroll | 3 |
| Service users | 3 |
| Migrations | 16 commits touching migrations |

> Client messaging tip: **Admin UI = what staff click; APIs = what makes those screens work.** July delivered **both**, with the heaviest visible surface area on **CareAdmin**.

---

## 5. Week-by-week narrative (July 2026)

| Week | Dates | What was delivered |
|------|-------|--------------------|
| **W27** | 1-3 Jul | Initial Assessment + Tasks planner; Service User Portal; Employee + Service Portal; access-zone fix |
| **W28** | 8-14 Jul | Bill management foundation; invoice templates & runs; visit reconciliation & payroll-run hooks; travel time / mileage / distance rules; bill management polish |
| **W29** | 15-21 Jul | **ECM + Carer app + Graph** (major); employee hours & absence records; pay cards & carer pay calculations; visit reconciliation refinements |
| **W30** | 22-24 Jul | Native UK payroll UI/API foundation; employee hours detail; schedule job & visit plan UX; pay card corrections; design/icons |
| **W31** | 27-31 Jul | Full **Learning** module; PayCard + Learning; **double-up visit** design/behaviour; **employee payout** batches |

---

## 6. Module-by-module: delivered vs pending (FE + BE together)

> Per-feature small-task checklists live in **Section 2**. This section is a short module rollup only.


### 6.1 Electronic Call Monitoring (ECM)

**Delivered in July**
- Admin: Live monitoring, exception queue, visit detail / ops actions, health banner, audit/schedule history, Reports page, Graph page + graph-first dashboard, Compliance overview.
- API: ECM module - evaluation, exceptions, visits, graph analytics, reports, missed-visit detection job, manual attendance, alerts, audit, schedule versioning, threshold/settings resolution, reason codes.
- Migrations for visit attendance / ECM evaluation family (named late July → early Aug migration files in the same delivery wave).

**Maturity today:** **Strong / ops-ready** for day-to-day monitoring. Commissioner **PDF pack** still not in product (CSV report pack strengthened in August).

**Still pending / gaps**
- PDF export for inspection packs (CSV exists; PDF does not).
- Some deeper continuity/identity analytics beyond current graphs/reports.
- Standalone `/ecm/exceptions` route optional (exceptions currently live on Live page).

**Key paths**
- FE: `careflow-admin/src/features/ecm/**` - routes `/ecm/live`, `/ecm/graph`, `/ecm/reports`
- BE: `careflow-api/src/ecm/**` - `ecm/visits/*`, `ecm/exceptions`, `ecm/reports/*`, threshold lookups

---

### 6.2 Carer / Employee App APIs

**Delivered in July**
Full Nest `employee-app` surface for the carer mobile/app client:

| Capability | Examples |
|------------|----------|
| Auth | login, refresh, logout, me |
| Home | home feed |
| Clients | list/detail, documents, medications, assessments, history, consent, care plan |
| Schedule | schedule + visit list |
| Visit workspace | check-in, unable-to-start, tasks, medication admin, observations, notes/handover/concerns, incidents + attachments, identity, body map, complete |
| Salary | me/salary |

**Maturity today:** **API production-ready** for the surfaces above. This monorepo does **not** contain the native mobile UI - only the APIs (+ admin Carer Visit Hub).

**Still pending / gaps**
- Mobile client QA/sign-off lives outside this repo.
- Edge-case hardening of multi-carer / partial task saves (ops edge cases).

**Key paths**
- BE: `careflow-api/src/employee-app/**`
- Admin hub: `careflow-admin/.../CarerVisitHubPage.tsx` - `/scheduling/visits/$jobId`

---

### 6.3 Billing (largest July delivery)

**Delivered in July**
- Pay cards & charge cards (templates, assignment targets, employee assignment)
- Funding contract billing fields
- Invoice templates (incl. layout presets) + validate/preview
- Invoice runs (create / calculate / approve / lock / send-status)
- Visit reconciliation (exceptions, approve/reject, overrun, payable amounts)
- Billing payments + allocations
- Payroll-runs (finance pay calculation / CSV export path)
- Travel time, mileage, distance rules & calculations
- Employee payout batches (end of July)
- Salary overview UI under billing

**Maturity today:** **Partial - strong operational finance pipeline**, weaker on true document delivery and audit export.

**Still pending / gaps**
- **Billing Audit Export:** UI still driven by **mock data**; "New export job" / Download not wired to real APIs.
- **Invoice "send":** status flip toward SENT - **not** full email/PDF generation pipeline.
- Template preview uses placeholders - not always live calculated invoice data.
- Dashboard still can fall back to hardcoded stats when APIs lag.

**Key paths**
- FE: `/billing`, visit-reconciliation, payroll-runs, invoice-runs, payments, audit-export, employee-payouts, salary
- BE: `careflow-api/src/billing/**`

---

### 6.4 UK Payroll

**Delivered in July**
- Native UK payroll foundation (employer settings, tax years, schedules, employees, runs)
- Gross / statutory calculation foundations (phases 2-3 migrations)
- Deduction elections, salary calculation basis, employee salary deductions
- Admin payroll pages for setup and run lifecycle (enrol / calculate / close)

**Maturity today:** **Partial.** July = **payroll core**. **HMRC FPS/EPS RTI** (GovTalk, dry-run, LIVE dual-control, fraud headers) landed mainly in **early August**, not July.

**Still pending / gaps**
- Production live filing depends on environment flags and credentials (`HMRC_RTI_HTTP_ENABLED`, Test vs Live gateway).
- LIVE submit uses dual-control approval - correct for compliance, but not "one-click filed."
- Ongoing UAT with real HMRC sandbox/live.

**Key paths**
- FE: `careflow-admin/src/features/payroll/**` - `/payroll/*`
- BE: `careflow-api/src/payroll/**`

---

### 6.5 Learning (LMS)

**Delivered in July (27-28 Jul)**
- Categories, course builder (versions/sections/content/assessments)
- Assignments (incl. bulk)
- Compliance matrix + CSV export (API + FE)
- Certificates (issue/revoke/verify; print in browser)
- Training events, external training verify/reject
- Learning reports & settings & dashboard
- Learner APIs under `learning/me/*`

**Maturity today:** **Partial - admin LMS strong; in-app learner take-course UX not in CareAdmin.**

**Still pending / gaps**
- CareAdmin does not fully host the learner "take course / submit assessment" experience (APIs exist).
- Certificates = browser print, not server-generated PDF files.
- Some report panels are on-screen tables without every CSV wired in FE.

**Key paths**
- FE: `/learning/*`
- BE: `careflow-api/src/learning/**`

---

### 6.6 Scheduling / Visit plan / Double-up

**Delivered in July**
- Schedule job UX improvements
- Visit plan page changes
- **Double-up visits:** required carers, under/over allocation, lead carer, Gantt cues, filters, complete-dialog guards, employee-app co-carer awareness
- Broader visit workspace (medication/obs/tasks) continued alongside ECM

**Maturity today:** **Strong for scheduling + double-up.** **Schedule report file export** still incomplete.

**Still pending / gaps**
- Several schedule report types still "coming soon" / unsupported (e.g. Adjustment, GeoFence, Housepack, Meds Administration, Spoof, etc.).
- File export hook for schedule reports still reports **not yet implemented** for generated files.
- Long-running report ready notifications stubbed.

**Key paths**
- FE: `/scheduling/*`, `/service-users/$id/visit-plan`
- BE: scheduled-jobs, job-allocations, schedule-reports, visit-plans, housekeeping

---

### 6.7 Employee hours, absences, payouts

**Delivered in July**
- Weekly/monthly hours summaries + detail + monthly review
- Absence records CRUD
- Employee payout batches (create / approve / mark-paid / cancel; tie-in to UK net runs)
- Pay-card assignment UI on employees; salary overview

**Maturity today:** **Hours & absences ops-ready.** **Payouts usable as batch workflow.** **Employee Reports tab still stub.**

**Still pending / gaps**
- Employee **Reports** page: static list of report titles with **non-functional buttons**; several BE report endpoints still "Not implemented yet."
- No BACS / bank-file export found for payouts.
- Some employee profile sections still use placeholder panels.

**Key paths**
- FE: `/employee/hours`, `/employee/absences`, `/employee/reports` (stub), `/billing/employee-payouts`
- BE: `employee-hours`, `employee-absences`, `billing/employee-payouts`, stubbed `employee-reports`

---

### 6.8 Service User Portal, Initial Assessment, Tasks Planner

**Delivered in July**
- Service User Portal (login + dashboard areas: profile, about me, contacts, allergies, meds, calendar, photos, visit plans, completed visits) + admin enablement
- Initial Assessment (enterprise/holistic sections, social history, secure fields) + HTML/PDF export APIs
- Tasks planner + seeder support
- Visit-plan / carer suggest work continued

**Maturity today:** **Partial MVP** - usable portals/IA, with several adjacent SU modules still placeholders.

**Still pending / gaps**
- SU module tabs still "coming soon": Comms, Alerts (+ History tile disabled on dashboard).
- Fake CTAs → `/in-progress`: Create Session, Care summary, Detailed Care report, House pack history.
- Care Plan page: "Add (coming soon)" and empty accordions for Consent/MCA, Risk Profile, Monitor Care Plans.
- Notification hooks (flash, calendar reminders, IA review) not fully configured.
- Portal is primarily read + limited write - not full care management.

**Key paths**
- FE: `/portal/*`, `/service-users/initial-assessment`, `/service-users/$id/tasks-planner`
- BE: `service-user-portal`, `initial-assessments`, `service-user-visit-tasks`, visit-plans

---

## 7. Database / platform work (July)

Representative migrations introduced in the July delivery window include:

- Billing: pay/charge cards, assignments, invoice templates, visit reconciliations, invoice/payroll runs, payments, travel/mileage, pay rate framework, enhancements  
- Payroll: native UK payroll foundation + gross/statutory phases, deduction elections  
- Workforce: employee portal account, salary deductions, ethnicity, hours monthly review, absence records, payout batches  
- Learning: LMS foundation + manual certificates  
- Scheduling/ECM: visit task priority, allocation actual times, visit attendance ECM, multi-carer funder charge mode, double-up related restores  
- ECM evaluation / exceptions / schedule audit / notification evidence (migration files dated around end-July / 1-2 Aug in the same wave)

---

## 8. Consolidated "still pending" backlog (client-visible)

| Priority | Item | Module |
|----------|------|--------|
| High | Wire or remove **Billing Audit Export** mocks | Billing |
| High | True **invoice PDF + email send** (not status-only) | Billing |
| High | Finish **Employee Reports** (UI + API) or hide stub tab | Employees |
| High | **Schedule report file export** + remaining report types | Scheduling |
| Medium | ECM **PDF** inspection pack (CSV done) | ECM |
| Medium | Learning **learner take-course UX** in product surface | Learning |
| Medium | SU **Comms / Alerts / Care Plan** placeholders | Service users |
| Medium | Remove SU fake CTAs (`/in-progress`) or implement | Service users |
| Medium | Payouts **BACS/bank file** export | Billing / Payroll |
| Medium | Notifications cron wiring (flash, calendar, IA) | Cross-cutting |
| Ops | HMRC live filing config + UAT (mostly Aug code) | UK Payroll |
| Ops | Carer **mobile app** UAT against July APIs | Employee-app |

---

## 9. What July proves for the client

1. **CareAdmin UI scale:** dozens of new/extended **screens and dialogs** across Billing, ECM, Learning, Payroll, Employees, Scheduling, Portal - this is the office product the client can click through.  
2. **Commercial stack stood up in the UI:** pay/charge cards → reconciliation → invoice & pay runs → payments → payouts.  
3. **Workforce ops in the UI:** hours, absences, LMS admin, payroll runs.  
4. **Care delivery visibility in the UI:** ECM Live / Graphs / Reports + scheduling visit workspace / carer hub (backed by carer app APIs).  
5. **Service-user engagement in the UI:** portal pages + initial assessment + tasks planner.  
6. **Honest gaps remain** in exports, PDF/email, stub report screens, and some SU "coming soon" modules - next priorities.

---

## 10. August note (out of July scope, for fairness)

After July, additional work landed (examples): ECM operational-period SSOT, CQC-style Reports pack + CSV, graph chart pack / branch risk fixes, Compliance slim-down, HMRC FPS/EPS submission UI/API, further payroll gateway credentials.  
To list August only:

```powershell
git log --since="2026-08-01" --pretty=format:"%h %ad %s" --date=short
```

---

*Prepared from git history and codebase audit of `careflow-admin` and `careflow-api`. Maturity labels are engineering assessments of wiring completeness, not formal UAT sign-off.*
