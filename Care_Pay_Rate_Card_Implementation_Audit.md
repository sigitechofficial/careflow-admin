# Domiciliary Care Rate-Card Implementation Audit

**Date:** 2026-07-14  
**Scope:** Pay cards, visit reconciliation, travel/mileage, payroll calculation  
**Rule:** A feature is “Implemented” only if schema + calculation service path + tests (where claimed) all support it. Pure util helpers without payroll/service wiring are **Not Implemented** or **Partial**.

**Primary code roots**
- Schema: `careadmin-backend/prisma/schema.prisma` (`PayCard`, `PayCardRule`, `VisitReconciliation`, `PayrollRun`, `PayrollRunLine`, `PayComponent`)
- Pay resolution: `careadmin-backend/src/billing/pay-card-assignment.util.ts`, `billing-cards.service.ts`
- Visit pay: `visit-reconciliation.util.ts`, `visit-reconciliations.service.ts`
- Payroll: `payroll-runs.service.ts`
- Helpers (often unwired): `pay-time-band.util.ts`, `pay-mileage.util.ts`, `pay-overnight.util.ts`, `pay-policy.util.ts`, `pay-compliance.util.ts`
- Tests: `pay-rate-card-framework.spec.ts`, `visit-reconciliation.util.spec.ts`
- APIs: `pay-cards.controller.ts`, `visit-reconciliations.controller.ts`, `payroll-runs.controller.ts`
- UI: `care-admin/src/features/billing/*` (PayCardsPanel, BillingCardRulesEditor, BillingPayrollRunsPanel, reconciliation panels)

---

## Global acceptance criteria (summary)

| Area | Verdict | Evidence |
|------|---------|----------|
| Rate-card selection precedence | **Partial** | Explicit `defaultPayCardId` wins; then ROLE→BRANCH→EMPLOYMENT_TYPE→WORKER_TYPE→ORG. `INDIVIDUAL`/`CLIENT_FUNDER` enums exist but are not resolved in `resolveForEmployee`. Explicit card **skips** effective-date check. |
| Effective dating | **Partial** | `effectiveFrom`/`effectiveTo` filtered in `pickBestMatchingPayCard`; not for EXPLICIT default; not keyed to visit date at resolve. |
| Historical rate-card version | **Not Implemented** | `PayCard.version` / `PayComponent` schema exist; payroll stores `payCardId` only; **no** `payComponent.create`; rules are current at recalculation. |
| Zero-rate silent fallback | **Partial** | Missing card → `PAY_CARD_MISSING` exception. Amount may still be null/0 on payroll line with exception message. |
| Time split across bands | **Partial** | Band engine wired when window + banded hourly rules exist; fixed ≤60m visits often bypass banding. |
| Cross-midnight | **Partial** | Segment splitter works in util/tests; BH lookup uses **planned start day only** (breaks Sun→Mon BH). |
| Time zones / DST | **Not Implemented** | UTC wall clock throughout; no DST policy. |
| Rounding policy | **Not Implemented** | `roundingRule` stored; never applied in calc. |
| Component-level breakdown persisted | **Partial** | Preview formula can show band segments; payroll lines are coarse (`VISIT_PAY`/`MILEAGE`/`TRAVEL_TIME`); `PayComponent` table unused. |
| Travel vs mileage separate | **Partial** | Separate line types; travel minutes must be entered on recon; no automatic gap→travel pipeline. |
| NMW results stored | **Partial** | `nmwTopUp` on run; age hardcoded `21`; no DOB; no per-component NMW explanation persistence. |
| Audit of rate/timesheet/payroll changes | **Partial** | `createdById`/`updatedById`; overrun approve user; **no** billing AuditLog write for pay-card old/new values. |
| Approved payroll immutability | **Partial** | Lock blocks recalc; approve→lock workflow exists; no adjustment workflow for historical reopen. |

---

## Scenario audit table

