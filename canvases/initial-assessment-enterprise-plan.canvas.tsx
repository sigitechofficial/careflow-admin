import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  TodoList,
  TodoListCard,
  UsageBar,
  useCanvasState,
} from "cursor/canvas";
import type { TodoItem, TodoStatus } from "cursor/canvas";

type View =
  | "overview"
  | "holistic"
  | "phases"
  | "backend"
  | "frontend"
  | "database"
  | "api"
  | "migration"
  | "integrations"
  | "roadmap";

type PhaseId = "p0" | "p1" | "p2" | "p3" | "p4" | "p5" | "p6";
type TrackFilter = "all" | "backend" | "frontend" | "swagger" | "qa";
type TaskFilter = "all" | "done" | "active" | "pending";

/** Phase 0 — Foundation shipped (enterprise beta) */
const P0_BACKEND_TODOS: TodoItem[] = [
  { id: "be0-1", status: "completed", content: "BE0.1 — Prisma schema: InitialAssessmentTemplate, Section, Question, Submission, Answer (existing migration)" },
  { id: "be0-2", status: "completed", content: "BE0.2 — initial-assessment-enterprise.seed.ts: 14 sections, ~110 starter questions, specRef metadata" },
  { id: "be0-3", status: "completed", content: "BE0.3 — seed.ts: enterprise template default; legacy 28-section template demoted" },
  { id: "be0-4", status: "completed", content: "BE0.4 — InitialAssessmentsModule: CRUD submissions, save answers, submit, review, soft delete" },
  { id: "be0-5", status: "completed", content: "BE0.5 — GET risk-summary + care-plan-triggers from flagged answers" },
  { id: "be0-6", status: "completed", content: "BE0.6 — Audit actions on create/save/submit/review (AuditLogsService)" },
  { id: "be0-7", status: "completed", content: "BE0.7 — Permissions seed: read, create, update, delete, submit, review, export, templates.*" },
  { id: "be0-8", status: "completed", content: "BE0.8 — E2E initial-assessment.e2e-spec.ts: create → save → submit → review → risk summary" },
  { id: "be0-9", status: "completed", content: "BE0.9 — InitialAssessmentTemplatesModule: default template with sections + questions" },
  { id: "be0-10", status: "completed", content: "BE0.10 — Notification hook on submit/review (basic)" },
];

const P0_FRONTEND_TODOS: TodoItem[] = [
  { id: "fe0-1", status: "completed", content: "FE0.1 — features/service-users/initial-assessment/: types.ts, api.ts, keys.ts" },
  { id: "fe0-2", status: "completed", content: "FE0.2 — hooks/useInitialAssessmentEnterprise.ts: template, submissions, answers, save, submit" },
  { id: "fe0-3", status: "completed", content: "FE0.3 — InitialAssessmentQuestionField: YES_NO, CHECKBOX, TEXT, TEXTAREA, NUMBER, DATE" },
  { id: "fe0-4", status: "completed", content: "FE0.4 — ServiceUserInitialAssessmentEnterprisePage: 14-section nav, save section, submit" },
  { id: "fe0-5", status: "completed", content: "FE0.5 — Route /service-users/initial-assessment + sidebar link" },
  { id: "fe0-6", status: "completed", content: "FE0.6 — Legacy checklist: deprecation banner + link to enterprise route" },
  { id: "fe0-7", status: "completed", content: "FE0.7 — roles.ts + types.ts: create, submit, review permissions (admin roles)" },
  { id: "fe0-8", status: "completed", content: "FE0.8 — ServiceUserRowActionStrip → enterprise route" },
  { id: "fe0-9", status: "completed", content: "FE0.9 — Route loader prefetch template + submissions (prefetch-routes.ts)" },
  { id: "fe0-10", status: "completed", content: "FE0.10 — Edit Service User tab: link to enterprise list instead of legacy tab only" },
];

/** Phase 1 — Template depth + full question catalog */
const P1_BACKEND_TODOS: TodoItem[] = [
  { id: "be1-1", status: "completed", content: "BE1.1 — Script: import initial-assessment-catalog.json → enterprise template questions (261 legacy IDs + metadata.legacyCatalogId)" },
  { id: "be1-2", status: "completed", content: "BE1.2 — Expand §1 questions: all §1.0–1.7 fields from spec (funding, referral, equality, accessible care)" },
  { id: "be1-3", status: "completed", content: "BE1.3 — Expand §2 consent: all MCA, best interest, sharing fields with conditional required flags" },
  { id: "be1-4", status: "completed", content: "BE1.4 — Expand §3 environment: §3.10 Property Environment + §3.11 Flooring checkbox groups" },
  { id: "be1-5", status: "completed", content: "BE1.5 — Expand §4 vitals: structured BP, glucose, competent person gate, monitoring schedule" },
  { id: "be1-6", status: "completed", content: "BE1.6 — Expand §5–§10: breathing/pain/swallowing, nutrition, oral, communication, medication, cognition (+ legacy catalog)" },
  { id: "be1-7", status: "completed", content: "BE1.7 — Expand §11 skin: §11.1a legacy skin checklist + wound fields" },
  { id: "be1-8", status: "completed", content: "BE1.8 — Expand §12 mobility: §12.5a–d transfers, amputation, equipment §12.8a" },
  { id: "be1-9", status: "completed", content: "BE1.9 — Expand §13–§14: safeguarding types, risk matrix stub, sign-off fields" },
  { id: "be1-10", status: "completed", content: "BE1.10 — Question options JSON for SINGLE_SELECT / MULTI_SELECT (dropdown values from spec)" },
  { id: "be1-11", status: "completed", content: "BE1.11 — Section description + carePlanArea on all 14 sections; template version v7" },
  { id: "be1-12", status: "completed", content: "BE1.12 — InitialAssessmentQuestion.metadata: specRef, legacyCatalogId, conditionalRules (showWhen JSON)" },
  { id: "be1-13", status: "completed", content: "BE1.13 — Attachment support on submission (MCA docs, discharge summary, assessment photo)" },
  { id: "be1-14", status: "completed", content: "BE1.14 — Secure field type for key safe code + door code (encrypted at rest)" },
  { id: "be1-15", status: "completed", content: "BE1.15 — GET template by version for historical submissions" },
];

const P1_FRONTEND_TODOS: TodoItem[] = [
  { id: "fe1-1", status: "completed", content: "FE1.1 — InitialAssessmentQuestionField: MULTI_SELECT + SINGLE_SELECT (options from template)" },
  { id: "fe1-2", status: "completed", content: "FE1.2 — Section completion % in nav (answered / total required per section)" },
  { id: "fe1-3", status: "completed", content: "FE1.3 — Debounced autosave per section (400ms) + save indicator" },
  { id: "fe1-4", status: "completed", content: "FE1.4 — Pre-fill §1 from service user profile (name, DOB, address, preferred name)" },
  { id: "fe1-5", status: "completed", content: "FE1.5 — Person-centred cards §1.3–1.4: single-column layout (one card per row)" },
  { id: "fe1-13", status: "completed", content: "FE1.13 — Preferred visit times: separate panel, medication rounds lookup, checkboxes + editable From/To windows" },
  { id: "fe1-14", status: "completed", content: "FE1.14 — Autosave: preserve object selectedOptions on hydrate; save only when section has dirty answers" },
  { id: "be1-17", status: "completed", content: "BE1.17 — BodyMapRecordTypeCatalog: unified wound types for IA §11 + body map wizard (optionsLookup)" },
  { id: "fe1-6", status: "completed", content: "FE1.6 — Group questions by subsection (1.0, 1.1…) using metadata.specRef" },
  { id: "fe1-7", status: "completed", content: "FE1.7 — Assessment hub: list submissions + status + Start / Resume / View read-only" },
  { id: "fe1-8", status: "completed", content: "FE1.8 — No concern clears sibling options (§5, §6, §7, §8 pattern)" },
  { id: "fe1-9", status: "completed", content: "FE1.9 — Help text from question.helpText + spec tooltips" },
  { id: "fe1-10", status: "completed", content: "FE1.10 — Notes field per answer when allowNotes=true" },
  { id: "fe1-11", status: "completed", content: "FE1.11 — Care plan triggers panel: fetch + display care-plan-triggers endpoint" },
  { id: "fe1-12", status: "completed", content: "FE1.12 — Risk summary panel: expandable list with section grouping" },
];

