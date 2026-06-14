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
import type { TableRowTone, TodoItem, TodoStatus } from "cursor/canvas";

type View = "overview" | "built" | "gaps" | "roadmap" | "referrals";
type Status = "done" | "partial" | "missing";
type Filter = "all" | Status;

type RoadmapRow = {
  id: string;
  area: string;
  feature: string;
  status: Status;
  whereToday: string;
  gap: string;
  priority: "P0" | "P1" | "P2" | "P3";
};

const STATUS_LABEL: Record<Status, string> = {
  done: "Built",
  partial: "Partial",
  missing: "Missing",
};

const ROWS: RoadmapRow[] = [
  {
    id: "ia-enterprise",
    area: "Initial Assessment",
    feature: "14-section enterprise IA + 18 holistic tabs",
    status: "done",
    whereToday: "ServiceUserInitialAssessmentEnterprisePage, hub tabs, submit/review",
    gap: "Production DB seed must complete for template parity",
    priority: "P0",
  },
  {
    id: "ia-once",
    area: "Architecture",
    feature: "IA once at admission (not repeated as IA)",
    status: "done",
    whereToday: "Product rule documented; submit freezes submission",
    gap: "Care Review product not built for 3/6/12 month cycles",
    priority: "P1",
  },
  {
    id: "care-review",
    area: "Care Review",
    feature: "Periodic care review (3/6/12 mo) — separate from IA",
    status: "missing",
    whereToday: "Review schedule tab covers IA governance only",
    gap: "No CareReview entity, form, or consent model",
    priority: "P1",
  },
  {
    id: "assess-registry",
    area: "Assessments",
    feature: "Service-user assessments registry (Care Plan page)",
    status: "partial",
    whereToday: "ServiceUserAssessmentsPanel — Add/Repeat, history, consent",
    gap: "Needs production seed + permissions; review queue separate from IA queue",
    priority: "P0",
  },
  {
    id: "ia-promote-tools",
    area: "Assessments",
    feature: "IA submit promotes Waterlow/MUST/Falls/etc. to registry",
    status: "done",
    whereToday: "ia-assessment-promotion.util on submit; source=INITIAL_ASSESSMENT",
    gap: "Backfill script for old submissions not run on prod",
    priority: "P1",
  },
  {
    id: "pathway-assessments",
    area: "Assessments",
    feature: "Care Pathway ASSESSMENT forms (Bed Rail, Choking, Capability…)",
    status: "partial",
    whereToday: "AddAssessmentDialog → pathway-form capture via Form Builder",
    gap: "Form Selection must enable forms; not all forms seeded with fields",
    priority: "P1",
  },
  {
    id: "assessment-consent",
    area: "Consent",
    feature: "Consent on every manual Add/Repeat assessment",
    status: "done",
    whereToday: "AssessmentConsentCaptureSection + backend validation",
    gap: "Not on IA submit promotions; no central consent register",
    priority: "P2",
  },
  {
    id: "consent-register",
    area: "Consent",
    feature: "Central consent register (all assessments + care plans)",
    status: "missing",
    whereToday: "IA §2 + per-completion snapshot only",
    gap: "No SU-level consent timeline or expiry",
    priority: "P2",
  },
  {
    id: "consent-care-plan-tab",
    area: "Consent",
    feature: "Care Plan → Consent and Mental Capacity accordion",
    status: "missing",
    whereToday: "Empty placeholder on ServiceUserCarePlanPage",
    gap: "Wire MCA/photography/DOLS summary from IA + assessments",
    priority: "P1",
  },
  {
    id: "risk-ia-records",
    area: "Risk",
    feature: "IA risk records + risk matrix (per submission)",
    status: "done",
    whereToday: "InitialAssessmentRiskRecordsPanel, promote on submit, CRUD API",
    gap: "Lives inside IA — not on Care Plan page",
    priority: "P1",
  },
  {
    id: "risk-register-su",
    area: "Risk",
    feature: "Service-user risk register (ongoing, cross-assessment)",
    status: "missing",
    whereToday: "Care Plan → Risk Profile accordion is empty",
    gap: "No SU-level RiskRegister model; no roll-up from IA + pathway assessments",
    priority: "P1",
  },
  {
    id: "risk-care-plan-compose",
    area: "Risk",
    feature: "Risk profile feeds care plan compose (Falls, Personal Safety…)",
    status: "partial",
    whereToday: "RiskProfileSection in CarePlanFormWorkspace (form fields)",
    gap: "Not wired to live IA risk records or assessment snapshots",
    priority: "P1",
  },
  {
    id: "ia-actions",
    area: "Actions / Referrals",
    feature: "IA actions auto-generated on submit (GP, SALT, OT, safeguarding…)",
    status: "done",
    whereToday: "InitialAssessmentActionsPanel; action-generation.util",
    gap: "Actions stay on IA submission — not on Care Plan task board",
    priority: "P1",
  },
  {
    id: "gp-referral-fields",
    area: "Actions / Referrals",
    feature: "GP referral capture in IA (§10 sleep, mental health, cognition)",
    status: "done",
    whereToday: "Enterprise seed + §10.5/10.6 fields + validation gates",
    gap: "No referral tracking workflow (requested → made → date → outcome)",
    priority: "P1",
  },
  {
    id: "gp-referral-workflow",
    area: "Actions / Referrals",
    feature: "GP / SALT / Dietitian referral workflow with due dates",
    status: "partial",
    whereToday: "InitialAssessmentAction types: GP_REVIEW, SALT_REFERRAL, etc.",
    gap: "No dedicated Referrals page; no link to external GP letter; no carer visibility",
    priority: "P1",
  },
  {
    id: "salt-blocking",
    area: "Actions / Referrals",
    feature: "SALT referral required validation (§5.4 swallowing)",
    status: "done",
    whereToday: "initial-assessment-validation.util.ts blocking rule",
    gap: "Prod template must match seed for rule to fire",
    priority: "P0",
  },
  {
    id: "care-plan-recs",
    area: "Care Plans",
    feature: "Care plan recommendations from IA triggers",
    status: "done",
    whereToday: "Review schedule tab; accept/decline; care-plan-rules seed",
    gap: "Discoverability — user must open schedule tab",
    priority: "P1",
  },
  {
    id: "care-plan-draft-from-accept",
    area: "Care Plans",
    feature: "Auto-create care plan draft when recommendation accepted (BE5.3)",
    status: "missing",
    whereToday: "Accept stores metadata only; manual compose required",
    gap: "One-click draft instance from accepted rec not implemented",
    priority: "P1",
  },
  {
    id: "care-plan-compose",
    area: "Care Plans",
    feature: "Compose pre-fill from IA (Person Centred, Falls, Med, Skin…)",
    status: "partial",
    whereToday: "CarePlanComposeService + compose mappers",
    gap: "Not all pathway care plan forms have mappers; evidence panel thin",
    priority: "P1",
  },
  {
    id: "care-plan-publish",
    area: "Care Plans",
    feature: "Draft → publish care plan instances + versions",
    status: "partial",
    whereToday: "ServiceUserCarePlanInstance API + CarePlanFormPage",
    gap: "Monitor / inactive care plan accordions empty on Care Plan page",
    priority: "P1",
  },
  {
    id: "assessment-auto-link",
    area: "Linking",
    feature: "Auto-link assessment completion → care plan forms",
    status: "partial",
    whereToday: "care-pathway-assessment-auto-link.util on MANUAL complete",
    gap: "Only mapped forms in CARE_PATHWAY_ASSESSMENT_CATALOG; IA promotions not auto-linked",
    priority: "P1",
  },
  {
    id: "assessment-manual-link",
    area: "Linking",
    feature: "Manual link assessment → care plan (UI)",
    status: "done",
    whereToday: "LinkAssessmentToCarePlanDialog in completion drawer",
    gap: "Care plan form page does not show linked assessments prominently",
    priority: "P2",
  },
  {
    id: "assessment-evidence-compose",
    area: "Linking",
    feature: "Linked assessments appear as evidence when composing care plan",
    status: "partial",
    whereToday: "CarePlanEvidencePanel shows compose deltas",
    gap: "Assessment completion snapshots not fully surfaced as evidence sources",
    priority: "P1",
  },
  {
    id: "visit-plan-ia",
    area: "Visit Plan",
    feature: "Visit plan draft from IA preferred times",
    status: "done",
    whereToday: "createDraftFromAssessment + Visit Plan tab",
    gap: "Visit plan history panel recently added — verify on prod",
    priority: "P2",
  },
  {
    id: "visit-plan-care-plans",
    area: "Visit Plan",
    feature: "Visit slots ↔ care plan objectives / pathway actions",
    status: "missing",
    whereToday: "VP-BE6/VP-BE7 pending in plan canvas",
    gap: "Planned tasks per slot not wired",
    priority: "P2",
  },
  {
    id: "assessment-review-schedule",
    area: "Assessments",
    feature: "Review due dates (Waterlow 6mo, pathway form intervals)",
    status: "partial",
    whereToday: "assessment-review-schedule.ts + AssessmentReviewBadge",
    gap: "AssessmentReviewQueuePage; reminder cron script exists but not scheduled",
    priority: "P2",
  },
  {
    id: "body-map-link",
    area: "Integrations",
    feature: "IA §11 ↔ body map baseline",
    status: "done",
    whereToday: "Open body map CTA + promotion on skin integrity",
    gap: "Prod demo seed optional",
    priority: "P3",
  },
  {
    id: "emar-link",
    area: "Integrations",
    feature: "IA §9 ↔ eMAR setup action",
    status: "done",
    whereToday: "EMAR_SETUP action on submit when required",
    gap: "Deep link to med wizard works locally",
    priority: "P2",
  },
  {
    id: "holistic-export",
    area: "Governance",
    feature: "HTML/PDF export includes all 18 holistic worksheets",
    status: "partial",
    whereToday: "HTML/PDF export shipped for core sections",
    gap: "HOL14–16: MCA checklist, photography consent, clinical outcome auto-fill",
    priority: "P2",
  },
  {
    id: "legacy-retire",
    area: "Legacy",
    feature: "Retire checklist + catalog.json (Phase 6)",
    status: "missing",
    whereToday: "Legacy route still live; catalog still in admin repo",
    gap: "import-legacy API + redirect not built",
    priority: "P2",
  },
  {
    id: "prod-seed",
    area: "Production",
    feature: "Production DB seed + migrations parity",
    status: "partial",
    whereToday: "API 96c33ac — catalog bundled, vital migration added",
    gap: "Run migrate deploy + db seed on VPS; IA template prunes",
    priority: "P0",
  },
];

