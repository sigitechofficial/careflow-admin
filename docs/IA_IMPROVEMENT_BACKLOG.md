# Initial Assessment (IA) — Improvement Backlog & Brainstorm

> **Scope:** Enterprise Initial Assessment feature (`src/features/service-users/initial-assessment/`).
> **Current focus:** Ship a strong **desktop** experience (desktop stays as-is for now).
> **Mobile/tablet work is explicitly deferred to LAST** (see Task 9).
> We will work through these tasks **one by one** and brainstorm each before building.

**Status legend:** 🔵 Not started · 🟡 Brainstorming · 🟠 In progress · ✅ Done

---

## 0. Where things stand today (baseline)

**Evaluation (council review, 2026-09-22):** Overall **~6.8 / 10**.

| Area | Score | Note |
|---|---|---|
| Clinical completeness | 8.5/10 | Market-leading breadth (Waterlow, MUST, Falls, M&H, Pain, Skin, MCA, PEEP, Bed Rails, Infection, Fire, ACP, EoL) |
| Care-plan generation logic | 8/10 | Trigger → recommend → draft chain is strong |
| Risk & safety | 8/10 | Auto risk derivation + lone-worker + care-activation gating |
| Governance / CQC | 9/10 | Audit, versions, compare, evidence export, sign-off |
| Data reuse / dedup | 7.5/10 | Prefill solid; upstream Add-SU validation weak |
| **UX / ease-of-use** | 5.5/10 | Dense, no guided path, 22 tabs at once |
| **Mobile / field use** | 3.5/10 | Desktop-only (biggest gap — deferred by decision) |
| Person-centred / outcomes | 6/10 | Clinical-heavy; "about me / what matters" side thin |

**Competitor context (UK):** Birdie, Nourish, CareBeans, Access Care Planning.
- We **win** on clinical depth + governance.
- We **lag** on guided flow, person-centred/outcomes framing, and mobile (deferred).

**Architecture facts to remember:**
- Active feature = **enterprise IA** (`/service-users/initial-assessment?serviceUserId=...`), 14 backend template sections rendered as **22 document tabs**.
- **Legacy checklist IA** (`initial-assessment-catalog.json/.ts` + `ServiceUserInitialAssessmentTab.tsx`) is **retired/commented out** — dead code.
- State: page-local React state + autosave (400ms); worksheet data persists in `submission.metadata` JSON.
- Prefill pulls from service-user detail + DOM Care + lookups + allergies (dedup mechanism).
- Care can't start until IA complete **and** manager approves (`CareActivationStatus`).

---

## Task Index (priority order — mobile is intentionally LAST)

| # | Task | Priority | Status |
|---|---|---|---|
| 1 | Guided wizard / recommended-path over the 22 tabs | High | 🔵 Option A planned (Phase A1 built then reverted on request) → `IA_TASK1_GUIDED_WIZARD_PLAN.md` |
| 2 | Person-centred "About Me / What matters / A good day" front section | High | 🔵 |
| 3 | Onboarding handoff — "Start Initial Assessment" prompt after adding a service user | Medium-High | 🔵 |
| 4 | Delete retired legacy checklist IA (dead code cleanup) | Medium | 🔵 |
| 5 | Add-Service-User data quality — proper zod schema + enforce required fields | Medium | 🔵 |
| 6 | Care-plan generation UX — make the assessment→care-plan bridge clearer | Medium | 🔵 |
| 7 | Reassessment / review triggers (hospital discharge, condition change) | Medium | 🔵 |
| 8 | Person-centred outcomes surfacing in review/summary + CQC evidence | Low-Medium | 🔵 |
| 9 | **Mobile / tablet-first field assessment mode** | **LAST (deferred)** | 🔵 |

---

## Task 1 — Guided wizard / recommended path over the 22 tabs
**Priority: High · Status: 🔵**

**Current state:** All 22 document tabs are shown at once in a left nav rail with status dots (🔴 blocking / 🟠 warning / ⚪ incomplete) and per-tab progress %. It behaves like a reference document, not a guided journey. A new assessor doesn't know where to start, what's mandatory-first, or when they're "done".

**Problem:** High cognitive load; risk of missed/incomplete sections; slow onboarding for new staff.

