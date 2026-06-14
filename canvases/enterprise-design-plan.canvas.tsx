import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
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

type View = "overview" | "structure" | "patterns" | "phases" | "roadmap" | "medication" | "audit" | "blister";

const FOUNDATION_DONE = 32;
const NEXT_PHASE_TOTAL = 24;
const NEXT_PHASE_DONE = 24;
const FOLLOW_ON_TOTAL = 10;
const FOLLOW_ON_DONE = 10;
/** Phase 9 — three delivery tracks (spec: canvases/medication.md §28) */
const MED_PROTOTYPE_DONE = 22;
const MED_PROTOTYPE_TOTAL = 22;
const MED_BACKEND_DONE = 17;
const MED_BACKEND_TOTAL = 17;
const MED_REACT_DONE = 16;
const MED_REACT_IN_PROGRESS = 0;
const MED_REACT_TOTAL = 20;
/** Track D — OpenAPI / Swagger enterprise maturity (medication.md §16.7) */
const MED_SWAGGER_DONE = 9;
const MED_SWAGGER_TOTAL = 9;
const MEDICATION_DONE = MED_PROTOTYPE_DONE + MED_BACKEND_DONE + MED_REACT_DONE + MED_SWAGGER_DONE;
const MEDICATION_TOTAL = MED_PROTOTYPE_TOTAL + MED_BACKEND_TOTAL + MED_REACT_TOTAL + MED_SWAGGER_TOTAL;
/** Audit log enterprise — May 2026 */
const AUDIT_BACKEND_DONE = 10;
const AUDIT_BACKEND_TOTAL = 10;
const AUDIT_REACT_DONE = 8;
const AUDIT_REACT_TOTAL = 8;
const AUDIT_DONE = AUDIT_BACKEND_DONE + AUDIT_REACT_DONE;
const AUDIT_TOTAL = AUDIT_BACKEND_TOTAL + AUDIT_REACT_TOTAL;
/** Phase 10 — Blister pack / MCA overlay (medication.md §35) — E0 prototype shipped in HTML */
const BLISTER_DESIGN_DONE = 3;
const BLISTER_DESIGN_TOTAL = 9;
const BLISTER_PROTO_DONE = 17;
const BLISTER_PROTO_TOTAL = 20;
const BLISTER_BACKEND_DONE = 11;
const BLISTER_BACKEND_TOTAL = 14;
const BLISTER_REACT_DONE = 8;
const BLISTER_REACT_TOTAL = 14;
const BLISTER_SWAGGER_DONE = 4;
const BLISTER_SWAGGER_TOTAL = 4;
const BLISTER_QA_DONE = 0;
const BLISTER_QA_TOTAL = 4;
const BLISTER_DONE =
  BLISTER_DESIGN_DONE + BLISTER_PROTO_DONE + BLISTER_BACKEND_DONE +
  BLISTER_REACT_DONE + BLISTER_SWAGGER_DONE + BLISTER_QA_DONE;
const BLISTER_TOTAL =
  BLISTER_DESIGN_TOTAL + BLISTER_PROTO_TOTAL + BLISTER_BACKEND_TOTAL +
  BLISTER_REACT_TOTAL + BLISTER_SWAGGER_TOTAL + BLISTER_QA_TOTAL;
const ALL_TASKS = FOUNDATION_DONE + NEXT_PHASE_TOTAL;
const ALL_WITH_FOLLOW_ON = ALL_TASKS + FOLLOW_ON_TOTAL + MEDICATION_TOTAL + AUDIT_TOTAL + BLISTER_TOTAL;

const PROGRESS_SEGMENTS = [
  { id: "p1-p4", value: FOUNDATION_DONE, color: "green" as const },
  { id: "p5-p7", value: NEXT_PHASE_DONE, color: "blue" as const },
  { id: "p8", value: FOLLOW_ON_DONE, color: "orange" as const },
  { id: "p9-proto", value: MED_PROTOTYPE_DONE, color: "green" as const },
  { id: "p9-be", value: MED_BACKEND_DONE, color: "blue" as const },
  { id: "p9-react", value: MED_REACT_DONE, color: "purple" as const },
  { id: "p9-swagger", value: MED_SWAGGER_DONE, color: "orange" as const },
  { id: "audit", value: AUDIT_DONE, color: "blue" as const },
  { id: "blister", value: BLISTER_DONE, color: "orange" as const },
];

const STRUCTURE_GAP: string[][] = [
  ["Verification", "Playwright audit-all-routes locally", "Optional — tsc, lint, and build pass post-ship; e2e not run"],
  ["Global stores", "useCompanyStore loads branding via api", "Acceptable — app-shell bootstrap, not page UI"],
  ["Presentational", "src/components/layout + observations forms", "Acceptable — types from barrels; no domain API calls"],
  ["Local UI loading", "LoginPage auth submit", "Acceptable — auth store mutation, not page fetch"],
];

const QUERY_MIGRATION: string[][] = [
  ["Service users — pages", "useQuery/useMutation hooks + route loaders", "Done"],
  ["Service users — tab components", "useServiceUserTabs + mutations", "Done"],
  ["Employees — pages", "useEmployees, useEmployee, mutations incl. AddEmployeePage", "Done"],
  ["Employees — edit panels", "useEmployeeTabs + skill/non-core/compliance hooks", "Done"],
  ["Scheduling — pages", "useScheduling + useSchedulingMutations on all 6 pages", "Done"],
  ["Settings — pages", "Moved to features; general + company have hooks", "Done"],
  ["Settings — panels", "GeneralSettings*, LookupName, ComplianceTypes → hooks", "Done"],
  ["Settings — location management", "useLocationManagement on all 3 panels", "Done"],
  ["Care pathway", "useCarePathwayTabs + useCarePathwayMutations on all tabs", "Done"],
  ["Service users — medication", "MAR/supply/events hooks + medication-mar.api + settings admin", "Done — 6 tabs on /medication"],
  ["Auth / account / admin / home", "Pages thin; account uses useMe + useLoginHistory", "Done"],
  ["Admin — audit log", "features/audit + AuditLogPage (event type, IP, dates, enriched rows)", "Done — May 2026"],
  ["API modules", "All backend API files under features/*/api/", "Done"],
  ["Types barrels", "settings, employees, service-users, care-pathway, auth — UI + defaults", "Done"],
  ["Route prefetch", "app/prefetch-routes.ts + tab-aware loaders", "Done"],
];

const FOUNDATION_PHASES = [
  { id: "p1", label: "Phase 1 — Global data layer", tone: "success" as const, duration: "Complete" },
  { id: "p2", label: "Phase 2 — Feature consolidation", tone: "success" as const, duration: "Complete" },
  { id: "p3", label: "Phase 3 — Delete dead code", tone: "success" as const, duration: "Complete" },
  { id: "p4", label: "Phase 4 — Dev environment", tone: "success" as const, duration: "Complete" },
];

const NEXT_PHASES = [
  { id: "p5", label: "Phase 5 — Remaining consolidation", tone: "success" as const, duration: "Complete" },
  { id: "p6", label: "Phase 6 — Query layer completion", tone: "success" as const, duration: "Complete" },
  { id: "p7", label: "Phase 7 — Cleanup & enforcement", tone: "success" as const, duration: "Complete" },
  { id: "p8", label: "Phase 8 — Component depth & verify", tone: "success" as const, duration: "Complete" },
  { id: "p9", label: "Phase 9 — Medication Records (eMAR)", tone: "success" as const, duration: `Proto ${MED_PROTOTYPE_DONE}/${MED_PROTOTYPE_TOTAL} · BE ${MED_BACKEND_DONE}/${MED_BACKEND_TOTAL} · RX ${MED_REACT_DONE}/${MED_REACT_TOTAL} · API docs ${MED_SWAGGER_DONE}/${MED_SWAGGER_TOTAL}` },
];

const ALL_PHASES = [...FOUNDATION_PHASES, ...NEXT_PHASES];