| # | Scenario | Status | Backend | Database | API | UI/Admin | Tests | Main Issue | Required Fix |
| - | -------- | ------ | ------- | -------- | --- | -------- | ----- | ---------- | ------------ |
| 1 | Two visits with travel between them | Partially Implemented | Visit pay + payroll mileage/travel lines if `travelMinutes`/`travelMiles` set on each recon | `VisitReconciliation.travelMinutes/Miles`, `PayrollRunLine` VISIT_PAY/TRAVEL_TIME/MILEAGE | `PATCH /visit-reconciliations/:id`, `POST /payroll-runs/:id/calculate` | Recon can edit travel fields; no auto journey link A→B | Util tests for mileage/bands; **no** end-to-end two-visit+travel scenario | Travel/miles are manual fields per visit; no journey entity; no auto reclassify gaps; editing visit does not force linked travel recalc | Add journey model or auto inter-visit travel; wire recalculation; assert Scenario 1 amounts in integration test |
| 2 | Genuine split-shift break | Not Implemented | `classifyGapBetweenVisits` util only | No gap classification field on recon/payroll | None | None | Unit tests on classifier only | Never called from reconciliation/payroll | Persist gap class; manager override API; drive WAITING_TIME lines |
| 3 | Visit crossing day/night bands | Partially Implemented | `calculateBandedPay` via `calculatePayableAmount` when window + time-banded hourly rules | `PayCardRule.startTime/endTime`, amounts | Evaluate recon + payroll uses stored `payableAmount` | Rules editor “Add time band” | Unit tests Example 2 / 21:30 style similar | Fixed visits ≤60m often use FIXED slots and skip bands; segment breakdown not stored on payroll line | Prefer band split for hourly (or policy); persist segments on PayComponent / line metadata |
| 4 | Sunday→Monday bank holiday | Partially Implemented | Midnight split works in band util | `BankHoliday` (region default UK); `PayCard.nation` unused in BH lookup | None for nation calendar | BH day types in UI | Midnight Sunday→Monday **rate** tested; **not** with Monday as BH | `isVisitOnBankHoliday` only on **planned start**; band `isBankHolidayFn` ties BH to that single date | Per-segment calendar BH lookup; respect nation/region |
| 5 | Double-up two workers | Not Implemented | One recon per `scheduledVisitId`; `resolveLeadAllocation` only | Unique recon↔visit; single `employeeId` | None for second carer pay | Scheduling may have 2 allocations | Double-up **supplement util** tested only | Second carer never gets own timesheet/pay line | Recon per allocation or worker pay rows; independent rates/travel |
| 6 | Cancel while travelling | Not Implemented | Cancellation **util** (`calculateCancellationPay`) unused | Visit cancel statuses in scheduling; no cancel-travel pay policy tables | No cancellation-pay endpoint | Visit cancel UX ≠ payroll matrix | Util notice-band test only | No travel-start vs cancel-time calc in payroll | Policy engine + timestamps + payable outcomes |
| 7 | Client not at home after arrival | Not Implemented | No SU-not-home attendance pay path | Status enums elsewhere; no min attendance pay type in payroll flow | None | None payroll-specific | None | Not wired | Status→policy→payroll line type |
| 8 | Emergency visit overrun | Partially Implemented | Overrun detected, reason, approve/reject APIs | `overrunMinutes/Reason/Decision` | `POST .../overrun/approve|reject` | Recon overrun UI | None for pay of extra minutes | **Defect:** pay always uses **planned** window even after approve (`resolveDefaultApprovedWindows`) | On APPROVED overrun, payable window = actual (or policy); band-split extra time; audit who approved (partial today) |
| 9 | Waking-night brief sleep | Not Implemented | `calculateWakingNightPay` util only | Charge methods SLEEP_IN/WAKING_NIGHT exist on charge side; pay side not shift-typed | None | Seeds labels only | Util smoke test | No shift-type on recon; no waking-night payroll line | Shift type + pay path + NMW hours |
| 10 | Sleep-in multiple interruptions | Not Implemented | `calculateSleepInPay` util (aggregates awake mins) | No interruption child table | None | None | Util min call-out test | No storage of separate interruptions; not in payroll | Interruptions model + SLEEP_IN / AWAKE lines |
| 11 | Sleep-in → waking night | Not Implemented | Util `convertToWakingNight` flag | No conversion audit fields | None | None | Util conversion test | No threshold evaluation in services | Policy threshold + approval + audit |
| 12 | Mandatory training outside hours | Not Implemented | `calculateNonVisitActivityPay` util | No non-visit activity timesheet table in payroll path | None | None | Util training test | Not in payroll calculate | Activity timesheets + line types + NMW |
| 13 | Worker carries another (passenger miles) | Partially Implemented | `calculateUkMileage` supports passenger; payroll never passes `passengerMiles` | No passenger worker id on recon | Payroll calc | None | Unit passenger test | **Defect:** `passengerAmount` always 0 in payroll; no passenger identity | Fields + API + prevent double claim |
| 14 | Exceeds annual mileage threshold | Partially Implemented | Util splits at 10k with `ytdBusinessMiles` | No YTD mileage ledger | Payroll ignores YTD (defaults 0) | None | Unit YTD split test | **Defect:** every period uses first-band rate only | Persist tax-year mileage; pass YTD into calc |
| 15 | Uniform/training deduction vs NMW | Partially Implemented | `deductionWouldBreachNmw` util | DEDUCTION rate type exists; unused in payroll | None | None | Unit warn test | No deductions applied/blocked in payroll | Deduction lines + NMW recheck + block/warn |
| 16 | Irregular hours rolled-up holiday | Partially Implemented | `calculateRolledUpHolidayPay` util; `holidayPayMethod` on PayCard/employment | Fields exist | DTO can set card method | Types only; weak UI | Unit 12.07% test | Not computed in payroll; no payslip component | Apply method per contract; HOLIDAY_PAY lines |
| 17 | Regular hours paid holiday | Not Implemented | None in billing payroll | Leave balance lives outside this path (if anywhere) | None billing | None | None | Out of wired billing calc | Leave→holiday pay engine |
| 18 | OT overlapping Sunday | Not Implemented | OT util with stack flag | No weekly hours accumulator in payroll | None | None | Util OT test | Payroll never computes OT | Weekly PRP hours + mid-shift OT split + policy |
| 19 | Christmas overlapping OT | Partially Implemented | Christmas day type + PRIORITY stacking in band util | Special days / CHRISTMAS enum | None OT | Day type options | Christmas vs Sunday priority unit test | OT not wired; nation calendar weak | Wire OT after bands; calendar |
| 20 | Role change mid period | Not Implemented | Resolve uses current employment role only | Employment role not effective-dated for pay | Resolve employee | Explicit card only | None | No dated role rate history | Effective-dated role/pay assignments; visit-date resolve |
| 21 | Statutory min rate mid-period | Partially Implemented | `nmwHourlyRate(asOf)` pre/post Apr 2026 | Hardcoded band table in code | Payroll uses period **end** only | None | Limited | Single rate for whole PRP; no split | Effective-dated NMW table; split PRP |
| 22 | Age 18/21 mid-period | Not Implemented | Category from `ageOnPayPeriodEnd` | DOB on personal detail; unused by payroll | Payroll hardcodes age **21** | None | None with DOB | Always 21+ category | DOB→age by day; split PRP |
| 23 | Apprentice ineligible | Partially Implemented | Heuristic `/apprentice/i` on contract type name | No apprenticeship programme dates | Payroll | None | None | No duration/age eligibility engine | Apprentice eligibility model + warnings |
| 24 | Historical recalc after rate change | Not Implemented | Recalc deletes/rebuilds lines for mutable runs | Version field; PayComponent unused | Recalc blocked when locked | None | None historical | Locked protects export; **unlocked** recalc uses **current** rules | Snapshot rules/version on approve; adjustments not silent rewrite |
| 25 | Visits OK but unpaid travel fails NMW | Partially Implemented | NMW includes TRAVEL_TIME hours if paid lines exist; unpaid travel **not** added as hours | — | Calculate | NMW top-up shown | Unit underpayment with unpaid travel hours | Unpaid travel never enters hour denominator unless modeled | Include unpaid qualifying travel hours in NMW hours |
| 26 | Salaried extra hours | Not Implemented | None | Contracted hours fields exist; salary fields sparse | None | None | None | No salary÷hours NMW | Salaried PRP engine |
| 27 | 48h opt-out | Partially Implemented | Field `optedOutOf48Hours` | Boolean only; no evidence/effective/withdraw | Unused by billing | Employment forms may set flag | None | No hour averaging / alerts | WTR monitoring module |
| 28 | Night worker average limit | Not Implemented | None | — | None | None | None | — | Night reference-period monitor |
| 29 | Sickness spans statutory change | Not Implemented | SSP estimate util only | — | None | None | Unit SSP estimate | Outside rate card; not payroll absence | Statutory absence engine |
| 30 | Rate card expires no replacement | Partially Implemented | Matching filters expired; EXPLICIT default may still attach expired card | effectiveTo | Missing → PAY_CARD_MISSING | Expiry warnings absent | None | **Defect:** explicit expired default still used | Validate EXPLICIT card dates; expiry alerts; block zero pay |

