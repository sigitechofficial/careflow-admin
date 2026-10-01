# IA Tab Re-order & Consent/Safety Restructure — Implementation Plan

> **Status:** Phases 1–5 ✅ built & verified locally (2026-09-28, uncommitted on `saqi`). Phase 6 (optional) not started.
> **Follows:** redundancy clean-up (Groups A–C done, uncommitted on `saqi`).
> **Goal:** the enterprise IA tabs follow the order a manager actually runs a home visit:
> consent → getting to know the person → health tools → home & safety → future planning → sign-off.

**Out of scope here:** splitting the big Tab 1 into smaller tabs (next step), Group D tool-tab duplicates
other than the MCA sync, the "missing content" adds (outcomes, social wellbeing, smoking/alcohol, hospital admissions).
**LPS:** removed from wording. Liberty Protection Safeguards are not in force; add back only if the law changes.

---

## 1. Target order (23 tabs)

Tab **ids stay frozen** (URL `section=`, section comments, autofill and saved data all key off the id).
Only the array order and `displayNumber` change. Two new ids: **23** (Consent) and **24** (Safeguarding & Emergency).
Tab **18 (Photography Consent) is folded into the Consent tab** — no separate tab (decision D1: avoid tab overload).

| New # | Tab | Current id | What changes |
|---|---|---|---|
| **A. Start of visit** ||||
| 1 | Consent | **23 (new)** | §2.1 consent to assessment, §2.3 explained, §2.4 capacity appears intact, §2.8 information sharing **+ the Photography Consent panel** (before any skin photos) |
| **B. Getting to know the person** ||||
| 2 | Personal Details & Medical History | 1 | unchanged content |
| 3 | Practical Task | 2 | — |
| **C. Health tools (same order as the Tab 1 sections)** ||||
| 4 | Pain Assessment Tool | 10 | §5 |
| 5 | Therapy Aide Memoire | 11 | §5 |
| 6 | MUST | 7 | §6 |
| 7 | MCA Screening | 3 | §10 — now also §2.6 best interest + §2.9 deprivation of liberty |
| 8 | MCA Identified (checklist) | 17 | only needed when MCA required; synced from Tab 7 (Phase 3) |
| 9 | Skin Integrity Check | 4 | §11 |
| 10 | Waterlow | 5 | §11 |
| 11 | Falls Screening | 8 | §12 |
| 12 | Moving & Handling | 9 | §12 |
| 13 | Equipment Selection | 6 | §12 |
| **D. Home & safety** ||||
| 14 | Environment & Home Safety | 12 | tool + the §3 questions that render nowhere today |
| 15 | Fire Safety | 22 | — |
| 16 | Infection & Clinical Precautions | 21 | — |
| 17 | Bed Rails | 20 | only if bed rails in use/considered |
| 18 | PEEP | 19 | only if the person can't self-evacuate |
| 19 | Safeguarding & Emergency | **24 (new)** | §13: safeguarding, no-response procedure, emergency contacts, DNACPR/ReSPECT, pharmacy, hospital |
| **E. Future planning** ||||
| 20 | Advance Care Planning | 13 | — |
| 21 | End of Life | 14 | — |
| **F. Close** ||||
| 22 | Outcome Summary | 15 | — |
| 23 | Care Plan, Consent to Care & Sign-off | 16 | + §2.2 consent to care (moved to the end) + §14.1 assessment reason/date/next review/frequency/reviewer |

---

## 2. Phases

### Phase 1 — Re-order existing tabs (admin, small) ✅
- `utils/holistic-assessment-tabs.ts`
  - Re-order `HOLISTIC_ASSESSMENT_TAB_DEFS` to the table above (array order = nav order).
  - Give every tab an explicit `displayNumber` (1–23). Keep ids.
  - Rename Tab 12 title → "Environment & Home Safety"; Tab 16 title → "Care Plan, Consent to Care & Sign-off".
- Check anything that walks tabs in order (next/previous, demo fill, e2e helper `tests/e2e/helpers/initial-assessment-autofill.ts`).
- Tests: `holistic-assessment-tabs.test.ts` order/displayNumber expectations.

### Phase 2 — Render the hidden sections (admin, medium–large) ✅
Today §2 (except MCA), §3, §13 and §14.1 have required questions that no tab renders.
All three renderers already exist inside `InitialAssessmentSectionQuestions` (consent stepper, car-parking panel, safeguarding panel) — reuse them.

1. **Consent tab (id 23):** new `kind: 'consent'` — renders §2 (`specRefs: ['2.1','2.3','2.4','2.8']`) and, below it,
   `InitialAssessmentPhotographyConsentPanel` (still saved to `metadata.photographyConsent`, no data change).
   Update `utils/consent-capacity-steps.ts` so the stepper only shows those steps (2.2 → final tab; 2.5/2.6/2.9 → MCA tab).
   - **Retire tab 18 from the nav**, but keep id 18 as an **alias → 23**: `section=18` in old URLs opens the Consent tab, and an
     existing tab-18 section comment (`metadata.sectionComments['18']`) is shown/merged on the Consent tab so nothing is lost.
   - Consent tab completeness = §2 required answers **and** `isPhotographyConsentComplete`.
