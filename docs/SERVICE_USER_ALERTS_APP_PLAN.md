# Service-User Alerts in the Carer App (Visit Details) — Build Plan

> **Goal (from manager):** Show the alerts an admin manages about a service user in the **carer app**, inside **visit details**.
> **Chosen design:** **Option B — Hybrid card.** Critical (life/safety) alerts show inline under the service-user header; the rest sit behind a "View all alerts" tap. Each alert taps through to detail.
> **Decision (2026-09-23):** **No acknowledge gate for now — display only.** The card just shows alerts; the carer can start care without confirming. Acknowledge + soft-gate are **deferred** (add later if needed). This keeps the existing visit-start flow unchanged.
> **Status:** 🔵 Planned — not built. Design approved 2026-09-23. No code changed yet.
> Spans three codebases: `careflow-api` (backend feed), `care_employee` (Flutter app UI), and mirrors admin data from `careflow-admin`.

---

## 1. Why this design

- Homecare rule: life/safety info (allergy, DNACPR, choking) must be visible **without any tap**. So critical alerts render inline; only secondary alerts hide behind "View all".
- Keeps the visit-details header clean but safe.
- Severity tiers + plain-language "carer action line" + source tag = fast to scan, easy to understand, trustworthy, CQC-friendly (acknowledge trail).

## 2. Placement in visit details

```
[ Avatar ]  Harry Max            [Visit]
            Today 09:00 · Personal care
─────────────────────────────────────────
SAFETY & ALERTS
  🔴 Critical (shown inline, always visible)
     • Allergy — Penicillin        (Admin)
     • DNACPR in place             (Admin)
     • Choking risk — dysphagia    (IA)
     [ I've read the critical alerts ]   ← acknowledge
  ▸ View all alerts (8)            ← tap opens full tiered sheet
─────────────────────────────────────────
[ rest of visit workspace: tasks, MAR, notes… ]
```

## 3. The three tiers + source→tier mapping

Each alert = `{ id, category, title, actionLine, tier, source, requiresAck, detail }`.

| Tier | Shown | Sources that map here |
|---|---|---|
| 🔴 **CRITICAL** | Inline, always | Allergies; DNACPR; medical conditions = Choking/Dysphagia, Epilepsy/Seizure, Aggression; IA risks = LONE_WORKER, (severe) SKIN/FALLS if high; Safeguarding flag; Infection precautions |
| 🟠 **IMPORTANT** | Behind "View all" | IA risks = FALLS, PRESSURE (SKIN_INTEGRITY), MOVING_HANDLING, HYDRATION; medical conditions = Diabetes, COPD, Palliative, cardiac; DoLS / Lack capacity; behaviour/mood; medication-by-carer |
| ⚪ **INFO** | Behind "View all" | Communication needs / non-verbal / sensory; Reasonable adjustments; Usual parameters (obs ranges); Access / key safe (DOM Care); Flash message (unless urgent → CRITICAL) |

Mapping lives in **one place** on the backend (single source of truth), so admin and app agree. Tier can be overridable by severity where the source carries one (e.g. IA riskLevel HIGH/URGENT can lift a tier).

## 4. Backend (careflow-api) — the missing "unified feed"