const REFERRAL_ROWS: string[][] = [
  ["GP review", "InitialAssessmentActionType.GP_REVIEW", "§5 breathing, §6 nutrition, §10 sleep/mental health/cognition", "Action row on IA only", "Referral tracker + Care Plan visibility"],
  ["SALT referral", "SALT_REFERRAL", "§5.4 swallowing concern", "Submit validation can block", "Outcome + appointment date"],
  ["Dietitian referral", "DIETITIAN_REFERRAL", "§6 MUST / nutrition flags", "Auto action on submit", "Link to Eating & Drinking care plan"],
  ["Continence referral", "CONTINENCE_REFERRAL", "§7 continence triggers", "Auto action", "Link to continence care plan"],
  ["Safeguarding referral", "SAFEGUARDING_REFERRAL", "§13 safeguarding", "High priority action", "Manager queue + audit"],
  ["Falls assessment", "FALLS_ASSESSMENT", "§12 falls history / triggers", "Promoted to assessments registry", "Repeat on care plan, not IA"],
  ["Equipment / OT", "EQUIPMENT_ORDER / OTHER", "§12.10 further equipment", "IA action + care plan rec", "Order tracking not built"],
  ["Specialist nurse", "OTHER (inferred)", "§5 GP/Specialist Nurse review requested", "Multi-select option only", "No dedicated action type"],
];

