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
  | "phases"
  | "backend"
  | "frontend"
  | "mar"
  | "swagger"
  | "prototype"
  | "database"
  | "api"
  | "roadmap";

type PhaseId = "p0" | "p1" | "p2" | "p3" | "p4" | "mar";
type TrackFilter = "all" | "proto" | "backend" | "react" | "mar" | "swagger" | "qa";
type TaskFilter = "all" | "done" | "active" | "pending";

/** Track A — HTML UX contract (careflow-body-map.html + anatomy assets) */
const PROTO_TODOS: TodoItem[] = [
  { id: "a0", status: "completed", content: "A0 — Clinical line art assets: assets/new.svg (798×815 dual figure), anatomy-reference-front.png" },
  { id: "a0b", status: "completed", content: "A0b — anatomy-map.html: 143 muscle regions + line-traced figure (scripts/build-anatomy-map.js)" },
  { id: "a0c", status: "completed", content: "A0c — references/anatomy-map-muscle-reference.html + careflow-body-map-anatomy.js (139 regions, 9 zoom views)" },
  { id: "a1", status: "completed", content: "A1 — careflow-body-map.html: main screen, catalog regions, clinical decor from new.svg" },
  { id: "a2", status: "completed", content: "A2 — HTML prototype: main screen (header + canvas + table + drawer)" },
  { id: "a3", status: "completed", content: "A3 — Marker placement, hover preview, drawer, table↔marker sync, zoom/pan" },
  { id: "a4", status: "completed", content: "A4 — 5-step Add Body Map Record wizard (type/subtype, location, observation, cause, action)" },
  { id: "a5", status: "completed", content: "A5 — Safeguarding checklist modal on unknown cause / before save" },
  { id: "a6", status: "in_progress", content: "A6 — Wound initial assessment + ongoing review forms (drawer/timeline only — dedicated forms TBD)" },
  { id: "a7", status: "in_progress", content: "A7 — Pressure area form + blanching check UI (sample record only — form TBD)" },
  { id: "a8", status: "completed", content: "A8 — Cream + patch workflows in HTML prototype (production: MAR wizard + §9.3 rules)" },
  { id: "a9", status: "completed", content: "A9 — Manager review queue page + filter chips + Review action" },
  { id: "a10", status: "completed", content: "A10 — CQC evidence export preview (body images, active records, gaps, audit excerpt)" },
  { id: "a11", status: "pending", content: "A11 — Mobile/tablet layout (large tap targets, photo capture, handover preview)" },
  { id: "a12", status: "pending", content: "A12 — UX sign-off against body-map.md §26 acceptance criteria" },
];

/** Phase 1 backend — core schema + APIs (body-map.md §19, §20, §25 Phase 1) */
const P1_BACKEND_TODOS: TodoItem[] = [
  { id: "b1-1", status: "completed", content: "B1.1 — Prisma enums: recordType, subType, bodyView, side, bodyPart, markerType, riskLevel, recordStatus" },
  { id: "b1-2", status: "completed", content: "B1.2 — body_map_records table + migration (§19.2 fields)" },
  { id: "b1-3", status: "completed", content: "B1.3 — body_map_markers table + migration (§19.3 — x/y coordinates)" },
  { id: "b1-4", status: "completed", content: "B1.4 — body_map_observations — JSON observationDetails (dedicated table deferred)" },
  { id: "b1-5", status: "completed", content: "B1.5 — body_map_photos table + secure file storage (BodyMapPhoto)" },
  { id: "b1-6", status: "in_progress", content: "B1.6 — body_map_actions table — stored in observationDetails.actions until dedicated table" },
  { id: "b1-7", status: "completed", content: "B1.7 — body_map_reviews table (§19.4)" },
  { id: "b1-8", status: "completed", content: "B1.8 — body_map_audit_logs table (no hard delete — §18)" },
  { id: "b1-9", status: "completed", content: "B1.9 — GET /body-map/lookups — record types, sub-types, body parts catalogue" },
  { id: "b1-10", status: "completed", content: "B1.10 — BodyMapModule (NestJS) + register in AppModule" },
  { id: "b1-11", status: "completed", content: "B1.11 — GET /service-users/:id/body-map — records with nested markers" },
  { id: "b1-12", status: "completed", content: "B1.12 — GET /service-users/:id/body-map/summary — header KPIs (active count, last review)" },
  { id: "b1-13", status: "completed", content: "B1.13 — POST /body-map/records — create + safeguarding trigger evaluation" },
  { id: "b1-14", status: "completed", content: "B1.14 — GET /body-map/records/:id — full record detail (observations, markers, photos, actions)" },
  { id: "b1-15", status: "completed", content: "B1.15 — PATCH /body-map/records/:id — update with edit reason + audit" },
  { id: "b1-16", status: "completed", content: "B1.16 — POST /body-map/records/:id/markers + PATCH /body-map/markers/:id" },
  { id: "b1-17", status: "completed", content: "B1.17 — POST /body-map/records/:id/photos (consent GRANTED required)" },
  { id: "b1-18", status: "completed", content: "B1.18 — POST /body-map/records/:id/reviews (+ actions in JSON until B1.6 table)" },
  { id: "b1-19", status: "completed", content: "B1.19 — POST /body-map/records/:id/close — status transition + closure note" },
  { id: "b1-20", status: "completed", content: "B1.20 — GET /body-map/audit/:recordId — audit trail for record" },
  { id: "b1-21", status: "completed", content: "B1.21 — Permissions seed: body_map.read/create/update/review/close (§17)" },
  { id: "b1-22", status: "pending", content: "B1.22 — E2E: create record with marker, list, close with audit" },
];

