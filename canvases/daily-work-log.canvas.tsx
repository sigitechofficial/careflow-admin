import {
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  mergeStyle,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  TodoList,
  useCanvasState,
  useHostTheme,
} from "cursor/canvas";
import type { TodoItem } from "cursor/canvas";

/** Append newest day at the top of this array when closing out a session. */
type DayArea = {
  label: string;
  items: string[];
};

type CanvasRef = {
  id: string;
  file: string;
  title: string;
  note: string;
};

type DayLog = {
  date: string;
  weekday: string;
  headline: string;
  summary: string;
  areas: DayArea[];
  canvasRefs: CanvasRef[];
  keyPaths: string[];
};

type NoticeTone = "info" | "success" | "warning";

/** Replaces legacy Callout (not in current cursor/canvas SDK). */
function Notice({
  title,
  children,
  tone = "info",
}: {
  title: string;
  children: unknown;
  tone?: NoticeTone;
}) {
  const { tokens: t } = useHostTheme();
  const accent =
    tone === "success" ? t.accent.primary : tone === "warning" ? t.text.secondary : t.stroke.secondary;
  return (
    <Card
      style={mergeStyle(
        { background: t.fill.tertiary, borderLeft: `3px solid ${accent}` },
        undefined,
      )}
    >
      <CardHeader>{title}</CardHeader>
      <CardBody>
        <Text tone="secondary">{children}</Text>
      </CardBody>
    </Card>
  );
}

const PROJECT_CANVASES: CanvasRef[] = [
  {
    id: "ia-plan",
    file: "canvases/initial-assessment-enterprise-plan.canvas.tsx",
    title: "Initial Assessment — Enterprise Plan",
    note: "18 holistic paper tabs, metadata persistence, BE/FE/SW/QA task boards",
  },
  {
    id: "enterprise",
    file: "canvases/enterprise-design-plan.canvas.tsx",
    title: "Enterprise Design Plan",
    note: "Cross-module enterprise UX, medication, blister pack prototypes",
  },
  {
    id: "body-map",
    file: "canvases/body-map-plan.canvas.tsx",
    title: "Body Map Plan",
    note: "Body map + MAR integration phases",
  },
  {
    id: "daily",
    file: "canvases/daily-work-log.canvas.tsx",
    title: "Daily Work Log",
    note: "This file — per-day shipped work",
  },
];