const PHASE_TODOS: Record<string, TodoItem[]> = {
  p1: [
    { id: "p1-1", status: "completed", content: "apiJson — AbortError re-thrown correctly, 401 retry with deduped refresh" },
    { id: "p1-2", status: "completed", content: "SessionRefresh — visibilitychange + online + expired token refresh" },
    { id: "p1-3", status: "completed", content: "src/app/query-client.ts — QueryClient singleton" },
    { id: "p1-4", status: "completed", content: "src/features/service-users/keys.ts — typed query key factory" },
    { id: "p1-5", status: "completed", content: "src/features/employees/keys.ts — typed query key factory" },
    { id: "p1-6", status: "completed", content: "apiJson forwards AbortSignal from Query queryFn({ signal })" },
    { id: "p1-7", status: "completed", content: "Route loaders: serviceUsersRoute → prefetchQuery(list + lookups)" },
    { id: "p1-8", status: "completed", content: "Route loaders: detail/medication/care-plan/observations/edit → prefetch" },
  ],
  p2: [
    { id: "p2-1", status: "completed", content: "features/service-users/api.ts — moved from lib/" },
    { id: "p2-2", status: "completed", content: "features/service-users/hooks/ — query hooks created" },
    { id: "p2-3", status: "completed", content: "Move ServiceUsers pages → features/service-users/pages/" },
    { id: "p2-4", status: "completed", content: "Move service-user components → features/service-users/components/" },
    { id: "p2-5", status: "completed", content: "features/employees/api.ts — moved from lib/" },
    { id: "p2-6", status: "completed", content: "features/employees/hooks/ — useEmployees created" },
    { id: "p2-7", status: "completed", content: "Move Employee pages → features/employees/pages/" },
    { id: "p2-8", status: "completed", content: "Move employee components → features/employees/components/" },
    { id: "p2-9", status: "completed", content: "Consolidate auth → features/auth/" },
    { id: "p2-10", status: "completed", content: "Move scheduling pages → features/scheduling/pages/" },
    { id: "p2-11", status: "completed", content: "Move components/ui/ → shared/ui/" },
    { id: "p2-12", status: "completed", content: "shared/api/api-client.ts is canonical HTTP entry point" },
  ],
  p3: [
    { id: "p3-1", status: "completed", content: "Deleted use-latest-async.ts and backward-compat shims" },
    { id: "p3-2", status: "completed", content: "isAbortError only in api-client, query-client, http-client" },
    { id: "p3-3", status: "completed", content: "Migrated SU pages use Query hooks" },
    { id: "p3-4", status: "completed", content: "Removed ensureAuthHydrated() from apiJson" },
    { id: "p3-5", status: "completed", content: "Deleted lib/ domain API shims" },
    { id: "p3-6", status: "completed", content: "Moved utils, toast, media-url → shared/lib/" },
  ],
  p4: [
    { id: "p4-1", status: "completed", content: "Backend CORS maxAge: 600" },
    { id: "p4-2", status: "completed", content: "Vite proxy /api → localhost:3000" },
    { id: "p4-3", status: "completed", content: "Backend JWT_ACCESS_TOKEN_EXPIRES_IN=60m in dev" },
    { id: "p4-4", status: "completed", content: "@tanstack/react-query-devtools" },
    { id: "p4-5", status: "completed", content: "TypeScript noUncheckedIndexedAccess: true" },
    { id: "p4-6", status: "completed", content: "ESLint flat config — apiJson blocked in pages" },
  ],
  p5: [
    { id: "p5-1", status: "completed", content: "Move auth pages → features/auth/pages/" },
    { id: "p5-2", status: "completed", content: "Co-locate auth api + store" },
    { id: "p5-3", status: "completed", content: "Move settings pages → features/settings/pages/" },
    { id: "p5-4", status: "completed", content: "Move settings APIs → features/settings/api/" },
    { id: "p5-5", status: "completed", content: "Move admin pages → features/admin/pages/" },
    { id: "p5-6", status: "completed", content: "Move accidents pages → features/accidents/pages/" },
    { id: "p5-7", status: "completed", content: "Move HomePage, CalendarPage, CarePathwayPage to features" },
    { id: "p5-8", status: "completed", content: "Co-locate observations-api → service-users/observations/" },
    { id: "p5-9", status: "completed", content: "Co-locate employee-compliance-api → employees/" },
    { id: "p5-10", status: "completed", content: "Update router.tsx — 106 import sites updated" },
  ],
  p6: [
    { id: "p6-1", status: "completed", content: "Extract types.ts from service-users and employees api" },
    { id: "p6-2", status: "completed", content: "Add useEmployee, useEmployeeLookups, useEmployeeChartSummary" },
    { id: "p6-3", status: "completed", content: "Add scheduling/keys.ts + useScheduling hooks" },
    { id: "p6-4", status: "completed", content: "Migrate AddServiceUserPage to useMutation" },
    { id: "p6-5", status: "completed", content: "Migrate GeneralEmployeeDocumentsPage to hooks" },
    { id: "p6-6", status: "completed", content: "Add useCreateServiceUser, useUpdateServiceUser, useDeleteServiceUser" },
    { id: "p6-7", status: "completed", content: "Add useCreateEmployee, usePatchPersonalDetails, usePatchEmployeeStatus" },
    { id: "p6-8", status: "completed", content: "Add settings/keys.ts + useGeneralSettings hooks" },
    { id: "p6-9", status: "completed", content: "Route loaders for employee, settings, scheduling routes" },
  ],
  p7: [
    { id: "p7-1", status: "completed", content: "Delete src/lib/ domain files" },
    { id: "p7-2", status: "completed", content: "Delete src/components/pages/" },
    { id: "p7-3", status: "completed", content: "Expand ESLint — block api.ts imports in pages" },
    { id: "p7-4", status: "completed", content: "Expand ESLint — warn on setLoading in pages" },
    { id: "p7-5", status: "completed", content: "E2E audit — audit-all-routes.spec.ts" },
  ],
  p8: [
    { id: "p8-1", status: "completed", content: "Migrate AddEmployeePage to feature hooks (ESLint override removed)" },
    { id: "p8-2", status: "completed", content: "Migrate service-user tab components to hooks (Documents, Allergies, AboutMe, Contacts, DomCare, LiveIn, Inventory…)" },
    { id: "p8-3", status: "completed", content: "Migrate employee edit panels to hooks (Skills, NonCore, EditSkills, EditNonCore)" },
    { id: "p8-4", status: "completed", content: "Settings panels — Query hooks for dom care, alerts, privacy, incident, pre-assessment, lookups admin" },
    { id: "p8-5", status: "completed", content: "Route loaders for admin, accidents, care-pathway settings routes" },
    { id: "p8-6", status: "completed", content: "Extend ESLint api.ts ban to feature components; care-pathway tabs migrated, exemption removed" },
    { id: "p8-7", status: "completed", content: "Local verification — npx tsc --noEmit, npm run lint, npm run build" },
    { id: "p8-8", status: "completed", content: "Shipped Phase 8 — careflow-platform (7485cf8…a0ba9e5), careflow-admin (0cef98d…252520f), careflow-api (861cfa3)" },
    { id: "p8-9", status: "completed", content: "Route prefetch centralization + care-plan cache keys — platform be89e91, admin 619afd2" },
    { id: "p8-10", status: "completed", content: "API normalization + types barrels — platform c5f8d4b, admin 6806d3f (HEAD on main, May 2026)" },
  ],
  p9: [], // populated from MED_TODOS below
};

/** Track A — HTML UX contract (careflow-medication-records.html) */
const MED_PROTOTYPE_TODOS: TodoItem[] = [
  { id: "proto-a1", status: "completed", content: "A — Primary tabs: MAR Calendar + Supply & cycles" },
  { id: "proto-a2", status: "completed", content: "A — Sticky medication / time / day header grid" },
  { id: "proto-a3", status: "completed", content: "A — Collapsible filter bar (status, schedule type, cell type)" },
  { id: "proto-a4", status: "completed", content: "A — Legend popover (schedule + 15 status codes, fixed position)" },
  { id: "proto-b1", status: "completed", content: "B — Medication group collapse" },
  { id: "proto-b2", status: "completed", content: "B — Go to today (scroll to current day column)" },
  { id: "proto-c1", status: "completed", content: "C — KPI strip: Due / Recorded / Missed / Review today" },
  { id: "proto-c2", status: "completed", content: "C — Month | Week view toggle" },
  { id: "proto-c3", status: "completed", content: "C — Collapsible month stats + compliance %" },
  { id: "proto-d1", status: "completed", content: "Core — Cell states: Due, N/A, PRN (+), recorded codes, Pending (…)" },
  { id: "proto-d2", status: "completed", content: "Core — 15 STATUS_CODES (14 recordable); conditional reason + manager review flags" },
  { id: "proto-d3", status: "completed", content: "Core — Record modal: status grid, admin vs on-behalf (enteredBy)" },
  { id: "proto-d4", status: "completed", content: "Core — PRN log modal (dose, reason, outcome)" },
  { id: "proto-d5", status: "completed", content: "Core — Log Delivery modal (MarDelivery) — separate from administration" },
  { id: "proto-d6", status: "completed", content: "Core — Supply models: blister_cycle, bottle_28day, prescription_qty (SUPPLY_MEDS)" },
  { id: "proto-d7", status: "completed", content: "Core — Record drawer: detail, cycle context, audit trail, review CTA" },
  { id: "proto-d8", status: "completed", content: "Core — Correction modal (mandatory notes, audit preserved)" },
  { id: "proto-d9", status: "completed", content: "Core — List view + status/PRN filters" },
  { id: "proto-d10", status: "completed", content: "Core — Manager reviews page" },
  { id: "proto-d11", status: "completed", content: "Core — Settings page (status codes + time slots)" },
  { id: "proto-d12", status: "completed", content: "Core — Export MAR page (options + preview placeholder)" },
];

/** Track B — Backend & data (medication.md §28 Track B) */
const MED_BACKEND_TODOS: TodoItem[] = [
  { id: "be-1", status: "completed", content: "B1 — MedicationStatusCode table + seed 15 codes (§6)" },
  { id: "be-2", status: "completed", content: "B1 — GET /medication-status-codes + lookups bundle" },
  { id: "be-3", status: "completed", content: "B2 — Service user medications CRUD (packs, schedules)" },
  { id: "be-4", status: "completed", content: "B2 — medication-events POST/GET + chart/regular + chart/prn APIs" },
  { id: "be-5", status: "completed", content: "B2 — medication-support-profile API" },
  { id: "be-6", status: "completed", content: "B1 — Time slots §5: Morning–Night + window start/end; GET/PATCH /medication-administration-rounds" },
  { id: "be-7", status: "completed", content: "B1 — POST medication-events accepts statusCode (G/R/N…) + maps to enum" },
  { id: "be-8", status: "completed", content: "B2 — medication_supply_profiles table (§8.9) + auto-create on delivery" },
  { id: "be-9", status: "completed", content: "B5 — medication_supply_deliveries + GET bundle + POST deliveries API" },
  { id: "be-10", status: "completed", content: "B3 — POST …/medication-schedule-preview — due slot count for proposed schedules" },
  { id: "be-11", status: "completed", content: "B3 — Chart API: due | na | prn | recorded + PRN rows + legend + summary + monthStats" },
  { id: "be-12", status: "completed", content: "B4 — PATCH corrections + on-behalf (enteredById); POST …/review; needsReview filter" },
  { id: "be-13", status: "completed", content: "B4 — Event snapshots (med name, dose, strength, route) at record time" },
  { id: "be-14", status: "completed", content: "B4 — Chart cells return { code, label, color, textColor, cellState } (§17)" },
  { id: "be-15", status: "completed", content: "B5 — GET …/medication-chart/regular/export (HTML/PDF/CSV/Excel + preview=true)" },
  { id: "be-16", status: "completed", content: "B6 — MAR completion metrics (monthStats to-date) + export meta alignment" },
  { id: "be-17", status: "completed", content: "B7 — MAR export blister layout: packExportDetail=summary|full (HTML/PDF/CSV/Excel parity)" },
];

/** Track D — OpenAPI / Swagger (enterprise API docs — medication.md §16.7) */
const MED_SWAGGER_TODOS: TodoItem[] = [
  { id: "sw-1", status: "completed", content: "Swagger — 14 tags, 59 routes, @ApiMedicationStandardResponses (400/401/403/404)" },
  { id: "sw-2", status: "completed", content: "Swagger — Per-module response DTOs (chart, events, supply, schedules, …)" },
  { id: "sw-3", status: "completed", content: "Docs — medication.md §16.7 + README Swagger section · live /api/docs" },
  { id: "sw-4", status: "completed", content: "Golden examples — GET regular MAR, POST event, GET supply (full { success, message, data, meta })" },
  { id: "sw-5", status: "completed", content: "Golden examples — GET events list + 400/404 error examples on standard decorator" },
  { id: "sw-6", status: "completed", content: "Tighten weak schemas — report row DTOs + nested event medication/schedule/person" },
  { id: "sw-7", status: "completed", content: "openapi:export → careadmin-backend/openapi/openapi.json (pnpm run openapi:export)" },
  { id: "sw-8", status: "completed", content: "Contract tests — medication-api.examples.spec + medication-openapi.contract.spec" },
  { id: "sw-9", status: "completed", content: "CI — run openapi:export on PR/build; fail if openapi/openapi.json drifts (commit artifact or diff check)" },
];