/** Phase 1 frontend — core screen (body-map.md §2, §3, §25 Phase 1) */
const P1_FRONTEND_TODOS: TodoItem[] = [
  { id: "r1-0", status: "completed", content: "R1.0 — Module tab icon in ServiceUserModuleTabs" },
  { id: "r1-1", status: "completed", content: "R1.1 — Route /service-users/:id/body-map + TanStack Query prefetch loader" },
  { id: "r1-2", status: "completed", content: "R1.2 — Wire body-map tab `to` prop in ServiceUserModuleTabs" },
  { id: "r1-3", status: "completed", content: "R1.3 — Scaffold features/service-users/body-map/: api, keys.ts, types.ts, hooks" },
  { id: "r1-4", status: "completed", content: "R1.4 — ServiceUserBodyMapPage shell + loading/error states" },
  { id: "r1-5", status: "completed", content: "R1.5 — BodyMapHeader: name, DOB, photo, care type, risk flags, allergies (§2.1)" },
  { id: "r1-6", status: "completed", content: "R1.6 — Header deep links: care plan, MAR/eMAR, profile" },
  { id: "r1-7", status: "completed", content: "R1.7 — BodyMapCanvas: 139 regions, 9 zoom views (prototype engine in care-admin/public/body-map/)" },
  { id: "r1-8", status: "completed", content: "R1.8 — Canvas zoom in/out + pan (§2.2)" },
  { id: "r1-9", status: "completed", content: "R1.9 — Marker placement on region tap or free click → x/y + bodyPart" },
  { id: "r1-10", status: "completed", content: "R1.10 — MarkerRenderer: type/status/risk visual styles (§3.3)" },
  { id: "r1-11", status: "completed", content: "R1.11 — Marker hover preview + click opens RecordDetailDrawer" },
  { id: "r1-12", status: "completed", content: "R1.12 — BodyMapRecordsTable: type, location, risk, status, review due" },
  { id: "r1-13", status: "completed", content: "R1.13 — Table row click → switch body view + highlight marker (§3.1)" },
  { id: "r1-14", status: "completed", content: "R1.14 — AddBodyMapRecordWizard Step 1–2: type, sub-type, location + marker" },
  { id: "r1-15", status: "completed", content: "R1.15 — Wizard Step 3: observation (description, pain, skin intact)" },
  { id: "r1-16", status: "completed", content: "R1.16 — Wizard Step 4–5: cause + action + review date" },
  { id: "r1-17", status: "completed", content: "R1.17 — Show Cleared toggle — hide/show resolved markers (§2.2)" },
  { id: "r1-18", status: "completed", content: "R1.18 — Photo upload in drawer with consent gate (§16.1)" },
  { id: "r1-19", status: "completed", content: "R1.19 — RecordDetailDrawer: reviews, audit, photos, links, wound/pressure display" },
  { id: "r1-20", status: "completed", content: "R1.20 — Print body map (browser print of page)" },
  { id: "r1-21", status: "completed", content: "R1.21 — useBodyMapMutations: create, close, addReview" },
  { id: "r1-22", status: "completed", content: "R1.22 — BodyMapCompactHeader + BodyMapSummaryStrip (page chrome + KPI strip)" },
  { id: "r1-23", status: "completed", content: "R1.23 — BodyMapMarkerLegend + BodyMapMarkerPreview (canvas marker UX)" },
  { id: "r1-24", status: "completed", content: "R1.24 — BodyMapRegionPicker + place-marker-from-region util (region-first placement)" },
];

/** Phase 2 backend — safeguarding, wound, pressure, links (§6–8, §13, §25 Phase 2) */
const P2_BACKEND_TODOS: TodoItem[] = [
  { id: "b2-1", status: "completed", content: "B2.1 — body_map_safeguarding_checks table + migration" },
  { id: "b2-2", status: "completed", content: "B2.2 — Safeguarding trigger engine on create (evaluateSafeguardingTrigger)" },
  { id: "b2-3", status: "completed", content: "B2.3 — Safeguarding checklist on create + POST …/safeguarding-check" },
  { id: "b2-4", status: "completed", content: "B2.4 — Block save when safeguarding triggered without checklist" },
  { id: "b2-5", status: "completed", content: "B2.5 — body_map_wound_assessments table (§7.1)" },
  { id: "b2-6", status: "completed", content: "B2.6 — POST /body-map/records/:id/wound-assessment (+ on create)" },
  { id: "b2-7", status: "completed", content: "B2.7 — Wound status lifecycle automation New→Healed→Closed (§7.3)" },
  { id: "b2-8", status: "completed", content: "B2.8 — body_map_pressure_assessments table (§8.1)" },
  { id: "b2-9", status: "completed", content: "B2.9 — POST /body-map/records/:id/pressure-assessment (+ on create)" },
  { id: "b2-10", status: "completed", content: "B2.10 — Non-blanching → manager review / AWAITING_REVIEW (§8.2)" },
  { id: "b2-11", status: "completed", content: "B2.11 — body_map_links + POST /body-map/records/:id/link" },
  { id: "b2-12", status: "completed", content: "B2.12 — Link validation by module (MAR links medication UUID; other modules TBD)" },
  { id: "b2-13", status: "completed", content: "B2.13 — body_map_alerts table + alert generation service (§15.3)" },
  { id: "b2-14", status: "completed", content: "B2.14 — GET /body-map/review-queue" },
  { id: "b2-15", status: "pending", content: "B2.15 — GET /body-map/alerts — alert list for dashboard" },
  { id: "b2-16", status: "completed", content: "B2.16 — Close: manager sign-off for high-risk / safeguarding (§12)" },
  { id: "b2-17", status: "pending", content: "B2.17 — Warning rules: duplicate nearby, repeated bruising (§16.2)" },
  { id: "b2-18", status: "pending", content: "B2.18 — E2E: safeguarding trigger → checklist → manager queue" },
];

/** Phase 2 frontend — workflows + manager queue */
const P2_FRONTEND_TODOS: TodoItem[] = [
  { id: "r2-1", status: "completed", content: "R2.1 — SafeguardingChecklistDialog — full §6.2 fields on save" },
  { id: "r2-2", status: "in_progress", content: "R2.2 — Cause step in wizard (causeKnown, consistent) — post-fall/hospital flags TBD" },
  { id: "r2-3", status: "in_progress", content: "R2.3 — Action step in wizard — manager informed; GP/DN contact list TBD" },
  { id: "r2-4", status: "completed", content: "R2.4 — Record drawer: add link (care plan, MAR med picker, incident…) — incident ID TBD" },
  { id: "r2-5", status: "pending", content: "R2.5 — Care plan + risk assessment update flags + deep link" },
  { id: "r2-6", status: "in_progress", content: "R2.6 — Wound fields in wizard (type, exudate, dressing) — dedicated review form TBD" },
  { id: "r2-7", status: "completed", content: "R2.7 — WoundReviewForm — compare to previous: better/same/worse (§7.2)" },
  { id: "r2-8", status: "in_progress", content: "R2.8 — Pressure fields in wizard (risk tool, blanching, repositioning)" },
  { id: "r2-9", status: "in_progress", content: "R2.9 — nextReviewAt in wizard — required policy TBD" },
  { id: "r2-10", status: "in_progress", content: "R2.10 — Status badges in drawer/table — full lifecycle UI TBD" },
  { id: "r2-11", status: "completed", content: "R2.11 — BodyMapReviewQueuePage at /body-map/review-queue" },
  { id: "r2-12", status: "in_progress", content: "R2.12 — Queue quick actions — Open map done; escalate/export TBD" },
  { id: "r2-13", status: "pending", content: "R2.13 — Pain mapping dedicated form (§10)" },
  { id: "r2-14", status: "pending", content: "R2.14 — Medical device mark form (§11)" },
  { id: "r2-15", status: "in_progress", content: "R2.15 — Alert banners: MAR/body-map medication alerts shipped; wound/safeguarding TBD" },
  { id: "r2-16", status: "completed", content: "R2.16 — Canvas 9 views: dual, face, chest, arms, hands, feet, etc." },
  { id: "r2-17", status: "completed", content: "R2.17 — BodyMapRegionCoverage sidebar + CloseBodyMapRecordDialog" },
  { id: "r2-18", status: "completed", content: "R2.18 — CQC export JSON download on body map toolbar" },
];

