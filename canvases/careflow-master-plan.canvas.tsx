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
  | "principles"
  | "phases"
  | "domains"
  | "correspondence"
  | "production"
  | "inventory";

type PhaseId =
  | "ph0"
  | "ph1"
  | "ph2"
  | "ph3"
  | "ph4"
  | "ph5"
  | "ph6"
  | "ph7"
  | "ph8"
  | "ph9"
  | "ph10"
  | "ph11"
  | "ph12";

const PHASE_META: Record<
  PhaseId,
  { title: string; subtitle: string; dependsOn?: PhaseId[] }
> = {
  ph0: {
    title: "Phase 0 — Platform & production foundation",
    subtitle: "Repos, deploy, DB seed idempotency, migrations — nothing clinical ships without this",
  },
  ph1: {
    title: "Phase 1 — Initial Assessment (admission snapshot)",
    subtitle: "One-time enterprise IA: 14 sections + 18 holistic tabs, submit, governance",
    dependsOn: ["ph0"],
  },
  ph2: {
    title: "Phase 2 — IA template quality & paper parity",
    subtitle: "Dedup legacy catalog, prune seeds, section reviews §3–§14, production template parity",
    dependsOn: ["ph0", "ph1"],
  },
  ph3: {
    title: "Phase 3 — Assessments registry (ongoing tools)",
    subtitle: "Care Plan assessments panel: IA tools + Care Pathway forms, repeat, consent, review dates",
    dependsOn: ["ph1"],
  },
  ph4: {
    title: "Phase 4 — Care plans (living documents)",
    subtitle: "Compose, draft, publish, recommendations, evidence, monitor active/inactive",
    dependsOn: ["ph1", "ph3"],
  },
  ph5: {
    title: "Phase 5 — Risk register (service-user scoped)",
    subtitle: "Beyond IA submission matrix: ongoing risks, controls, review, care plan feed",
    dependsOn: ["ph1", "ph3", "ph4"],
  },
  ph6: {
    title: "Phase 6 — Referrals & external correspondence",
    subtitle: "GP/SALT/hospital multi-channel cases: email, phone, letter, responses, SLA",
    dependsOn: ["ph1", "ph3"],
  },
  ph7: {
    title: "Phase 7 — Consent & mental capacity register",
    subtitle: "Central consent timeline; IA §2 + per-assessment + care plan + photography",
    dependsOn: ["ph1", "ph3"],
  },
  ph8: {
    title: "Phase 8 — Care Review (periodic, NOT IA)",
    subtitle: "3/6/12 month reviews summarising changes; separate product from Initial Assessment",
    dependsOn: ["ph3", "ph4", "ph5", "ph7"],
  },
  ph9: {
    title: "Phase 9 — Care package & visit delivery",
    subtitle: "Visit plan, scheduling, pathway actions on visits, care plan objectives per slot",
    dependsOn: ["ph1", "ph4"],
  },
  ph10: {
    title: "Phase 10 — Care Pathway configuration layer",
    subtitle: "Form builder, form selection, rules registry, auto-link maps, agency settings",
    dependsOn: ["ph3", "ph4"],
  },
  ph11: {
    title: "Phase 11 — Event-driven care & integrations",
    subtitle: "Incidents, hospital discharge, eMAR/body map/observations, trigger engine, notifications",
    dependsOn: ["ph3", "ph4", "ph5", "ph6"],
  },
  ph12: {
    title: "Phase 12 — Legacy retire, QA, inspector readiness",
    subtitle: "Import legacy checklist, remove catalog UI, E2E, CQC packs, permissions matrix",
    dependsOn: ["ph1", "ph8"],
  },
};

function todos(items: Array<[string, TodoStatus, string]>): TodoItem[] {
  return items.map(([id, status, content]) => ({ id, status, content }));
}