**Proposed direction (to brainstorm):**
- A "guided mode" toggle that walks: mandatory-first → recommended order → review → submit.
- A top progress bar / stepper showing overall completion and next best action.
- "Next incomplete section" button; smart jump to blocking items.
- Keep the free-navigation power-user rail available (don't remove it).

**Open questions:**
- Do we want a true linear wizard, or a "recommended path" nudge layered on the existing rail?
- What is the canonical mandatory order? (needs input from care/clinical side)
- Should completion gating (blocking dots) drive the wizard's "can proceed" logic?

**Files likely involved:** `pages/ServiceUserInitialAssessmentEnterprisePage.tsx`, `utils/holistic-assessment-tabs.ts` (`buildHolisticTabNavStatus`), `components/InitialAssessmentHubTabs.tsx`.

---

## Task 2 — Person-centred "About Me / What matters / A good day" front section
**Priority: High · Status: 🔵**

**Current state:** An About Me section exists (`InitialAssessmentAboutMeSection.tsx`), but the overall assessment tilts heavily clinical/risk. Competitors (Birdie, Nourish) put "what matters to me / outcomes / a good day looks like" front-and-centre.

**Problem:** UK families and CQC increasingly expect a person-centred, outcomes-led opening — not a clinical form first.

**Proposed direction (to brainstorm):**
- Elevate a warm, person-first section as **tab 1 / opening step** (life history, preferences, communication, culture/faith, "what a good day looks like", desired outcomes).
- Feed these into the care plan as personal outcomes, not just clinical tasks.

**Open questions:**
- Reuse existing About Me fields or design a richer person-centred set?
- How do outcomes map into the care-plan recommendation engine?

**Files likely involved:** `components/InitialAssessmentAboutMeSection.tsx`, `utils/about-me-ia-questions.ts`, `utils/holistic-assessment-tabs.ts`, care-plan bridge.

---

## Task 3 — Onboarding handoff: "Start Initial Assessment" after adding a service user
**Priority: Medium-High · Status: 🔵**

**Current state:** After creating a service user, the app redirects to `/service-users/all`. There is **no prompt/CTA** to begin the IA. IA is a fully manual, separate step (profile tab or enterprise page).

**Problem:** Friction + risk that the most important onboarding step (IA → care plan → care activation) gets forgotten.

**Proposed direction (to brainstorm):**
- On successful create, offer "Start Initial Assessment now" (or redirect to the new SU's profile with an IA CTA).
- Optionally show IA status on the service-user list/profile as an onboarding step.

**Open questions:**
- Redirect straight into IA, or land on profile with a prominent CTA?
- Auto-create a DRAFT submission on SU creation, or on first "Start"?

**Files likely involved:** `pages/AddServiceUserPage.tsx` (onSubmit navigation), `hooks/useServiceUserMutations.ts`, `components/ServiceUserInitialAssessmentEnterpriseTab.tsx`.

---

## Task 4 — Delete retired legacy checklist IA (dead code cleanup)
**Priority: Medium · Status: 🔵**

**Current state:** Legacy checklist IA is commented out in the router (approx. `src/router.tsx:748-768`) but still present: `initial-assessment-catalog.json`, `initial-assessment-catalog.ts`, `components/ServiceUserInitialAssessmentTab.tsx`, `pages/InitialAssessmentChecklistPage.tsx`, generator `scripts/gen-initial-assessment-catalog.mjs`. Catalog items are all empty.

**Problem:** Confusing dual system; dead code; maintenance noise.

**Proposed direction:** Confirm nothing live imports it, then delete the legacy files, route stubs, and generator. Keep a note in git history.

**Open questions:**
- Any migration/import path still reading the legacy catalog? (verify before delete)
- Keep the JSON as historical reference or remove entirely?

---

## Task 5 — Add-Service-User data quality (zod schema + enforce required fields)
**Priority: Medium · Status: 🔵**

**Current state:** `AddServiceUserPage.tsx` has **no zod schema**; client-side validation enforces only First name, Last name, Status. Title/DOB/Gender/Location render `*` but are **not** enforced.

**Problem:** Weak/incomplete core data flows into IA prefill (DOB, gender, address, etc.), lowering assessment quality and care-plan accuracy.

**Proposed direction (to brainstorm):**
- Add a zod schema for the create payload; enforce the fields that IA depends on.
- Decide which fields are truly required at *create* vs. can be completed later.

**Open questions:**
- Minimum required set at onboarding (keep it light) vs. IA-time completeness?
- Reuse pattern from `src/schemas/add-employee.schema.ts`?

**Files likely involved:** `pages/AddServiceUserPage.tsx`, new `src/features/service-users/*.schema.ts`, `api/service-users.api.ts` (`CreateServiceUserPayload`).

---

## Task 6 — Care-plan generation UX (make the assessment → care-plan bridge clearer)
**Priority: Medium · Status: 🔵**

**Current state:** Answers flagged `carePlanTrigger` generate server recommendations; `InitialAssessmentCarePlanRecommendationsPanel` supports Accept/Decline + "Create care plan" (`createCarePlanDraftFromCompose`). Downstream shown on Care Plan page (`CarePlanIaSourcePanels.tsx`).

**Problem:** The logic is strong but the *experience* of "assessment produced these care needs → here's the plan" may not be obvious/reassuring to assessors and managers.

**Proposed direction (to brainstorm):**
- Clearer "what this assessment recommends" summary at submit/review.
- Visual traceability: recommendation → triggering answer(s) → care-plan area.

**Open questions:**
- Where does this live — submit step, review step, or a dedicated summary tab?
- How much auto-accept vs. manual review do we want?

**Files likely involved:** `components/InitialAssessmentCarePlanRecommendationsPanel.tsx`, `utils/submit-validation.ts`, `care-plan/CarePlanIaSourcePanels.tsx`, `care-plans/api.ts`.

---

## Task 7 — Reassessment / review triggers
**Priority: Medium · Status: 🔵**

**Current state:** A review schedule exists (`InitialAssessmentSchedulePanel`, review queue). Unclear whether *change-triggered* reassessment (hospital discharge, condition change, incident) is prompted.

**Problem:** CQC expects reassessment on significant change, not just on a calendar.

**Proposed direction (to brainstorm):**
- Triggers that flag "reassessment due" on defined events; surface in review queue.

**Open questions:**
- Which events trigger? (discharge, fall, medication change, incident, weight loss via MUST…)
- Manual flag vs. automated from other modules (incidents, observations)?

---

## Task 8 — Person-centred outcomes in review/summary + CQC evidence
**Priority: Low-Medium · Status: 🔵**

**Current state:** CQC evidence export exists (`.../cqc-evidence`). Outcomes/"what matters" not necessarily foregrounded in the summary.

**Proposed direction (to brainstorm):** Ensure the outcomes captured in Task 2 flow into the summary, sign-off, and CQC evidence output.

**Depends on:** Task 2.

---

## Task 9 — Mobile / tablet-first field assessment mode  ⏸️ DEFERRED — DO LAST
**Priority: LAST (by decision, 2026-09-22) · Status: 🔵**

**Decision:** We are **not** doing this now. Desktop stays as-is. This is the **final** task after everything above ships.

**Current state:** 3-column layout with breakpoints at 900px / 1200px; below 900px the nav rail collapses/cramps. Real IAs happen in the service user's home on a tablet — this experience is currently weak.

**Problem (for later):** Assessors can't comfortably run the IA on a tablet in the field, unlike Birdie/Nourish.

**Proposed direction (later):**
- Tablet-optimized single-column guided flow; larger touch targets; offline-tolerant autosave; possibly a dedicated assessment mode.

**Reminder:** Everything above (Tasks 1–8) should be desktop-solid before starting this.

---

## Brainstorm log
_(We'll fill this in as we discuss each task one by one.)_

- **2026-09-22:** Backlog created. Decision: desktop-first for now; mobile/tablet deferred to last (Task 9).
- **2026-09-22:** Task 1 brainstormed. Chose **Option A** (additive guidance layer, not a forced wizard). Detailed build plan written → `docs/IA_TASK1_GUIDED_WIZARD_PLAN.md`. Option B (Required-vs-Optional + Ready-to-submit checklist) queued as the follow-up after A.
- **2026-09-22:** Task 1 **Phase A1 built then reverted** on request. The Guide Bar component, `next-incomplete-tab` util + tests, and the page wiring were all removed; the enterprise IA page is back to its original state (no source changes remain). The plan in `IA_TASK1_GUIDED_WIZARD_PLAN.md` is kept for future reference. Focus shifted to analysing IA overload/redundancy first (see below).
- **2026-09-22:** IA overload/redundancy analysed (template is DB-seeded in careflow-api). Findings: ~544 questions across 18 sections; **Section 1 alone ≈168 questions / ~265 fields** (49 core + 77 About-Me mirror incl. a 42-cell weekly routine grid + 42 holistic identity). Real redundancy = prefillable identity re-asked, syncKey duplicates (representative/interpreter/language/access/assessor asked in 2–3 places), measurements (weight/BMI/MUST) across §4/§6/§11, cognition/MCA across §2/§2-tool/§10. NOT redundant = screening→validated-tool escalation (Waterlow/MUST/Falls) which CQC expects. Biggest win = slim Section 1 by prefilling identity + About-Me instead of re-asking.