/** Phase 2 — Rules engine + submit gates */
const P2_BACKEND_TODOS: TodoItem[] = [
  { id: "be2-1", status: "completed", content: "BE2.1 — initial-assessment-validation.util.ts: evaluate rules from question answers" },
  { id: "be2-2", status: "completed", content: "BE2.2 — Rule: consent to assessment = No → block submit (400 + field errors)" },
  { id: "be2-3", status: "completed", content: "BE2.3 — Rule: capacity No/Unsure → MCA required before submit" },
  { id: "be2-4", status: "completed", content: "BE2.4 — Rule: safeguarding concern → manager review required flag" },
  { id: "be2-5", status: "completed", content: "BE2.5 — Rule: high Waterlow / falls / medication → manager review auto" },
  { id: "be2-6", status: "completed", content: "BE2.6 — Agency settings wired into BE + FE validation (emergency contact, no-response, sign-off, review date, Waterlow threshold)" },
  { id: "be2-7", status: "completed", content: "BE2.7 — Rule: no response procedure missing → block care activation flag" },
  { id: "be2-8", status: "completed", content: "BE2.8 — Cross-field sync: food likes §1 → §6; door code §1 ↔ §3; interpreter §1 ↔ §8" },
  { id: "be2-9", status: "completed", content: "BE2.9 — POST /submissions/:id/validate — dry-run submit validation returning blocking + warnings" },
  { id: "be2-10", status: "completed", content: "BE2.10 — InitialAssessmentAction table: title, type, priority, dueDate, status, sourceQuestionId" },
  { id: "be2-11", status: "completed", content: "BE2.11 — Auto-create actions on submit (GP, SALT, equipment, safeguarding, MCA)" },
  { id: "be2-12", status: "completed", content: "BE2.12 — InitialAssessmentRiskRecord table: likelihood, severity, controls, reviewDate" },
  { id: "be2-13", status: "completed", content: "BE2.13 — Promote flagged answers to risk records on submit" },
  { id: "be2-14", status: "completed", content: "BE2.14 — Care plan recommendation DTO on GET summary (accept/decline later in P4)" },
  { id: "be2-15", status: "completed", content: "BE2.15 — Agency config: InitialAssessmentAgencySettings (thresholds, blocking rules toggles)" },
  { id: "be2-16", status: "completed", content: "BE2.16 — v7 template rules: conditional required (showWhen), safeguarding details, wound assessment, ADL grid" },
];

const P2_FRONTEND_TODOS: TodoItem[] = [
  { id: "fe2-1", status: "completed", content: "FE2.1 — Submit flow: call validate endpoint → show blocking issues modal" },
  { id: "fe2-2", status: "completed", content: "FE2.2 — Blocking banner: consent, safeguarding, access, eMAR, moving & handling" },
  { id: "fe2-3", status: "completed", content: "FE2.3 — Inline field errors from validate response" },
  { id: "fe2-4", status: "completed", content: "FE2.4 — Conditional show/hide questions (rule engine preview on client)" },
  { id: "fe2-5", status: "completed", content: "FE2.5 — Section nav: required incomplete indicator (red dot)" },
  { id: "fe2-6", status: "completed", content: "FE2.6 — Generated actions list after save (Review schedule tab + regenerate)" },
  { id: "fe2-7", status: "completed", content: "FE2.7 — Confirm submit dialog with risk count + open actions count" },
  { id: "fe2-8", status: "completed", content: "FE2.8 — Read-only mode for SUBMITTED/REVIEWED with Reopen request (manager only)" },
  { id: "fe2-9", status: "completed", content: "FE2.9 — Conditional required + §5–§14 showWhen gates wired to submit validation and nav progress" },
  { id: "fe2-10", status: "completed", content: "FE2.10 — §3.8/§3.10/§3.11 subsection filters + concern/medication sync utils (visible-section-questions)" },
];

/** Phase 3 — Clinical & scoring UI */
const P3_BACKEND_TODOS: TodoItem[] = [
  { id: "be3-1", status: "completed", content: "BE3.1 — Waterlow scoring: store category selections + auto total + risk band (submission metadata)" },
  { id: "be3-2", status: "completed", content: "BE3.2 — ADL scoring: per-activity 0–4 answers + auto section totals + dependency level (metadata)" },
  { id: "be3-3", status: "completed", content: "BE3.3 — Risk matrix CRUD endpoints nested under submission (create/update/regenerate shipped)" },
  { id: "be3-4", status: "completed", content: "BE3.4 — Structured vitals snapshot + sync to ServiceUserObservation on submit (TEMPERATURE, PULSE, BP, etc.)" },
  { id: "be3-5", status: "completed", content: "BE3.5 — Medication list snapshot on submit (links serviceUserMedication IDs) + GET …/clinical" },
  { id: "be3-6", status: "completed", content: "BE3.6 — Falls assessment risk score (LOW/MEDIUM/HIGH) + FALLS observation link on submit" },
  { id: "be3-7", status: "completed", content: "BE3.7 — initial-assessment-waterlow.util.ts: server-side Waterlow scoring + band metadata sync" },
  { id: "be1-16", status: "completed", content: "BE1.16 — Seed expansions: §4 vitals, §6 appetite, §9 med, §10 emotional, §11/§12 mobility metadata" },
];

const P3_FRONTEND_TODOS: TodoItem[] = [
  { id: "fe3-1", status: "completed", content: "FE3.1 — WaterlowAssessmentForm component (§11.4–11.6) with live score" },
  { id: "fe3-2", status: "completed", content: "FE3.2 — AdlScoringGrid component (§12.1–12.6) with auto totals" },
  { id: "fe3-3", status: "completed", content: "FE3.3 — RiskMatrixEditor: L×S heatmap, editable likelihood/severity, add row form" },
  { id: "fe3-4", status: "completed", content: "FE3.4 — VitalsForm: competent person banner, field lock when not competent, numeric range validation" },
  { id: "fe3-5", status: "completed", content: "FE3.5 — ConsentCapacitySection: §2 step wizard, MCA upload strip, consent/capacity blocking banners" },
  { id: "fe3-6", status: "completed", content: "FE3.6 — SafeguardingSection: concern alert, abuse type grid, immediate action block, emergency contacts panel" },
  { id: "fe3-7", status: "completed", content: "FE3.7 — MedicationListTable on §9 (read from meds module, mark verified, link to eMAR)" },
  { id: "fe3-8", status: "completed", content: "FE3.8 — FinanceSupportPanel: §12.11–12.13 controls, consent linkage, cash/manager approval" },
  { id: "fe3-9", status: "completed", content: "FE3.9 — TransferMatrixPanel: §12.5c bed/chair/commode grid with ADL 0–4 scores" },
  { id: "fe3-10", status: "completed", content: "FE3.10 — EquipmentChecklistPanel: §12.8a hoist/bed servicing and training fields" },
  { id: "fe3-11", status: "completed", content: "FE3.11 — Dedicated Waterlow hub tab + equipment catalog + unsure age band + manager-review threshold" },
  { id: "fe3-12", status: "completed", content: "FE3.12 — InitialAssessmentSkinPressureSection: §11 skin/pressure dedicated layout + body map CTA" },
  { id: "fe3-13", status: "completed", content: "FE3.13 — Risk matrix heatmap: help tooltip (likelihood × severity, closed risks excluded)" },
];