const PHASE_TODOS: Record<PhaseId, TodoItem[]> = {
  ph0: todos([
    ["p0-1", "completed", "Split repos: careflow-admin + careflow-api aligned with monorepo"],
    ["p0-2", "completed", "Admin/API deploy workflows (GitHub Actions → VPS)"],
    ["p0-3", "completed", "Bundle initial-assessment-catalog.json in API prisma/seed-data"],
    ["p0-4", "completed", "Move vital-accepted-ranges defaults out of src/ for seed"],
    ["p0-5", "completed", "Add VitalAcceptedRangeCatalog migration (96c33ac)"],
    ["p0-6", "in_progress", "Production: prisma migrate deploy + db seed completes without error"],
    ["p0-7", "pending", "CI guard: prisma/seeds must never import from src/"],
    ["p0-8", "pending", "Ops runbook: seed failure, migration reconcile, rollback (DEPLOY_FAILURES.md kept current)"],
    ["p0-9", "pending", "Release.json verification step in deploy smoke checks"],
    ["p0-10", "pending", "Monorepo backup branch merged or documented as source-of-truth workflow"],
  ]),
  ph1: todos([
    ["p1-1", "completed", "Enterprise template 14 sections + API CRUD submissions/answers"],
    ["p1-2", "completed", "18 holistic document tabs + metadata persistence"],
    ["p1-3", "completed", "Hub tabs: form, Waterlow, submissions, versions, review, schedule, audit, compare"],
    ["p1-4", "completed", "Submit validation + blocking banner (consent, safeguarding, eMAR, etc.)"],
    ["p1-5", "completed", "Auto actions + risk records promotion on submit"],
    ["p1-6", "completed", "Care plan triggers + recommendations generation"],
    ["p1-7", "completed", "Manager review queue + approve care start + reopen + answer correction audit"],
    ["p1-8", "completed", "HTML/PDF export + CQC evidence JSON bundle"],
    ["p1-9", "completed", "Accept/decline care plan recommendations + post-submit schedule redirect"],
    ["p1-10", "completed", "Preferred visit times + medication rounds lookup"],
    ["p1-11", "completed", "Secure fields (key safe, door code) + attachments"],
    ["p1-12", "completed", "Clinical panels: Waterlow, ADL, vitals, skin, MCA, safeguarding, transfer matrix"],
    ["p1-13", "pending", "Holistic worksheets fully rendered in HTML/PDF export (HOL14)"],
    ["p1-14", "pending", "Clinical outcome summary auto-populated from scores (HOL15)"],
    ["p1-15", "pending", "Sync holistic metadata → legacy template questions where mapped (HOL16)"],
    ["p1-16", "pending", "Full E2E: 18 tabs → submit → manager review → evidence pack (QA1)"],
  ]),
  ph2: todos([
    ["p2-1", "completed", "Stop legacy catalog import for §3, §5, §6, §10, §12 (enterprise-only fields)"],
    ["p2-2", "completed", "Section prune seeds + frontend visible-section-questions filters"],
    ["p2-3", "completed", "§3.10 trimmed to 6-question minimum; §3.8 pets consolidated"],
    ["p2-4", "completed", "§12 ADL paper layout, ordering, merged falls/equipment panels"],
    ["p2-5", "completed", "Paper gap P1–P3 fields (vitals, appetite, insulin, sleep, §12.9–12.11)"],
    ["p2-6", "in_progress", "Production DB runs full enterprise seed + prune (not stale duplicate UI)"],
    ["p2-7", "pending", "§7 continence, §8 communication, §9 medication, §11 skin, §13 safeguarding section audits"],
    ["p2-8", "pending", "§1 profile field order + person-centred cards UX polish"],
    ["p2-9", "pending", "Template governance process: version bump + changelog when questions change"],
    ["p2-10", "pending", "Point-in-time: submissions pinned to template version they started on"],
  ]),
  ph3: todos([
    ["p3-1", "completed", "Prisma: ServiceUserAssessment + Completion + CarePlanAssessmentLink"],
    ["p3-2", "completed", "IA submit promotes Waterlow, MUST, Falls, Skin, MCA → registry"],
    ["p3-3", "completed", "ServiceUserAssessmentsPanel on Care Plan page (Add/Repeat/history/drawer)"],
    ["p3-4", "completed", "Assessment tool registry (IA holistic tools shared with capture UI)"],
    ["p3-5", "completed", "Care Pathway ASSESSMENT forms in Add dialog (pathway-form capture)"],
    ["p3-6", "completed", "Manual assessment consent capture + backend validation"],
    ["p3-7", "completed", "Assessment review schedule util + review badges"],
    ["p3-8", "completed", "AssessmentReviewQueuePage (overdue reviews)"],
    ["p3-9", "completed", "Manual LinkAssessmentToCarePlanDialog"],
    ["p3-10", "completed", "Auto-link pathway assessments → care plans (catalog mapping)"],
    ["p3-11", "pending", "Backfill IA promotions for existing submitted assessments (prod script)"],
    ["p3-12", "pending", "Form Selection: enable all required pathway assessment forms per agency"],
    ["p3-13", "pending", "Seed/build fields for all priority pathway assessments (Bed Rail, Choking, etc.)"],
    ["p3-14", "pending", "Assessment review reminder cron scheduled on VPS"],
    ["p3-15", "pending", "Promoted IA tools auto-link to related care plan forms (not only manual pathway)"],
    ["p3-16", "pending", "Assessment completion → risk register promotion rules"],
    ["p3-17", "pending", "Inspector read-only view of assessment history + snapshots"],
  ]),
  ph4: todos([
    ["p4-1", "completed", "ServiceUserCarePlanInstance: draft + published versions API"],
    ["p4-2", "completed", "CarePlanComposeService: Person Centred, Medication, Falls, Skin Integrity, Dementia, Master, Review"],
    ["p4-3", "completed", "CarePlanFormPage + compose/publish UI wired"],
    ["p4-4", "completed", "CarePlanEvidencePanel + compose deltas vs last published"],
    ["p4-5", "completed", "Create care plan draft from accepted IA recommendations (UI button)"],
    ["p4-6", "pending", "BE5.3: API auto-create draft instance when recommendation accepted"],
    ["p4-7", "pending", "Wire Monitor Care Plans accordion (review due, stale evidence)"],
    ["p4-8", "pending", "Inactive care plans list with reason + archive audit"],
    ["p4-9", "pending", "Compose mappers for ALL active Care Pathway CARE_PLAN forms in Form Selection"],
    ["p4-10", "pending", "Evidence graph: show linked assessment completions on care plan form"],
    ["p4-11", "pending", "Override compose suggestion with reason (provenance lineage)"],
    ["p4-12", "pending", "Staleness warnings: plan based on assessment older than review interval"],
    ["p4-13", "pending", "Care plan publish triggers visit plan / rota review flag"],
    ["p4-14", "pending", "Published plan PDF export aligned with compose layout"],
  ]),
  ph5: todos([
    ["p5-1", "completed", "IA risk matrix + InitialAssessmentRiskRecord CRUD (per submission)"],
    ["p5-2", "completed", "Promote flagged IA answers → risk records on submit"],
    ["p5-3", "completed", "InitialAssessmentRiskRecordsPanel in IA hub"],
    ["p5-4", "pending", "Service-user RiskRegister model (not submission-bound)"],
    ["p5-5", "pending", "Seed IA submission risks → SU register on manager review approve"],
    ["p5-6", "pending", "Wire Care Plan → Risk Profile accordion (open/mitigated/closed)"],
    ["p5-7", "pending", "Assessment outcomes update SU risks (e.g. high Waterlow repeat)"],
    ["p5-8", "pending", "Incident/accident → risk register + reassessment trigger"],
    ["p5-9", "pending", "Risk controls + owner + review date + likelihood×severity standard language"],
    ["p5-10", "pending", "Risk register feeds Falls / Personal Safety / Skin care plan compose"],
    ["p5-11", "pending", "CQC risk summary in evidence pack from SU register (not only IA)"],
  ]),
  ph6: todos([
    ["p6-1", "completed", "IA fields: GP referral required/made (§10 sleep, mental health, cognition)"],
    ["p6-2", "completed", "InitialAssessmentAction types: GP_REVIEW, SALT, DIETITIAN, CONTINENCE, SAFEGUARDING"],
    ["p6-3", "completed", "SALT blocking validation when swallowing concern (§5.4)"],
    ["p6-4", "pending", "ReferralRequirement entity (internal: needed because of X trigger)"],
    ["p6-5", "pending", "CorrespondenceCase entity (external party + status + SLA)"],
    ["p6-6", "pending", "CorrespondenceThread: outbound email, phone log, letter PDF, inbound upload"],
    ["p6-7", "pending", "GP/SALT/dietitian/safeguarding letter & email templates with clinical summary"],
    ["p6-8", "pending", "Consent-to-share check before send (link consent register)"],
    ["p6-9", "pending", "Phase A: manual send + mark sent + upload response PDF"],
    ["p6-10", "pending", "Phase B: system outbound email + case ID in subject line"],
    ["p6-11", "pending", "Phase C: inbound mailbox queue + match to case"],
    ["p6-12", "pending", "SLA overdue dashboard tile + reminders (GP 14d routine / 48h urgent)"],
    ["p6-13", "pending", "Outcome → close case → update care plan + risk + referral requirement"],
    ["p6-14", "pending", "Safeguarding cases: restricted visibility + statutory timeline fields"],
    ["p6-15", "pending", "Care Plan hub → Referrals & Correspondence section (replace IA-only actions)"],
  ]),
  ph7: todos([
    ["p7-1", "completed", "IA §2 consent & capacity wizard + blocking rules"],
    ["p7-2", "completed", "Per-manual-assessment consent snapshot (except photography form)"],
    ["p7-3", "pending", "ConsentRegister: scope, granted/withdrawn, best interest, expiry, document links"],
    ["p7-4", "pending", "Wire Care Plan → Consent and Mental Capacity accordion"],
    ["p7-5", "pending", "Photography consent in register + link to holistic tab 18 completion"],
    ["p7-6", "pending", "Consent check before correspondence send + care plan publish (where required)"],
    ["p7-7", "pending", "Care Review consent capture (when Phase 8 built)"],
    ["p7-8", "pending", "LPA/deputy/representative decision log linked to consent entries"],
  ]),
  ph8: todos([
    ["p8-1", "pending", "CareReview entity: scheduled 3/6/12 month + ad hoc"],
    ["p8-2", "pending", "CareReview NOT IA: summary of changes since last review"],
    ["p8-3", "pending", "Pull current assessments, care plan versions, risks, referrals, incidents into review"],
    ["p8-4", "pending", "Review outcomes: sign-off, plan updates, schedule changes, reassessment flags"],
    ["p8-5", "pending", "Care Review UI on Care Plan hub + overdue queue"],
    ["p8-6", "pending", "Commissioner/funding change → triggers ad hoc Care Review"],
    ["p8-7", "pending", "Hospital discharge → reassessment bundle (not full IA)"],
  ]),
  ph9: todos([
    ["p9-1", "completed", "Visit plan CRUD + slots + activate + generate ScheduledVisit (31-day window)"],
    ["p9-2", "completed", "createDraftFromAssessment from IA preferred times"],
    ["p9-3", "completed", "Visit Plan tab on Edit SU + IA deep links"],
    ["p9-4", "completed", "VisitPlanHistoryPanel (amendments/history)"],
    ["p9-5", "completed", "Care package activation gate (IA manager approve + evaluateCareActivation)"],
    ["p9-6", "pending", "VP-BE6: VisitAction linkage — care plan objectives → tasks per slot"],
    ["p9-7", "pending", "VP-BE7: Planned vs actual exceptions + CQC assurance reporting"],
    ["p9-8", "pending", "VP-FE6: Scheduling view highlights visits from visit plan slot"],
    ["p9-9", "pending", "Visit plan status on Service User overview dashboard"],
    ["p9-10", "pending", "Rota API integration for carer assignment on slots (P5 rota pending note)"],
  ]),
  ph10: todos([
    ["p10-1", "completed", "Care Pathway module: forms, fields, form builder, form selection tabs"],
    ["p10-2", "completed", "Care pathway seed: ASSESSMENT + CARE_PLAN + SERVICE_FORM catalogue"],
    ["p10-3", "completed", "CARE_PATHWAY_ASSESSMENT_CATALOG: review intervals + auto-link care plan names"],
    ["p10-4", "completed", "PathwayActions CRUD (visit task catalogue)"],
    ["p10-5", "pending", "Single rules registry doc: IA triggers, assessment links, review intervals (not scattered seeds)"],
    ["p10-6", "pending", "Agency settings UI: Waterlow threshold, blocking toggles, default review intervals"],
    ["p10-7", "pending", "Template version pinning + migration when pathway form fields change"],
    ["p10-8", "pending", "Analysis areas / care plan icons linked consistently across modules"],
  ]),
  ph11: todos([
    ["p11-1", "completed", "Body map ↔ IA §11 CTA + record type catalog"],
    ["p11-2", "completed", "eMAR setup action from IA §9 + deep link to med wizard"],
    ["p11-3", "completed", "Vitals snapshot → ServiceUserObservation on IA submit"],
    ["p11-4", "completed", "Emergency contacts §13 ↔ profile sync"],
    ["p11-5", "completed", "Notify managers on high risk / safeguarding submit"],
    ["p11-6", "pending", "Unified event bus: IA submit, assessment complete, incident, med change, review overdue"],
    ["p11-7", "pending", "Event → reassessment requirement (e.g. fall → Falls screening due)"],
    ["p11-8", "pending", "Medication reconciliation alert: IA §9 snapshot vs live eMAR drift"],
    ["p11-9", "pending", "Observations/NEWS2 trend linked to care plan monitoring sections"],
    ["p11-10", "pending", "ACCIDENT/SERVICE_FORM pathway forms wired to incident → risk + correspondence"],
    ["p11-11", "pending", "Training/competency gate for hoist/moving & handling (workforce module link)"],
  ]),
  ph12: todos([
    ["p12-1", "pending", "BE6.1–6.3: Import legacy ServiceUserInitialAssessment → enterprise DRAFT submission"],
    ["p12-2", "pending", "FE6: Retire /initial-assessment-checklist route + redirect to enterprise"],
    ["p12-3", "pending", "Remove initial-assessment-catalog.json from production UI paths"],
    ["p12-4", "pending", "Legacy PATCH API sunset (410) after migration window"],
    ["p12-5", "pending", "QA2–QA4, QA6–QA7, QA10: consent block, legacy import, PDF, permissions, CQC walkthrough"],
    ["p12-6", "pending", "Swagger/OpenAPI complete for IA + assessments + care plans (SW1–SW5)"],
    ["p12-7", "pending", "Mock inspection mode: read-only aggregated SU evidence dashboard"],
    ["p12-8", "pending", "Carer-facing read model spec (future app): published plans + tasks, no IA edit"],
  ]),
};