/** Track C — care-admin React (medication.md §28 Track C / Phase D) */
const MED_REACT_TODOS: TodoItem[] = [
  { id: "rx-0", status: "completed", content: "D0 — ServiceUserMedicationPage + AddMedicationDialog (regular + blister) + useServiceUserMedicationMutations" },
  { id: "rx-1", status: "completed", content: "D0 — Route /service-users/:id/medication + prefetch" },
  { id: "rx-2", status: "pending", content: "D0 — features/medication-records/ scaffold: api, keys, types, hooks (optional — lives under service-users/medication)" },
  { id: "rx-3", status: "completed", content: "D1 — MarCalendarTab grid + sticky columns + month nav" },
  { id: "rx-4", status: "completed", content: "D1 — MarFiltersBar + collapsible month stats + week/month toggle + go-to-today" },
  { id: "rx-5", status: "completed", content: "D1 — RecordAdministrationDialog (status codes, conditional reason)" },
  { id: "rx-6", status: "completed", content: "D1 — RecordDetailDrawer + RecordPrnDialog + CorrectRecordDialog + on-behalf recording" },
  { id: "rx-7", status: "completed", content: "D1 — Wire GET calendar + summary KPIs; ?view=calendar on medication route" },
  { id: "rx-8", status: "completed", content: "D2 — MedicationSupplyTab + LogDeliveryDialog + delivery history" },
  { id: "rx-9", status: "completed", content: "D2 — 6 tabs: Records | MAR | Supply | History | Reviews | Export MAR" },
  { id: "rx-10", status: "completed", content: "D3 — History tab: date/status filters, pagination, row opens drawer" },
  { id: "rx-11", status: "completed", content: "D3 — Review queue tab (?view=reviews) + needsReview filter" },
  { id: "rx-12", status: "completed", content: "D3 — /settings?tab=medication: edit status codes + time slots (PATCH)" },
  { id: "rx-13", status: "completed", content: "D3 — Export tab: HTML + server PDF download (?format=pdf)" },
  { id: "rx-14", status: "completed", content: "D3 — MedicationStatusBadge shared component" },
  { id: "rx-15", status: "completed", content: "D3 — Support profile tab (?view=support): flags + notes (GP/pharmacy in notes)" },
  { id: "rx-16", status: "completed", content: "D3 — PRN on add, EditMedicationDialog (pause/stop/cancel/reactivate/archive), schedule preview on add; schedule times still read-only on edit" },
  { id: "rx-17", status: "pending", content: "D4 — Carer visit recording (mobile) — same record API" },
  { id: "rx-18", status: "pending", content: "D5 — Reports: missed/refused/late + dashboard alerts from rules" },
  { id: "rx-19", status: "pending", content: "D5 — Permissions, route prefetch, ESLint hooks-only, e2e calendar + record smoke" },
];

PHASE_TODOS.p9 = [...MED_PROTOTYPE_TODOS, ...MED_BACKEND_TODOS, ...MED_SWAGGER_TODOS, ...MED_REACT_TODOS];

const ROADMAP_PRIORITY: string[][] = [
  ["0 — Locked", "HTML prototype (careflow-medication-records.html)", "Track A 22/22 — visual contract; no MAR redesign without sign-off"],
  ["0b — Locked", "Blister HTML prototype (careflow-blister-pack-journey.html)", "Track E E0 17/20 — 6 flows + 7-step wizard; UX contract for E4"],
  ["1 — Done", "Core MAR loop in care-admin", "Calendar, record, PRN, drawer, correction, supply, history, reviews"],
  ["2 — Done", "Backend migrations applied", "supply · corrections · review/snapshots — restart API after pull"],
  ["3 — Done", "Server PDF MAR export", "GET …/export?format=pdf (pdfkit)"],
  ["4 — Done", "Time slots + schedule preview", "be-6, be-10 — settings + add-med preview panel"],
  ["5 — Done", "Add/edit medication flows", "rx-16 — PRN, stop/archive, edit dialog; schedule time edit deferred"],
  ["6 — Done", "Medication support profile UI", "rx-15 — ?view=support tab"],
  ["7 — Later", "Dedicated list route + mobile carer (D4)", "Visit recording via same events API"],
  ["8 — Later", "Reports & dashboard alerts (D5)", "Missed/refused/late rules"],
  ["9 — Done", "API docs tier 4–5 (contract-grade)", "sw-1–sw-9 — golden examples, openapi export, contract tests, CI drift check"],
  ["10 — Done", "Blister pack Track E APIs + React wizard/MAR", "11/14 BE · 8/14 RX · 4/4 Swagger — May 2026"],
  ["Optional", "e2e: calendar record · delivery · review", "rx-19"],
];

const MEDICATION_DECISIONS: string[][] = [
  ["UX contract", "careflow-medication-records.html is source of truth for Phase D", "Spec §0 maps prototype modules → React components"],
  ["Record model", "Extend event-centric model (schedules + events + chart synthesis)", "Avoid duplicate MAR table in v1; optional generator job later"],
  ["Supply", "Parallel audit: medication_supply_deliveries — not only MAR cells", "Log Delivery ≠ Record Administration (two modals)"],
  ["Cell states", "due | na | prn | recorded — chart API or derived at read", "Prototype Due/N/A/PRN before status recorded"],
  ["Pending", "System Pending (…) — not selectable when recording", "14 recordable codes only"],
  ["On behalf", "enteredBy when manager records for carer", "Prototype getRecordingContext()"],
  ["Status codes", "MedicationStatusCode table — 15 seeded; PATCH + /settings?tab=medication", "Done — colours/label/active editable"],
  ["Status display", "APIs return { code, label, color, textColor, cellState }", "§17 — never color alone in UI"],
  ["Navigation", "Extend /service-users/:id/medication + features/medication-records/", "No vendor naming in product copy"],
  ["Architecture", "Pages → hooks → TanStack Query → features/*/api/", "Same enterprise pattern as Phase 8"],
  ["API contract", "OpenAPI at /api/docs — tier 3 today (~70% enterprise)", "Tier 4: golden examples + envelope; tier 5: CI + contract tests (§16.7)"],
];

const MEDICATION_INVENTORY: string[][] = [
  ["HTML prototype — Track A", "careflow-medication-records.html", "Done 22/22 — UX reference only"],
  ["care-admin — page shell", "ServiceUserMedicationPage + 6 ?view= tabs + AddMedicationDialog", "Done"],
  ["care-admin — MAR D1", "MarCalendarTab, filters, week/month, KPI, modals, drawer", "Done"],
  ["care-admin — Supply D2", "MedicationSupplyTab, LogDeliveryDialog", "Done"],
  ["care-admin — D3 workflows", "History, reviews, export, settings tab, status badge", "Done — HTML/PDF/CSV export tab"],
  ["Backend — meds + events", "CRUD, POST/PATCH events, chart/regular + prn", "Done"],
  ["Backend — supply", "Profiles + deliveries migrations + APIs", "Done"],
  ["Backend — review + snapshots", "POST review, snapshots, enteredBy", "Done"],
  ["Backend — export", "GET medication-chart/regular/export", "Done — html|pdf|csv|xlsx + preview=true"],
  ["Backend — MAR completion", "monthStats to-date + deprecated aliases", "Done — be-16"],
  ["OpenAPI — tier 3–5", "14 tags, 59 routes, golden examples, openapi.json export, contract tests", "Done 9/9 — sw-1–sw-9 incl. CI drift check"],
  ["Mobile + reports D4–D5", "Carer visit, compliance reports/alerts", "Not started"],
];

const PROTOTYPE_PARITY: string[][] = [
  ["MAR + Supply tabs", "Done", "Done — ?view=calendar | supply"],
  ["Sticky calendar grid", "Done", "Done — MarCalendarTab"],
  ["Due / N/A / PRN cells", "Done", "Done — click Due / + / recorded"],
  ["KPI + month/week + month stats", "Done", "Done — summary + monthStats panel"],
  ["Filters + legend", "Done", "Done — MarFiltersBar + table legend"],
  ["Record + PRN + Delivery modals", "Done", "Done — 3 separate dialogs"],
  ["Drawer + correction + review", "Done", "Done — drawer + CorrectRecord + review panel"],
  ["On-behalf recording", "Done", "Done — carer select + enteredById"],
  ["Supply models (3 types)", "Done", "Done — blister / bottle / Rx qty"],
  ["History + reviews + export", "Done", "Done — events | reviews | export tabs"],
  ["Settings (status codes)", "Done", "Partial — edit codes; rounds read-only"],
  ["15 status codes in record UI", "Done", "Done — lookup grid in modal"],
];

/** Production routes & views (care-admin) — May 2026 */
const MEDICATION_ROUTES: string[][] = [
  ["Service user medication", "/service-users/:id/medication", "Default: Records tab"],
  ["MAR calendar", "?view=calendar", "MarCalendarTab"],
  ["Supply & cycles", "?view=supply", "MedicationSupplyTab"],
  ["Administration history", "?view=events", "Filters + pagination + drawer"],
  ["Manager review queue", "?view=reviews", "Mark reviewed + view"],
  ["Export MAR", "?view=export", "Preview + print + HTML download"],
  ["Org settings", "/settings?tab=medication", "Status codes + time slots editor"],
  ["Support profile", "?view=support", "MedicationSupportProfileTab"],
];

/** Key API endpoints (careadmin-backend) */
const MEDICATION_API_SHIPPED: string[][] = [
  ["Chart", "GET /service-users/:id/medication-chart/regular?month=", "Grid + KPIs + legend"],
  ["Chart export", "GET …/medication-chart/regular/export?month=", "HTML/PDF/CSV/Excel; ?packExportDetail=summary|full for blister compartments"],
  ["Schedule preview", "POST …/medication-schedule-preview", "Due slot count"],
  ["Events", "GET/POST /service-users/:id/medication-events", "statusCode on POST"],
  ["Event detail", "GET …/medication-events/:eventId", "Includes enteredBy, snapshots"],
  ["Correction", "PATCH …/medication-events/:eventId", "correctionNotes required"],
  ["Manager review", "POST …/medication-events/:eventId/review", "Exception statuses only"],
  ["Supply", "GET/POST …/medication-supply", "Bundle + log delivery"],
  ["Status codes", "GET/PATCH /medication-status-codes", "Settings editor"],
  ["Lookups", "GET /medication-lookups/*", "statusCodes, rounds, routes, …"],
  ["OpenAPI", "GET /api/docs (Bearer)", "§16.7 — 14 tags + Medication Packs (24 routes); packExportDetail on export"],
  ["Medication packs", "GET/POST …/medication-packs + members/publish/manifest/deliveries", "Track E — lifecycle APIs shipped May 2026"],
];

const MEDICATION_SWAGGER_MATURITY: string[][] = [
  ["Tier 1 — Basic", "Routes in Swagger UI", "Done"],
  ["Tier 2 — Documented", "Success schemas + 400/401/403/404 per route", "Done — ApiMedicationStandardResponses"],
  ["Tier 3 — Usable", "Field examples + product spec §16.7", "Done"],
  ["Tier 4 — Contract-grade", "Operation-level golden examples + wire envelope", "Done — sw-4–sw-6"],
  ["Tier 5 — Governed", "openapi.json export + contract tests", "Done — sw-7–sw-8"],
];

const MEDICATION_SWAGGER_BY_AREA: string[][] = [
  ["MAR chart + export", "~95%", "Golden envelope example on GET regular"],
  ["Administration events", "~90%", "Golden create/list + nested DTOs"],
  ["Supply", "~90%", "Golden bundle example"],
  ["Reports", "~75%", "Administered row DTOs + golden example"],
  ["Lookups, status codes, rounds", "~75%", "Field examples"],
  ["Governance", "~85%", "openapi:export + Jest contract specs"],
];

/** Cross-track future work (not started) */
const MEDICATION_FUTURE_TODOS: string[][] = [
  ["rx-17", "React D4", "Mobile carer visit recording", "Same POST medication-events API"],
  ["rx-18", "React D5", "Compliance reports + dashboard alerts", "Missed / refused / late rules"],
  ["rx-19", "QA", "e2e smoke — calendar record, delivery, review", "Optional"],
  ["rx-2", "React", "features/medication-records/ scaffold", "Optional — code under service-users/medication"],
];

const PRODUCTION_GAPS: string[][] = [
  ["Schedule preview on add", "Live count in AddMedicationDialog", "Done — be-10"],
  ["Edit medication / PRN / stop", "EditMedicationDialog + PRN on add", "Done — rx-16; schedule times on edit deferred"],
  ["Support profile UI", "?view=support tab", "Done — rx-15"],
  ["Medication group collapse", "HTML has group collapse", "Optional polish"],
  ["Legend popover", "React uses inline legend + filter chips", "Acceptable deviation"],
  ["Dedicated /medication/list route", "Uses ?view=events tab", "Optional"],
  ["Mobile carer flow", "Not started", "rx-17"],
  ["Compliance reports / alerts", "Not started", "rx-18, rx-19"],
];