**New endpoint (carer-facing, scoped to the carer's assigned service users):**
`GET /employee-app/clients/{serviceUserId}/alerts` → `{ criticalCount, alerts: AlertItem[] }`
(or fold into the existing visit-details `shell`, since `employee-app-visits.service.ts` already assembles allergies/flags/flash/lone-worker there).

**Aggregates from existing tables** (no new capture — surfacing only):
- `ServiceUserMedicalCondition` (active) + `MedicalConditionCatalog` (name/category)
- `ServiceUserAllergy`
- Legal record → `dnacprInPlace` / DoLS
- `ServiceUserReasonableAdjustment`
- `ServiceUserFlashMessage` (active)
- `InitialAssessmentRiskRecord` (open) — FALLS, SKIN_INTEGRITY, MOVING_HANDLING, HYDRATION, LONE_WORKER, CHOKING…

**New shared mapping util** `service-user-alert-mapping.ts`: `code/riskType → { tier, category, actionLine, requiresAck }`. This is the heart of the feature; mirror it (or expose it) so admin can show the same.

**Acknowledge endpoint:** `POST /employee-app/visits/{jobId}/alerts/ack` → records which carer acknowledged critical alerts for that visit (new small table `VisitAlertAcknowledgement { visitId, employeeId, acknowledgedAt, alertHash }`). Gives the CQC trail.

**Note:** `employee-app-clients.service.ts` already maps IA risk types → safety tags (falls/pressure/lone-worker). Extend that same logic rather than rewriting.

## 5. App (care_employee, Flutter)

- **New data:** `AlertItem` model + repository/datasource calling the new endpoint (slots beside existing client/visit repositories). Or read from the enriched visit `shell`.
- **New widget:** `ServiceUserAlertsCard` in the visit-details header area (`visit_workspace_screen.dart`), below the name/DOB/visit-id block.
  - Renders CRITICAL rows inline (red, icon + title + action line + source tag).
  - "I've read the critical alerts" button → calls ack endpoint; soft-gate before starting care (warn if unacknowledged).
  - "View all alerts (N)" row → bottom sheet with all three tiers.
  - Each row tappable → alert detail sheet (title, action, source, date).
- **Reuse existing UI vocabulary:** `AppChip.danger/warning`, `AppAssets.homeAlertDanger/Warning`, existing allergy/flags rendering — so it looks native.
- **Icons per category** for fast scanning (allergy, heart-off, lungs, walk, bandage, droplet, message, key).

## 6. Phasing

- **Phase 1 — Backend feed:** ✅ **BUILT (2026-09-23).** `GET /employee-app/clients/:clientId/alerts` returns `{ data: { criticalCount, total, alerts[] } }`. New: `service-user-alert-mapping.util.ts` (tier/action/source mapping, single source of truth) + `.spec.ts` (14 tests passing); `employee-app-alerts.service.ts` (aggregates allergies, DNACPR, admin medical conditions, reasonable adjustments, active flash message, open IA risks). Wired into `EmployeeAppClientsController` + module. Scoped by `assertClientOnRound`. Typecheck clean (no errors in new files). Sources covered: 6 clinical. **Deferred to a later pass:** DOM-care access/key-safe INFO alerts, DoLS-from-legal.
- **Phase 2 — App card (display only):** ✅ **BUILT (2026-09-23).** `ServiceUserAlertsCard` in visit details (below `_VisitHeader`), critical inline + "View all alerts (N)" toggle + per-alert detail bottom sheet. Reads the new feed via `ClientAlertsController` (cache-first, silent refresh). **No acknowledge / no gate** — carer starts care as before. Files in care_employee/: `data/models/client_alerts_models.dart`, `presentation/controllers/client_alerts_controller.dart`, `presentation/pages/visit/widgets/service_user_alerts_card.dart`; extended `clients_remote_datasource.dart` + `clients_repository(.dart/_impl.dart)` (+`clientAlerts` endpoint). `flutter analyze` clean on all new files (visit screen shows only pre-existing lints). **Remaining: live end-to-end run against the backend** (needs app + logged-in carer + a service user with alerts).
- **Phase 3 — Acknowledge + gate (DEFERRED, add later if needed):** ack endpoint + table + button + soft-gate + CQC trail.
- **Phase 4 (later, optional):** live push when a new critical alert is added (FCM already carries `serviceUserId`; add a `CLIENT_ALERT` push kind). Ties into the deferred "live alerts" work.

**Current scope = Phase 1 + Phase 2 only (display, no gate).**

## 7. Out of scope (for now)

- Full real-time alert stream (Phase 4 / later).
- Family/circle alerts.
- Reworking the admin "Medical & Alerts" data capture (that stays as-is — it's sound).
- Alert create/category redesign in admin (separate future task).

## 8. Acceptance criteria

- [ ] Visit details shows a Safety & Alerts card under the service-user header.
- [ ] Critical alerts (allergy, DNACPR, choking, lone-worker, safeguarding, infection) render **inline**, always visible.
- [ ] Important + info alerts sit behind "View all alerts (N)".
- [ ] Each alert shows a plain-language carer action line + a source tag (Admin / IA / DOM).
- [ ] Data comes from one backend feed; admin and app agree on tier/wording via the shared mapping.
- [ ] Display only — carer can start care without any confirm step (visit-start flow unchanged).
- [ ] Nothing new is captured — only existing service-user data is surfaced.

## 9. Rough effort

- Phase 1 (backend feed + mapping): ~2–3 days.
- Phase 2 (app card + sheets): ~2–3 days.
- Phase 3 (acknowledge + trail): ~1–2 days.
- Phase 4 (live push): later.