const PRINCIPLES: string[][] = [
  ["IA once", "Initial Assessment = admission snapshot only; never repeated as IA"],
  ["Care Review", "3/6/12 month reviews = separate product summarising change"],
  ["Assessments home", "All repeats (Waterlow, pathway forms) live in SU assessments registry"],
  ["Care Pathway config", "Pathway configures forms/rules; runtime lives on the service user"],
  ["Provenance", "Every care plan field traceable to IA answer, assessment completion, or override"],
  ["Risk SU-scoped", "Risk register belongs to person, seeded from IA once, updated ongoing"],
  ["Referrals", "External communication = correspondence cases with thread, not IA checkboxes"],
  ["Consent register", "Central timeline; per-event capture where needed"],
  ["One hub", "Care Plan page = primary ongoing workspace; IA = admission archive + edit when reopened"],
  ["Temporal clarity", "Current Waterlow = latest completion; current plan = latest published version"],
];

const NAV_SPINE: string[][] = [
  ["Overview", "Status dashboard: IA, overdue assessments, open risks, referrals, plans", "Missing"],
  ["Initial Assessment", "Admission snapshot; hub tabs; read-heavy after submit", "Built"],
  ["Care Plan hub", "Assessments, risks, referrals, plans, consent, reviews", "Partial"],
  ["Visit plan", "Call pattern, activation, history, scheduling link", "Partial"],
  ["Medication / eMAR", "MAR, support profile, IA §9 integration", "Built"],
  ["Body map / observations", "Skin records, vitals, NEWS2 guidance", "Built"],
  ["Documents & audit", "Attachments, correspondence PDFs, audit trail", "Partial"],
  ["Settings", "Care Pathway, agency rules, form selection", "Built"],
];