const PHASE_ROADMAP: TodoItem[] = [
  {
    id: "ph0",
    status: "completed",
    content: "P0 — Production parity: migrate deploy, db seed, verify IA draft on prod",
  },
  {
    id: "ph1",
    status: "pending",
    content: "P1 — Care Plan page: wire Risk Profile, Consent, Monitor accordions from IA + assessments",
  },
  {
    id: "ph2",
    status: "pending",
    content: "P1 — SU-level risk register: roll up IA risk records + pathway assessment flags",
  },
  {
    id: "ph3",
    status: "pending",
    content: "P1 — Referral workflow: GP/SALT/dietitian tracker with status, dates, assignee (extend InitialAssessmentAction or new Referral table)",
  },
  {
    id: "ph4",
    status: "pending",
    content: "P1 — BE5.3: create care plan draft automatically when IA recommendation accepted",
  },
  {
    id: "ph5",
    status: "pending",
    content: "P1 — Assessment ↔ care plan linking: show links on care plan form, compose evidence from linked completions",
  },
  {
    id: "ph6",
    status: "pending",
    content: "P1 — Care Review product (3/6/12 mo) — new entity, not IA repeat",
  },
  {
    id: "ph7",
    status: "pending",
    content: "P2 — Central consent register + Care Review consent",
  },
  {
    id: "ph8",
    status: "pending",
    content: "P2 — Visit plan ↔ pathway actions / care plan objectives (VP-BE6/7)",
  },
  {
    id: "ph9",
    status: "pending",
    content: "P2 — Phase 6 legacy retire + import-legacy migration",
  },
  {
    id: "ph10",
    status: "pending",
    content: "P2 — Assessment review reminders cron + AssessmentReviewQueue operational",
  },
];