/** Phase 4 — Governance: PDF, signatures, manager review */
const P4_BACKEND_TODOS: TodoItem[] = [
  { id: "be4-1", status: "completed", content: "BE4.1 — GET /submissions/:id/pdf — inspection-ready PDF (hide key safe by default)" },
  { id: "be4-2", status: "completed", content: "BE4.2 — PDF includes: consent summary, risks, actions, Waterlow, ADL, signatures" },
  { id: "be4-3", status: "completed", content: "BE4.3 — AssessorSignature + ServiceUserSignature fields on submission" },
  { id: "be4-4", status: "completed", content: "BE4.4 — PATCH review: approvedForCareStart + careStartConditions in submission metadata" },
  { id: "be4-5", status: "completed", content: "BE4.5 — Reopen flow: PATCH …/status → IN_PROGRESS + reason (audit logged)" },
  { id: "be4-6", status: "completed", content: "BE4.6 — Answer-level audit: correctionReason on reopen save + per-field INITIAL_ASSESSMENT_ANSWER_CORRECTED" },
  { id: "be4-7", status: "completed", content: "BE4.7 — Submissions list + Versions & Compare tabs (per-SU assessment history)" },
  { id: "be4-8", status: "completed", content: "BE4.8 — PATCH care-plan-recommendations/:id accept/decline + metadata.carePlanDecisions" },
  { id: "be4-9", status: "completed", content: "BE4.9 — GET …/cqc-evidence JSON bundle (risks, actions, audit excerpt)" },
  { id: "be4-10", status: "completed", content: "BE4.10 — GET /initial-assessments/review-queue manager dashboard API" },
  { id: "be4-11", status: "completed", content: "BE4.11 — GET …/html — branded export (cover page, TOC, cards, embedded org logo)" },
  { id: "be4-12", status: "completed", content: "BE4.12 — PDF export renders same HTML layout (puppeteer-core + system Chrome/Edge)" },
  { id: "be4-13", status: "completed", content: "BE4.13 — Preferred visit times export: structured round codes + custom time windows" },
];

const P4_FRONTEND_TODOS: TodoItem[] = [
  { id: "fe4-1", status: "completed", content: "FE4.1 — SignOffPanel: assessor declaration checkbox + signature capture" },
  { id: "fe4-2", status: "completed", content: "FE4.2 — Service user / representative agreement §14.6" },
  { id: "fe4-3", status: "completed", content: "FE4.3 — ManagerReviewPanel: approve care start, conditions, archive, reopen" },
  { id: "fe4-4", status: "completed", content: "FE4.4 — PDF preview + download button (permission: export)" },
  { id: "fe4-5", status: "completed", content: "FE4.5 — Versions & history tab: submission list + side-by-side compare" },
  { id: "fe4-6", status: "completed", content: "FE4.6 — Care plan recommendations: accept / decline with reason" },
  { id: "fe4-7", status: "completed", content: "FE4.7 — Reopen assessment modal (manager + reason)" },
  { id: "fe4-8", status: "completed", content: "FE4.8 — Audit trail tab per submission (AuditLogs integration)" },
  { id: "fe4-9", status: "completed", content: "FE4.9 — Manager queue page /initial-assessments/review-queue + sidebar link" },
  { id: "fe4-10", status: "completed", content: "FE4.10 — HTML export: preview dialog (iframe) + download from toolbar / manager review" },
  { id: "fe4-11", status: "completed", content: "FE4.11 — Versions tab: submission detail sheet (timeline, users, review notes)" },
];

/** Phase 5 — Integrations */
const P5_BACKEND_TODOS: TodoItem[] = [
  { id: "be5-1", status: "completed", content: "BE5.1 — Link §11 body map required → create/open body map baseline record" },
  { id: "be5-2", status: "completed", content: "BE5.2 — eMAR setup action (EMAR_SETUP) auto-created when §9.6 MAR/eMAR required = Yes" },
  { id: "be5-3", status: "pending", content: "BE5.3 — Care plan draft create from accepted recommendations" },
  { id: "be5-4", status: "completed", content: "BE5.4 — Emergency contacts §13 ↔ profile sync (auto on validate/submit + FE sync button)" },
  { id: "be5-5", status: "completed", content: "BE5.5 — ServiceUserVisitPlan API: IA preferred times → draft slots, activate, generate ScheduledVisit (MVP)" },
  { id: "be5-6", status: "completed", content: "BE5.6 — Notify managers on submit when high risk or safeguarding" },
  { id: "be5-7", status: "completed", content: "BE5.7 — Care activation gate: evaluateCareActivation in summary + careActivationBlocked on submit" },
];

const P5_FRONTEND_TODOS: TodoItem[] = [
  { id: "fe5-1", status: "completed", content: "FE5.1 — §11: Open body map CTA when body map advised / wound present" },
  { id: "fe5-2", status: "completed", content: "FE5.2 — §9: Configure eMAR button → medication tab with setup wizard" },
  { id: "fe5-3", status: "completed", content: "FE5.3 — Care plan recommendations: Create care plan button" },
  { id: "fe5-4", status: "completed", content: "FE5.4 — Deep links from risk summary to target section (side panel § links)" },
  { id: "fe5-5", status: "completed", content: "FE5.5 — Service user header: assessment status badge on profile" },
  { id: "fe5-6", status: "completed", content: "FE5.6 — §1 preferred visit times ↔ medication-lookups rounds (same slots as MAR “at times”)" },
  { id: "fe5-7", status: "completed", content: "FE5.7 — Edit SU Visit Plan tab + IA care activation / manager review deep links" },
];

/** Visit Plan module — CQC care package / call pattern (MVP Phases VP0–VP4) */
const VISIT_PLAN_BACKEND_TODOS: TodoItem[] = [
  { id: "vp-be1", status: "completed", content: "VP-BE1 — Prisma: ServiceUserVisitPlan, VisitPlanSlot, VisitPlanAmendment + ScheduledVisit.visitPlanSlotId" },
  { id: "vp-be2", status: "completed", content: "VP-BE2 — ServiceUserVisitPlansModule: CRUD, activate/suspend/end, amendments, prefill dom-care" },
  { id: "vp-be3", status: "completed", content: "VP-BE3 — createDraftFromAssessment on manager review + approvedForCareStart" },
  { id: "vp-be4", status: "completed", content: "VP-BE4 — generateSchedule: idempotent ScheduledJob + ScheduledVisit (max 31 days)" },
  { id: "vp-be5", status: "completed", content: "VP-BE5 — Permissions seed: visit_plan.read/write/activate, scheduling.generate_from_visit_plan" },
  { id: "vp-be6", status: "pending", content: "VP-BE6 — VisitAction linkage: care plan objectives → planned tasks per slot" },
  { id: "vp-be7", status: "pending", content: "VP-BE7 — Planned vs actual exceptions + CQC assurance reporting" },
];

const VISIT_PLAN_FRONTEND_TODOS: TodoItem[] = [
  { id: "vp-fe1", status: "completed", content: "VP-FE1 — visit-plan/: types, api, hooks, ServiceUserVisitPlanTab (call pattern grid)" },
  { id: "vp-fe2", status: "completed", content: "VP-FE2 — Edit Service User tab visit-plan + query key prefetch" },
  { id: "vp-fe3", status: "completed", content: "VP-FE3 — roles.ts + types.ts visit plan permissions" },
  { id: "vp-fe4", status: "completed", content: "VP-FE4 — IA schedule/review panels → Open Visit Plan tab deep link" },
  { id: "vp-fe5", status: "completed", content: "VP-FE5 — SU dashboard visits card links to Visit Plan tab" },
  { id: "vp-fe6", status: "pending", content: "VP-FE6 — Scheduling view: highlight visits generated from visit plan slot" },
];