const CORRESPONDENCE_PHASES: string[][] = [
  ["A — Record", "Case + thread + manual phone/email log + upload response", "Foundation"],
  ["B — Outbound", "PDF letters + platform email + mark sent + templates", "After consent register"],
  ["C — Inbound", "Dedicated inbox + case ID subject matching + queue", "Optional"],
  ["D — SLA", "Overdue reminders, escalation, safeguarding timelines", "With dashboard"],
  ["E — Secure", "NHSmail / secure mail where contract requires", "Late stage"],
];

function countPhase(status: TodoStatus) {
  let n = 0;
  for (const phase of Object.values(PHASE_TODOS)) {
    for (const t of phase) {
      if (t.status === status) n += 1;
    }
  }
  return n;
}

const DONE = countPhase("completed");
const ACTIVE = countPhase("in_progress");
const PENDING = countPhase("pending");
const ALL = DONE + ACTIVE + PENDING;

const PHASE_ORDER: PhaseId[] = [
  "ph0",
  "ph1",
  "ph2",
  "ph3",
  "ph4",
  "ph5",
  "ph6",
  "ph7",
  "ph8",
  "ph9",
  "ph10",
  "ph11",
  "ph12",
];

function phaseProgress(id: PhaseId) {
  const items = PHASE_TODOS[id];
  const done = items.filter((t) => t.status === "completed").length;
  return { done, total: items.length };
}