const MEDICATION_STATUS_CODES: string[][] = [
  ["G", "Given", "#2E7D32", "Success", "No", "No"],
  ["R", "Refused", "#E53935", "Exception", "Yes", "Yes"],
  ["N", "Not Given / Missed", "#FB8C00", "Warning", "Yes", "Yes"],
  ["U", "Unavailable", "#9E9E9E", "Warning", "Yes", "Yes"],
  ["H", "Hospitalised", "#7B1FA2", "Information", "Yes", "Optional"],
  ["A", "Absent", "#607D8B", "Information", "Yes", "Optional"],
  ["C", "Cancelled", "#424242", "Neutral", "Optional", "No"],
  ["F", "Family Administered", "#1976D2", "Information", "Optional", "Optional"],
  ["I", "Independent", "#00897B", "Information", "Optional", "Optional"],
  ["S", "Self Medicated", "#00ACC1", "Information", "Optional", "Optional"],
  ["T", "Already Done", "#3949AB", "Information", "Optional", "Optional"],
  ["O", "Other", "#795548", "Exception", "Yes", "Yes"],
  ["P", "Nausea / Vomiting", "#EC407A", "Exception", "Yes", "Yes"],
  ["PCI", "Please Contact Carer", "#B71C1C", "Critical", "Yes", "Yes"],
  ["Pending", "Pending", "#E0E0E0", "Pending", "No", "No"],
];

/** Audit log — backend (careadmin-backend) */
const AUDIT_BACKEND_TODOS: TodoItem[] = [
  { id: "au-be-1", status: "completed", content: "Migration 20260628140000_audit_event_type — AuditEventType enum + column + backfill" },
  { id: "au-be-2", status: "completed", content: "audit-event-type.util — resolve VIEW/CREATE/UPDATE/DELETE/EXPORT/SECURITY/SYSTEM from action/metadata" },
  { id: "au-be-3", status: "completed", content: "audit-log-context.util — enrich rows: service user name, medication/observation item, readable summary" },
  { id: "au-be-4", status: "completed", content: "GET /audit-logs — filters: eventType, serviceUserId, module, dateFrom/dateTo (UTC day), ipAddress (partial)" },
  { id: "au-be-5", status: "completed", content: "GET /audit-logs/event-types — filter labels for admin UI dropdown" },
  { id: "au-be-6", status: "completed", content: "request-audit-meta.util — client IP from X-Forwarded-For, req.ip, socket (not loopback-only)" },
  { id: "au-be-7", status: "completed", content: "Observation + medication services — rich audit metadata; CREATE/DELETE event types where applicable" },
  { id: "au-be-8", status: "completed", content: "GET …/medications/activity-log — per–service-user medication audit trail" },
  { id: "au-be-9", status: "completed", content: "Medication restore + status end reason; audit on lifecycle actions" },
  { id: "au-be-10", status: "completed", content: "OpenAPI — audit routes in openapi/openapi.json (341 paths; pnpm run openapi:export)" },
];

/** Audit log — care-admin React */
const AUDIT_REACT_TODOS: TodoItem[] = [
  { id: "au-rx-1", status: "completed", content: "features/audit — audit-logs.api.ts, useAuditLogs, audit-event-types.ts" },
  { id: "au-rx-2", status: "completed", content: "audit-log-display.ts — formatAuditIp, row labels, deep links to SU / medication / observations" },
  { id: "au-rx-3", status: "completed", content: "AuditLogPage — columns: When, Who, Type, What happened, Service user, Item, IP address" },
  { id: "au-rx-4", status: "completed", content: "Filters — search, module, event type, date from/to, IP address" },
  { id: "au-rx-5", status: "completed", content: "Type column — enterprise AuditEventType badge (not observation type like Weight)" },
  { id: "au-rx-6", status: "completed", content: "MedicationActivityTab — ?view=activity on service user medication page" },
  { id: "au-rx-7", status: "completed", content: "Router — activity search param on /service-users/:id/medication" },
  { id: "au-rx-8", status: "completed", content: "Shipped — careflow-platform 90b66f5 · careflow-admin · careflow-api (deploy + seed)" },
];

const AUDIT_EVENT_TYPES: string[][] = [
  ["VIEW", "Read-only access (profile, chart, list)", "Filterable in UI + API ?eventType="],
  ["CREATE", "New record created", "Observations, medications, etc."],
  ["UPDATE", "Field or status change", "Most common action type"],
  ["DELETE", "Soft-delete or archive", "Medications, observations"],
  ["EXPORT", "MAR/report export", "DataAccessLog + AuditLog where wired"],
  ["SECURITY", "Auth failures, permission denials", "LoginHistory + SecurityEvent siblings"],
  ["SYSTEM", "Automated / seed / migration", "Rare in production UI"],
];

const AUDIT_API_SHIPPED: string[][] = [
  ["List", "GET /audit-logs", "Paged; enriched context on each row"],
  ["Detail", "GET /audit-logs/:id", "Single immutable row"],
  ["Event types", "GET /audit-logs/event-types", "value + label for filters"],
  ["Login history", "GET /audit-logs/login-history", "Existing — unchanged surface"],
  ["Security", "GET /audit-logs/security-events", "Existing"],
  ["Data access", "GET /audit-logs/data-access", "VIEW / DOWNLOAD / EXPORT"],
  ["Export log", "GET /audit-logs/exports", "Report exports"],
  ["Medication activity", "GET /service-users/:id/medications/activity-log", "Scoped medication module audit"],
];

const AUDIT_UI_COLUMNS: string[][] = [
  ["When", "createdAt", "Sortable; UTC display"],
  ["Who", "user display name", "From identity join"],
  ["Type", "eventType badge", "VIEW · CREATE · UPDATE · … — not clinical observation type"],
  ["What happened", "summary + action", "Human-readable from audit-log-context"],
  ["Service user", "context.serviceUserName", "Link to /service-users/:id when present"],
  ["Item", "medication or observation label", "Link to medication or observations tab"],
  ["IP address", "ipAddress", "Raw IP; (local dev) note for ::1 / 127.0.0.1"],
];

const AUDIT_DECISIONS: string[][] = [
  ["Type vs clinical type", "Type column = AuditEventType only", "Weight/BP stay in observation payload / Item column"],
  ["IP storage", "Persist request IP on each AuditLog row", "Production: X-Forwarded-For; dev: loopback is expected"],
  ["Immutability", "No PATCH/DELETE on audit tables", "Read-only HTTP APIs"],
  ["Sensitive fields", "Mask password, tokens, keySafe in service", "AuditLogsService before persist"],
  ["Permissions", "audit_logs.read on all audit routes", "Privacy Officer + Admin in seed"],
  ["Deploy repos", "careflow-admin + careflow-api separate from monorepo", "Monorepo: CI/deploy manual-only on push"],
];

/** Phase 10 — Blister pack / MCA (medication.md §35) */
const BLISTER_DESIGN_TODOS: TodoItem[] = [
  { id: "bp-d-1", status: "completed", content: "E0 — Model A + standalone medicine flows frozen (§35.1)" },
  { id: "bp-d-2", status: "completed", content: "E0 — Legacy blister migration path documented (§35.1)" },
  { id: "bp-d-3", status: "pending", content: "E0 — Canonical linking model signed off — Member authoritative (§35.2)" },
  { id: "bp-d-4", status: "pending", content: "E0 — Supply allocation + remaining-doses formula signed off (§35.4)" },
  { id: "bp-d-5", status: "pending", content: "E0 — Lifecycle state machine publish/supersede/end (§35.5)" },
  { id: "bp-d-6", status: "pending", content: "E0 — Edge-case matrix PRN/CD/witness/covert/liquids (§35.6)" },
  { id: "bp-d-7", status: "completed", content: "E0 — Interactive wireframes — careflow-blister-pack-journey.html (6 flows, 7-step wizards)" },
  { id: "bp-d-8", status: "pending", content: "E0 — Migration playbook + backfill strategy (§35.1 legacy)" },
  { id: "bp-d-9", status: "pending", content: "E0 — QA plan signed off (§35.17)" },
];

const BLISTER_PROTO_TODOS: TodoItem[] = [
  { id: "bp-proto-0", status: "completed", content: "E0 — Journey hub — 6 flows, progress bar, Start from zero, journey rules" },
  { id: "bp-proto-1", status: "completed", content: "E0 — Flow 1 pack wizard — 7 steps: About → Compartments → Medicines → Review → Safety → Generation → Preview" },
  { id: "bp-proto-2", status: "completed", content: "E0 — Step 1 — pack/pharmacy/GP/NHS, cycle duration, pack type hints, rx checked, pack notes" },
  { id: "bp-proto-3", status: "completed", content: "E0 — Step 2 — compartment rounds (Morning–Night) with due time + window" },
  { id: "bp-proto-4", status: "completed", content: "E0 — Step 3 — select from chart + create new (AddMedForm parity); demo seed 10 meds + off-chart prefill" },
  { id: "bp-proto-5", status: "completed", content: "E0 — Step 4 — member-by-compartment review + cycle duration summary" },
  { id: "bp-proto-6", status: "completed", content: "E0 — Step 5 — MCA assessment checkboxes + admin rules (witness/covert/PRN/late/review) + risk notes" },
  { id: "bp-proto-7", status: "completed", content: "E0 — Step 6 — generation window (Model A: MAR rows/day × days = events — not compartment-level)" },
  { id: "bp-proto-8", status: "completed", content: "E0 — Step 7 — preview, MCA manifest table, allergy alert, confirm checkbox, publish ACTIVE stub" },
  { id: "bp-proto-9", status: "completed", content: "E0 — Flow 2 delivery wizard — 7 steps (details, checklist, reconciliation, contents, sign-off, photo, activate)" },
  { id: "bp-proto-10", status: "completed", content: "E0 — Pack MAR tab — Model A group header, per-med cells, PR on collapsed row, Mark all given per round" },
  { id: "bp-proto-11", status: "completed", content: "E0 — MCA manifest modal (CQC dated list + PDF stub + export bundle hint)" },
  { id: "bp-proto-12", status: "completed", content: "E0 — Flow 3 carer visit + compartment modal (fast path, per-med exceptions, confirm)" },
  { id: "bp-proto-13", status: "completed", content: "E0 — Flow 4 mid-cycle overlay (version history, effective date, manager auth, pharmacy notify)" },
  { id: "bp-proto-14", status: "completed", content: "E0 — Flow 5 manager review queue (P/R/N cards, correct/escalate/GP actions)" },
  { id: "bp-proto-15", status: "completed", content: "E0 — Flow 6 archive overlay (compliance stats, disposal, stock reconcile, next cycle prompt)" },
  { id: "bp-proto-16", status: "completed", content: "E0 — Standalone Add Medication page + return-to-wizard path; MedFlowGuide" },
  { id: "bp-proto-17", status: "pending", content: "E0 — wizardPublish() → dynamic PACK_MEDS + MAR row regen (still static demo data)" },
  { id: "bp-proto-18", status: "pending", content: "E0 — AddMedForm full save payload + post-save link to MAR rows; PRN path" },
  { id: "bp-proto-19", status: "pending", content: "E0 — Re-enable wizard validation (SKIP_WIZARD_VALIDATION=false) + delivery wizard gates" },
];