---

## Per-scenario detail notes (high signal)

### Scenario 1 — Two visits + travel
- **Calculation method:** Each visit recon → `payableAmount` from card rules; payroll adds `travelMinutes×TRAVEL_TIME` and `travelMiles×mileage` if fields set.
- **Missing validation:** No check that travel isn’t double-counted across both visits; no auto 09:30–10:00 journey.
- **Defects:** Manual data entry; NMW includes travel only if travel **pay** lines exist.

### Scenario 3 — Cross-band visit
- **Implemented when:** Hourly (or banded) rules with `startTime`/`endTime` and pay window passed.
- **Defect:** Many UK presets use FIXED 15–60 slots → whole visit one fixed amount, no evening/night split.

### Scenario 4 — Sunday into Monday BH
- **Defect:** BH flag from start date only; Monday segments not consulted against `BankHoliday`.

### Scenario 8 — Overrun
- **API:** overrun approve/reject work.
- **Critical defect:** Approved overrun still pays planned duration only (commented intentional). Extra 45 minutes never paid via this path.

### Scenario 13–14 — Passenger / YTD mileage
- Utils correct; payroll omits `passengerMiles` and `ytdBusinessMiles`.

### Scenario 25 — NMW travel underpayment
- Top-up can be written; age always 21; unpaid travel hours not inferred; finalize not hard-blocked (EXCEPTION_FOUND status only if visit exceptions).