/** Phase 3 backend — medication site map (§9) */
const P3_BACKEND_TODOS: TodoItem[] = [
  { id: "b3-1", status: "completed", content: "B3.1 — body_map_medication_sites table (cream, patch, injection, spray fields)" },
  { id: "b3-2", status: "completed", content: "B3.2 — POST /body-map/records/:id/medication-site — cream/ointment/lotion workflow (§9.1)" },
  { id: "b3-3", status: "completed", content: "B3.3 — Patch workflow fields: old patch, removal time, disposal, next change (§9.2) — MAR M1/M2" },
  { id: "b3-4", status: "completed", content: "B3.4 — Patch safety rules: block new patch without old patch check (§9.3)" },
  { id: "b3-5", status: "completed", content: "B3.5 — Site rotation check — warn same location repeatedly (§9.3)" },
  { id: "b3-6", status: "completed", content: "B3.6 — MAR link: serviceUserMedicationId + optional lastAdministrationEventId (M3.6–M3.7)" },
  { id: "b3-7", status: "completed", content: "B3.7 — Medication alerts: missing site + patch overdue on summary (§15.2)" },
  { id: "b3-8", status: "completed", content: "B3.8 — MEDICATION create requires marker + MAR link (wizard + policy)" },
  { id: "b3-9", status: "completed", content: "B3.9 — Handover export includes active patch locations (§9.3 hospital transfer)" },
  { id: "b3-10", status: "pending", content: "B3.10 — E2E: patch apply with old removal → MAR link → next change due" },
];

/** Phase 3 frontend — medication site map (summary — detail in MAR phase) */
const P3_FRONTEND_TODOS: TodoItem[] = [
  { id: "r3-1", status: "completed", content: "R3.1 — Show medication sites toggle on canvas (§2.2)" },
  { id: "r3-2", status: "completed", content: "R3.2 — CreamApplicationForm — medicine, location marker, frequency, MAR link, fire risk (§9.1)" },
  { id: "r3-3", status: "completed", content: "R3.3 — PatchApplicationForm — old patch map + removal + disposal + new site (§9.2)" },
  { id: "r3-8", status: "completed", content: "R3.8 — Medication site records in table with filter (§14.2)" },
  { id: "r3-4", status: "completed", content: "R3.4 — Patch safety UI: block save, rotation warning, overdue alert" },
  { id: "r3-5", status: "completed", content: "R3.5 — MAR administration picker: recent events dropdown + link/unlink on site (§9 CQC dose-at-site evidence)" },
  { id: "r3-6", status: "completed", content: "R3.6 — Entry from MAR: patch due → open body map (M3.9)" },
  { id: "r3-7", status: "completed", content: "R3.7 — Distinct injection/spray marker styles on canvas (§3.3)" },
];

/**
 * Phase MAR — Body map ↔ MAR two-way integration
 * Detailed spec: canvas-types/body-map-mar-integration.md (tasks M0–M5)
 */
const MAR_BACKEND_TODOS: TodoItem[] = [
  { id: "m0-1", status: "completed", content: "M0.1 — requiresBodyMapSite on MedicationType + MedicationRoute (Prisma)" },
  { id: "m0-2", status: "completed", content: "M0.2 — Seed flags: CREAM, OINTMENT, PATCH, INJECTION, TOPICAL, TRANSDERMAL…" },
  { id: "m0-3", status: "completed", content: "M0.3 — Seed LOTION, SPRAY types + TRANSDERMAL route" },
  { id: "m0-4", status: "completed", content: "M0.4 — medication-lookups bundle exposes requiresBodyMapSite" },
  { id: "m0-6", status: "completed", content: "M0.6 — GET /body-map/lookups medicationSubTypeByMarTypeCode mapping" },
  { id: "m1-1", status: "completed", content: "M1.1 — BodyMapMedicationSite model + migration (1:1 record, FK serviceUserMedicationId)" },
  { id: "m1-2", status: "completed", content: "M1.2 — Cream/ointment fields + patch fields (§9.1–9.2)" },
  { id: "m1-6", status: "completed", content: "M1.6 — POST /body-map/records accepts nested medicationSite (MEDICATION type)" },
  { id: "m1-7", status: "completed", content: "M1.7 — POST /body-map/records/:id/medication-site upsert (maps b3-2)" },
  { id: "m1-9", status: "completed", content: "M1.9 — Validate serviceUserMedicationId same service user" },
  { id: "m1-10", status: "completed", content: "M1.10 — Validate linked med requiresBodyMapSite (REQUIRED policy env)" },
  { id: "m1-11", status: "completed", content: "M1.11 — Audit MEDICATION_SITE_CREATE / MEDICATION_SITE_UPDATE" },
  { id: "m1-12", status: "completed", content: "M1.12 — BodyMapLink MAR uses medication UUID not service user id" },
  { id: "m1-13", status: "completed", content: "M1.13 — DTOs + Swagger for medication-site endpoints" },
  { id: "m3-1", status: "completed", content: "M3.1 — GET …/medications/:medicationId/body-map-site" },
  { id: "m3-2", status: "completed", content: "M3.2 — POST …/medications/:medicationId/body-map-site create/link from MAR" },
  { id: "m3-7", status: "completed", content: "M3.7 — PATCH …/medication-site/administration → lastAdministrationEventId" },
  { id: "m3-8", status: "completed", content: "M3.8 — MAR calendar: icon when due med has no body site" },
  { id: "m4-1", status: "completed", content: "M4.1 — Patch save rules: old patch removed + disposal (§9.3)" },
  { id: "m4-2", status: "completed", content: "M4.2 — GET patch-rotation-check + warnings on create" },
  { id: "m4-3", status: "completed", content: "M4.3 — serviceUserMedicationId required on medication site (policy)" },
  { id: "m4-4", status: "completed", content: "M4.4 — Alert: topical/patch med without body site (summary.medicationAlerts)" },
  { id: "m4-5", status: "completed", content: "M4.5 — Alert: patch nextChangeDue overdue" },
  { id: "m4-6", status: "completed", content: "M4.6 — Patch safety UI in wizard (errors + rotation warn)" },
  { id: "m4-7", status: "completed", content: "M4.7 — Export includes handoverPatchSites (extends JSON export)" },
];