/** Phase 6 — Legacy migration & retire */
const P6_BACKEND_TODOS: TodoItem[] = [
  { id: "be6-1", status: "pending", content: "BE6.1 — MigrationService: ServiceUserInitialAssessment → DRAFT submission (checklist + text fields)" },
  { id: "be6-2", status: "pending", content: "BE6.2 — Map legacy catalog IDs to enterprise question IDs via metadata.legacyCatalogId" },
  { id: "be6-3", status: "pending", content: "BE6.3 — POST /service-users/:id/initial-assessment/import-legacy (one-time per SU)" },
  { id: "be6-4", status: "pending", content: "BE6.4 — Deprecate PATCH /initial-assessment: Sunset header + log usage" },
  { id: "be6-5", status: "pending", content: "BE6.5 — Return 410 Gone on legacy PATCH after migration window" },
  { id: "be6-6", status: "pending", content: "BE6.6 — Remove legacy seed as default; archive template v1" },
];

const P6_FRONTEND_TODOS: TodoItem[] = [
  { id: "fe6-1", status: "pending", content: "FE6.1 — Import legacy banner on enterprise page when legacy data exists" },
  { id: "fe6-2", status: "pending", content: "FE6.2 — Remove ServiceUserInitialAssessmentTab from Edit profile (or read-only redirect)" },
  { id: "fe6-3", status: "pending", content: "FE6.3 — Delete initial-assessment-catalog.json usage from production UI" },
  { id: "fe6-4", status: "pending", content: "FE6.4 — Redirect /initial-assessment-checklist → enterprise with query param" },
  { id: "fe6-5", status: "pending", content: "FE6.5 — Remove fetchServiceUserInitialAssessment from active paths" },
];

const SWAGGER_TODOS: TodoItem[] = [
  { id: "sw-1", status: "pending", content: "SW1 — @ApiTags Initial Assessments + Templates; document all DTOs" },
  { id: "sw-2", status: "pending", content: "SW2 — Golden examples: default template, create submission, save answers, submit" },
  { id: "sw-3", status: "pending", content: "SW3 — Document validate, risk-summary, care-plan-triggers, PDF export (as added)" },
  { id: "sw-4", status: "pending", content: "SW4 — initial-assessment-api.examples.spec.ts + openapi.contract.spec" },
  { id: "sw-5", status: "pending", content: "SW5 — openapi:export includes initial-assessment routes; CI drift check" },
];

const HOLISTIC_TODOS: TodoItem[] = [
  { id: "hol-1", status: "completed", content: "HOL1 — 18-tab holistic document nav (HOLISTIC_ASSESSMENT_TABS) replacing legacy section-only IA UX" },
  { id: "hol-2", status: "completed", content: "HOL2 — Holistic typography + HolisticSectionHeader / HolisticAssessmentTable paper layout tokens" },
  { id: "hol-3", status: "completed", content: "HOL3 — Tabs 7–16: paper worksheets (MUST, falls, moving/handling, pain, therapy, environment, ACP, EoL, clinical outcome, care plan)" },
  { id: "hol-4", status: "completed", content: "HOL4 — Tab 17: Mental Capacity Checklist → metadata.mentalCapacityChecklist" },
  { id: "hol-5", status: "completed", content: "HOL5 — Tab 18: Photography consent → metadata.photographyConsent" },
  { id: "hol-6", status: "completed", content: "HOL6 — Tab 6: Equipment selection notes → metadata.equipmentSelection (risk band, equipment, OT referral)" },
  { id: "hol-7", status: "completed", content: "HOL7 — Tab 16: Sign-off panel restored (assessor + SU agreement → InitialAssessmentAnswer autosave)" },
  { id: "hol-8", status: "completed", content: "HOL8 — submission.metadata persistence: all worksheet keys via persistMetadata PATCH on change" },
  { id: "hol-9", status: "completed", content: "HOL9 — buildHolisticTabNavStatus completion checks per paper-form kind" },
  { id: "hol-10", status: "completed", content: "HOL10 — BE fix: MCA_SCREENING_OUTCOME_OPTIONS wrapped shape in enterprise seed (TS2322)" },
  { id: "hol-11", status: "completed", content: "HOL11 — ia-holistic-metadata-autofill.ts: shared E2E metadata builder for all 18 tabs" },
  { id: "hol-12", status: "completed", content: "HOL12 — Playwright autofill: patch all worksheet keys + assertHolisticMetadataSaved after API save" },
  { id: "hol-13", status: "completed", content: "HOL13 — fill-initial-assessment.spec.ts: expect 18 nav tabs + hydrate photography/equipment panels" },
  { id: "hol-14", status: "pending", content: "HOL14 — HTML/PDF export: render new worksheet metadata (MCA checklist, photography consent, etc.)" },
  { id: "hol-15", status: "pending", content: "HOL15 — Auto-populate clinical outcome summary from Waterlow/MUST/pain scores" },
  { id: "hol-16", status: "pending", content: "HOL16 — Sync holistic worksheet answers to legacy template questions where mappings exist" },
];

const QA_TODOS: TodoItem[] = [
  { id: "qa-1", status: "pending", content: "QA1 — E2E: full initial assessment happy path (18 holistic tabs → submit → manager review)" },
  { id: "qa-2", status: "pending", content: "QA2 — E2E: consent blocked submit" },
  { id: "qa-3", status: "pending", content: "QA3 — E2E: legacy import preserves checkbox state" },
  { id: "qa-4", status: "pending", content: "QA4 — E2E: key safe excluded from PDF by default" },
  { id: "qa-5", status: "completed", content: "QA5 — Playwright: holistic 18-tab nav + API autofill saves all metadata keys" },
  { id: "qa-6", status: "pending", content: "QA6 — CQC walkthrough: produce evidence pack for mock inspection" },
  { id: "qa-7", status: "pending", content: "QA7 — Permissions matrix test: carer vs manager vs admin" },
  { id: "qa-8", status: "completed", content: "QA8 — reset-ia-demo-submission.mjs: soft-delete submissions + fresh draft for demo" },
  { id: "qa-9", status: "completed", content: "QA9 — Browser walkthrough §1 person-centred + preferred visit times (autosave + rounds lookup verified)" },
  { id: "qa-10", status: "pending", content: "QA10 — E2E/HTML+PDF export smoke: cover logo, visit times in export, PDF matches HTML" },
  { id: "qa-11", status: "completed", content: "QA11 — API autofill asserts 21+ metadata keys persisted (worksheets + mobility + footers)" },
];

const HOLISTIC_DOCUMENT_TABS: string[][] = [
  ["1", "Personal Details & Medical History", "multi-section · template answers"],
  ["2", "Practical Task", "§12 ADL + metadata.adl/transfers/practicalCare"],
  ["3", "MCA Screening Tool", "template answers §2.mca"],
  ["4", "Skin Integrity Check", "metadata.skinIntegrityCheck"],
  ["5", "Waterlow", "metadata.waterlow"],
  ["6", "Equipment Selection", "metadata.equipmentSelection"],
  ["7", "MUST", "metadata.mustAssessment"],
  ["8", "Falls Screening", "metadata.fallsScreening"],
  ["9", "Moving & Handling", "metadata.movingHandlingOperations"],
  ["10", "Pain Assessment", "metadata.painAssessment"],
  ["11", "Therapy Aide Memoire", "metadata.painAssessment.therapyAideMemoire"],
  ["12", "Environment Assessment", "metadata.environmentAssessment"],
  ["13", "Advance Care Planning", "metadata.advanceCarePlanning"],
  ["14", "End of Life Assessment", "metadata.endOfLifeAssessment"],
  ["15", "Clinical Outcome Summary", "metadata.clinicalOutcomeSummary"],
  ["16", "Care/Support Plan + Sign-off", "metadata.carePlanObjectives + §14 answers"],
  ["17", "Mental Capacity Checklist", "metadata.mentalCapacityChecklist"],
  ["18", "Photography Consent", "metadata.photographyConsent"],
];