const BLISTER_BACKEND_TODOS: TodoItem[] = [
  { id: "bp-be-1", status: "completed", content: "E1 — Migration: cycleNumber, packType, status, roundLabel on MedicationPack" },
  { id: "bp-be-2", status: "completed", content: "E1 — MedicationPackMember + sync medicationPackId denormalized FK" },
  { id: "bp-be-3", status: "completed", content: "E1 — ContentsSnapshot + publish service (immutable manifest lines)" },
  { id: "bp-be-4", status: "completed", content: "E1 — Manifest GET + PDF (tabletDescription on lines)" },
  { id: "bp-be-5", status: "completed", content: "E1 — PRN / CD guards on member link (400)" },
  { id: "bp-be-6", status: "pending", content: "E1 — Backfill script: legacy pack + PackItem → members + Cycle 0" },
  { id: "bp-be-7", status: "completed", content: "E2 — MedicationPackDelivery + receivedBy + countersign dual sign-off" },
  { id: "bp-be-8", status: "pending", content: "E2 — Remaining-doses read model per §35.4 formula" },
  { id: "bp-be-9", status: "pending", content: "E2 — Block POST medication-supply/deliveries for active pack members (409)" },
  { id: "bp-be-10", status: "completed", content: "E4 — Supersede + end pack APIs" },
  { id: "bp-be-11", status: "completed", content: "E1 — Permissions pack_publish / pack_deliver / pack_supersede" },
  { id: "bp-be-12", status: "completed", content: "E1 — Audit actions PACK_PUBLISHED, DELIVERED, SUPERSEDED, MEMBER_*" },
  { id: "bp-be-13", status: "completed", content: "E1–E4 — OpenAPI pack routes: members, publish snapshot, manifest PDF, expanded MedicationPackDto" },
  { id: "bp-be-14", status: "completed", content: "E3 — MAR export pack compartments: packExportDetail summary/full across HTML + Excel" },
];

const BLISTER_REACT_TODOS: TodoItem[] = [
  { id: "bp-rx-1", status: "completed", content: "E3 — Blister packs tab on Records (?view=packs) — cycle list DRAFT/ACTIVE/SUPERSEDED" },
  { id: "bp-rx-2", status: "completed", content: "E4 — AddBlisterPackWizard — 7-step flow ported from HTML prototype" },
  { id: "bp-rx-3", status: "completed", content: "E3 — PackManifestDialog — view + print MCA contents" },
  { id: "bp-rx-4", status: "completed", content: "E2 — PackDeliveryDialog — log delivery + reconciliation + countersign" },
  { id: "bp-rx-5", status: "completed", content: "E3 — MarPackCalendarSection — collapsible pack group + compartment rows on MAR" },
  { id: "bp-rx-6", status: "pending", content: "E2 — Supply pack card + per-member remaining table" },
  { id: "bp-rx-7", status: "completed", content: "E3 — PackRecordRoundDialog — per-medicine mixed G/R/N in same round" },
  { id: "bp-rx-8", status: "in_progress", content: "E3 — Export bundle — MAR pack layout done; manifest + receipt bundle pending" },
  { id: "bp-rx-9", status: "pending", content: "E3 — Hybrid filter in pack / standalone / all" },
  { id: "bp-rx-10", status: "pending", content: "E4 — Mid-cycle change wizard (supersede/end wired in tab; full Flow 4 pending)" },
  { id: "bp-rx-11", status: "pending", content: "E4 — Support profile MCA assessment gate before publish" },
  { id: "bp-rx-12", status: "pending", content: "E4 — Deprecate AddMedicationDialog BLISTER_PACK → redirect to wizard" },
  { id: "bp-rx-13", status: "completed", content: "E3 — MarStatusCodePicker uses API color/textColor (status chip parity with MAR cells)" },
  { id: "bp-rx-14", status: "completed", content: "E3 — Export tab pack layout toggle (summary vs full) + preview parity with HTML" },
];

const BLISTER_SWAGGER_TODOS: TodoItem[] = [
  { id: "bp-sw-1", status: "completed", content: "OpenAPI — manifest + pack delivery DTOs with examples" },
  { id: "bp-sw-2", status: "completed", content: "OpenAPI — publish snapshot + member link 400/409 examples" },
  { id: "bp-sw-3", status: "completed", content: "OpenAPI — MAR export packExportDetail query param (summary | full)" },
  { id: "bp-sw-4", status: "completed", content: "OpenAPI — MedicationPackMemberDto + ContentsSnapshotDto + expanded MedicationPackDto" },
];

const BLISTER_QA_TODOS: TodoItem[] = [
  { id: "bp-qa-1", status: "pending", content: "E2E — publish → pack deliver → per-med MAR record" },
  { id: "bp-qa-2", status: "pending", content: "E2E — partial refusal same round (G + R on pack members)" },
  { id: "bp-qa-3", status: "pending", content: "E2E — supersede mid-cycle; manifest history retained" },
  { id: "bp-qa-4", status: "pending", content: "Regression — standalone med add / MAR / supply unchanged" },
];

const BLISTER_GAP_TODAY: string[][] = [
  ["HTML prototype", "careflow-blister-pack-journey.html — 17/20 E0 items", "UX reference — React wizard + MAR group shipped"],
  ["Linking", "MedicationPackMember + synced medicationPackId", "Done — bp-be-2; legacy PackItem backfill pending"],
  ["Pack entity", "cycleNumber, status, packType, pharmacy/GP fields", "Done — bp-be-1"],
  ["Manifest", "GET manifest + PDF + publish snapshot", "Done — bp-be-3/4"],
  ["Supply", "Pack delivery API + dialog", "Per-med delivery 409 guard pending — bp-be-9"],
  ["MAR UI", "MarPackCalendarSection + PackRecordRoundDialog", "Done — bp-rx-5/7; export layout bp-rx-14"],
  ["Partial refusal", "PackRecordRoundDialog per medicine", "Done — independent events per med in round"],
  ["Export", "MAR packExportDetail summary/full", "Manifest + receipt bundle pending — bp-rx-8"],
  ["Edge cases", "PRN/CD blocked at member link API", "Witness/covert/liquids messaging pending in UI"],
  ["Permissions", "pack_publish / pack_deliver / pack_supersede", "Done — seeded bp-be-11"],
  ["Migration", "Legacy AddMedicationDialog BLISTER_PACK", "Redirect to wizard pending — bp-rx-12"],
];

const BLISTER_LINKING: string[][] = [
  ["MedicationPackMember", "Runtime authority", "FK serviceUserMedicationId; one ACTIVE pack per med"],
  ["medicationPackId on med", "Denormalized cache", "Synced from member row on link/end"],
  ["ContentsSnapshotLine", "Immutable at publish", "CQC cross-ref; includes tabletDescription"],
  ["MedicationPackItem", "Legacy", "Backfill then archive — not runtime after E1"],
];

const BLISTER_SUPPLY_RULES: string[][] = [
  ["Booking-in", "One MedicationPackDelivery per cycle", "receivedBy + checkedBy dual sign-off"],
  ["compartmentCount", "Admin slots in tray (not tablet sum)", "e.g. 28 days × 2 rounds"],
  ["remainingDoses", "expectedInCycle − GIVEN events", "Per member read model"],
  ["packRemaining", "min(member remaining)", "Conservative supply indicator"],
  ["Per-med delivery", "409 when active pack member", "Prevents double booking-in"],
];

const BLISTER_EDGE_CASES: string[][] = [
  ["PRN", "Not in pack", "Block at member link"],
  ["Controlled drug", "Not in pack", "Standalone + CD register"],
  ["Witness required", "Not in pack", "Standalone flow"],
  ["Covert", "Not in pack", "Separate administration record"],
  ["Liquids / creams / inhalers", "Not in pack", "Hybrid MAR alongside pack group"],
  ["Split tablets", "Not in pack unless pharmacy supplies split", "Policy message in UI"],
];

const BLISTER_PERMISSIONS: string[][] = [
  ["service_users.medications.read", "List packs, view manifest", "Existing"],
  ["service_users.medications.create", "Create DRAFT, add members", "Existing"],
  ["service_users.medications.update", "End membership, metadata", "Existing"],
  ["service_users.medications.pack_publish", "Publish snapshot", "New E1"],
  ["service_users.medications.pack_deliver", "Log pack delivery", "New E1"],
  ["service_users.medications.pack_supersede", "Supersede cycle", "New E4"],
];

const BLISTER_LIFECYCLE: string[][] = [
  ["DRAFT", "Add/remove members", "No manifest, no delivery"],
  ["Publish → ACTIVE", "Manager + pack_publish", "Snapshot frozen; MCA assessment required"],
  ["Deliver", "pack_deliver", "Dual sign-off; one primary receipt per cycle"],
  ["Supersede", "pack_supersede", "New cycleNumber+1; old SUPERSEDED"],
  ["End", "Manager", "Unlink members; med may continue standalone"],
  ["Mid-cycle change", "Wizard", "Short-term: end member + standalone; long-term: supersede"],
];

const BLISTER_DECISIONS: string[][] = [
  ["UX contract", "careflow-blister-pack-journey.html is source for E4 React", "Same role as medication-records.html for Phase 9"],
  ["Standalone meds", "Frozen — zero API/UI behaviour change", "Regression test bp-qa-4"],
  ["Legacy blister dialog", "Deprecated E4 — redirect to wizard", "Explicit migration not “no touch”"],
  ["Linking", "MedicationPackMember canonical", "PackItem legacy only"],
  ["Recording", "Model A — per-med MAR mandatory E1–E4", "Manifest + mapping for CQC"],
  ["Same-round refusal", "Independent events per med", "Group header shows round context"],
  ["Supply", "Pack delivery only for members", "409 blocks per-med blister delivery"],
  ["Multi-pack", "One ACTIVE pack per roundLabel per SU", "Morning + Evening packs allowed"],
  ["Schedule in pack", "Shared round label; frequency may differ per member", "Not forced identical schedule"],
  ["Mobile", "Out of scope E1–E4", "E6 future — read-only pack context on visit"],
  ["Model B / pouch scan", "E5 only", "Pharmacy integration prerequisite"],
];

const BLISTER_API_PLANNED: string[][] = [
  ["Publish", "POST …/medication-packs/:id/publish", "Done — immutable snapshot"],
  ["Supersede", "POST …/medication-packs/:id/supersede", "Done"],
  ["End", "POST …/medication-packs/:id/end", "Done"],
  ["Manifest", "GET …/manifest + manifest/pdf", "Done"],
  ["Pack delivery", "POST/GET …/deliveries + countersign", "Done"],
  ["Members", "GET/POST/DELETE …/members", "Done — PRN/CD 400, duplicate 409"],
  ["Compartments", "GET/POST/PATCH/DELETE …/compartments", "Done"],
  ["MAR export packs", "GET …/export?packExportDetail=summary|full", "Done — HTML/PDF/CSV/Excel"],
  ["Guard", "POST …/medication-supply/deliveries", "409 for active pack members — pending"],
];