const MAR_FRONTEND_TODOS: TodoItem[] = [
  { id: "m0-5", status: "completed", content: "M0.5 — isBodyMapSiteMedication() util in care-admin" },
  { id: "m2-1", status: "completed", content: "M2.1 — Active med picker filtered by requiresBodyMapSite" },
  { id: "m2-2", status: "completed", content: "M2.2 — MEDICATION wizard: select chart medication (required policy)" },
  { id: "m2-3", status: "completed", content: "M2.3 — CreamApplicationForm (fire risk, consent) — maps r3-2" },
  { id: "m2-4", status: "completed", content: "M2.4 — PatchApplicationForm (old patch, disposal) — maps r3-3" },
  { id: "m2-5", status: "completed", content: "M2.5 — Injection/spray notes in wizard" },
  { id: "m2-6", status: "completed", content: "M2.6 — Drawer: medication site section + Open in MAR" },
  { id: "m2-7", status: "completed", content: "M2.7 — Records table filter: medication sites only" },
  { id: "m2-8", status: "completed", content: "M2.8 — Block save MEDICATION without MAR link + consent" },
  { id: "m2-9", status: "completed", content: "M2.9 — Canvas marker tooltip shows linked medicine name" },
  { id: "m3-3", status: "completed", content: "M3.3 — AddMedicationDialog: prompt Add body site after save" },
  { id: "m3-4", status: "completed", content: "M3.4 — EditMedicationDialog: body site status chip" },
  { id: "m3-5", status: "completed", content: "M3.5 — MedicationRecordsTab: Site on map column" },
  { id: "m3-6", status: "completed", content: "M3.6 — RecordAdministrationDialog: confirm/link body site" },
  { id: "m3-9", status: "completed", content: "M3.9 — MAR calendar: Open body map for patch change (§24.3)" },
  { id: "m5-1", status: "pending", content: "M5.1 — E2E: add patch on MAR → body site prompt → linked" },
  { id: "m5-2", status: "pending", content: "M5.2 — E2E: body map med site → select existing cream line" },
  { id: "m5-3", status: "pending", content: "M5.3 — E2E: patch change — removal → new marker → MAR Given (qa-3)" },
  { id: "m5-4", status: "pending", content: "M5.4 — E2E: oral paracetamol — no body map prompt" },
  { id: "m5-5", status: "pending", content: "M5.5 — Verify body-map.md §26 MAR/medication rows" },
];

const MAR_TODOS: TodoItem[] = [...MAR_BACKEND_TODOS, ...MAR_FRONTEND_TODOS];

/** Phase 4 backend — enterprise governance (§21–22, §25 Phase 4) */
const P4_BACKEND_TODOS: TodoItem[] = [
  { id: "b4-1", status: "completed", content: "B4.1 — CQC export JSON v1 + GET …/export/pdf (pdfkit §21)" },
  { id: "b4-2", status: "completed", content: "B4.2 — GET /body-map/records/:recordId/cqc-evidence + inspection dialog" },
  { id: "b4-3", status: "completed", content: "B4.3 — GET /body-map/analytics — branch aggregates + review queue panel" },
  { id: "b4-4", status: "pending", content: "B4.4 — Branch reports: by service user, staff, issue type, body part, overdue rate (§22.2)" },
  { id: "b4-5", status: "pending", content: "B4.5 — body_map_templates table + GET /body-map/templates — configurable templates" },
  { id: "b4-6", status: "pending", content: "B4.6 — Advanced audit: photo remove with manager approval, export logging (§18)" },
  { id: "b4-7", status: "in_progress", content: "B4.7 — Role-based permissions: export key + handover API; UI gates on map/drawer (§17)" },
  { id: "b4-8", status: "completed", content: "B4.8 — Governance alerts: BodyMapGovernanceAlertsPanel + BodyMapAttentionPanel (§15.3)" },
  { id: "b4-9", status: "completed", content: "B4.9 — Outstanding gaps in export JSON + PDF (body-map-gaps.util)" },
  { id: "b4-10", status: "completed", content: "B4.10 — CQC Inspector role (seed) + inspection-only UI + auditor perms" },
];

/** Phase 4 frontend — enterprise + mobile */
const P4_FRONTEND_TODOS: TodoItem[] = [
  { id: "r4-1", status: "completed", content: "R4.1 — CQC evidence pack (?view=export) + print + PDF download" },
  { id: "r4-2", status: "completed", content: "R4.2 — BodyMapAnalyticsPanel + attention widgets on service user map (§22.1); branch CSV TBD" },
  { id: "r4-3", status: "pending", content: "R4.3 — Branch reports UI — filters + export CSV" },
  { id: "r4-4", status: "completed", content: "R4.4 — Full audit trail list in record drawer (§18)" },
  { id: "r4-5", status: "completed", content: "R4.5 — Role-based UI gates + inspection-only mode (§17)" },
  { id: "r4-6", status: "pending", content: "R4.6 — Mobile/tablet responsive layout — large tap targets (§23)" },
  { id: "r4-7", status: "pending", content: "R4.7 — Offline draft support — IndexedDB + sync on reconnect (§23)" },
  { id: "r4-8", status: "completed", content: "R4.8 — Handover preview API + UI on body map + MAR (§23, §13)" },
  { id: "r4-9", status: "completed", content: "R4.9 — Quick review: Checked, no change (§23)" },
  { id: "r4-10", status: "pending", content: "R4.10 — Photo capture from device camera + compression (§23)" },
  { id: "r4-11", status: "pending", content: "R4.11 — Configurable record type templates (admin settings)" },
  { id: "r4-12", status: "completed", content: "R4.12 — Inspection read-only mode (isBodyMapInspectionOnly)" },
];

/** OpenAPI / contract */
const SWAGGER_TODOS: TodoItem[] = [
  { id: "sw-1", status: "completed", content: "SW1 — @ApiTags Body Map + bearer auth on routes" },
  { id: "sw-2", status: "pending", content: "SW2 — Request/response DTOs for records, markers, wound, pressure, medication, safeguarding" },
  { id: "sw-3", status: "pending", content: "SW3 — @ApiStandardResponses (400/401/403/404) on all endpoints" },
  { id: "sw-4", status: "pending", content: "SW4 — Golden examples: GET body-map list, POST record+marker, POST safeguarding-check" },
  { id: "sw-5", status: "pending", content: "SW5 — openapi:export includes body-map routes; CI drift check" },
  { id: "sw-6", status: "pending", content: "SW6 — Contract tests: body-map-api.examples.spec + openapi.contract.spec" },
];

/** QA / integration */
const QA_TODOS: TodoItem[] = [
  { id: "qa-1", status: "pending", content: "QA1 — E2E: full bruise journey (§24.1) — add → safeguarding → manager review → close" },
  { id: "qa-2", status: "pending", content: "QA2 — E2E: wound review journey (§24.2) — progression tracking + escalation" },
  { id: "qa-3", status: "in_progress", content: "QA3 — E2E: patch journey (§24.3) — features shipped; automated test pending (M5.3)" },
  { id: "qa-4", status: "pending", content: "QA4 — E2E: pressure area journey (§24.4) — risk assessment prompt + care plan" },
  { id: "qa-5", status: "pending", content: "QA5 — Acceptance checklist §26 — all 22 criteria verified" },
  { id: "qa-6", status: "in_progress", content: "QA6 — Initial assessment handoff: §11 SkinPressureSection body map CTA shipped; baseline verify pending" },
];