const DAY_LOGS: DayLog[] = [
  {
    date: "2026-06-05",
    weekday: "Friday",
    headline: "Holistic IA — all 18 tabs persist to backend + Playwright",
    summary:
      "Replaced remaining legacy form sections with paper worksheets (Mental Capacity Checklist, Photography Consent, Equipment Selection). Wired every tab to submission.metadata or template answers. Updated Playwright autofill to patch and verify all worksheet keys.",
    areas: [
      {
        label: "Paper worksheet tabs (care-admin)",
        items: [
          "Tab 17: Mental Capacity Checklist — 21 rows + signatures → metadata.mentalCapacityChecklist",
          "Tab 18: Photography consent form → metadata.photographyConsent",
          "Tab 6: Equipment selection — editable risk/equipment/OT fields → metadata.equipmentSelection",
          "Tab 16: Care plan objectives + Sign-off panel restored (§14 template answers)",
          "Tabs 7–15: MUST, falls, moving/handling, pain, therapy, environment, ACP, EoL, clinical outcome, care plan (prior session)",
        ],
      },
      {
        label: "Backend persistence",
        items: [
          "All worksheet data stored in InitialAssessmentSubmission.metadata (JSON shallow merge on PATCH)",
          "Template Q&A (tabs 1–3, §12 questions, sign-off) in InitialAssessmentAnswer with autosave",
          "Fixed MCA screening seed: options wrapped as { options: [{ value, label }] }",
        ],
      },
      {
        label: "Playwright / E2E autofill",
        items: [
          "ia-holistic-metadata-autofill.ts — buildHolisticWorksheetMetadata() for all 18 tabs",
          "initial-assessment-autofill.ts — asserts metadata keys after API patch",
          "fill-initial-assessment.spec.ts — expects 18 nav tabs; verifies photography + equipment hydrate",
        ],
      },
      {
        label: "Planning canvases",
        items: [
          "initial-assessment-enterprise-plan.canvas.tsx — new Holistic tabs view + HOL* task board",
          "daily-work-log.canvas.tsx — this entry",
        ],
      },
    ],
    canvasRefs: [
      {
        id: "ia-plan",
        file: "canvases/initial-assessment-enterprise-plan.canvas.tsx",
        title: "Initial Assessment — Enterprise Plan",
        note: "Holistic view, HOL1–HOL13 complete, QA5 + QA11 complete",
      },
      {
        id: "daily",
        file: "canvases/daily-work-log.canvas.tsx",
        title: "Daily Work Log",
        note: "2026-06-05 session logged",
      },
    ],
    keyPaths: [
      "care-admin/src/features/service-users/initial-assessment/utils/ia-holistic-metadata-autofill.ts",
      "care-admin/src/features/service-users/initial-assessment/utils/equipment-selection.ts",
      "care-admin/src/features/service-users/initial-assessment/utils/photography-consent.ts",
      "care-admin/src/features/service-users/initial-assessment/utils/mental-capacity-checklist.ts",
      "care-admin/tests/e2e/helpers/initial-assessment-autofill.ts",
      "care-admin/tests/e2e/service-users/fill-initial-assessment.spec.ts",
      "careadmin-backend/prisma/seeds/initial-assessment-mca-screening.seed.ts",
    ],
  },
  {
    date: "2026-06-02",
    weekday: "Tuesday",
    headline: "Enterprise IA — export, §1 visit times, canvas sync",
    summary:
      "Shipped branded HTML/PDF assessment export, rebuilt preferred visit times using medication administration rounds, fixed autosave wiping visit-time answers, and synced the IA plan canvas task board.",
    areas: [
      {
        label: "HTML & PDF export",
        items: [
          "GET …/html — cover page, TOC, Q&A cards, org logo as embedded base64",
          "InitialAssessmentHtmlExportDialog — iframe preview before download",
          "PDF now renders the same HTML via puppeteer-core (system Chrome/Edge)",
          "Export formatting iterations: cards + summary table (not table-heavy layout)",
        ],
      },
      {
        label: "§1 Person-centred & visit times",
        items: [
          "Preferred visit times moved out of person-centred card grid into its own panel",
          "Checkboxes per slot with editable From/To times",
          "Slots loaded from medication-lookups rounds (Morning → Night, same as MAR “at times”)",
          "Answers stored as round codes (MORNING, EVENING, …) with custom windows",
          "Person-centred cards: single column (one card per row)",
        ],
      },
      {
        label: "Bug fixes",
        items: [
          "Autosave: preserve object-shaped selectedOptions when hydrating from API",
          "Autosave: only save when the section has dirty answers (stops “All changes saved” loop)",
        ],
      },
      {
        label: "Other IA polish (earlier in session)",
        items: [
          "Risk matrix heatmap help tooltip (likelihood × severity)",
          "Versions tab — submission detail sheet (timeline, users, review notes)",
          "BodyMapRecordTypeCatalog — unified wound types for IA §11 + body map wizard",
        ],
      },
      {
        label: "Planning",
        items: [
          "Updated initial-assessment-enterprise-plan.canvas.tsx with completed + pending tasks",
        ],
      },
    ],
    canvasRefs: [
      {
        id: "ia-plan",
        file: "canvases/initial-assessment-enterprise-plan.canvas.tsx",
        title: "Initial Assessment — Enterprise Plan",
        note: "Marked BE4.11–4.13, FE1.13–1.14, FE4.10–4.11, FE5.6, QA9 complete",
      },
    ],
    keyPaths: [
      "careadmin-backend/src/initial-assessments/initial-assessment-html.util.ts",
      "careadmin-backend/src/initial-assessments/initial-assessment-pdf.util.ts",
      "careadmin-backend/src/common/utils/html-to-pdf.util.ts",
      "careadmin-backend/src/initial-assessments/initial-assessment-export-logo.util.ts",
      "care-admin/src/features/service-users/initial-assessment/components/InitialAssessmentPreferredVisitTimesField.tsx",
      "care-admin/src/features/service-users/initial-assessment/utils/preferred-visit-times.ts",
      "care-admin/src/features/service-users/initial-assessment/pages/ServiceUserInitialAssessmentEnterprisePage.tsx",
    ],
  },
];

const REF_CANVAS_ROWS = PROJECT_CANVASES.map(c => [c.title, c.file, c.note]);

function dayTodos(log: DayLog): TodoItem[] {
  return log.areas.flatMap((area, ai) =>
    area.items.map((item, ii) => ({
      id: `${log.date}-a${ai}-i${ii}`,
      status: "completed" as const,
      content: `${area.label}: ${item}`,
    })),
  );
}

function DayDetail({ log }: { log: DayLog }) {
  return (
    <Stack gap={16}>
      <Notice title={`${log.weekday} · ${log.date}`} tone="info">
        {log.summary}
      </Notice>
      <Grid columns={3} gap={12}>
        <Stat value={String(log.areas.length)} label="Work areas" />
        <Stat value={String(log.areas.reduce((n, a) => n + a.items.length, 0))} label="Items logged" />
        <Stat value={String(log.canvasRefs.length)} label="Canvases updated" />
      </Grid>
      {log.areas.map(area => (
        <Card key={area.label}>
          <CardHeader>{area.label}</CardHeader>
          <CardBody>
            <TodoList todos={area.items.map((item, i) => ({ id: `${area.label}-${i}`, status: "completed", content: item }))} />
          </CardBody>
        </Card>
      ))}
      {log.canvasRefs.length > 0 ? (
        <>
          <H3>Canvas references</H3>
          <Table
            headers={["Canvas", "File", "Notes"]}
            rows={log.canvasRefs.map(r => [r.title, r.file, r.note])}
            striped
          />
        </>
      ) : null}
      {log.keyPaths.length > 0 ? (
        <>
          <H3>Key code paths</H3>
          <Table headers={["Path"]} rows={log.keyPaths.map(p => [p])} striped />
        </>
      ) : null}
    </Stack>
  );
}