---

## Critical payroll defects

1. **Overrun approval does not pay overrun minutes** — underpayment risk (Scenario 8).  
2. **Unpaid qualifying travel not in NMW hours** — underpayment / false compliance (Scenario 25).  
3. **NMW age hardcoded to 21** — wrong category risk (22).  
4. **Mileage YTD never applied** — wrong AMAPs after 10k (14).  
5. **Passenger miles never applied** — wrong expenses / possible duplicate if naively fixed (13).  
6. **Historical recalculation uses live rules** — historical corruption risk (24).  
7. **Explicit pay card ignores effective dates** — expired card can pay (30).  
8. **Sunday→Monday BH uses start-day BH only** — wrong enhancement (4).  
9. **Double-up only pays lead allocation** — second worker underpayment (5).  
10. **OT / holiday / sleep-in / cancellation / training** not in payroll path — silent zero for those elements (6–12, 16–19).

Duplicate-payment risk is moderate: payroll `calculate` deletes lines then recreate (idempotent within run); unique `(payrollRunId, visitReconciliationId, lineType)` helps; adjusting recon after lock is blocked but unlocked rewrite overwrites history.

---

## Missing features (no end-to-end flow)

- Gap classification pipeline (2)  
- Double-up per-worker pay (5)  
- Cancellation-while-travelling pay matrix (6)  
- SU not home / min attendance pay (7)  
- Waking night / sleep-in / conversion payroll (9–11)  
- Non-visit activities (12)  
- Regular leave holiday pay (17)  
- Overtime engine in payroll (18–19 OT half)  
- Mid-period role/rate effective dating (20)  
- Age-banded NMW from DOB (22)  
- Proper apprentice eligibility (23)  
- Historical versioned recalc / adjustments (24)  
- Salaried NMW (26)  
- WTR 48h monitoring / night averages (27–28)  
- Statutory sickness spanning rule changes (29)  
- Persisted `PayComponent` audit breakdown  
- Billing AuditLog for rate old→new  
- Rounding engine  
- DST/timezone policy  

---

## Partial implementations

