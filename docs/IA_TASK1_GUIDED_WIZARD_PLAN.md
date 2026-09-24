# Task 1 — Guided Wizard (Option A): Detailed Build Plan

> **Parent backlog:** `docs/IA_IMPROVEMENT_BACKLOG.md` (Task 1)
> **Approach chosen:** **Option A — additive guidance layer** (NOT a forced linear wizard).
> **Principle:** Sit on top of the existing 22-tab rail and the data that's *already computed*. Add guidance; break nothing; keep free navigation for power users.
> **Status:** 🟡 Planned — not yet built. This document is a plan only; no code changed.

---

## 1. What we reuse (already exists — do not rebuild)

| Thing | Where | Note |
|---|---|---|
| Overall % | `overallPercent` in page (line ~1029) via `overallAssessmentProgress(sections, draftAnswers, progressContext)` → returns rounded number | Already computed; only shown buried in right sidebar today |
| Per-tab status map | `holisticTabNavStatus` in page (line ~918) via `buildHolisticTabNavStatus(...)` → `Map<tabId, 'ok'|'incomplete'|'warning'|'blocking'>` | Drives the coloured dots in the rail |
| Ordered tab list | `HOLISTIC_ASSESSMENT_TABS` (22 tabs, visible order) + `HOLISTIC_TAB_COUNT` (=22) | `utils/holistic-assessment-tabs.ts` |
| Tab lookups | `holisticTabById`, `holisticTabDisplayNumber(tab)`, `holisticTabTitle(id)` | same file |
| Navigation | `goToHolisticTab(tabId)` / `goToSection(n)` (page ~988) → sets URL `section` param | Wizard just calls these |
| Per-tab meta text | `formatSectionNavMeta(prog)` → e.g. "12/18 fields · 3 required" | `utils/section-progress.ts:152` |
| Save + submit | `saveSection()` (`saveMutation`), `openSubmitReview()` | page footer (~2766) |

**Key insight:** the "brain" (what's done / what's incomplete / overall %) already exists. Option A is almost entirely a **presentation layer** over it — low risk.

---

## 2. What we build (3 new, small pieces)

### Piece 1 — Top **Guide Bar** (`InitialAssessmentGuideBar.tsx`)
A slim, full-width bar near the top of the assessment (visible at all screen widths, unlike the right sidebar).

**Shows:**
- **Overall progress bar** + `"{overallPercent}%"`.
- **Completion count**: `"{completeCount} of 22 sections complete"` (complete = status `ok`).
- **Attention counts** (small chips): `"{blockingCount} blocking"` (red), `"{incompleteCount} incomplete"` (grey) — only render when > 0.
- **Next hint**: `"Next: 7. Malnutrition Universal Screening Tool (MUST)"` + a **"Go →"** button → `goToHolisticTab(nextTabId)`.
- When everything is `ok`: switch to a green **"All sections complete — Review & submit"** state → `openSubmitReview()`.

**Props (pure, presentational):**
```ts
type Props = {
  overallPercent: number
  completeCount: number
  blockingCount: number
  incompleteCount: number
  totalCount: number            // HOLISTIC_TAB_COUNT
  nextTab: { id: number; displayNumber: number; title: string } | null
  editable: boolean
  onGoToTab: (tabId: number) => void
  onReviewSubmit: () => void
}
```
**A11y:** progress element uses `role="progressbar"` with `aria-valuenow/min/max`; the "Next" hint lives in an `aria-live="polite"` region so screen readers announce when the next step changes.

### Piece 2 — Footer **"Save & next incomplete →"** button
Add next to the existing **"Save section"** button in the per-tab footer (page ~2766).

**Behaviour:**
- `onClick`: `await saveSection()` → then `goToHolisticTab(nextIncompleteAfterCurrent)`.
- If no incomplete tab remains → button becomes **"Save & review submit"** → `openSubmitReview()`.
- Disabled while `saveMutation.isPending`.
- Only shown when `editable && canUpdate` (same guard as Save section).

### Piece 3 — Pure util `nextIncompleteHolisticTab(...)` (`utils/next-incomplete-tab.ts`)
Single source of truth for "what's next", unit-testable, used by both pieces above.

