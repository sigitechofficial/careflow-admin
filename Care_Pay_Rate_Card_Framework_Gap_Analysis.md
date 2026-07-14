# UK Carer Pay Rate-Card — Framework Gap Analysis

**Status:** Implementation baseline document  
**Aligned with:** UK Domiciliary Care Worker Rate-Card Framework + Care Billing Module  
**Code roots:** `careadmin-backend/src/billing`, `care-admin/src/features/billing`, `careadmin-backend/prisma/schema.prisma`

---

## 1. Purpose

This document maps the UK domiciliary care rate-card framework (20 sections) against Care’s existing PayCard / visit reconciliation / payroll-run stack, and defines the phased delivery that follows.

**Non-goals for rate cards:** full HMRC PAYE/NI/pension calculation; legal advice. Statutory payroll stays linked, not embedded.

---

## 2. Current system (as-built)

```
ScheduledVisit → VisitReconciliation → payableAmount (single rate)
                     ↓
              PayrollRun (+ MILEAGE / TRAVEL_TIME lines)
```

| Area | Location | Behaviour today |
|------|----------|-----------------|
| Pay cards | `PayCard` / `PayCardRule` | Name, code, effective dates, status, currency, assignment level, rules |
| Assignment | `pay-card-assignment.util.ts` | ROLE → BRANCH → EMPLOYMENT_TYPE → WORKER_TYPE → ORG; plus employee default |
| Visit pay | `visit-reconciliation.util.ts` | One day-type + duration rule for the whole visit |
| Payroll | `payroll-runs.service.ts` | Copies recon visit pay; mileage/travel supplements; `nmwTopUp` always 0 |
| UI | `BillingCardRulesEditor`, `PayCardsPanel` | Fixed/hourly/mileage/travel by day type |
| Seeds | `pay-card-presets.ts`, `pay-card-complete-preset.ts` | Evening/night times, sleep-in — mostly stored, not calculated |

**Critical defect:** rules with `startTime`/`endTime` were excluded from hourly selection, so evening/night bands never affected pay. Visits were never split across time bands.

---

## 3. Gap analysis (framework §§1–20)

| § | Topic | Status | Notes |
|---|--------|--------|-------|
| 1 | Rate-card hierarchy | Partial → Extended | Add INDIVIDUAL / CLIENT_FUNDER; versioning; nation; holiday/NMW FKs |
| 2 | Worker categories | Partial → Extended | Employment eligibility enums; HR flag for contractors |
| 3A | Visit pay | Partial → Extended | Segmented calc; pay policy fields |
| 3B | Travel time | Partial → Extended | Subtypes; commute rules; band inherit option |
| 3C | Waiting / gaps | Missing → Added | Gap classification enum + classifier util |
| 3D | Mileage / expenses | Partial → Extended | UK 2026–27 tiers; passenger; vehicle type |
| 4 | Time-band enhancements | Schema only → Core engine | Segment split; absolute / plus / % / multiplier; priority stacking |
| 5 | Overnight | Data only → Modelled | Sleep-in + waking + live-in calc helpers |
| 6 | On-call | Missing → Modelled | Standby + call-out helpers |
| 7 | Overtime | Missing → Modelled | Weekly threshold; no unintended stack with BH |
| 8 | Non-visit activities | Missing → Modelled | Activity code catalogue + pay helper |
| 9 | Double-up | Missing → Modelled | Per-worker supplements |
| 10 | Cancellation | Partial → Policy matrix | Notice-band outcomes |
| 11 | Holiday pay | Missing → Contract fields | Regular vs irregular 12.07% |
| 12 | Statutory sick/family | Out of rate card | Config hooks only |
| 13–14 | Allowances / deductions | Partial → Flags | Taxable / pensionable / NMW / holiday-average |
| 15 | NMW validation | Stub → PRP engine | Age bands Apr 2026; top-up lines |
| 16–17 | Calc sequence / employer cost | Partial → Pipeline | Component store + employer-cost estimate |
| 18–19 | DB structure | Partial → Extended | pay_components, travel rules, assignments |
| 20 | Critical tests | Few → Scenario pack | Time-band, mileage, NMW, holiday, etc. |

**Target pay precedence:** Individual worker → Client/funder → Branch → Role → Organisation default.

**Default time-band priority:** Christmas → Bank holiday → Sunday → Saturday → Night → Evening → Day. Overtime does not auto-stack with band multipliers unless `stackingPolicy` allows. Travel uses its own rate unless the card inherits time bands.

---

## 4. Calculation sequence (target)

1. Identify payable activities and working time  
2. Split across time bands (and midnight / special days)  
3. Base rate per segment  
4. Role / location / service supplements  
5. Evening / night / weekend / holiday enhancements  
6. Overtime (no unintended double count)  
7. Fixed sleep-in / on-call / call-out  
8. Cancellation / guaranteed-hours  
9. Holiday pay where permitted  
10. Gross taxable pay  
11. Mileage / expenses separately  
12. NMW validation (whole PRP)  
13. Statutory deductions (external payroll)  
14. Employer cost estimates  

**Gross pay** = visit + travel-time + waiting + non-visit + enhancements + OT + allowances + night/sleep-in + cancellation + holiday (+ statutory links)  
**Payable** = gross + approved expenses − payroll deductions  

---

## 5. Phased delivery checklist

- [x] Phase 0 — This document  
- [x] Phase 1 — Time-band segment engine + UI + tests  
- [x] Phase 2 — Travel / waiting / UK mileage 2026–27  
- [x] Phase 3 — Overnight + on-call  
- [x] Phase 4 — Overtime, non-visit, cancellation, double-up  
- [x] Phase 5 — Holiday methods, NMW PRP, card versioning  
- [x] Phase 6 — Allowances/deductions flags, statutory hooks, employer cost, §20 tests  

---

## 6. UK reference rates (config defaults, not legal advice)

**NMW / NLW from 1 April 2026**

| Category | Hourly |
|----------|--------|
| Age 21+ | £12.71 |
| Age 18–20 | £10.85 |
| Under 18 | £8.00 |
| Eligible apprentice | £8.00 |

**Approved mileage 2026–27 (from 6 April 2026)**

| Vehicle | First 10,000 | Over 10,000 |
|---------|--------------|-------------|
| Car/van | 55p | 25p |
| Motorcycle | 24p | 24p |
| Bicycle | 20p | 20p |
| Passenger supplement | up to 5p | — |

**SSP from 6 April 2026:** first qualifying day; lower of 80% AWE or £123.25/week (payroll module).

---

## 7. Critical test scenarios (implementation targets)

Two visits + paid travel; genuine split-shift home break; daytime→night cross; Sunday→Monday BH; double-up different rates; cancel while travelling; SU absent on arrival; emergency overrun; waking night brief sleep; sleep-in multi call-outs; sleep-in→waking conversion; training outside contracted hours; passenger miles; >10k miles mid-period; uniform deduction NMW risk; irregular rolled-up holiday; regular paid holiday; OT + Sunday; Christmas + OT; mid-period role change; mid-period NMW change; age 18/21 birthday; apprentice ineligibility; historical recalculation after rate change; unpaid travel NMW fail; salaried extra hours; 48h opt-out; night-worker average breach; sickness across statutory change; expired rate card with no replacement.

---

## 8. Specialist review note

Sleep-ins, live-in work, employment status and holiday-pay treatment are fact-specific. Final policies and contractual rates should be reviewed by a UK payroll or employment-law specialist before production use.