function countStatus(s: Status) {
  return ROWS.filter((r) => r.status === s).length;
}

const DONE = countStatus("done");
const PARTIAL = countStatus("partial");
const MISSING = countStatus("missing");
const TOTAL = ROWS.length;

export default function CarePathwayRoadmapCanvas() {
  const [view, setView] = useCanvasState<View>("cp-view", "overview");
  const [filter, setFilter] = useCanvasState<Filter>("cp-filter", "all");

  const filtered =
    filter === "all" ? ROWS : ROWS.filter((r) => r.status === filter);

  const tableRows: (string | number)[][] = filtered.map((r) => [
    r.area,
    r.feature,
    STATUS_LABEL[r.status],
    r.priority,
    r.gap,
  ]);

  const tableTones: TableRowTone[] = filtered.map((r) =>
    r.status === "done" ? "success" : r.status === "partial" ? "warning" : "danger",
  );

  const gapTodos: TodoItem[] = ROWS.filter((r) => r.status !== "done").map((r) => ({
    id: r.id,
    status: (r.status === "missing" ? "pending" : "in_progress") as TodoStatus,
    content: `[${r.priority}] ${r.feature} — ${r.gap}`,
  }));

  return (
    <Stack gap={16}>
      <Stack gap={4}>
        <H1>Care Pathway Roadmap</H1>
        <Text tone="secondary">
          IA once at admission → ongoing assessments & care plans from Care Pathway → Care Review
          (future). Built vs discussed gaps — {TOTAL} tracked items.
        </Text>
      </Stack>

      <UsageBar
        total={TOTAL}
        topLeftLabel="Care pathway coverage"
        topRightLabel={`${DONE} built · ${PARTIAL} partial · ${MISSING} missing`}
        segments={[
          { id: "done", value: DONE, color: "green" },
          { id: "partial", value: PARTIAL, color: "orange" },
          { id: "missing", value: MISSING, color: "pink" },
        ]}
      />

      <Row gap={8} wrap>
        {(
          [
            ["overview", "Overview"],
            ["built", "What's built"],
            ["gaps", "Gaps & missing"],
            ["referrals", "Referrals"],
            ["roadmap", "Next phases"],
          ] as const
        ).map(([id, label]) => (
          <Pill key={id} active={view === id} onClick={() => setView(id)}>
            {label}
          </Pill>
        ))}
      </Row>

      {view === "overview" && (
        <Grid columns={3} gap={12}>
          <Stat label="Built" value={String(DONE)} tone="success" />
          <Stat label="Partial" value={String(PARTIAL)} tone="warning" />
          <Stat label="Missing" value={String(MISSING)} tone="danger" />
        </Grid>
      )}

      {view === "overview" && (
        <Callout tone="info">
          <Stack gap={6}>
            <Text weight="semibold">Architecture (agreed)</Text>
            <Text>
              Initial Assessment = one-time admission snapshot. Repeat tools (Waterlow, MUST,
              Falls…) and Care Pathway assessment forms live on the Care Plan assessments registry.
              Care plans come from Care Pathway CARE_PLAN forms, composed from IA + latest
              assessments. Periodic reviews = future Care Review product — not another IA.
            </Text>
          </Stack>
        </Callout>
      )}

      {view === "overview" && (
        <Card>
          <CardHeader>Care Plan page — accordion reality check</CardHeader>
          <CardBody>
            <Table
              headers={["Accordion", "Status", "Notes"]}
              rows={[
                ["Margaret's Assessments", "Built", "Add/Repeat, consent, history, link to care plan"],
                ["Consent and Mental Capacity", "Empty placeholder", "Needs IA §2 + assessment consent roll-up"],
                ["Risk Profile", "Empty placeholder", "Needs SU risk register from IA + assessments"],
                ["Active / Inactive Care Plans", "Partial", "List + compose/publish; monitor tab empty"],
              ]}
            />
          </CardBody>
        </Card>
      )}

      {(view === "overview" || view === "built" || view === "gaps") && (
        <Stack gap={8}>
          <Row gap={8} wrap>
            {(["all", "done", "partial", "missing"] as const).map((f) => (
              <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : STATUS_LABEL[f]} (
                {f === "all" ? TOTAL : countStatus(f)})
              </Pill>
            ))}
          </Row>
          <Table
            headers={["Area", "Feature", "Status", "Priority", "Gap / next step"]}
            rows={tableRows}
            rowTone={tableTones}
            striped
          />
        </Stack>
      )}

      {view === "referrals" && (
        <Card>
          <CardHeader>Referrals & clinical actions</CardHeader>
          <CardBody>
            <Stack gap={8}>
              <Callout tone="warning">
                IA already generates GP/SALT/dietitian/safeguarding actions on submit — but they
                live on the IA submission, not as a service-user referral register or Care Plan
                work queue.
              </Callout>
              <Table
                headers={["Referral / action", "Code", "Triggered from", "Today", "Missing"]}
                rows={REFERRAL_ROWS}
                striped
              />
            </Stack>
          </CardBody>
        </Card>
      )}

      {view === "roadmap" && (
        <Stack gap={12}>
          <Card>
            <CardHeader>Recommended build order</CardHeader>
            <CardBody>
              <TodoListCard todos={PHASE_ROADMAP} defaultExpanded />
            </CardBody>
          </Card>
          <Divider />
          <H2>Linking model (target)</H2>
          <Card variant="borderless">
            <CardBody>
              <Stack gap={4}>
                <Text>
                  IA submit → promotes tools to Assessments + generates actions/recommendations
                </Text>
                <Text>
                  Manual pathway assessment → completion → auto-link to mapped care plans (catalog)
                </Text>
                <Text>
                  Manager accepts care plan rec → draft instance (BE5.3) → compose from IA +
                  linked assessments → publish
                </Text>
                <Text>
                  Risk register rolls up IA risk matrix + flagged assessment outcomes → feeds Falls
                  / Personal Safety care plans
                </Text>
                <Text tone="tertiary">
                  Care Review (future) reuses assessments registry + care plan instances — does not
                  reopen IA template
                </Text>
              </Stack>
            </CardBody>
          </Card>
        </Stack>
      )}

      {view === "gaps" && (
        <Card>
          <CardHeader>Open gaps (partial + missing)</CardHeader>
          <CardBody>
            <TodoListCard todos={gapTodos.slice(0, 18)} defaultExpanded />
          </CardBody>
        </Card>
      )}

      <Text tone="tertiary" size="small">
        Source: codebase audit + conversation — IA enterprise plan, care pathway registry, production
        seed work. Updated Jun 2026.
      </Text>
    </Stack>
  );
}