const PHASE_META: { id: PhaseId; label: string; spec: string }[] = [
  { id: "p0", label: "Phase 0 — HTML prototype", spec: "body-map.md — UX contract before React" },
  { id: "p1", label: "Phase 1 — Strong core", spec: "§25 Phase 1 · shipped in care-admin + careadmin-backend" },
  { id: "p2", label: "Phase 2 — Risk & workflow", spec: "§25 Phase 2 · mostly shipped — alerts/E2E pending" },
  { id: "p3", label: "Phase 3 — Medication (legacy)", spec: "§9 b3/r3 — superseded by MAR; most items done" },
  { id: "mar", label: "Phase MAR — Body map ↔ MAR", spec: "body-map-mar-integration.md · M0–M4 shipped · M3.8 + M5 QA next" },
  { id: "p4", label: "Phase 4 — Enterprise governance", spec: "§25 Phase 4 · governance alerts + analytics widgets shipped Jun 2026" },
];

const PHASE_TODOS: Record<PhaseId, TodoItem[]> = {
  p0: PROTO_TODOS,
  p1: [...P1_BACKEND_TODOS, ...P1_FRONTEND_TODOS],
  p2: [...P2_BACKEND_TODOS, ...P2_FRONTEND_TODOS],
  p3: [...P3_BACKEND_TODOS, ...P3_FRONTEND_TODOS],
  mar: MAR_TODOS,
  p4: [...P4_BACKEND_TODOS, ...P4_FRONTEND_TODOS],
};

const ALL_BACKEND = [...P1_BACKEND_TODOS, ...P2_BACKEND_TODOS, ...P3_BACKEND_TODOS, ...P4_BACKEND_TODOS];
const ALL_FRONTEND = [...P1_FRONTEND_TODOS, ...P2_FRONTEND_TODOS, ...P3_FRONTEND_TODOS, ...P4_FRONTEND_TODOS];
const ALL_MAR = MAR_TODOS;
const ALL_TODOS = [...PROTO_TODOS, ...ALL_BACKEND, ...ALL_FRONTEND, ...ALL_MAR, ...SWAGGER_TODOS, ...QA_TODOS];

function countDone(todos: readonly TodoItem[]): number {
  return todos.filter(t => t.status === "completed").length;
}

const PROTO_DONE = countDone(PROTO_TODOS);
const BE_DONE = countDone(ALL_BACKEND);
const RX_DONE = countDone(ALL_FRONTEND);
const SW_DONE = countDone(SWAGGER_TODOS);
const QA_DONE = countDone(QA_TODOS);
const TOTAL_DONE = countDone(ALL_TODOS);

const MAR_DONE = countDone(MAR_TODOS);

const PROGRESS_SEGMENTS = [
  { id: "proto", value: PROTO_DONE, color: "green" as const },
  { id: "backend", value: BE_DONE, color: "blue" as const },
  { id: "frontend", value: RX_DONE, color: "purple" as const },
  { id: "mar", value: MAR_DONE, color: "orange" as const },
  { id: "swagger", value: SW_DONE, color: "orange" as const },
  { id: "qa", value: QA_DONE, color: "orange" as const },
];

const SIX_AREAS: string[][] = [
  ["Body Map Concerns", "Bruises, cuts, burns, unexplained marks", "P1 core + P2 safeguarding"],
  ["Wound & Skin Integrity", "Wounds, tears, healing progress", "P2 wound workflow"],
  ["Medication Site Map", "Creams, patches, injections", "MAR M0–M4 ✓ (E2E M5)"],
  ["Safeguarding & Incident", "Triggers, checklist, incident link", "P2"],
  ["Review & Monitoring", "Lifecycle, overdue, manager queue", "P1 reviews + P2 queue"],
  ["CQC Evidence Centre", "Export, audit, inspection view", "P4"],
];

const DB_TABLES: string[][] = [
  ["body_map_records", "Main record", "P1"],
  ["body_map_markers", "Visual x/y locations", "P1"],
  ["body_map_observations", "JSON observationDetails", "P1"],
  ["body_map_photos", "Secure attachments + consent", "P1 ✓"],
  ["body_map_actions", "People informed (JSON until table)", "P1"],
  ["body_map_reviews", "Ongoing follow-up notes", "P1"],
  ["body_map_audit_logs", "Full history, no hard delete", "P1"],
  ["body_map_safeguarding_checks", "Trigger checklist answers", "P2 ✓"],
  ["body_map_wound_assessments", "Initial wound data", "P2 ✓"],
  ["body_map_pressure_assessments", "Pressure area fields", "P2 ✓"],
  ["body_map_medication_sites", "Cream, patch + serviceUserMedicationId", "MAR"],
  ["body_map_links", "Incident, care plan, MAR, referral", "P2 ✓"],
  ["body_map_alerts", "Generated alerts", "P2"],
  ["body_map_templates", "Configurable templates", "P4"],
];

const CORE_APIS: string[][] = [
  ["GET /service-users/:id/body-map", "All records + markers", "P1"],
  ["GET /service-users/:id/body-map/summary", "KPIs + medicationAlerts", "MAR M4"],
  ["GET …/body-map/patch-rotation-check", "Patch site rotation warnings", "M4"],
  ["POST /body-map/records", "Create record", "P1"],
  ["GET/PATCH /body-map/records/:id", "Detail + update", "P1"],
  ["POST/PATCH markers", "Add/update marker coordinates", "P1"],
  ["POST photos, reviews, close", "Evidence + follow-up", "P1 ✓"],
  ["POST safeguarding-check", "Checklist on trigger", "P2 ✓"],
  ["POST wound/pressure-assessment", "Type-specific tables", "P2 ✓"],
  ["POST medication-site", "Cream + patch workflows", "MAR"],
  ["GET …/medications/:id/body-map-site", "MAR lookup from chart", "MAR"],
  ["POST link", "Cross-module links", "P2 ✓"],
  ["GET review-queue", "Manager queue", "P2 ✓"],
  ["GET …/body-map/export", "CQC JSON v1 + handoverPatchSites", "M4 ✓"],
  ["GET cqc-evidence/:recordId", "Single record inspection view", "P4"],
  ["GET analytics", "Manager reports", "P4"],
  ["GET audit/:recordId", "Audit trail", "P1"],
];

const REACT_ROUTES: string[][] = [
  ["Main body map", "/service-users/:id/body-map", "ServiceUserBodyMapPage", "P1"],
  ["Manager review queue", "/body-map/review-queue", "BodyMapReviewQueuePage", "P2"],
  ["Branch dashboard widgets", "/dashboard (body map section)", "BodyMapDashboardWidgets", "P4"],
  ["CQC export", "/service-users/:id/body-map?view=export", "BodyMapExportTab", "P4"],
  ["From medication round", "/medication + ?linkMedicationId=", "Add med prompt + patch due CTA", "MAR ✓"],
  ["MAR medication alerts", "/medication + /body-map summary", "Missing site + patch overdue banners", "M4"],
  ["Handover preview", "Visit handover component", "Active markers summary", "P4"],
];