2. **MCA Screening (id 3):** add `2.6` (best interest) next to the existing `2.mca`, `2.5` gate and `2.9`.
3. **Environment & Home Safety (id 12):** render §3 below the environment tool.
   Exclude `3.5`/`3.6` (access instructions, door code, key-safe location) — they already live on Tab 1's §1.2 home-access panel. Keep the car-parking panel.
4. **Safeguarding & Emergency (id 24):** `kind: 'form-section'`, `enterpriseSection: 13` → renders `InitialAssessmentSafeguardingSection` (incl. emergency-contact sync).
5. **Final tab (id 16):** add §2.2 and the §14.1 fields to `utils/sign-off-questions.ts` / `questionsForDocumentTab`, so they render **and** save
   (page special-case at `ServiceUserInitialAssessmentEnterprisePage.tsx:1180` keeps the tab-16 save scope).
6. **"Required" links go to the right tab.** Replace the section-level `firstHolisticTabForEnterpriseSection` lookup for validation
   with a question→tab index built from `questionsForDocumentTab` (2.2 → final tab, 2.6/2.9 → MCA tab, §13 → tab 24, §14.1 → final tab).
7. `utils/demo-fill-tab-questions.ts`: stop treating §2/§3/§13 as hidden extras so QA demo fill works on the new tabs.
8. Tests: tabs, demo-fill, submit-validation tab mapping.

### Phase 3 — MCA sync: Tab 17 ← Tab 3 (admin, medium) ✅
- Tab 17's first six questions (impairment, unable to decide, understand, retain, use/weigh, communicate) are shown **read-only, filled from the Tab 3 screening answers**, with a "from MCA Screening" note.
- Remove the combined "oral care and grooming" row (separate rows already exist).
- Keep the existing metadata keys (no data loss); completeness uses the synced values.
- Files: `utils/mental-capacity-checklist.ts`, `components/InitialAssessmentMentalCapacityChecklistPanel.tsx`, page hydration.

### Phase 4 — Deprivation of liberty (§2.9) wording (backend seed + admin labels, medium) ✅
Domiciliary care → the normal route is a **Court of Protection** order; DoLS only applies in care homes/hospitals (e.g. respite).

| Field | Change |
|---|---|
| "DoLS / LPS authorisation in place?" | → **"Deprivation of liberty authorisation in place?"** (YES_NO, keep `fieldKey: dolsLpsAuthorisationInPlace` so saved answers carry over) |
| NEW "Type of authorisation" | SINGLE_SELECT: **Court of Protection order (home / supported living)** — default · DoLS (care home / hospital, e.g. respite). Shown when Yes |
| NEW "Referred to local authority — awaiting authorisation?" | YES_NO, shown when **No** (admin + API gates support `no`) |
| Authorising body / Reference / Expiry | unchanged; switch their gates from `gateTextIncludes: 'DoLS / LPS…'` to **`gateFieldKey`** (the text is changing) |
| "DoLS / LPS relevant details" | → **"Conditions / restrictions carers must follow"** |

- Seed: `prisma/seeds/initial-assessment-enterprise.seed.ts` (2.9 block). Existing rows update via the seed's fieldKey match; run the seed + cleanup script on deploy (already wired).
- Labels saying "DoLS / LPS" elsewhere → "Deprivation of liberty": `spec-ref-groups.ts`, `consent-capacity-steps.ts`,
  `alerts/medical-safety/MedicalAlertsClinicalBody.tsx`, API `document-store-compliance.util.ts`. Keep the `DOLS_LPS` document type code.
- Optional: "Referred = Yes" auto-creates an IA action "Chase deprivation of liberty authorisation".

### Phase 5 — Fix care-plan "missing data" deep links (backend + admin, small) ✅
Existing bug: care-plan compose links use **enterprise section numbers** (`iaRoute(id, 10/11/12/14)`) but the admin reads `section=` as a **tab id**,
so e.g. "Complete skin integrity / Waterlow" opens Tab 11 (Therapy).
- API `compose/compose-routes.util.ts`: emit `iaSection=<enterprise section>` instead of `section=`.
- Admin `utils/initial-assessment-url-search.ts`: accept `iaSection` and map it to the right tab via the Phase 2 index.