const METADATA_STORAGE_KEYS: string[][] = [
  ["skinIntegrityCheck", "Tab 4 — body-part table", "Saved"],
  ["waterlow", "Tab 5 — pressure score", "Saved"],
  ["equipmentSelection", "Tab 6 — equipment notes", "Saved"],
  ["mustAssessment", "Tab 7 — MUST worksheet", "Saved"],
  ["fallsScreening", "Tab 8 — falls screen", "Saved"],
  ["movingHandlingOperations", "Tab 9 — risk filter + tasks", "Saved"],
  ["painAssessment", "Tabs 10–11 — NRS/Abbey + therapy", "Saved"],
  ["environmentAssessment", "Tab 12 — environment table", "Saved"],
  ["advanceCarePlanning", "Tab 13 — ACP forms", "Saved"],
  ["endOfLifeAssessment", "Tab 14 — EoL questions", "Saved"],
  ["clinicalOutcomeSummary", "Tab 15 — outcome grid", "Saved"],
  ["carePlanObjectives", "Tab 16 — visit blocks + equipment", "Saved"],
  ["mentalCapacityChecklist", "Tab 17 — 21-row checklist", "Saved"],
  ["photographyConsent", "Tab 18 — consent form", "Saved"],
  ["adl / transfers / sectionFooters", "Tabs 1–2 mobility blocks", "Saved"],
];

const PHASE_META: { id: PhaseId; label: string; spec: string }[] = [
  { id: "p0", label: "Phase 0 — Foundation (beta)", spec: "Shipped May 2026 — submission API + enterprise UI shell" },
  { id: "p1", label: "Phase 1 — Template depth", spec: "Complete — catalog, §1 polish (visit times, single-column cards, autosave fix)" },
  { id: "p2", label: "Phase 2 — Rules & actions", spec: "Complete — validation, actions, risks, v7 conditional gates" },
  { id: "p3", label: "Phase 3 — Clinical UI", spec: "Complete — Waterlow hub, ADL, §11 skin section, server-side scoring" },
  { id: "p4", label: "Phase 4 — Governance", spec: "Complete — HTML+PDF branded export, versions detail sheet, manager queue" },
  { id: "p5", label: "Phase 5 — Integrations", spec: "Mostly shipped — visit plan MVP (BE5.5), body map, med rounds; BE5.3 care plan draft pending" },
  { id: "p6", label: "Phase 6 — Legacy retire", spec: "Import · deprecate PATCH · remove catalog UI" },
];

const PHASE_TODOS: Record<PhaseId, TodoItem[]> = {
  p0: [...P0_BACKEND_TODOS, ...P0_FRONTEND_TODOS],
  p1: [...P1_BACKEND_TODOS, ...P1_FRONTEND_TODOS],
  p2: [...P2_BACKEND_TODOS, ...P2_FRONTEND_TODOS],
  p3: [...P3_BACKEND_TODOS, ...P3_FRONTEND_TODOS],
  p4: [...P4_BACKEND_TODOS, ...P4_FRONTEND_TODOS],
  p5: [...P5_BACKEND_TODOS, ...P5_FRONTEND_TODOS],
  p6: [...P6_BACKEND_TODOS, ...P6_FRONTEND_TODOS],
};

const ALL_BACKEND = [
  ...P0_BACKEND_TODOS,
  ...P1_BACKEND_TODOS,
  ...P2_BACKEND_TODOS,
  ...P3_BACKEND_TODOS,
  ...P4_BACKEND_TODOS,
  ...P5_BACKEND_TODOS,
  ...P6_BACKEND_TODOS,
];
const ALL_FRONTEND = [
  ...P0_FRONTEND_TODOS,
  ...P1_FRONTEND_TODOS,
  ...P2_FRONTEND_TODOS,
  ...P3_FRONTEND_TODOS,
  ...P4_FRONTEND_TODOS,
  ...P5_FRONTEND_TODOS,
  ...P6_FRONTEND_TODOS,
];
const VISIT_PLAN_TODOS = [...VISIT_PLAN_BACKEND_TODOS, ...VISIT_PLAN_FRONTEND_TODOS];
const ALL_TODOS = [...ALL_BACKEND, ...ALL_FRONTEND, ...HOLISTIC_TODOS, ...VISIT_PLAN_TODOS, ...SWAGGER_TODOS, ...QA_TODOS];

function countDone(todos: readonly TodoItem[]): number {
  return todos.filter(t => t.status === "completed").length;
}

function countByStatus(todos: readonly TodoItem[], status: TodoStatus): number {
  return todos.filter(t => t.status === status).length;
}

const P0_DONE = countDone(PHASE_TODOS.p0);
const P1_DONE = countDone(PHASE_TODOS.p1);
const BE_DONE = countDone(ALL_BACKEND);
const RX_DONE = countDone(ALL_FRONTEND);
const SW_DONE = countDone(SWAGGER_TODOS);
const QA_DONE = countDone(QA_TODOS);
const TOTAL_DONE = countDone(ALL_TODOS);

const HOL_DONE = countDone(HOLISTIC_TODOS);
const VP_DONE = countDone(VISIT_PLAN_TODOS);

const PROGRESS_SEGMENTS = [
  { id: "p0", value: P0_DONE, color: "green" as const },
  { id: "p1", value: P1_DONE, color: "blue" as const },
  { id: "p2", value: countDone(PHASE_TODOS.p2), color: "blue" as const },
  { id: "p3", value: countDone(PHASE_TODOS.p3), color: "purple" as const },
  { id: "p4", value: countDone(PHASE_TODOS.p4), color: "purple" as const },
  { id: "p5", value: countDone(PHASE_TODOS.p5), color: "orange" as const },
  { id: "p6", value: countDone(PHASE_TODOS.p6), color: "orange" as const },
  { id: "holistic", value: HOL_DONE, color: "green" as const },
  { id: "visit-plan", value: VP_DONE, color: "green" as const },
  { id: "swagger", value: SW_DONE, color: "orange" as const },
  { id: "qa", value: QA_DONE, color: "orange" as const },
];

const FOURTEEN_SECTIONS: string[][] = [
  ["1", "Profile & person centred", "§1.0–1.7 · admission, preferences, dignity"],
  ["2", "Consent & capacity", "§2.1–2.8 · MCA, best interest, sharing"],
  ["3", "Home, fire, environment", "§3.1–3.11 · access, flooring, pets"],
  ["4", "Physical health & vitals", "§4.1–4.10 · competent person, build"],
  ["5", "Breathing, pain, swallowing", "§5.1–5.5 · SALT, choking"],
  ["6", "Nutrition & hydration", "§6.1–6.13 · MUST, BMI"],
  ["7", "Oral health & continence", "§7.1–7.10"],
  ["8", "Communication & sensory", "§8.1–8.11"],
  ["9", "Medication safety", "§9.1–9.13 · eMAR link"],
  ["10", "Mental health & cognition", "§10.1–10.11"],
  ["11", "Skin & pressure care", "§11.1–11.13 · body map link"],
  ["12", "Mobility & ADL", "§12.1–12.14 · transfers, finance"],
  ["13", "Safeguarding & emergency", "§13.1–13.15"],
  ["14", "Review & sign-off", "§14.1–14.14 · PDF, audit"],
];

const EXISTING_PLATFORM: string[][] = [
  ["Submission API", "initial-assessments/* + templates/*", "Live — extend, do not replace"],
  ["Legacy PATCH API", "service-users/:id/initial-assessment", "Deprecate Phase 6"],
  ["Legacy UI", "initial-assessment-catalog.json (261 items)", "Migration only"],
  ["Enterprise UI", "/service-users/initial-assessment", "Live — 18 holistic paper tabs + metadata persistence + HTML/PDF export"],
  ["Spec", "canvas-types/initial-assessment-checklist.md", "2720 lines · merge index at end"],
  ["Body map spec", "canvas-types/body-map.md", "Integrate Phase 5 §11"],
  ["eMAR module", "service-user-medications/", "Integrate Phase 5 §9"],
  ["Audit logs", "features/audit/", "Extend for answer-level diff Phase 4"],
  ["Care plans", "ServiceUserCarePlanPage", "Recommendations Phase 5"],
  ["Visit Plan", "Edit SU → visit-plan tab + service-user-visit-plans/*", "MVP shipped — clinical care plan is separate"],
];