const BLISTER_MARKET_2026: string[][] = [
  ["Per-med eMAR; MCA = format", "Access, ATLAS", "Model A + manifest"],
  ["Dual blister + original", "Care Vision", "Hybrid filters + wizard"],
  ["Pack metadata", "Birdie", "Full per-med MAR + manifest"],
  ["Pouch scan → one action", "PillPacPlus", "E5 Model B"],
];

const BLISTER_PHASES: string[][] = [
  ["E0", "Enterprise spec + interactive HTML prototype", "In progress — design 3/9 · proto 17/20"],
  ["E1", "Member, publish, guards, permissions, OpenAPI", "Mostly done — 11/14 backend; backfill pending"],
  ["E2", "Pack delivery, remaining calc, 409 guard", "Partial — delivery shipped; 409 + remaining doses pending"],
  ["E3", "MAR group, round recording, export layout", "Partial — 8/14 React; supply card + export bundle pending"],
  ["E4", "Wizard polish, supersede UX, deprecate legacy dialog", "Partial — wizard shipped; mid-cycle + MCA gate pending"],
  ["E5", "Pharmacy PMR / pouch QR", "Future Model B"],
  ["E6", "Mobile carer read-only context", "Future domiciliary"],
];

/** careflow-blister-pack-journey.html — Track E UX contract (May 2026) */
const BLISTER_PROTO_FLOWS: string[][] = [
  ["Flow 1 — Add pack", "7-step wizard overlay", "About · Compartments · Medicines · Review · Safety · Generation · Preview → ACTIVE", "Done — opens on Medicines step with demo seed"],
  ["Flow 2 — Log delivery", "7-step delivery wizard", "Details · Checklist · Reconciliation · Contents change · Sign-off · Photo · Activate", "Done — UI prototype"],
  ["Flow 3 — Carer admin", "Carer visit page + compartment modal", "Mark all given · per-med exceptions · confirm (witness stub for CD)", "Done — Model A per-med recording"],
  ["Flow 4 — Mid-cycle", "Mid-cycle overlay", "Change type · effective date · version preview · manager PIN", "Done — UI prototype"],
  ["Flow 5 — Review", "Manager reviews page", "P/R/N queue · correct · escalate · contact GP", "Reuses MAR review UI"],
  ["Flow 6 — Archive", "Archive overlay", "Compliance stats · disposal · stock reconcile · next delivery prompt", "Done — UI prototype"],
];

const BLISTER_WIZARD_STEP_ORDER: string[][] = [
  ["1", "About this pack", "blister-pack-plan step 2 (pack details)", "Pharmacy label, GP, cycle duration, rx checked"],
  ["2", "Compartments", "blister-pack-plan step 3", "Administration rounds — Morning + Evening default"],
  ["3", "Medicines", "blister-pack-plan step 1 + 4", "Select from chart OR create new — two paths frozen"],
  ["4", "Review contents", "blister-pack-plan step 4", "Member × compartment matrix; manifest draft"],
  ["5", "Safety rules", "blister-pack-plan step 5", "MCA assessment + pack-wide admin rules + risk notes"],
  ["6", "MAR generation", "blister-pack-plan step 6 (refactored)", "Generation window only — rows/day × days (Model A)"],
  ["7", "Preview → ACTIVE", "blister-pack-plan step 7 + 8", "MCA preview, record count, publish Cycle 1"],
];

const BLISTER_PROTO_INVENTORY: string[][] = [
  ["UX contract file", "careflow-blister-pack-journey.html", "Open directly in browser — not served by care-admin vite"],
  ["Spec alignment", "canvases/blister-pack-plan.md + medication.md §35", "6 flows · Model A MAR · standalone meds frozen"],
  ["Journey hub", "Blister Packs page — 6 flow cards + progress", "Start from zero → empty chart path"],
  ["Demo data", "seedPackWizardDemo() — 10 chart meds + 2 off-chart prefill", "5 pre-selected · 5 optional · Ferrous + Calcium"],
  ["Add medication", "AddMedForm — mirrors AddMedicationDialog.tsx", "Pack + standalone modes; schedule preview stub"],
  ["Pack MAR", "Model A — pack group row + per-med sub-rows", "PR on collapsed mixed round; not recordable code"],
  ["Generation math", "computeGenerationPreview() — members × slots × days", "168 events demo (6 rows/day × 28 days)"],
  ["Validation", "SKIP_WIZARD_VALIDATION: true", "Re-enable before production sign-off — bp-proto-19"],
  ["Backend wiring", "None — static PROTO_SU_MEDICATIONS + PACK_MEDS", "E1+ — bp-proto-17"],
];

const BLISTER_PROTO_GAPS: string[][] = [
  ["Publish → MAR", "Static PACK_MEDS grid", "Dynamic member list — React uses live API"],
  ["Add med save", "Form validates; partial chart update", "AddBlisterPackWizard + member link API shipped"],
  ["Delivery activate", "Toast + flow complete", "PackDeliveryDialog + countersign API shipped"],
  ["Supply card", "Legacy per-med supply tab only", "Pack delivery card + 409 on per-med (E2)"],
  ["Export bundle", "Manifest modal + export hint", "packExportDetail on MAR export done; receipt bundle pending"],
  ["React parity", "HTML prototype", "Wizard + MAR group + round dialog shipped — polish remaining"],
];

const MEDICATION_ENUM_GAP: string[][] = [
  ["GIVEN → G", "Yes", "Chart API needs color display config"],
  ["REFUSED → R", "Yes", ""],
  ["MISSED + NOT_GIVEN → N", "Partial", "Two enum values for one spec code"],
  ["PENDING → Pending", "Yes", ""],
  ["CANCELLED → C", "Yes", ""],
  ["HELD", "Partial", "Extra — not in spec §6/§13"],
  ["U, H, A, F, I, S, T, O, P, PCI", "No", "Missing from enum — add via status config"],
];

type MedTrack = "all" | "proto" | "backend" | "swagger" | "react";

const MEDICATION_TRACKS: { id: MedTrack; label: string; tone: "success" | "warning"; done: number; total: number }[] = [
  { id: "proto", label: "Track A — HTML prototype", tone: "success", done: MED_PROTOTYPE_DONE, total: MED_PROTOTYPE_TOTAL },
  { id: "backend", label: "Track B — Backend", tone: "success", done: MED_BACKEND_DONE, total: MED_BACKEND_TOTAL },
  { id: "swagger", label: "Track D — OpenAPI / Swagger", tone: "warning", done: MED_SWAGGER_DONE, total: MED_SWAGGER_TOTAL },
  { id: "react", label: "Track C — care-admin React", tone: "warning", done: MED_REACT_DONE, total: MED_REACT_TOTAL },
];

type TaskFilter = "all" | "done" | "active" | "pending";

function countByStatus(todos: readonly TodoItem[], status: TodoStatus): number {
  return (todos ?? []).filter(t => t.status === status).length;
}

function filterTodos(todos: readonly TodoItem[], filter: TaskFilter): TodoItem[] {
  const list = todos ?? [];
  if (filter === "done") return list.filter(t => t.status === "completed");
  if (filter === "pending") return list.filter(t => t.status === "pending");
  if (filter === "active") {
    return list.filter(t => t.status === "pending" || t.status === "in_progress");
  }
  return [...list];
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
  const list = todos ?? [];
  const [filterRaw, setFilter] = useCanvasState<TaskFilter>(filterKey, "all");
  const filter: TaskFilter = filterRaw ?? "all";
  const filtered = filterTodos(list, filter);
  const done = countByStatus(list, "completed");
  const pending = countByStatus(list, "pending");
  const inProgress = countByStatus(list, "in_progress");
  return (
    <Stack gap={8}>
      <Row gap={8} wrap>
        <Pill active={filter === "all"} onClick={() => setFilter("all")}>All ({list.length})</Pill>
        <Pill active={filter === "done"} tone="success" onClick={() => setFilter("done")}>Done ({done})</Pill>
        <Pill active={filter === "active"} tone="warning" onClick={() => setFilter("active")}>
          Active ({pending + inProgress})
        </Pill>
        <Pill active={filter === "pending"} onClick={() => setFilter("pending")}>Pending ({pending})</Pill>
      </Row>
      <TodoListCard todos={filtered} defaultExpanded />
      <Text tone="tertiary" size="small">{title} — showing {filtered.length} of {list.length}</Text>
    </Stack>
  );
}

function OverviewView() {
  const followOnDone = PHASE_TODOS.p8?.filter(t => t.status === "completed").length ?? 0;
  return (
    <Stack gap={24}>
      <Grid columns={4} gap={12}>
        <Stat value={`${ALL_TASKS}/${ALL_TASKS}`} label="Plan tasks (Ph 1–7)" tone="success" />
        <Stat value={`${FOLLOW_ON_DONE}/${FOLLOW_ON_TOTAL}`} label="Phase 8 follow-on" tone="success" />
        <Stat value="100%" label="Core plan complete" />
        <Stat value="8" label="Total phases" />
      </Grid>
      <UsageBar
        total={ALL_WITH_FOLLOW_ON}
        topLeftLabel="Overall progress (plan + follow-on)"
        topRightLabel={`${ALL_TASKS + followOnDone} / ${ALL_WITH_FOLLOW_ON} tasks`}
        segments={PROGRESS_SEGMENTS}
      />
      <Callout tone="success" title="All phases complete">
        All pages in features/, Query hooks on pages and components, ESLint enforcement, route loaders, types barrels, API modules under features/*/api/. Latest HEAD: platform c5f8d4b, admin 6806d3f, api 861cfa3.
      </Callout>
      <Callout tone="success" title="Phase 8 + follow-on complete">
        Component depth, centralized prefetch, care-plan cache alignment, types barrels, and API folder normalization shipped to careflow-platform and careflow-admin on main.
      </Callout>
      <Callout tone="success" title="Phase 9 — HTML prototype (Track A)">
        careflow-medication-records.html is complete ({MED_PROTOTYPE_DONE}/{MED_PROTOTYPE_TOTAL}) — UX contract for React. Spec: canvases/medication.md §0.
      </Callout>
      <Callout tone="warning" title="Phase 9 — Production (Tracks B + C + D)">
        Backend {MED_BACKEND_DONE}/{MED_BACKEND_TOTAL} · React {MED_REACT_DONE}/{MED_REACT_TOTAL} · OpenAPI {MED_SWAGGER_DONE}/{MED_SWAGGER_TOTAL} · Overall {MEDICATION_DONE}/{MEDICATION_TOTAL}. Remaining product work: mobile (rx-17), reports UI (rx-18).
      </Callout>
      <Callout tone="success" title="Audit log enterprise — complete">
        Backend {AUDIT_BACKEND_DONE}/{AUDIT_BACKEND_TOTAL} · Admin UI {AUDIT_REACT_DONE}/{AUDIT_REACT_TOTAL}. Filterable event types, IP + date range, enriched service user and item context. See Audit tab.
      </Callout>
      <Callout tone="warning" title="Phase 10 — Blister pack / MCA (Track E) — E1–E3 in progress">
        Backend {BLISTER_BACKEND_DONE}/{BLISTER_BACKEND_TOTAL} · React {BLISTER_REACT_DONE}/{BLISTER_REACT_TOTAL} · OpenAPI {BLISTER_SWAGGER_DONE}/{BLISTER_SWAGGER_TOTAL} · E0 proto {BLISTER_PROTO_DONE}/{BLISTER_PROTO_TOTAL}. Shipped: 7-step wizard, packs tab, MAR pack groups, round recording, manifest, delivery, publish/supersede/end APIs.
      </Callout>
      <Grid columns={4} gap={12}>
        <Stat value={`${MED_PROTOTYPE_DONE}/${MED_PROTOTYPE_TOTAL}`} label="HTML prototype (locked)" tone="success" />
        <Stat value={`${MED_BACKEND_DONE}/${MED_BACKEND_TOTAL}`} label="Backend" tone="success" />
        <Stat value={`${MED_SWAGGER_DONE}/${MED_SWAGGER_TOTAL}`} label="OpenAPI / Swagger" tone="success" />
        <Stat value={`${MED_REACT_DONE}/${MED_REACT_TOTAL}`} label="care-admin React" tone="warning" />
      </Grid>
      <Table headers={["Domain", "Pattern", "Status"]} rows={QUERY_MIGRATION} striped />
    </Stack>
  );
}

function StructureView() {
  return (
    <Stack gap={16}>
      <H3>Optional follow-up</H3>
      <Table headers={["Target", "Work", "Today"]} rows={STRUCTURE_GAP} striped />
    </Stack>
  );
}

function PatternsView() {
  return (
    <Callout tone="info" title="Pattern">
      Pages/components → feature hooks + types barrels; hooks → TanStack Query → api modules under features/*/api/.
    </Callout>
  );
}