### Phase 6 (optional) — "Not needed" state for conditional tabs
MCA Identified, Bed Rails and PEEP stay visible but show a "Not needed" badge (and don't count as incomplete) when their gate says so. No data hidden.

---

### Built in Phases 1–2 (beyond the list above)
- Default tab (no `section=`) is now the first nav tab (Consent), not id 1.
- Tab 1 save scope now includes §3.5 / §3.6 (`scopeOnlySections`) — previously editing the door code on Tab 1 did not autosave.
- Banner / MCA link / consent copy use display numbers via `holisticTabRef(id)` instead of hard-coded "Tab N".
- Submit dialog / blocking banner "Go to" links name the real tab and route by question (`holisticTabForValidationIssue`);
  fixes the old bug where §3 / §13 / §14 issues opened tabs 3 / 13 / 14.
- Nav status for filtered tabs now counts "Required" issues from every section they show (e.g. Tab 1, final tab).
- Backend dev-tools demo autofill registers tabs 23 / 24 (`prisma/seed-lib/ia-registered-holistic-tab-ids.ts`, `ia-api-autofill.service.ts`, `extraQuestionsForHolisticTab`).

### Built in Phases 3–5 (notes)
- Phase 3: rows 1–6 of Tab 17 mirror the Tab 3 screening (`syncMentalCapacityChecklistFromScreening`), read-only with comments editable;
  synced on Tab 17 open, on checklist edits, in completeness and on save. Combined "oral care and grooming" row removed (rows renumbered 1–19).
- Phase 4: seed `IA_DEPRIVATION_OF_LIBERTY_QUESTIONS`; `prisma/scripts/ia-template-cleanup.ts` (renamed from the prune script,
  `npm run seed:ia-template-cleanup`, runs in `run-deploy-seeds.sh` after the seed) upserts them by fieldKey. The optional
  "Referred → IA action" was not built. The Documents "DoLS record" module is unchanged (decision D3).
- Phase 5: `iaRoute` emits `iaSection=`; the admin URL parser maps it to a tab. Also fixed `CarePlanIaSourcePanels`
  recommendations opening tab = § number, and backend labels that named "Tab 1" / "Tab 6".

## 3. Data safety
- No question ids change, no answers deleted, tab ids frozen → saved IAs, section comments and URLs keep working.
- PDF/HTML/CQC export is ordered by enterprise section, not tabs → unaffected by the re-order.
- Phases 1–3, 5 and 6 are frontend/links only. Phase 4 changes seed text + adds 2 questions (deploy runs seed + cleanup automatically).

## 4. Decisions needed before building
| # | Question | Recommendation |
|---|---|---|
| D1 | Photography consent: separate tab or inside the Consent tab? | ✅ **Decided: inside the Consent tab** (too many tabs already) |
| D2 | Access fields (3.5/3.6): keep on Tab 1 §1.2 panel only? | Yes — don't duplicate on the Environment tab |
| D3 | Link IA §2.9 with the Documents "DoLS record" (`ServiceUserDolsRecord`)? | Later: prefill IA from the current record; for now wording only |
| D4 | Conditional tabs: hide or badge? | Badge (Phase 6) — hiding risks losing entered data |

## 5. Verification (each phase)
- Admin `tsc` + IA vitest; API build `tsc` + IA/compose jest (baseline: 4 known pre-existing failures).
- Browser walk-through of all 23 tabs on local (no crash, right content per tab); old `section=18` URL opens the Consent tab.
- Open the submit dialog: every "Required" link lands on the tab that shows that question.
- Local end-to-end: fill + submit a test IA, manager review, care-plan "missing data" links open the right tab.
- §2.9 gates: Yes → type/body/reference/expiry; No → "referred / awaiting".

## 6. Suggested build order
Phase 1 → 2 → 3 → 4 → 5 → (6). Phases 1–2 are one visible change (the new order); 3–5 are independent and can follow in any order.

---

## 7. Follow-on: missing content ✅ (built 2026-09-28, uncommitted)
No new tabs — everything sits inside existing tabs.
- **Tab 2 Personal Details:** §1.9 Recent hospital stay (6), §1.11 Smoking / alcohol / drugs (4), §1.10 Social wellbeing (6).
  Seed `IA_MISSING_CONTENT_SECTION_1_QUESTIONS`; required = in hospital (6 months), discharge summary (when shown), loneliness, smoking, alcohol.
- **Final tab:** "Agreed goals" block (`metadata.agreedGoals`, 1–5 goals: goal · Care Act outcome area · measure · target date).
  Goal #1 prefills from §1.3 "What do they want support to achieve?". Skippable submit block "Agreed goals: …" (admin + API).
- **Fire §18.2:** "Local fire and rescue service informed (home fire safety visit)?" (fieldKeys unchanged).
- **Syncs (fill only while unanswered, `utils/cross-tab-answer-defaults.ts`):** referral = hospital discharge / reason = post-hospital →
  in hospital Yes; follow-up "district nurse" → §13.9 (now `districtNurseInvolved`); current smoker → §18.4 smoking in property;
  alcohol dependence / drug use → Environment lone-worker "substance misuse" (+ default details).
- **Dropped as redundant:** community access (= ADL "Mobility outside the home"), groups/faith (= About Me + §1.7),
  smokes indoors (= §18.4), reason for hospital stay (merged into "Hospital, ward and reason for stay").
- **Not yet wired:** care-plan compose / carer app do not read the new fields or goals yet; PDF/HTML export does not print `agreedGoals`.