- Time-band split (3, parts of 4, 19 Christmas priority) — util + recon window; weak for fixed visits; BH cross-midnight broken.  
- Travel/mileage lines (1, 13, 14) — require manual fields; UK rate util partial.  
- Overrun workflow (8) — operational flags, wrong pay outcome.  
- NMW top-up (15, 21, 25) — runs, incomplete inputs.  
- Rate hierarchy (global, 30) — org/role/branch/etc.; not individual/funder; explicit dating hole.  
- Holiday method fields / rolled-up util (16) — not payroll.  
- 48h opt-out flag (27) — storage only.  
- UI time-band editor / payroll NMW display — config and totals only.

---

## Test coverage gaps

| Coverage | Reality |
|----------|---------|
| Scenarios with solid util tests | 3 (bands), parts of 4 (midnight not BH), 10–11 utils, 13–16 utils, 18 util, 19 Christmas priority, 25 util |
| Positive/boundary/invalid for all 30 | Missing for almost all |
| Integration: recon→payroll→NMW | Absent |
| Component assertions on payroll lines | Absent |
| Historical / effective-date / DOB / double-up / cancel / overrun-pay | Absent |
| Tests avoid system date | Mostly fixed dates in unit tests — good for util pack only |

---

## Recommended implementation order

1. **Minimum-wage and underpayment** — DOB age; unpaid travel hours; stop false compliance; block finalize on unresolved NMW; fix overrun payable minutes.  
2. **Duplicate / rewrite risks** — snapshot rate-card version + rule payload on approve; adjustment lines instead of silent unlocked rewrite of history.  
3. **Rate-card effective dating & history** — validate EXPLICIT card dates; resolve as-of visit date; Persist `PayComponent` with version.  
4. **Working-time and travel** — inter-visit travel auto-calc; gap classifier; YTD mileage; passenger miles; BH per segment.  
5. **Overtime and enhancement stacking** — mid-shift OT; Christmas/OT policy in payroll.  
6. **Holiday and statutory** — rolled-up vs when-taken; SSP spanning rules (separate module).  
7. **Compliance warnings** — 48h / night averages; apprentice expiry; card expiry alerts.  
8. **Reporting / UI** — component breakdown, segment formula on payslip export, admin for overnight/cancel policies.

---

## API map (what exists)

| Area | Endpoints |
|------|-----------|
| Pay cards | `GET/POST/PATCH/DELETE /pay-cards`, `GET resolve/:employeeId`, assign-matching |
| Visit recon | `GET/PATCH`, `POST evaluate\|approve\|reject`, `POST overrun/approve\|reject`, backfill |
| Payroll | `POST /payroll-runs`, `POST :id/calculate\|approve\|lock`, `GET :id/export` |

No APIs for: sleep-in interruptions, gap classify, non-visit activities, holiday pay runs, deduction warnings, historical adjustment.

---

## Automated tests today

- `visit-reconciliation.util.spec.ts` — fixed-slot / hourly pick.  
- `pay-rate-card-framework.spec.ts` — band splits, mileage YTD, passenger util, gap classify, sleep-in, OT, cancel util, double-up util, holiday %, NMW, employer cost.  

**None** of the 30 scenarios are covered as end-to-end reconciliation→payroll acceptance tests with exact Scenario amounts.

---

## Bottom line

**Do not treat the rate-card module as production-complete for UK domiciliary payroll.**  
Core visit pay + optional manual travel/mileage + a **partial** time-band and NMW stub exist. Most of the 30 critical scenarios are **Not Implemented** or **Partial**, and several **critical underpayment defects** (overrun pay, NMW age, BH cross-midnight, double-up, historical rates) are present in the live calculation path.

---

## Critical fixes applied (2026-07-14 follow-up)

| Fix | Result you get |
|-----|----------------|
| Overrun APPROVED | Pays **actual** clock minutes (not planned only) |
| Sunday→Monday BH | BH rate applied **per calendar day** in the window |
| Expired explicit pay card | Falls back to hierarchy instead of silent expired rates |
| Resolve as-of visit date | Uses visit date for effective dating |
| NMW age | From worker **DOB** (not hardcoded 21) |
| Unpaid travel minutes | Counts toward NMW hours (detects underpayment) |
| Passenger miles + YTD | Wired into payroll mileage calc |
| Double-up | One recon **per job allocation** / worker |
| PayComponent rows | Written on payroll calculate (when migration applied) |

Apply migrations: `npx prisma migrate deploy` (after stopping `start:dev` if generate fails).