const CORE_APIS: string[][] = [
  ["GET /initial-assessment-templates/default", "14-section template + questions", "P0 done"],
  ["GET/POST /service-users/:id/initial-assessments", "List / create submission", "P0 done"],
  ["PATCH …/answers", "Batch save answers", "P0 done"],
  ["PATCH …/submit", "Lock submission", "P0 done"],
  ["PATCH …/review", "Manager review status", "P0 done"],
  ["GET …/risk-summary", "Flagged risk answers", "P0 done"],
  ["GET …/care-plan-triggers", "Flagged care plan answers", "P0 done"],
  ["POST …/validate", "Dry-run submit rules", "Done"],
  ["GET …/pdf", "Branded PDF (HTML render)", "Done"],
  ["GET …/html", "Branded HTML export + preview", "Done"],
  ["POST …/import-legacy", "Migrate legacy record", "P6"],
  ["CRUD …/actions", "Generated action register", "Done"],
  ["CRUD …/risks", "Risk matrix rows", "Done"],
  ["PATCH …/status", "Reopen / status change + reason", "Done"],
];

const REACT_ROUTES: string[][] = [
  ["Enterprise assessment", "/service-users/initial-assessment", "ServiceUserInitialAssessmentEnterprisePage", "P0"],
  ["Legacy checklist", "/service-users/initial-assessment-checklist", "InitialAssessmentChecklistPage", "P6 retire"],
  ["Assessment hub (planned)", "/service-users/:id/initial-assessments", "AssessmentList embedded or tab", "P1"],
  ["Manager queue (planned)", "/initial-assessments/review-queue", "InitialAssessmentReviewQueuePage", "P4"],
  ["From edit SU tab", "/service-users/:id/edit → assessments", "Link to hub", "P1"],
];

const DB_TABLES: string[][] = [
  ["InitialAssessmentTemplate", "Versioned checklist definition", "Exists"],
  ["InitialAssessmentSection", "14 sections per template", "Exists"],
  ["InitialAssessmentQuestion", "Fields + metadata", "Exists — expand P1"],
  ["InitialAssessmentSubmission", "Per assessment instance", "Exists"],
  ["InitialAssessmentAnswer", "Typed answer columns", "Exists"],
  ["ServiceUserInitialAssessment", "Legacy single row + JSON checklist", "Retire P6"],
  ["InitialAssessmentAction", "Generated actions", "P2 new"],
  ["InitialAssessmentRiskRecord", "Structured risk matrix", "P2 new"],
  ["InitialAssessmentAttachment", "MCA, photos, discharge docs", "P1 new"],
  ["InitialAssessmentAgencySettings", "Agency thresholds / rules", "P2 new"],
];

const ROADMAP: string[][] = [
  ["Now", "Holistic paper forms + backend metadata", "18 tabs as worksheets; all keys in submission.metadata; Playwright autofill verifies save"],
  ["Next", "Export + Phase 5 remainder", "HTML/PDF include worksheet metadata (HOL14); BE5.3 care plan draft; rota API"],
  ["Then", "Phase 6 legacy retire", "Import + remove old API/UI"],
  ["Parallel", "OpenAPI + full E2E submit path", "Swagger + QA1 happy path through all 18 tabs"],
];

const ARCHITECTURE: string[][] = [
  ["Platform", "Submission API + templates", "Extend — no third API"],
  ["Legacy", "ServiceUserInitialAssessment.checklist JSON", "Import then deprecate"],
  ["UI pattern", "Pages → hooks → TanStack Query → api/", "features/service-users/initial-assessment/"],
  ["Rules", "Server-side on submit + optional client preview", "Spec system rules in checklist.md"],
  ["Default template", "Initial Assessment — Enterprise v7", "Legacy template kept for old submissions"],
  ["Permissions", "service_users.initial_assessment.*", "create/submit/review for managers"],
  ["CQC evidence", "PDF + audit + locked submissions", "Phase 4"],
];

const CQC_MAPPING: string[][] = [
  ["Reg 9 Person-centred", "§1", "P1 UI + P2 rules"],
  ["Reg 10 Dignity", "§1.5–1.6", "P1"],
  ["Reg 11 Consent", "§2", "P2 block submit"],
  ["Reg 12 Safe care", "§3–§12 risks", "P2–P3"],
  ["Reg 13 Safeguarding", "§13", "P2–P3"],
  ["Reg 14 Nutrition", "§6", "P1 questions"],
  ["Reg 17 Records", "§14 audit, PDF", "P4"],
];

function filterTodos(todos: readonly TodoItem[], filter: TaskFilter): TodoItem[] {
  if (filter === "done") return todos.filter(t => t.status === "completed");
  if (filter === "pending") return todos.filter(t => t.status === "pending");
  if (filter === "active") {
    return todos.filter(t => t.status === "pending" || t.status === "in_progress");
  }
  return [...todos];
}

function TaskListPanel({
  todos,
  filterKey,
  title,
}: {
  todos: readonly TodoItem[];
  filterKey: string;
  title: string;
}) {
  const [filterRaw, setFilter] = useCanvasState<TaskFilter>(filterKey, "all");
  const filter: TaskFilter = filterRaw ?? "all";
  const filtered = filterTodos(todos, filter);
  const done = countByStatus(todos, "completed");
  const pending = countByStatus(todos, "pending");
  const inProgress = countByStatus(todos, "in_progress");
  return (
    <Stack gap={8}>
      <Row gap={8} wrap>
        <Pill active={filter === "all"} onClick={() => setFilter("all")}>All ({todos.length})</Pill>
        <Pill active={filter === "done"} tone="success" onClick={() => setFilter("done")}>Done ({done})</Pill>
        <Pill active={filter === "active"} tone="warning" onClick={() => setFilter("active")}>
          Active ({pending + inProgress})
        </Pill>
        <Pill active={filter === "pending"} onClick={() => setFilter("pending")}>Pending ({pending})</Pill>
      </Row>
      <TodoListCard todos={filtered} defaultExpanded />
      <Text tone="tertiary" size="small">{title} — {filtered.length} of {todos.length}</Text>
    </Stack>
  );
}

function HolisticView() {
  return (
    <Stack gap={16}>
      <Callout tone="success" title="Storage model">
        Template questions → InitialAssessmentAnswer (autosave). Paper worksheets → submission.metadata JSON (immediate
        PATCH on change). Backend shallow-merges all keys — no whitelist.
      </Callout>
      <Grid columns={3} gap={12}>
        <Stat value={`${HOL_DONE}/${HOLISTIC_TODOS.length}`} label="Holistic tasks done" tone="success" />
        <Stat value="18" label="Document tabs" />
        <Stat value="14" label="Metadata worksheet keys" />
      </Grid>
      <H3>18 holistic document tabs</H3>
      <Table headers={["Tab", "Title", "Persistence"]} rows={HOLISTIC_DOCUMENT_TABS} striped />
      <H3>metadata.* keys (backend)</H3>
      <Table headers={["Key", "Tab / scope", "Status"]} rows={METADATA_STORAGE_KEYS} striped />
      <Card>
        <CardHeader trailing={<Pill size="sm">{HOL_DONE}/{HOLISTIC_TODOS.length}</Pill>}>
          Holistic implementation tasks
        </CardHeader>
        <CardBody>
          <TaskListPanel todos={HOLISTIC_TODOS} filterKey="ia.holistic.filter" title="Holistic paper forms" />
        </CardBody>
      </Card>
    </Stack>
  );
}