const ROADMAP: string[][] = [
  ["0 — First", "HTML prototype (Track A)", "Lock UX before React — mirror medication HTML pattern"],
  ["1 — Foundation", "Phase 1 core (BE + FE)", "Canvas, markers, records, table, drawer, photos, basic audit — not release-ready alone"],
  ["2 — Compliance", "Phase 2 safeguarding + wound + pressure", "Triggers, manager queue, linked modules — §26 wounds/pressure"],
  ["3 — Med safety", "Phase MAR (M0–M5 + r3-5)", "Two-way sites, patch §9.3, admin event picker, permissions, E2E §24.3 — §26 MAR row"],
  ["4 — Governance", "Phase 4 CQC + analytics + mobile", "PDF/inspection view §21, handover §13/§23, dashboard §22, offline, auditor role"],
  ["Parallel", "OpenAPI + contract tests", "Ship with each phase — not deferred to end"],
  ["Parallel", "QA user journeys §24", "One E2E per journey after its phase ships"],
];

const ARCHITECTURE_DECISIONS: string[][] = [
  ["Spec source", "canvas-types/body-map.md", "915-line enterprise plan — all tasks trace to sections"],
  ["Marker invariant", "Every saved record → visible marker on image", "§3 — non-negotiable; coordinates persisted"],
  ["Modular schema", "14 tables, not one monolithic table", "§19 — type-specific data in extension tables"],
  ["NestJS module", "body-map/ under careadmin-backend/src/", "Mirror service-user-observations + medications pattern"],
  ["React location", "features/service-users/body-map/", "Same as medication/ and observations/ co-location"],
  ["Data layer", "Pages → hooks → TanStack Query → api/", "Enterprise pattern from Phase 8"],
  ["Permissions", "body_map.* permission keys", "§17 — care worker create, manager close/export"],
  ["No hard delete", "Soft archive + audit_logs only", "§18 — CQC evidence requirement"],
  ["Initial assessment", "Section 11 skin integrity → body map baseline", "Link at QA6; not duplicate assessment"],
  ["Medication integration", "Link to ServiceUserMedication + optional AdministrationEvent", "Plan: canvas-types/body-map-mar-integration.md"],
  ["MAR execution tracker", "Phase MAR in this canvas (M0–M5)", "Supersedes b3/r3 checklist for implementation"],
];

const EXISTING_PLATFORM: string[][] = [
  ["Module tab + route", "ServiceUserModuleTabs + /service-users/:id/body-map", "Done"],
  ["Service user header data", "GET /service-users/:id — risk, allergies, care type", "Reuse in BodyMapHeader"],
  ["Observations module", "service-user-observations/", "Pattern reference for NestJS module"],
  ["Medication MAR", "service-user-medications/ + body-map MAR phase", "M0–M4 foundation; M5 + r3-5 + M4.8 for §26 sign-off"],
  ["Care plan", "/service-users/:id/care-plan", "Link target from body map records"],
  ["Audit log admin", "features/audit/", "Extend for body_map audit events"],
  ["Initial assessment §11", "careflow-initial-assessment-enterprise.html PX.15", "Body map modal stub — QA6 handoff"],
  ["Anatomy map", "anatomy-map.html + build-anatomy-map.js", "Line art + 143 F*/B* hit regions — not production module"],
  ["Clinical SVG", "assets/new.svg, body-map-diagram.svg", "Shared decor for body-map + anatomy-map"],
  ["Prisma schema", "service_users schema", "All body_map_* tables go here"],
];

const PROTO_ARTIFACTS: string[][] = [
  ["Main prototype", "careflow-body-map.html", "Canvas, markers, wizard, queue, CQC export"],
  ["Anatomy reference", "anatomy-map.html", "Clinical line trace + muscle hit layer"],
  ["Muscle catalog", "references/anatomy-map-muscle-reference.html", "Source for F*/B* region paths"],
  ["Region engine", "careflow-body-map-anatomy.js + catalog.js", "139 regions, 9 views, wire to new.svg"],
  ["Enterprise spec", "canvas-types/body-map.md", "915 lines — product rules"],
  ["MAR integration plan", "canvas-types/body-map-mar-integration.md", "M0–M5 tasks — sync with Phase MAR here"],
  ["Plan canvas", "body-map-plan.canvas.tsx", "This tracker — synced 1 Jun 2026"],
];

function countByStatus(todos: readonly TodoItem[], status: TodoStatus): number {
  return todos.filter(t => t.status === status).length;
}

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
      <Text tone="tertiary" size="small">{title} — showing {filtered.length} of {todos.length}</Text>
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
        <Stat value={`${PROTO_DONE}/${PROTO_TODOS.length}`} label="HTML prototype" tone="warning" />
      </Grid>
      <UsageBar
        total={ALL_TODOS.length}
        topLeftLabel="Body Map implementation progress"
        topRightLabel={`${TOTAL_DONE} / ${ALL_TODOS.length} tasks`}
        segments={PROGRESS_SEGMENTS}
      />
      <Callout tone="success" title="Phases 1–2 + MAR (M0–M4) shipped">
        Core body map, safeguarding, wound/pressure, review queue, and full MAR ↔ body map two-way integration (lookups, BodyMapMedicationSite, wizard, MAR UI, patch safety, rotation warnings, medication alerts, handover export).
        Next: M3.8 (MAR calendar missing-site icon), M5 automated E2E, Phase 4 analytics/PDF.
      </Callout>
      <Grid columns={4} gap={12}>
        <Stat value={`${countDone(P1_BACKEND_TODOS) + countDone(P1_FRONTEND_TODOS)}/${P1_BACKEND_TODOS.length + P1_FRONTEND_TODOS.length}`} label="Phase 1 — Core" tone="success" />
        <Stat value={`${countDone(P2_BACKEND_TODOS) + countDone(P2_FRONTEND_TODOS)}/${P2_BACKEND_TODOS.length + P2_FRONTEND_TODOS.length}`} label="Phase 2 — Workflow" tone="success" />
        <Stat value={`${MAR_DONE}/${MAR_TODOS.length}`} label="Phase MAR — Integration" tone={MAR_DONE >= MAR_TODOS.length - 6 ? "success" : "warning"} />
        <Stat value={`${countDone(P3_BACKEND_TODOS) + countDone(P3_FRONTEND_TODOS)}/${P3_BACKEND_TODOS.length + P3_FRONTEND_TODOS.length}`} label="Phase 3 (legacy b3/r3)" tone="success" />
      </Grid>
      <H3>Six connected product areas (§1)</H3>
      <Table headers={["Area", "Scope", "Phase"]} rows={SIX_AREAS} striped />
      <H3>Existing platform to reuse</H3>
      <Table headers={["Asset", "Location", "Status"]} rows={EXISTING_PLATFORM} striped />
      <H3>Prototype artifacts (shipped in repo)</H3>
      <Table headers={["Artifact", "Path", "Role"]} rows={PROTO_ARTIFACTS} striped />
    </Stack>
  );
}