function RoadmapView() {
  const productionTodos = [...MED_BACKEND_TODOS, ...MED_REACT_TODOS];
  const pending = productionTodos.filter(t => t.status === "pending");
  const inProgress = productionTodos.filter(t => t.status === "in_progress");
  const done = productionTodos.filter(t => t.status === "completed");
  return (
    <Stack gap={16}>
      <Grid columns={3} gap={12}>
        <Stat value={`${done.length}/${productionTodos.length}`} label="Production tasks done" tone="success" />
        <Stat value={String(inProgress.length)} label="In progress" tone="warning" />
        <Stat value={String(pending.length)} label="Pending" tone="warning" />
      </Grid>
      <Table headers={["Priority", "Work item", "Rationale"]} rows={ROADMAP_PRIORITY} striped />
      {inProgress.length > 0 && (
        <>
          <H3>In progress ({inProgress.length})</H3>
          <TodoList todos={inProgress} />
        </>
      )}
      <H3>Pending next ({pending.length})</H3>
      <TodoList todos={pending} />
    </Stack>
  );
}

function AuditView() {
  const todos = [...AUDIT_BACKEND_TODOS, ...AUDIT_REACT_TODOS];
  const completed = todos.filter(t => t.status === "completed");
  return (
    <Stack gap={24}>
      <UsageBar
        total={AUDIT_TOTAL}
        topLeftLabel="Audit log enterprise"
        topRightLabel={`${AUDIT_DONE} / ${AUDIT_TOTAL} tasks`}
        segments={[
          { id: "be", value: AUDIT_BACKEND_DONE, color: "blue" },
          { id: "rx", value: AUDIT_REACT_DONE, color: "green" },
        ]}
      />
      <Grid columns={2} gap={12}>
        <Stat value={`${AUDIT_BACKEND_DONE}/${AUDIT_BACKEND_TOTAL}`} label="Backend — audit schema + APIs" tone="success" />
        <Stat value={`${AUDIT_REACT_DONE}/${AUDIT_REACT_TOTAL}`} label="care-admin — AuditLogPage + activity tab" tone="success" />
      </Grid>
      <Callout tone="success" title="Shipped May 2026">
        Monorepo 90b66f5 (admin) · 973e361 (backend) · careflow-admin ed36da0 · careflow-api 6af589e+. Migration applied on production; seed idempotent.
      </Callout>
      <Callout tone="info" title="How to read the Type column">
        Type is the enterprise event category (VIEW, CREATE, UPDATE, …), not the clinical observation type (Weight, Blood pressure). Use the event type filter and Item column for clinical context.
      </Callout>
      <Card>
        <CardHeader trailing={<Pill tone="success" size="sm">{completed.length}/{todos.length} done</Pill>}>
          Audit delivery checklist
        </CardHeader>
        <CardBody>
          <TaskListPanel todos={todos} filterKey="audit.tasks.all" title="Backend + React" />
        </CardBody>
      </Card>
      <H3>Admin AuditLogPage columns</H3>
      <Table headers={["Column", "Source", "Notes"]} rows={AUDIT_UI_COLUMNS} striped />
      <H3>AuditEventType values</H3>
      <Table headers={["Type", "Meaning", "Notes"]} rows={AUDIT_EVENT_TYPES} striped />
      <H3>Backend APIs</H3>
      <Table headers={["Area", "Endpoint", "Notes"]} rows={AUDIT_API_SHIPPED} striped />
      <H3>Architecture decisions</H3>
      <Table headers={["Topic", "Decision", "Notes"]} rows={AUDIT_DECISIONS} striped />
      <H3>Key files</H3>
      <Table
        headers={["Layer", "Path", "Role"]}
        rows={[
          ["Backend", "src/audit-logs/audit-logs.service.ts", "List filters, enrichment, masking"],
          ["Backend", "src/audit-logs/audit-log-context.util.ts", "Service user + item labels"],
          ["Backend", "src/common/utils/request-audit-meta.util.ts", "IP extraction for logAudit"],
          ["Backend", "prisma/migrations/20260628140000_audit_event_type/", "Enum + column + index"],
          ["Admin", "src/features/audit/", "API client, hooks, display helpers"],
          ["Admin", "src/features/admin/pages/AuditLogPage.tsx", "Enterprise audit UI"],
          ["Admin", "src/features/service-users/medication/MedicationActivityTab.tsx", "Per-SU medication audit"],
        ]}
        striped
      />
    </Stack>
  );
}

function BlisterView() {
  const todos = [
    ...BLISTER_DESIGN_TODOS,
    ...BLISTER_PROTO_TODOS,
    ...BLISTER_BACKEND_TODOS,
    ...BLISTER_REACT_TODOS,
    ...BLISTER_SWAGGER_TODOS,
    ...BLISTER_QA_TODOS,
  ];
  const buildTodos = [
    ...BLISTER_BACKEND_TODOS,
    ...BLISTER_REACT_TODOS,
    ...BLISTER_SWAGGER_TODOS,
    ...BLISTER_QA_TODOS,
  ];
  const buildDone = buildTodos.filter(t => t.status === "completed").length;
  const e0Todos = [...BLISTER_DESIGN_TODOS, ...BLISTER_PROTO_TODOS];
  const e0Done = e0Todos.filter(t => t.status === "completed").length;
  const protoDone = BLISTER_PROTO_DONE;
  const protoTotal = BLISTER_PROTO_TOTAL;
  return (
    <Stack gap={24}>
      <UsageBar
        total={BLISTER_TOTAL}
        topLeftLabel="Phase 10 — Blister pack / MCA (Track E)"
        topRightLabel={`${BLISTER_DONE} / ${BLISTER_TOTAL} tasks`}
        segments={[
          { id: "design", value: BLISTER_DESIGN_DONE, color: "green" },
          { id: "proto", value: BLISTER_PROTO_DONE, color: "green" },
          { id: "be", value: BLISTER_BACKEND_DONE, color: "blue" },
          { id: "rx", value: BLISTER_REACT_DONE, color: "purple" },
          { id: "sw", value: BLISTER_SWAGGER_DONE, color: "orange" },
          { id: "qa", value: BLISTER_QA_DONE, color: "blue" },
        ]}
      />
      <Grid columns={4} gap={12}>
        <Stat value={`${e0Done}/${e0Todos.length}`} label="E0 — Spec + wireframes" tone="warning" />
        <Stat value={`${protoDone}/${protoTotal}`} label="E0 — HTML prototype" tone="success" />
        <Stat value={`${BLISTER_BACKEND_DONE}/${BLISTER_BACKEND_TOTAL}`} label="Backend (E1–E2)" tone="warning" />
        <Stat value={`${buildDone}/${buildTodos.length}`} label="React + QA (E3–E4)" tone="warning" />
      </Grid>
      <Callout tone="success" title="UX contract — careflow-blister-pack-journey.html">
        6 end-to-end flows prototyped in HTML. Production: AddBlisterPackWizard (7 steps), MedicationPacksTab, MarPackCalendarSection, PackRecordRoundDialog, PackDeliveryDialog, manifest PDF — wired to Track E APIs.
      </Callout>
      <Callout tone="warning" title="E0 sign-off + remaining build">
        Product sign-off still pending for linking model, supply formula, lifecycle, edge matrix. Build gaps: per-med supply 409, remaining doses, legacy dialog redirect, export receipt bundle.
      </Callout>
      <Callout tone="info" title="Scope boundary">
        Standalone medicine flows are frozen. Legacy AddMedicationDialog BLISTER_PACK is explicitly migrated in E4 — not “no touch”. Pack members use pack delivery only (409 on per-med blister delivery).
      </Callout>
      <Card>
        <CardHeader trailing={<Pill tone="warning" size="sm">{BLISTER_DONE}/{BLISTER_TOTAL} done</Pill>}>
          Track E delivery checklist
        </CardHeader>
        <CardBody>
          <TaskListPanel todos={todos} filterKey="blister.tasks.all" title="Design + Proto + Backend + React + OpenAPI + QA" />
        </CardBody>
      </Card>
      <H3>Phases E0–E6</H3>
      <Table headers={["Phase", "Scope", "Status"]} rows={BLISTER_PHASES} striped />
      <H3>HTML prototype — 6 flows (careflow-blister-pack-journey.html)</H3>
      <Table headers={["Flow", "Surface", "Steps", "Status"]} rows={BLISTER_PROTO_FLOWS} striped />
      <H3>Flow 1 wizard step order (proto vs plan)</H3>
      <Table headers={["Step", "Proto label", "blister-pack-plan.md", "Notes"]} rows={BLISTER_WIZARD_STEP_ORDER} striped />
      <H3>Prototype inventory</H3>
      <Table headers={["Area", "Artifact", "Status"]} rows={BLISTER_PROTO_INVENTORY} striped />
      <H3>Prototype → production gaps</H3>
      <Table headers={["Gap", "Today (HTML)", "Target (E1–E4)"]} rows={BLISTER_PROTO_GAPS} striped />
      <H3>Canonical linking model</H3>
      <Table headers={["Entity", "Role", "Rule"]} rows={BLISTER_LINKING} striped />
      <H3>Supply & stock rules (§35.4)</H3>
      <Table headers={["Rule", "Definition", "Notes"]} rows={BLISTER_SUPPLY_RULES} striped />
      <H3>Compliance edge cases (§35.6)</H3>
      <Table headers={["Case", "v1 rule", "Notes"]} rows={BLISTER_EDGE_CASES} striped />
      <H3>Lifecycle state machine</H3>
      <Table headers={["State / action", "Who", "Rules"]} rows={BLISTER_LIFECYCLE} striped />
      <H3>Permissions</H3>
      <Table headers={["Permission", "Action", "Notes"]} rows={BLISTER_PERMISSIONS} striped />
      <H3>Gap — today vs target</H3>
      <Table headers={["Area", "Today", "Track E target"]} rows={BLISTER_GAP_TODAY} striped />
      <H3>Architecture decisions</H3>
      <Table headers={["Topic", "Decision", "Notes"]} rows={BLISTER_DECISIONS} striped />
      <H3>Planned APIs</H3>
      <Table headers={["Area", "Endpoint", "Purpose"]} rows={BLISTER_API_PLANNED} striped />
      <H3>Market alignment (2026 — internal)</H3>
      <Table headers={["Pattern", "Reference", "CareFlow"]} rows={BLISTER_MARKET_2026} striped />
      <H3>Success criteria (§35.19)</H3>
      <Table
        headers={["#", "Criterion", "Verified by"]}
        rows={[
          ["1", "Single linking model — no Member vs PackItem drift", "bp-be-2, bp-be-6"],
          ["2", "Inspector bundle — MAR + manifest + receipt", "bp-rx-8, bp-sw-3"],
          ["3", "No double booking-in — pack OR per-med, never both", "bp-be-9, bp-qa-1"],
          ["4", "Standalone regression zero", "bp-qa-4"],
          ["5", "PRN/CD/covert/liquids blocked at API", "bp-be-5"],
          ["6", "Lifecycle auditable", "bp-be-12"],
          ["7", "Legacy dialog deprecated", "bp-rx-12"],
        ]}
        striped
      />
    </Stack>
  );
}