function OverviewView() {
  return (
    <Stack gap={24}>
      <Grid columns={4} gap={12}>
        <Stat value={`${TOTAL_DONE}/${ALL_TODOS.length}`} label="All tasks" tone="warning" />
        <Stat value={`${BE_DONE}/${ALL_BACKEND.length}`} label="Backend" tone="warning" />
        <Stat value={`${RX_DONE}/${ALL_FRONTEND.length}`} label="Frontend" tone="warning" />
        <Stat value={`${P0_DONE}/${PHASE_TODOS.p0.length}`} label="Phase 0 (beta)" tone="success" />
      </Grid>
      <UsageBar
        total={ALL_TODOS.length}
        topLeftLabel="Initial Assessment enterprise implementation"
        topRightLabel={`${TOTAL_DONE} / ${ALL_TODOS.length} tasks`}
        segments={PROGRESS_SEGMENTS}
      />
      <Callout tone="success" title="Latest shipped (May 2026)">
        Service User Visit Plan MVP — Prisma models, Nest CRUD + rota generation, Edit SU Visit Plan tab, IA approval →
        draft plan, dashboard deep links · BE5.5 rota integration complete · 18 holistic paper-form tabs with metadata
        persistence · Playwright autofill + ia-holistic-metadata-autofill.ts.
      </Callout>
      <Callout tone="info" title="Still pending">
        HTML/PDF export of new worksheet metadata (HOL14) · Clinical outcome auto-fill from scores · Legacy question sync ·
        BE5.3 care plan draft · VP-BE6/7 task linkage + assurance · Phase 6 legacy retire · OpenAPI (SW*) · full submit E2E (QA1, QA10).
      </Callout>
      <Grid columns={4} gap={12}>
        <Stat value={`${HOL_DONE}/${HOLISTIC_TODOS.length}`} label="Holistic paper forms" tone="success" />
        <Stat value={`${VP_DONE}/${VISIT_PLAN_TODOS.length}`} label="Visit Plan MVP" tone="success" />
        <Stat value="18" label="Document tabs" />
        <Stat value={`${QA_DONE}/${QA_TODOS.length}`} label="QA tasks" />
      </Grid>
      <Grid columns={3} gap={12}>
        <Stat value={`${P1_DONE}/${PHASE_TODOS.p1.length}`} label="Phase 1 — Template" />
        <Stat value={`${countDone(PHASE_TODOS.p2)}/${PHASE_TODOS.p2.length}`} label="Phase 2 — Rules" />
        <Stat value={`${countDone(PHASE_TODOS.p4)}/${PHASE_TODOS.p4.length}`} label="Phase 4 — Governance" />
      </Grid>
      <H3>14 main sections (spec)</H3>
      <Table headers={["§", "Domain", "Scope"]} rows={FOURTEEN_SECTIONS} striped />
      <H3>Existing platform</H3>
      <Table headers={["Asset", "Location", "Notes"]} rows={EXISTING_PLATFORM} striped />
      <H3>CQC regulation mapping (target)</H3>
      <Table headers={["Regulation", "Spec sections", "Phase"]} rows={CQC_MAPPING} striped />
    </Stack>
  );
}

function PhasesView() {
  const [activePhaseRaw, setActivePhase] = useCanvasState<PhaseId>("ia.phases.active", "p1");
  const activePhase: PhaseId = activePhaseRaw ?? "p1";
  const meta = PHASE_META.find(p => p.id === activePhase) ?? PHASE_META[1];
  const todos = PHASE_TODOS[activePhase] ?? [];
  const beTodos = todos.filter(t => t.id.startsWith("be"));
  const feTodos = todos.filter(t => t.id.startsWith("fe"));
  const done = countDone(todos);
  return (
    <Stack gap={16}>
      <Row gap={8} wrap>
        {PHASE_META.map(p => (
          <Pill
            key={p.id}
            active={activePhase === p.id}
            tone={p.id === "p0" && done === todos.length ? "success" : undefined}
            onClick={() => setActivePhase(p.id)}
          >
            {p.label.split("—")[0].trim()}
          </Pill>
        ))}
      </Row>
      <Callout tone="info" title={meta.label}>
        {meta.spec}
      </Callout>
      <Card>
        <CardHeader trailing={<Pill size="sm">{done}/{todos.length}</Pill>}>
          {meta.label} — all tasks
        </CardHeader>
        <CardBody>
          <TaskListPanel todos={todos} filterKey={`ia.phases.${activePhase}.filter`} title={meta.label} />
        </CardBody>
      </Card>
      {beTodos.length > 0 && (
        <Card>
          <CardHeader trailing={<Pill size="sm">{countDone(beTodos)}/{beTodos.length}</Pill>}>Backend only</CardHeader>
          <CardBody>
            <TodoListCard todos={beTodos} defaultExpanded={activePhase !== "p0"} />
          </CardBody>
        </Card>
      )}
      {feTodos.length > 0 && (
        <Card>
          <CardHeader trailing={<Pill size="sm">{countDone(feTodos)}/{feTodos.length}</Pill>}>Frontend only</CardHeader>
          <CardBody>
            <TodoListCard todos={feTodos} defaultExpanded={activePhase !== "p0"} />
          </CardBody>
        </Card>
      )}
    </Stack>
  );
}

function TracksShell({
  active,
  onSelect,
  children,
}: {
  active: TrackFilter;
  onSelect: (t: TrackFilter) => void;
  children: React.ReactNode;
}) {
  const tracks = [
    { id: "backend" as const, label: "Backend", done: BE_DONE, total: ALL_BACKEND.length },
    { id: "frontend" as const, label: "Frontend", done: RX_DONE, total: ALL_FRONTEND.length },
    { id: "swagger" as const, label: "OpenAPI", done: SW_DONE, total: SWAGGER_TODOS.length },
    { id: "qa" as const, label: "QA", done: QA_DONE, total: QA_TODOS.length },
  ];
  return (
    <Stack gap={16}>
      <Row gap={8} wrap>
        <Pill active={active === "all"} onClick={() => onSelect("all")}>All · {TOTAL_DONE}/{ALL_TODOS.length}</Pill>
        {tracks.map(t => (
          <Pill
            key={t.id}
            active={active === t.id}
            tone={t.done === t.total ? "success" : "warning"}
            onClick={() => onSelect(t.id)}
          >
            {t.label} · {t.done}/{t.total}
          </Pill>
        ))}
      </Row>
      {children}
    </Stack>
  );
}

function BackendView() {
  const [track, setTrack] = useCanvasState<TrackFilter>("ia.backend.track", "backend");
  const t: TrackFilter = track ?? "backend";
  if (t === "swagger") {
    return (
      <TracksShell active={t} onSelect={setTrack}>
        <TaskListPanel todos={SWAGGER_TODOS} filterKey="ia.swagger.filter" title="OpenAPI / contract" />
      </TracksShell>
    );
  }
  if (t === "qa") {
    return (
      <TracksShell active={t} onSelect={setTrack}>
        <TaskListPanel todos={QA_TODOS} filterKey="ia.qa.filter" title="QA & E2E" />
      </TracksShell>
    );
  }
  return (
    <TracksShell active={t} onSelect={setTrack}>
      <H2>Backend by phase</H2>
      {(["p0", "p1", "p2", "p3", "p4", "p5", "p6"] as PhaseId[]).map(pid => {
        const beTodos = PHASE_TODOS[pid].filter(item => item.id.startsWith("be"));
        if (beTodos.length === 0) return null;
        const label = PHASE_META.find(p => p.id === pid)?.label ?? pid;
        return (
          <Card key={pid}>
            <CardHeader trailing={<Pill size="sm">{countDone(beTodos)}/{beTodos.length}</Pill>}>
              {label}
            </CardHeader>
            <CardBody>
              <TodoListCard todos={beTodos} defaultExpanded={pid === "p1"} />
            </CardBody>
          </Card>
        );
      })}
    </TracksShell>
  );
}