function PhasesView() {
  const [activePhaseRaw, setActivePhase] = useCanvasState<PhaseId>("bodymap.phases.active", "p1");
  const activePhase: PhaseId = activePhaseRaw ?? "p1";
  const meta = PHASE_META.find(p => p.id === activePhase) ?? PHASE_META[1];
  const todos = PHASE_TODOS[activePhase] ?? [];
  const done = countDone(todos);
  return (
    <Stack gap={16}>
      <Row gap={8} wrap>
        {PHASE_META.map(p => {
          const pt = PHASE_TODOS[p.id] ?? [];
          const d = countDone(pt);
          return (
            <Pill
              key={p.id}
              active={activePhase === p.id}
              tone={d === pt.length ? "success" : "warning"}
              onClick={() => setActivePhase(p.id)}
            >
              {p.label.split("—")[0].trim()} · {d}/{pt.length}
            </Pill>
          );
        })}
      </Row>
      <Card>
        <CardHeader trailing={<Pill tone="warning" size="sm">{done}/{todos.length} done</Pill>}>
          {meta.label}
        </CardHeader>
        <CardBody>
          <Text tone="secondary" size="small">{meta.spec}</Text>
          <Divider />
          <TaskListPanel todos={todos} filterKey={`bodymap.phase.${activePhase}`} title={meta.label} />
        </CardBody>
      </Card>
    </Stack>
  );
}

function TrackView({ track }: { track: TrackFilter }) {
  const trackTodos: Record<TrackFilter, TodoItem[]> = {
    all: ALL_TODOS,
    proto: PROTO_TODOS,
    backend: ALL_BACKEND,
    react: ALL_FRONTEND,
    mar: MAR_TODOS,
    swagger: SWAGGER_TODOS,
    qa: QA_TODOS,
  };
  const todos = trackTodos[track];
  const labels: Record<TrackFilter, string> = {
    all: "All tracks",
    proto: "Track A — HTML prototype",
    backend: "Track B — Backend (NestJS + Prisma)",
    react: "Track C — care-admin React",
    mar: "Track F — MAR ↔ body map (body-map-mar-integration.md)",
    swagger: "Track D — OpenAPI / contract",
    qa: "Track E — QA / E2E journeys",
  };
  return (
    <Stack gap={16}>
      <TaskListPanel todos={todos} filterKey={`bodymap.track.${track}`} title={labels[track]} />
    </Stack>
  );
}

function TracksShell({ children, active, onSelect }: {
  active: TrackFilter;
  onSelect: (t: TrackFilter) => void;
  children?: JSX.Element | null;
}) {
  const tracks: { id: TrackFilter; label: string; done: number; total: number }[] = [
    { id: "proto", label: "Prototype", done: PROTO_DONE, total: PROTO_TODOS.length },
    { id: "backend", label: "Backend", done: BE_DONE, total: ALL_BACKEND.length },
    { id: "react", label: "Frontend", done: RX_DONE, total: ALL_FRONTEND.length },
    { id: "mar", label: "MAR", done: MAR_DONE, total: MAR_TODOS.length },
    { id: "swagger", label: "OpenAPI", done: SW_DONE, total: SWAGGER_TODOS.length },
    { id: "qa", label: "QA", done: QA_DONE, total: QA_TODOS.length },
  ];
  return (
    <Stack gap={16}>
      <Row gap={8} wrap>
        <Pill active={active === "all"} onClick={() => onSelect("all")}>
          All · {TOTAL_DONE}/{ALL_TODOS.length}
        </Pill>
        {tracks.map(t => (
          <Pill key={t.id} active={active === t.id} tone={t.done === t.total ? "success" : "warning"} onClick={() => onSelect(t.id)}>
            {t.label} · {t.done}/{t.total}
          </Pill>
        ))}
      </Row>
      {children}
    </Stack>
  );
}

function BackendView() {
  const [track, setTrack] = useCanvasState<TrackFilter>("bodymap.backend.track", "backend");
  const t: TrackFilter = track ?? "backend";
  return (
    <TracksShell active={t} onSelect={setTrack}>
      <H2>Backend by phase</H2>
      {(["p1", "p2", "p3", "mar", "p4"] as PhaseId[]).map(pid => {
        const beTodos =
          pid === "mar"
            ? MAR_BACKEND_TODOS
            : PHASE_TODOS[pid].filter(item => item.id.startsWith("b"));
        if (beTodos.length === 0) return null;
        const label = PHASE_META.find(p => p.id === pid)?.label ?? pid;
        return (
          <Card key={pid}>
            <CardHeader trailing={<Pill size="sm">{countDone(beTodos)}/{beTodos.length}</Pill>}>
              {label} — backend
            </CardHeader>
            <CardBody>
              <TodoListCard todos={beTodos} defaultExpanded={pid === "p1"} />
            </CardBody>
          </Card>
        );
      })}
      {t !== "backend" && t !== "all" && <TrackView track={t} />}
    </TracksShell>
  );
}

function FrontendView() {
  return (
    <Stack gap={16}>
      <H2>Frontend by phase</H2>
      {(["p1", "p2", "p3", "mar", "p4"] as PhaseId[]).map(pid => {
        const rxTodos =
          pid === "mar"
            ? MAR_FRONTEND_TODOS
            : PHASE_TODOS[pid].filter(item => item.id.startsWith("r"));
        if (rxTodos.length === 0) return null;
        const label = PHASE_META.find(p => p.id === pid)?.label ?? pid;
        return (
          <Card key={pid}>
            <CardHeader trailing={<Pill size="sm">{countDone(rxTodos)}/{rxTodos.length}</Pill>}>
              {label} — frontend
            </CardHeader>
            <CardBody>
              <TodoListCard todos={rxTodos} defaultExpanded={pid === "p1"} />
            </CardBody>
          </Card>
        );
      })}
      <H3>Planned routes</H3>
      <Table headers={["Screen", "Route", "Component", "Phase"]} rows={REACT_ROUTES} striped />
    </Stack>
  );
}

function DatabaseView() {
  return (
    <Stack gap={16}>
      <Callout tone="warning" title="14 modular tables (§19.1)">
        All tables in service_users schema. No hard deletes — audit_logs captures every mutation.
      </Callout>
      <Table headers={["Table", "Purpose", "Phase"]} rows={DB_TABLES} striped />
      <H3>Core record fields (body_map_records §19.2)</H3>
      <Table
        headers={["Field group", "Fields"]}
        rows={[
          ["Identity", "id, serviceUserId, recordType, subType, title, description"],
          ["Risk & status", "riskLevel, status, safeguardingTriggered, managerReviewRequired"],
          ["Timing", "firstNoticedAt, noticedByType, noticedByName, reviewRequired, nextReviewAt"],
          ["Audit", "createdBy, createdAt, updatedBy, updatedAt, closedAt, closedBy, closureNote, isArchived"],
        ]}
        striped
      />
      <H3>Marker fields (body_map_markers §19.3)</H3>
      <Table
        headers={["Field", "Purpose"]}
        rows={[
          ["bodyView", "front | back | left | right | face | hand | foot"],
          ["xCoordinate, yCoordinate", "Exact click position on image (%)"],
          ["bodyPart, specificLocation", "Structured + free-text location"],
          ["markerType, riskLevel, status", "Visual encoding on canvas"],
        ]}
        striped
      />
    </Stack>
  );
}