export default function DailyWorkLog() {
  const defaultDate = DAY_LOGS[0]?.date ?? "";
  const [selectedDate, setSelectedDate] = useCanvasState<string>("daily.selectedDate", defaultDate);
  const [view, setView] = useCanvasState<"days" | "refs" | "howto">("daily.view", "days");

  const activeDate = selectedDate ?? defaultDate;
  const log = DAY_LOGS.find(d => d.date === activeDate) ?? DAY_LOGS[0];
  const totalItems = DAY_LOGS.reduce((n, d) => n + d.areas.reduce((m, a) => m + a.items.length, 0), 0);

  return (
    <Stack gap={24} style={{ maxWidth: 920, margin: "0 auto", padding: "24px 20px 48px" }}>
      <Stack gap={4}>
        <H1>Daily work log</H1>
        <Text tone="secondary">
          Per-day record of shipped work for Care Admin. Cross-check plan canvases, then append a new entry at the top of{" "}
          <Text as="span" tone="primary">
            DAY_LOGS
          </Text>{" "}
          in this file.
        </Text>
      </Stack>

      <Grid columns={3} gap={12}>
        <Stat value={String(DAY_LOGS.length)} label="Days tracked" />
        <Stat value={String(totalItems)} label="Logged items (all days)" />
        <Stat value={String(PROJECT_CANVASES.length)} label="Plan canvases" />
      </Grid>

      <Row gap={8} wrap>
        <Pill active={view === "days"} onClick={() => setView("days")}>
          By day
        </Pill>
        <Pill active={view === "refs"} onClick={() => setView("refs")}>
          Plan canvases
        </Pill>
        <Pill active={view === "howto"} onClick={() => setView("howto")}>
          How to update
        </Pill>
      </Row>

      <Divider />

      {view === "days" && log ? (
        <Stack gap={16}>
          <Row gap={8} wrap>
            {DAY_LOGS.map(d => (
              <Pill key={d.date} active={activeDate === d.date} onClick={() => setSelectedDate(d.date)}>
                {d.date}
              </Pill>
            ))}
          </Row>
          <H2>{log.headline}</H2>
          <DayDetail log={log} />
          <Card>
            <CardHeader trailing={<Pill size="sm">All items</Pill>}>Full checklist — {log.date}</CardHeader>
            <CardBody>
              <TodoList todos={dayTodos(log)} />
            </CardBody>
          </Card>
        </Stack>
      ) : null}

      {view === "refs" ? (
        <Stack gap={16}>
          <Notice title="Reference canvases" tone="info">
            Open these to see phase tasks and what is still pending. After a day&apos;s work, update the relevant plan
            canvas and add a summary here.
          </Notice>
          <Table headers={["Canvas", "Path in repo", "Purpose"]} rows={REF_CANVAS_ROWS} striped />
        </Stack>
      ) : null}

      {view === "howto" ? (
        <Stack gap={16}>
          <H3>End-of-day workflow</H3>
          <TodoList
            todos={[
              {
                id: "h1",
                status: "completed",
                content: "Review git diff or session notes for care-admin + careadmin-backend",
              },
              {
                id: "h2",
                status: "completed",
                content: "Open each plan canvas — mark completed tasks, add new ones if scope grew",
              },
              {
                id: "h3",
                status: "pending",
                content: "Prepend a new DayLog object to DAY_LOGS (newest date first) in daily-work-log.canvas.tsx",
              },
              {
                id: "h4",
                status: "pending",
                content: "List canvasRefs pointing to which plan files you updated",
              },
              {
                id: "h5",
                status: "pending",
                content: "Optional: note keyPaths for major files touched (helps code review)",
              },
            ]}
          />
          <Notice title="Template fields for a new day" tone="success">
            date (YYYY-MM-DD) · weekday · headline · summary · areas[] (label + items[]) · canvasRefs[] · keyPaths[]
          </Notice>
        </Stack>
      ) : null}

      <Text tone="tertiary" size="small">
        Repo: canvases/daily-work-log.canvas.tsx · Sync with initial-assessment-enterprise-plan, enterprise-design-plan,
        and body-map-plan canvases
      </Text>
    </Stack>
  );
}