function FrontendView() {
  const [track, setTrack] = useCanvasState<TrackFilter>("ia.frontend.track", "frontend");
  const t: TrackFilter = track ?? "frontend";
  if (t === "swagger" || t === "qa") {
    return <BackendView />;
  }
  return (
    <TracksShell active={t} onSelect={setTrack}>
      <H2>Frontend by phase</H2>
      {(["p0", "p1", "p2", "p3", "p4", "p5", "p6"] as PhaseId[]).map(pid => {
        const feTodos = PHASE_TODOS[pid].filter(item => item.id.startsWith("fe"));
        if (feTodos.length === 0) return null;
        const label = PHASE_META.find(p => p.id === pid)?.label ?? pid;
        return (
          <Card key={pid}>
            <CardHeader trailing={<Pill size="sm">{countDone(feTodos)}/{feTodos.length}</Pill>}>
              {label}
            </CardHeader>
            <CardBody>
              <TodoListCard todos={feTodos} defaultExpanded={pid === "p1"} />
            </CardBody>
          </Card>
        );
      })}
      <H3>Planned routes</H3>
      <Table headers={["Screen", "Route", "Component", "Phase"]} rows={REACT_ROUTES} striped />
    </TracksShell>
  );
}

function DatabaseView() {
  return (
    <Stack gap={16}>
      <Callout tone="info" title="Schema: service_users">
        Extend existing initial assessment tables; add action/risk/attachment tables in P1–P2.
      </Callout>
      <Table headers={["Table", "Purpose", "Phase"]} rows={DB_TABLES} striped />
    </Stack>
  );
}

function ApiView() {
  return (
    <Stack gap={16}>
      <Table headers={["Endpoint", "Purpose", "Phase"]} rows={CORE_APIS} striped />
      <H3>Legacy (deprecate P6)</H3>
      <Table
        headers={["Endpoint", "Status"]}
        rows={[
          ["GET/PATCH /service-users/:id/initial-assessment", "Legacy — import then 410"],
          ["POST …/initial-assessment/picture", "Move to submission attachments P1"],
        ]}
        striped
      />
    </Stack>
  );
}

function MigrationView() {
  return (
    <Stack gap={16}>
      <Callout tone="warning" title="Legacy → enterprise mapping">
        See Legacy Checklist Merge Index in canvas-types/initial-assessment-checklist.md. Phase 6 tasks BE6.x / FE6.x.
      </Callout>
      <TaskListPanel todos={[...P6_BACKEND_TODOS, ...P6_FRONTEND_TODOS]} filterKey="ia.migration.filter" title="Phase 6 migration" />
      <H3>Field mapping (summary)</H3>
      <Table
        headers={["Legacy", "Enterprise target"]}
        rows={[
          ["checklist JSON (261 keys)", "InitialAssessmentAnswer per questionId"],
          ["reasonForAdmission, etc.", "§1.0 questions"],
          ["doorCode", "§1.0 + §3.4/3.5 secure fields"],
          ["culturalReligiousNotes", "§1.6 question"],
          ["environmentAccessHazardsNotes", "§3.10 question"],
        ]}
        striped
      />
    </Stack>
  );
}

function IntegrationsView() {
  return (
    <Stack gap={16}>
      <TaskListPanel todos={[...P5_BACKEND_TODOS, ...P5_FRONTEND_TODOS]} filterKey="ia.integrations.filter" title="Phase 5" />
      <Card>
        <CardHeader trailing={<Pill size="sm" tone="success">{VP_DONE}/{VISIT_PLAN_TODOS.length}</Pill>}>
          Visit Plan module (CQC care package)
        </CardHeader>
        <CardBody>
          <TaskListPanel todos={VISIT_PLAN_TODOS} filterKey="ia.visit-plan.filter" title="Visit Plan MVP" />
        </CardBody>
      </Card>
      <H3>Integration map</H3>
      <Table
        headers={["Module", "Trigger", "Phase"]}
        rows={[
          ["body-map.md", "§11 wound/pressure → open body map", "P5"],
          ["medications / eMAR", "§9 MAR required → setup wizard", "P5"],
          ["care plans", "Accepted recommendations → draft plan", "P5"],
          ["service user contacts", "§13 emergency contacts", "P5"],
          ["notifications", "Submit/review alerts", "P5"],
          ["care package / visit plan", "Manager approves care start → draft visit plan → activate → generate rota", "P5 ✓"],
          ["scheduling", "POST …/generate-schedule → ScheduledVisit per slot/day", "VP4 ✓"],
        ]}
        striped
      />
      <H3>Visit Plan APIs</H3>
      <Table
        headers={["Endpoint", "Purpose", "Status"]}
        rows={[
          ["GET/POST /service-users/:id/visit-plans", "List / create draft plan", "Done"],
          ["POST …/from-assessment/:submissionId", "Prefill from IA preferred times", "Done"],
          ["PATCH …/:planId + activate/suspend/end", "Amend + lifecycle", "Done"],
          ["POST …/prefill-dom-care", "Copy DOM Care shift pattern", "Done"],
          ["POST …/generate-schedule", "Idempotent rota generation (≤31 days)", "Done"],
        ]}
        striped
      />
    </Stack>
  );
}

function RoadmapView() {
  return (
    <Stack gap={16}>
      <Table headers={["Priority", "Milestone", "Notes"]} rows={ROADMAP} striped />
      <H3>Architecture decisions</H3>
      <Table headers={["Topic", "Decision"]} rows={ARCHITECTURE} striped />
      <H3>Parallel tracks</H3>
      <Row gap={8} wrap>
        <TodoListCard todos={SWAGGER_TODOS} />
        <TodoListCard todos={QA_TODOS} />
      </Row>
    </Stack>
  );
}

export default function InitialAssessmentEnterprisePlan() {
  const [viewRaw, setView] = useCanvasState<View>("ia.view", "overview");
  const view: View = viewRaw ?? "overview";
  const VIEWS: { id: View; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "holistic", label: "Holistic tabs" },
    { id: "phases", label: "Phases & tasks" },
    { id: "backend", label: "Backend" },
    { id: "frontend", label: "Frontend" },
    { id: "database", label: "Database" },
    { id: "api", label: "APIs" },
    { id: "migration", label: "Migration" },
    { id: "integrations", label: "Integrations" },
    { id: "roadmap", label: "Roadmap" },
  ];
  return (
    <Stack gap={24} style={{ maxWidth: 920, margin: "0 auto", padding: "24px 20px 48px" }}>
      <Stack gap={4}>
        <H1>Initial Assessment — Enterprise Plan</H1>
        <Text tone="secondary">
          14 enterprise sections · 18 holistic document tabs · Spec: canvas-types/initial-assessment-checklist.md ·{" "}
          {TOTAL_DONE}/{ALL_TODOS.length} tasks · Jun 2026
        </Text>
      </Stack>
      <Row gap={8} wrap>
        {VIEWS.map(v => (
          <Pill key={v.id} active={view === v.id} onClick={() => setView(v.id)}>
            {v.label}
          </Pill>
        ))}
      </Row>
      <Divider />
      {view === "overview" && <OverviewView />}
      {view === "holistic" && <HolisticView />}
      {view === "phases" && <PhasesView />}
      {view === "backend" && <BackendView />}
      {view === "frontend" && <FrontendView />}
      {view === "database" && <DatabaseView />}
      {view === "api" && <ApiView />}
      {view === "migration" && <MigrationView />}
      {view === "integrations" && <IntegrationsView />}
      {view === "roadmap" && <RoadmapView />}
      <Text tone="tertiary" size="small">
        Backend {BE_DONE}/{ALL_BACKEND.length} · Frontend {RX_DONE}/{ALL_FRONTEND.length} · OpenAPI {SW_DONE}/
        {SWAGGER_TODOS.length} · QA {QA_DONE}/{QA_TODOS.length} — Tick tasks in canvas to persist progress
      </Text>
    </Stack>
  );
}