export default function CareflowMasterPlanCanvas() {
  const [view, setView] = useCanvasState<View>("mplan-view", "overview");
  const [phase, setPhase] = useCanvasState<PhaseId>("mplan-phase", "ph0");

  const pg = phaseProgress(phase);

  const inventoryRows: (string | number)[][] = PHASE_ORDER.flatMap((pid) =>
    PHASE_TODOS[pid].map((t) => [
      pid.toUpperCase(),
      PHASE_META[pid].title.replace(/^Phase \d+ — /, ""),
      t.status === "completed" ? "Done" : t.status === "in_progress" ? "Active" : "Pending",
      t.content,
    ]),
  );

  return (
    <Stack gap={16}>
      <Stack gap={4}>
        <H1>Careflow Master Plan</H1>
        <Text tone="secondary">
          End-to-end enterprise roadmap from platform foundation through IA, ongoing care pathway,
          correspondence, and inspector readiness. {ALL} tracked deliverables.
        </Text>
      </Stack>

      <UsageBar
        total={ALL}
        topLeftLabel="Master plan progress"
        topRightLabel={`${DONE} / ${ALL} completed`}
        segments={[
          { id: "done", value: DONE, color: "green" },
          { id: "active", value: ACTIVE, color: "orange" },
          { id: "pending", value: PENDING, color: "pink" },
        ]}
      />

      <Grid columns={4} gap={12}>
        <Stat label="Completed" value={String(DONE)} tone="success" />
        <Stat label="In progress" value={String(ACTIVE)} tone="warning" />
        <Stat label="Pending" value={String(PENDING)} tone="danger" />
        <Stat label="Total items" value={String(ALL)} />
      </Grid>

      <Row gap={8} wrap>
        {(
          [
            ["overview", "Overview"],
            ["principles", "Principles"],
            ["phases", "Phases"],
            ["domains", "Care Plan hub"],
            ["correspondence", "GP & correspondence"],
            ["production", "Production"],
            ["inventory", "Full inventory"],
          ] as const
        ).map(([id, label]) => (
          <Pill key={id} active={view === id} onClick={() => setView(id)}>
            {label}
          </Pill>
        ))}
      </Row>

      {view === "overview" && (
        <Callout tone="info">
          <Stack gap={6}>
            <Text weight="semibold">Execution order (do not scatter)</Text>
            <Text>
              Finish Phase 0 production seed → Phase 2 template parity on prod → Phase 3–4 wire Care
              Plan hub (assessments + plans + evidence) → Phase 5–7 risks/consent/referrals → Phase 8
              Care Review → Phase 9 visit delivery → Phase 11 events → Phase 12 legacy retire + QA.
            </Text>
          </Stack>
        </Callout>
      )}

      {view === "overview" && (
        <Card>
          <CardHeader>Phase summary</CardHeader>
          <CardBody>
            <Table
              headers={["Phase", "Focus", "Done", "Total", "Blocked by"]}
              rows={PHASE_ORDER.map((pid) => {
                const p = phaseProgress(pid);
                const deps = PHASE_META[pid].dependsOn?.join(", ") ?? "—";
                return [
                  pid.toUpperCase(),
                  PHASE_META[pid].title.replace(/^Phase \d+ — /, ""),
                  p.done,
                  p.total,
                  deps,
                ];
              })}
            />
          </CardBody>
        </Card>
      )}

      {view === "principles" && (
        <Stack gap={12}>
          <Card>
            <CardHeader>Architecture principles (decision log)</CardHeader>
            <CardBody>
              <Table headers={["Principle", "Rule"]} rows={PRINCIPLES} striped />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>Target navigation spine</CardHeader>
            <CardBody>
              <Table headers={["Area", "Purpose", "Status today"]} rows={NAV_SPINE} striped />
            </CardBody>
          </Card>
        </Stack>
      )}

      {view === "phases" && (
        <Stack gap={12}>
          <Row gap={8} wrap>
            {PHASE_ORDER.map((pid) => {
              const p = phaseProgress(pid);
              return (
                <Pill
                  key={pid}
                  active={phase === pid}
                  onClick={() => setPhase(pid)}
                >
                  {pid.toUpperCase()} ({p.done}/{p.total})
                </Pill>
              );
            })}
          </Row>
          <Card>
            <CardHeader
              trailing={<Pill size="sm" tone="info">{pg.done}/{pg.total} done</Pill>}
            >
              {PHASE_META[phase].title}
            </CardHeader>
            <CardBody>
              <Stack gap={8}>
                <Text tone="secondary">{PHASE_META[phase].subtitle}</Text>
                {PHASE_META[phase].dependsOn && (
                  <Text size="small" tone="tertiary">
                    Depends on: {PHASE_META[phase].dependsOn!.join(", ")}
                  </Text>
                )}
                <TodoList todos={PHASE_TODOS[phase]} />
              </Stack>
            </CardBody>
          </Card>
        </Stack>
      )}

      {view === "domains" && (
        <Stack gap={12}>
          <H2>Care Plan hub — target accordion map</H2>
          <Table
            headers={["Accordion / section", "Phase", "Deliverables"]}
            rows={[
              ["Margaret's Assessments", "ph3", "Registry, Add/Repeat, consent, review badges, link to plans"],
              ["Risk Profile", "ph5", "SU risk register, matrix summary, controls, review dates"],
              ["Referrals & correspondence", "ph6", "GP/SALT cases, email/phone/letter thread, SLA"],
              ["Consent and Mental Capacity", "ph7", "Consent register + IA §2 + assessment snapshots"],
              ["Active care plans", "ph4", "Compose, publish, evidence, linked assessments"],
              ["Monitor care plans", "ph4", "Review due, stale evidence, overdue publish"],
              ["Inactive care plans", "ph4", "Archive, reason, historical read"],
              ["Care reviews (future)", "ph8", "3/6/12 mo summaries — NOT IA repeat"],
              ["Care package / visit plan link", "ph9", "Activation, slots, pathway actions on visits"],
            ]}
          />
          <Callout tone="warning">
            Today: Assessments accordion is built; Risk, Consent, Monitor, Referrals accordions are
            empty or IA-only. Phases 4–7 consolidate here.
          </Callout>
        </Stack>
      )}

      {view === "correspondence" && (
        <Stack gap={12}>
          <H2>External communication (GP & others)</H2>
          <Table
            headers={["Sub-phase", "Scope", "When"]}
            rows={CORRESPONDENCE_PHASES}
            striped
          />
          <Card>
            <CardHeader>Correspondence case model</CardHeader>
            <CardBody>
              <Stack gap={4}>
                <Text>
                  Trigger (IA / assessment / incident) → ReferralRequirement → CorrespondenceCase →
                  Thread (email, phone, letter, upload) → Outcome → care plan + risk + close
                </Text>
                <Divider />
                <Text weight="semibold">Party types to support</Text>
                <Text>
                  GP practice, SALT, dietitian, OT, continence, hospital/discharge, pharmacy, LA
                  safeguarding, social worker, specialist nurse
                </Text>
                <Text weight="semibold">Channels</Text>
                <Text>
                  Email, phone log, posted letter/PDF, portal reference, secure mail (later), in-person
                </Text>
              </Stack>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>Phase 6 deliverables</CardHeader>
            <CardBody>
              <TodoListCard todos={PHASE_TODOS.ph6} defaultExpanded />
            </CardBody>
          </Card>
        </Stack>
      )}

      {view === "production" && (
        <Stack gap={12}>
          <Card>
            <CardHeader>Phase 0 — production checklist</CardHeader>
            <CardBody>
              <TodoListCard todos={PHASE_TODOS.ph0} defaultExpanded />
            </CardBody>
          </Card>
          <Callout tone="warning">
            VPS commands: migrate deploy → db seed → verify IA draft on prod. If seed fails mid-run,
            IA template stays stale (duplicate questions). seed:section-311-flooring is IA-only fallback.
          </Callout>
          <Table
            headers={["Check", "Command / location"]}
            rows={[
              ["API release", "curl careflowbackend…/release.json"],
              ["Admin release", "curl careflowadmin…/release.json"],
              ["Migrate log", "deployments/careflow-api/logs/last-migrate-deploy.log"],
              ["Seed log", "deployments/careflow-api/logs/last-seed.log"],
              ["Full seed", "cd live API && npx prisma db seed"],
              ["IA-only seed", "npm run seed:section-311-flooring"],
            ]}
          />
        </Stack>
      )}

      {view === "inventory" && (
        <Stack gap={8}>
          <Text tone="secondary">
            Complete inventory of {inventoryRows.length} deliverables across all phases. Use Phases
            tab for detailed checklist per phase.
          </Text>
          <Table
            headers={["Phase", "Area", "Status", "Deliverable"]}
            rows={inventoryRows}
            striped
          />
        </Stack>
      )}

      <Text tone="tertiary" size="small">
        Master plan — synthesises IA enterprise plan, care pathway registry, production seed work,
        risk/referral/consent architecture, GP correspondence, and anti-scatter principles. Jun 2026.
      </Text>
    </Stack>
  );
}