```ts
type NavStatus = 'ok' | 'incomplete' | 'warning' | 'blocking'
// Priority: blocking first, then incomplete, then warning.
// "after current, wrapping" so the footer button advances naturally.
export function nextIncompleteHolisticTab(
  tabs: readonly { id: number }[],
  status: Map<number, NavStatus>,
  currentTabId: number | null,
): number | null
```
Rules:
- Consider a tab "needs attention" if status ∈ {`blocking`, `incomplete`, `warning`}.
- Search order: start **after** `currentTabId` in `HOLISTIC_ASSESSMENT_TABS` order, wrap around to the start, skip the current tab.
- Return the first needing attention, preferring `blocking` if any exist anywhere (for the top bar's "Next"). Return `null` when all `ok`.
- (Two selectors may be cleaner: `firstAttentionTab(...)` for the top bar's global "Next", and `nextAttentionAfter(currentId)` for the footer's "advance". Decide during build — both are ~10 lines.)

---

## 3. Wiring into the page (exact spots)

`src/features/service-users/initial-assessment/pages/ServiceUserInitialAssessmentEnterprisePage.tsx`:

1. **Derive the counts + next tab** (near the existing `overallPercent` memo, ~line 1030):
   ```ts
   const navCounts = React.useMemo(() => {
     let ok = 0, blocking = 0, incomplete = 0, warning = 0
     for (const t of HOLISTIC_ASSESSMENT_TABS) {
       const s = holisticTabNavStatus.get(t.id) ?? 'ok'
       if (s === 'ok') ok++; else if (s === 'blocking') blocking++
       else if (s === 'incomplete') incomplete++; else warning++
     }
     return { ok, blocking, incomplete, warning }
   }, [holisticTabNavStatus])

   const nextTabId = React.useMemo(
     () => nextIncompleteHolisticTab(HOLISTIC_ASSESSMENT_TABS, holisticTabNavStatus, activeHolisticTab),
     [holisticTabNavStatus, activeHolisticTab],
   )
   ```
2. **Render `<InitialAssessmentGuideBar/>`** right after the title block (~line 2152, after the `<h1>{HOLISTIC_FORM_TITLE}</h1>` row) and only when `hubTab === 'form'` and a submission is loaded. Keep it above `PolicyContextPanel` or between it and the hub tabs — decide visually during build.
3. **Add the footer button** beside "Save section" (~line 2766) using `nextIncompleteAfter(activeHolisticTab)`.

No changes to routing, data fetching, mutations, validation, or the existing rail. Purely additive rendering + one util.

---

## 4. Phasing

- **Phase A1 (core):** ✅ **BUILT (2026-09-22)** — util + Guide Bar (progress %, counts, next hint, Go button, all-complete state). Typecheck clean, 10 unit tests passing, eslint clean.
- **Phase A2 (flow):** 🔵 footer "Save & next incomplete →" button (util `nextAttentionAfter` already built + tested, ready to wire).
- **Phase A3 (polish):** 🔵 aria-live wording, empty/read-only states, dark-mode colours, tidy chip styling, respect `editable`/permissions.

Ship A1 first (visible win), then A2, then A3.

### Phase A1 — as-built notes
- New: `components/InitialAssessmentGuideBar.tsx` (presentational bar: progress bar with `role="progressbar"`, "N of 22 complete", blocking/incomplete chips, `aria-live` "Next: …" hint + Go button, green "All sections complete — Review & submit" state).
- New: `utils/next-incomplete-tab.ts` (`firstAttentionHolisticTab` used by the bar; `nextAttentionAfter` ready for A2; `tabNeedsAttention`).
- New: `utils/next-incomplete-tab.test.ts` (10 tests).
- Touched: `pages/ServiceUserInitialAssessmentEnterprisePage.tsx` — 2 imports, one `guideNav` memo (derived from existing `holisticTabNavStatus`), and the `<InitialAssessmentGuideBar/>` render at the top of the `hubTab === 'form'` block. Additive only; no changes to data/validation/routing.

---

## 5. Acceptance criteria

- [ ] Opening an editable IA shows a top bar with overall %, "N of 22 complete", and a correct "Next: …" pointing at a real incomplete/blocking tab.
- [ ] Clicking **Go →** navigates to that tab (URL `section` updates).
- [ ] Footer **"Save & next incomplete →"** saves the current section, then lands on the next tab needing attention.
- [ ] When all 22 tabs are `ok`, both the top bar and footer switch to a **Review & submit** affordance (calls `openSubmitReview`).
- [ ] Read-only / no-permission assessments show the progress read-out but **no** action buttons (matches existing "This assessment is read-only.").
- [ ] Free navigation via the left rail is unchanged; nothing is forced or blocked.
- [ ] Counts/next update live as answers change (they derive from `holisticTabNavStatus`, which already recomputes).

---

## 6. Testing

- **Unit:** `next-incomplete-tab.test.ts` — all `ok` → `null`; blocking preferred; wrap-around after current; single remaining tab; current tab skipped.
- **Component:** Guide Bar renders correct counts + next label for a given status map; all-complete state; read-only hides buttons.
- **Manual/QA:** use the existing DEV demo-fill (`InitialAssessmentQaDemoDataDialog`) to fill tabs and watch the bar/counter move to 100% and flip to "Review & submit".
- Run existing IA test suite to ensure no regressions (nav status + progress utils have tests already).

---

## 7. Out of scope (explicitly NOT in Option A)

- ❌ Forced/linear step order (that's Option C — rejected for now).
- ❌ Required-vs-Optional grouping + "Ready to submit" checklist (that's **Option B** — a follow-up after A).
- ❌ Reordering the 22 tabs or changing clinical section order.
- ❌ Any mobile/tablet layout work (Task 9 — deferred to last).
- ❌ Changes to submit validation logic (`getSubmitValidationIssues`) — we only *surface* existing state.

---

## 8. Risk & mitigation

| Risk | Mitigation |
|---|---|
| Page file is ~2,921 lines — easy to introduce noise | All new logic in small external components + one util; page only wires props |
| Colour/status meaning must match the rail dots | Reuse the same `SectionNavStatus` values and existing colour intent (red/amber/grey) |
| A11y regressions | `role="progressbar"`, `aria-live` for next hint, buttons keyboard-reachable |
| "Next" feels random to assessors | Priority = blocking → incomplete → warning; "after current, wrapping" so it advances predictably |

---

## 9. New / touched files summary

**New:**
- `src/features/service-users/initial-assessment/components/InitialAssessmentGuideBar.tsx`
- `src/features/service-users/initial-assessment/utils/next-incomplete-tab.ts`
- `src/features/service-users/initial-assessment/utils/next-incomplete-tab.test.ts`
- (optional) `components/InitialAssessmentGuideBar.test.tsx`

**Touched:**
- `pages/ServiceUserInitialAssessmentEnterprisePage.tsx` (derive counts/next; render guide bar; add footer button) — additive only.

---

## 10. Rough effort

- Phase A1: ~0.5–1 day. Phase A2: ~0.5 day. Phase A3 + tests: ~0.5 day.
- **Total ≈ 1.5–2 days**, low risk, fully additive.