function MedicationView() {
  const [trackRaw, setTrack] = useCanvasState<MedTrack>("medication.track", "all");
  const track: MedTrack = trackRaw ?? "all";
  const todos =
    track === "proto" ? MED_PROTOTYPE_TODOS
    : track === "backend" ? MED_BACKEND_TODOS
    : track === "swagger" ? MED_SWAGGER_TODOS
    : track === "react" ? MED_REACT_TODOS
    : PHASE_TODOS.p9 ?? [];
  const pending = todos.filter(t => t.status === "pending");
  const inProgress = todos.filter(t => t.status === "in_progress");
  const completed = todos.filter(t => t.status === "completed");
  return (
    <Stack gap={24}>
      <UsageBar
        total={MEDICATION_TOTAL}
        topLeftLabel="Phase 9 — prototype + backend + React"
        topRightLabel={`${MEDICATION_DONE} / ${MEDICATION_TOTAL} tasks`}
        segments={[
          { id: "proto", value: MED_PROTOTYPE_DONE, color: "green" },
          { id: "be", value: MED_BACKEND_DONE, color: "blue" },
          { id: "swagger", value: MED_SWAGGER_DONE, color: "orange" },
          { id: "rx", value: MED_REACT_DONE, color: "purple" },
        ]}
      />
      <Grid columns={4} gap={12}>
        <Stat value={`${MED_PROTOTYPE_DONE}/${MED_PROTOTYPE_TOTAL}`} label="Track A — HTML" tone="success" />
        <Stat value={`${MED_BACKEND_DONE}/${MED_BACKEND_TOTAL}`} label="Track B — Backend" tone="success" />
        <Stat value={`${MED_SWAGGER_DONE}/${MED_SWAGGER_TOTAL}`} label="Track D — OpenAPI" tone="success" />
        <Stat value={`${MED_REACT_DONE}/${MED_REACT_TOTAL}`} label="Track C — React" tone="warning" />
      </Grid>
      <Callout tone="success" title="API documentation — tier 4–5 complete (Track D 9/9)">
        Done sw-1–sw-9: golden wire examples, 400/404 examples, report/event DTOs, pack members + publish examples, npm run openapi:export, Jest contract tests, CI openapi drift check. Spec: medication.md §16.7.
      </Callout>
      <Callout tone="success" title="Core loop — done (May 2026)">
        End-to-end: view MAR → record Due cell → PRN + → supply delivery → history filters → manager review → correct record → export HTML. Migrations: 20260605120000_supply, 20260605140000_corrections, 20260605160000_review_snapshots.
      </Callout>
      <Row gap={8} wrap>
        {MEDICATION_TRACKS.map(t => (
          <Pill
            key={t.id}
            active={track === t.id}
            tone={t.done === t.total ? "success" : t.tone}
            onClick={() => setTrack(t.id)}
          >
            {t.label} · {t.done}/{t.total}
          </Pill>
        ))}
        <Pill active={track === "all"} onClick={() => setTrack("all")}>All tracks</Pill>
      </Row>
      <Callout tone="info" title="Spec">
        Full product spec: canvases/medication.md · HTML reference: careflow-medication-records.html (do not rename vendors in UI).
      </Callout>
      <Card>
        <CardHeader trailing={
          <Pill tone={completed.length === todos.length ? "success" : "warning"} size="sm">
            {completed.length}/{todos.length} done
          </Pill>
        }>
          Tasks — use Done filter to review completed work
        </CardHeader>
        <CardBody>
          <TaskListPanel
            todos={todos}
            filterKey={`medication.tasks.${track}`}
            title={
              track === "proto" ? "Track A — HTML prototype"
              : track === "backend" ? "Track B — Backend"
              : track === "swagger" ? "Track D — OpenAPI / Swagger"
              : track === "react" ? "Track C — care-admin React"
              : "Phase 9 — all tracks"
            }
          />
        </CardBody>
      </Card>
      <H3>care-admin routes (?view=)</H3>
      <Table headers={["Screen", "URL", "Component"]} rows={MEDICATION_ROUTES} striped />
      <H3>Backend APIs shipped</H3>
      <Table headers={["Area", "Endpoint", "Notes"]} rows={MEDICATION_API_SHIPPED} striped />
      <H3>OpenAPI maturity tiers</H3>
      <Table headers={["Tier", "Requirement", "Status"]} rows={MEDICATION_SWAGGER_MATURITY} striped />
      <H3>OpenAPI coverage by area</H3>
      <Table headers={["Area", "~% enterprise", "Gap / next step"]} rows={MEDICATION_SWAGGER_BY_AREA} striped />
      <H3>Prototype vs React parity</H3>
      <Table headers={["Feature", "HTML prototype", "care-admin React"]} rows={PROTOTYPE_PARITY} striped />
      <H3>Future todos (backlog)</H3>
      <Table headers={["ID", "Area", "Task", "Notes"]} rows={MEDICATION_FUTURE_TODOS} striped />
      <H3>Remaining gaps</H3>
      <Table headers={["Gap", "Today", "Track"]} rows={PRODUCTION_GAPS} striped />
      <Table headers={["Decision", "Choice", "Why"]} rows={MEDICATION_DECISIONS} striped />
      <Table headers={["Area", "What exists", "Status"]} rows={MEDICATION_INVENTORY} striped />
      <H3>Status codes — spec defaults (§6)</H3>
      <Table headers={["Code", "Label", "Color", "Category", "Reason?", "Review?"]} rows={MEDICATION_STATUS_CODES} striped />
      <H3>Enum gap — API vs spec</H3>
      <Table headers={["Mapping", "In system?", "Notes"]} rows={MEDICATION_ENUM_GAP} striped />
      {track === "all" && inProgress.length > 0 && (
        <>
          <H3>In progress ({inProgress.length})</H3>
          <TodoList todos={inProgress} />
        </>
      )}
      {track === "all" && pending.length > 0 && (
        <>
          <H3>Pending ({pending.length})</H3>
          <TodoList todos={pending} />
        </>
      )}
    </Stack>
  );
}

function PhasesView() {
  const [activePhaseRaw, setActivePhase] = useCanvasState<string>("phases.active", "p9");
  const activePhase = activePhaseRaw ?? "p9";
  const currentPhase = ALL_PHASES.find(p => p.id === activePhase) ?? NEXT_PHASES[4];
  const currentTodos = PHASE_TODOS[activePhase] ?? PHASE_TODOS.p9 ?? [];
  return (
    <Stack gap={16}>
      <Text tone="secondary" size="small">Foundation (complete)</Text>
      <Row gap={8} wrap>
        {FOUNDATION_PHASES.map(p => {
          const done = (PHASE_TODOS[p.id] ?? []).filter(t => t.status === "completed").length;
          const total = (PHASE_TODOS[p.id] ?? []).length;
          return (
            <Pill key={p.id} active={activePhase === p.id} tone="success" onClick={() => setActivePhase(p.id)}>
              {p.label.split("—")[0].trim()} · {done}/{total}
            </Pill>
          );
        })}
      </Row>
      <Text tone="secondary" size="small">Plan + follow-on</Text>
      <Row gap={8} wrap>
        {NEXT_PHASES.map(p => {
          const done = (PHASE_TODOS[p.id] ?? []).filter(t => t.status === "completed").length;
          const total = (PHASE_TODOS[p.id] ?? []).length;
          return (
            <Pill key={p.id} active={activePhase === p.id} tone={done === total ? "success" : p.tone} onClick={() => setActivePhase(p.id)}>
              {p.label.split("—")[0].trim()} · {done}/{total}
            </Pill>
          );
        })}
      </Row>
      <Card>
        <CardHeader trailing={<Pill tone={currentPhase.tone} size="sm">{currentPhase.duration}</Pill>}>
          {currentPhase.label}
        </CardHeader>
        <CardBody>
          <TaskListPanel
            todos={currentTodos}
            filterKey={`phases.tasks.${activePhase}`}
            title={currentPhase.label}
          />
        </CardBody>
      </Card>
    </Stack>
  );
}

export default function EnterprisePlan() {
  const [viewRaw, setView] = useCanvasState<View>("plan.view", "overview");
  const view: View = viewRaw ?? "overview";
  const VIEWS: { id: View; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "medication", label: "Medication (P9)" },
    { id: "blister", label: "Blister pack (P10)" },
    { id: "audit", label: "Audit log" },
    { id: "structure", label: "Folder Structure" },
    { id: "patterns", label: "Patterns" },
    { id: "phases", label: "Phases & Tasks" },
    { id: "roadmap", label: "Roadmap" },
  ];
  return (
    <Stack gap={24} style={{ maxWidth: 920, margin: "0 auto", padding: "24px 20px 48px" }}>
      <Stack gap={4}>
        <H1>CareAdmin — Enterprise Architecture</H1>
        <Text tone="secondary">
          Phases 1–8 complete. P9 medication {MEDICATION_DONE}/{MEDICATION_TOTAL}. Audit {AUDIT_DONE}/{AUDIT_TOTAL}. P10 blister {BLISTER_DONE}/{BLISTER_TOTAL}. Clinical modules: IA Sprint 1 done (see initial-assessment-enterprise-plan.canvas.tsx); Body Map proto mostly done (body-map-plan.canvas.tsx). May 2026.
        </Text>
      </Stack>
      <Row gap={8}>{VIEWS.map(v => <Pill key={v.id} active={view === v.id} onClick={() => setView(v.id)}>{v.label}</Pill>)}</Row>
      <Divider />
      {view === "overview" && <OverviewView />}
      {view === "medication" && <MedicationView />}
      {view === "blister" && <BlisterView />}
      {view === "audit" && <AuditView />}
      {view === "structure" && <StructureView />}
      {view === "patterns" && <PatternsView />}
      {view === "phases" && <PhasesView />}
      {view === "roadmap" && <RoadmapView />}
      <Text tone="tertiary" size="small">
        Plan 64/64 + follow-on 10/10 · P9 {MEDICATION_DONE}/{MEDICATION_TOTAL} · Audit {AUDIT_DONE}/{AUDIT_TOTAL} · P10 blister {BLISTER_DONE}/{BLISTER_TOTAL} · Updated May 2026
      </Text>
    </Stack>
  );
}