function ApiView() {
  return (
    <Stack gap={16}>
      <Table headers={["Endpoint", "Purpose", "Phase"]} rows={CORE_APIS} striped />
      <H3>Special endpoints (§20.2)</H3>
      <Table
        headers={["Endpoint", "Purpose", "Phase"]}
        rows={[
          ["POST …/safeguarding-check", "Save trigger checklist", "P2"],
          ["POST …/wound-assessment", "Initial wound data", "P2"],
          ["POST …/pressure-assessment", "Pressure area data", "P2"],
          ["POST …/medication-site", "Cream, patch, injection", "MAR"],
          ["GET /body-map/templates", "Configurable templates", "P4"],
        ]}
        striped
      />
    </Stack>
  );
}

function MarIntegrationView() {
  return (
    <Stack gap={16}>
      <Callout tone="info" title="MAR programme — foundation shipped; enterprise sign-off open">
        Shipped: lookups, BodyMapMedicationSite, two-way UI, patch rules, rotation API, alerts, handoverPatchSites in export JSON.
        Enterprise still required: M5 E2E (deferred), Phase 2 wound/pressure/alerts, offline/mobile. Shipped: governance PDF, analytics, CQC Inspector, gaps, r3-5, r4-8 handover.
        Release bar: body-map.md §26 Medication + MAR/eMAR rows verified at QA5 — not “checkbox MVP”.
      </Callout>
      <Grid columns={3} gap={12}>
        <Stat value={`${MAR_DONE}/${MAR_TODOS.length}`} label="MAR phase tasks" tone="success" />
        <Stat value={`${countDone(MAR_BACKEND_TODOS)}/${MAR_BACKEND_TODOS.length}`} label="MAR backend" tone="success" />
        <Stat value={`${countDone(MAR_FRONTEND_TODOS)}/${MAR_FRONTEND_TODOS.length}`} label="MAR frontend" tone="success" />
      </Grid>
      <H3>Backend (M0, M1, M3, M4)</H3>
      <TodoListCard todos={MAR_BACKEND_TODOS} defaultExpanded />
      <H3>Frontend (M0, M2, M3, M5)</H3>
      <TodoListCard todos={MAR_FRONTEND_TODOS} defaultExpanded />
      <H3>Maps to legacy Phase 3 IDs</H3>
      <Table
        headers={["MAR task", "Legacy"]}
        rows={[
          ["M0–M1 lookups + site table", "b3-1, m0-*"],
          ["M2 wizard + drawer + table filter", "r3-1, r3-8, m2-*"],
          ["M3 MAR prompts + admin link + calendar CTA", "m3-3–m3.9, r3-6"],
          ["M4 patch rules + rotation + alerts + export", "b3-4–b3-9, m4-*"],
          ["M3.8 calendar missing-site icon", "m3-8 ✓"],
          ["M5.3 E2E patch journey", "qa-3, b3-10"],
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
      <Table headers={["Topic", "Decision", "Rationale"]} rows={ARCHITECTURE_DECISIONS} striped />
      <H3>Acceptance criteria (§26) — verify at QA5</H3>
      <TodoList todos={[
        { id: "ac-1", status: "completed", content: "Visual marker — every record places one or more markers" },
        { id: "ac-2", status: "completed", content: "Marker sync — table row highlights marker; marker opens drawer" },
        { id: "ac-3", status: "completed", content: "Safeguarding — checklist on trigger before save" },
        { id: "ac-4", status: "in_progress", content: "Wounds — assessment on create; dedicated review compare TBD" },
        { id: "ac-5", status: "pending", content: "Pressure care — links to risk assessment and care plan" },
        { id: "ac-6", status: "completed", content: "Medication — cream/patch workflows + old patch mandatory (M4.1)" },
        { id: "ac-7", status: "completed", content: "MAR/eMAR — sites link to ServiceUserMedication (M1–M3)" },
        { id: "ac-8", status: "in_progress", content: "Closure — note + manager sign-off; audit logged" },
        { id: "ac-9", status: "in_progress", content: "Export — CQC JSON v1 (PDF inspection view TBD)" },
        { id: "ac-10", status: "pending", content: "Mobile + offline — tablet usable; drafts offline" },
      ]} />
    </Stack>
  );
}

export default function BodyMapPlan() {
  const [viewRaw, setView] = useCanvasState<View>("bodymap.view", "overview");
  const view: View = viewRaw ?? "overview";
  const VIEWS: { id: View; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "phases", label: "Phases & tasks" },
    { id: "mar", label: "MAR integration" },
    { id: "backend", label: "Backend" },
    { id: "frontend", label: "Frontend" },
    { id: "prototype", label: "Prototype" },
    { id: "database", label: "Database" },
    { id: "api", label: "APIs" },
    { id: "roadmap", label: "Roadmap" },
  ];
  return (
    <Stack gap={24} style={{ maxWidth: 920, margin: "0 auto", padding: "24px 20px 48px" }}>
      <Stack gap={4}>
        <H1>Body Map — Implementation Plan</H1>
        <Text tone="secondary">
          Care20:20 body map · Spec: body-map.md · MAR: body-map-mar-integration.md · {TOTAL_DONE}/{ALL_TODOS.length} tasks · MAR {MAR_DONE}/{MAR_TODOS.length} · 1 Jun 2026
        </Text>
      </Stack>
      <Row gap={8} wrap>
        {VIEWS.map(v => (
          <Pill key={v.id} active={view === v.id} onClick={() => setView(v.id)}>{v.label}</Pill>
        ))}
      </Row>
      <Divider />
      {view === "overview" && <OverviewView />}
      {view === "phases" && <PhasesView />}
      {view === "mar" && <MarIntegrationView />}
      {view === "backend" && <BackendView />}
      {view === "frontend" && <FrontendView />}
      {view === "prototype" && <TrackView track="proto" />}
      {view === "database" && <DatabaseView />}
      {view === "api" && <ApiView />}
      {view === "roadmap" && <RoadmapView />}
      <Text tone="tertiary" size="small">
        Proto {PROTO_DONE}/{PROTO_TODOS.length} · Backend {BE_DONE}/{ALL_BACKEND.length} · Frontend {RX_DONE}/{ALL_FRONTEND.length} · MAR {MAR_DONE}/{MAR_TODOS.length} · OpenAPI {SW_DONE}/{SWAGGER_TODOS.length} · QA {QA_DONE}/{QA_TODOS.length}
      </Text>
    </Stack>
  );
}
