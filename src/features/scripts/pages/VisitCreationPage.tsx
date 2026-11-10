import * as React from 'react'
import { CalendarPlus, FlaskConical, Loader2, Play, Plus, Trash2, Users, Wand2 } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { MultiSelect } from '@/shared/ui/multi-select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/dialog'
import { useMedicationRounds } from '@/features/settings/hooks/useMedicationRounds'
import {
  useRotaDatesPreview,
  useScriptCarerOptions,
  useScriptServiceUserOptions,
  useVisitCreationConfig,
  useVisitCreationRun,
} from '@/features/scripts/hooks'
import { RunResult } from '@/features/scripts/components/RunResult'
import { cn } from '@/shared/lib/utils'
import {
  VisitExtrasEditor,
  medicineTimeInVisit,
  type VisitMedicineDraft,
  type VisitTaskDraft,
} from '@/features/scripts/components/VisitExtrasEditor'
import type { CreateVisitsInput, RunMeta, VisitInput } from '@/features/scripts/create-visits.runner'

type Mode = RunMeta['mode']

/** What Run will do, shown before anything is saved. */
type Confirmation = {
  mode: Mode
  lines: Array<{ label: string; value: React.ReactNode }>
  input: CreateVisitsInput
  meta: RunMeta
}

const DAY_CHIPS: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
]
const DAY_LABEL = Object.fromEntries(DAY_CHIPS.map((d) => [d.value, d.label])) as Record<number, string>
const HM = /^([01]\d|2[0-3]):[0-5]\d$/

/** "13:05" → "1:05 pm", as the time boxes show it. */
function clock12(hm: string): string {
  const [h = 0, m = 0] = hm.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

/** "Daily", "Weekdays", or "Mon, Wed" for a visit's days (numbers 0=Sun … 6=Sat, or the config's words). */
function daysText(days: VisitInput['days']): string {
  if (days == null || days === 'daily') return 'Daily'
  if (days === 'weekdays') return 'Weekdays'
  if (days === 'weekends') return 'Weekends'
  if (!Array.isArray(days)) return String(days)
  const nums = days.map((d) => (typeof d === 'number' ? d : d))
  if (nums.length === 7) return 'Daily'
  return nums.map((d) => (typeof d === 'number' ? DAY_LABEL[d] : d)).join(', ')
}

const listText = (items: string[]) => (items.length ? items.join(', ') : '—')

const EXISTING_NOTE =
  'A visit with the same round and times on a service user’s current visit plan is updated; their other visits are kept, and another visit in a round they already have is added alongside it. ' +
  'Tasks are updated, not duplicated; medicines already active are skipped. Unavailable carers are swapped for available ones (listed in the result).'

/** Scripts → Visit Creation: the configured automation, or one built from selected service users and carers. */
export default function VisitCreationPage() {
  const run = useVisitCreationRun()
  const [lastMode, setLastMode] = React.useState<Mode | null>(null)
  const [confirm, setConfirm] = React.useState<Confirmation | null>(null)
  const rota = useRotaDatesPreview(Boolean(confirm))

  const start = (input: CreateVisitsInput, meta: RunMeta, dryRun: boolean) => {
    setLastMode(meta.mode)
    void run.start(input, meta, dryRun)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Visit Creation"
        description="Create service user visits, assign carers, and set up their tasks and medicines with the existing visit plan and rota steps. Every check the screens run still applies."
        icon={<CalendarPlus className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Scripts', href: '/scripts' }, { label: 'Visit Creation' }]}
      />

      <AutomaticSection
        running={run.running}
        onStart={(input, dryRun) => start(input, { mode: 'AUTOMATIC' }, dryRun)}
        onConfirm={setConfirm}
        result={lastMode === 'AUTOMATIC' ? <RunResult state={run.state} log={run.log} onGenerateRota={() => void run.generateRota()} onSkipRota={run.skipRota} /> : null}
      />

      <CustomSection
        running={run.running}
        onStart={start}
        onConfirm={setConfirm}
        result={lastMode === 'CUSTOM' ? <RunResult state={run.state} log={run.log} onGenerateRota={() => void run.generateRota()} onSkipRota={run.skipRota} /> : null}
      />

      <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => (!open ? setConfirm(null) : undefined)}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Run {confirm?.mode === 'AUTOMATIC' ? 'Automatic' : 'Custom'} Visit Creation?</AlertDialogTitle>
            <AlertDialogDescription>This saves for real, under your name.</AlertDialogDescription>
          </AlertDialogHeader>
          <dl className="max-h-[50vh] space-y-2 overflow-auto text-sm">
            {confirm?.lines.map((l) => (
              <div key={l.label}>
                <dt className="text-xs font-medium text-muted-foreground">{l.label}</dt>
                <dd className="text-foreground">{l.value}</dd>
              </div>
            ))}
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Rota</dt>
              <dd className="text-foreground">
                After the run you choose Generate rota or Not now. Generate rota covers{' '}
                {rota.data
                  ? `${rota.data.fromDate} → ${rota.data.toDate} (${rota.data.how})`
                  : rota.isError
                    ? 'today → the rota horizon (Settings → Dom Rules)'
                    : '…'}
                .
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Existing records</dt>
              <dd className="text-foreground">{EXISTING_NOTE}</dd>
            </div>
          </dl>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={run.running}
              onClick={() => {
                if (confirm) start(confirm.input, confirm.meta, false)
                setConfirm(null)
              }}
            >
              Run Automation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Option 1: the configured automation ─────────────────────────────────────

function AutomaticSection({
  running,
  onStart,
  onConfirm,
  result,
}: {
  running: boolean
  onStart: (input: CreateVisitsInput, dryRun: boolean) => void
  onConfirm: (c: Confirmation) => void
  result: React.ReactNode
}) {
  const config = useVisitCreationConfig()
  const input = config.data?.config
  const serviceUsers = input?.serviceUsers ?? []
  const carers = [
    ...new Set(
      serviceUsers.flatMap((su) =>
        su.visits.flatMap((v) => [
          ...(Array.isArray(v.carers) ? v.carers : v.carers ? [v.carers] : []),
          ...Object.values(v.carersByDay ?? {}).flatMap((c) => (Array.isArray(c) ? c : [c])),
        ]),
      ),
    ),
    ...(input?.carer ? (Array.isArray(input.carer) ? input.carer : [input.carer]) : []),
  ]

  return (
    <Card data-testid="visit-creation-automatic">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wand2 className="h-4 w-4 text-primary" aria-hidden />
          Automatic Visit Creation
        </CardTitle>
        <CardDescription>
          Automatically create visits using the existing automation script and its configured service users, carers, schedules, tasks, and
          medications.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {config.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading the configured automation…
          </p>
        ) : config.isError ? (
          <p className="text-sm text-destructive" role="alert">
            {config.error instanceof Error ? config.error.message : 'The configured automation could not be loaded.'}
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Configured in <span className="font-mono">{config.data?.source}</span> on the server (the same file as{' '}
              <span className="font-mono">npm run visits:create</span>).
            </p>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Service user</th>
                    <th className="px-3 py-2 font-medium">Visits and carers</th>
                    <th className="px-3 py-2 font-medium">Tasks</th>
                    <th className="px-3 py-2 font-medium">Medicines</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {serviceUsers.map((su) => (
                    <tr key={su.serviceUser} className="align-top">
                      <td className="px-3 py-2 font-medium text-foreground">{su.serviceUser}</td>
                      <td className="px-3 py-2">
                        <ul className="space-y-0.5">
                          {su.visits.map((v) => (
                            <li key={`${v.round}-${v.start}`}>
                              {v.round} {v.start}–{v.end} · {daysText(v.days)} ·{' '}
                              {listText(Array.isArray(v.carers) ? v.carers : v.carers ? [v.carers] : [])}
                              {v.carersByDay
                                ? ` (${Object.entries(v.carersByDay)
                                    .map(([d, c]) => `${d}: ${Array.isArray(c) ? c.join(' + ') : c}`)
                                    .join('; ')})`
                                : ''}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-3 py-2 tabular-nums">{su.visits.reduce((n, v) => n + (v.tasks?.length ?? 0), 0)}</td>
                      <td className="px-3 py-2 tabular-nums">{su.visits.reduce((n, v) => n + (v.medicines?.length ?? 0), 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={running || !input}
                leftIcon={<FlaskConical className="h-4 w-4" />}
                onClick={() => input && onStart(input, true)}
              >
                Check first (nothing saved)
              </Button>
              <Button
                type="button"
                disabled={running || !input}
                leftIcon={running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                onClick={() =>
                  input &&
                  onConfirm({
                    mode: 'AUTOMATIC',
                    input,
                    meta: { mode: 'AUTOMATIC' },
                    lines: [
                      { label: 'Mode', value: 'Automatic — the configured automation' },
                      { label: `Service users (${serviceUsers.length})`, value: listText(serviceUsers.map((s) => s.serviceUser)) },
                      { label: `Carers (${carers.length})`, value: listText(carers) },
                      {
                        label: 'Visits',
                        value: `${serviceUsers.reduce((n, s) => n + s.visits.length, 0)} visit pattern(s), with their tasks and medicines`,
                      },
                    ],
                  })
                }
              >
                {running ? 'Running…' : 'Run Automation'}
              </Button>
            </div>
          </>
        )}
        {result}
      </CardContent>
    </Card>
  )
}

// ── Option 2: selected service users and carers ─────────────────────────────

/** One visit on the page. forIds: the selected service users it is for — empty means all of them. */
type VisitRow = {
  id: number
  round: string
  start: string
  end: string
  days: number[]
  carersNeeded: 1 | 2
  forIds: string[]
  /** Optional: added to every service user the visit is for. */
  tasks: VisitTaskDraft[]
  medicines: VisitMedicineDraft[]
  /** Medicines the run picks from the built-in list, for each service user (0 = none). */
  autoMedicines: number
  /** Everyday tasks the run picks for the round, for each service user (0 = none). */
  autoTasks: number
  extrasOpen: boolean
}
type Mapping = Record<string, { lead?: string; secondary?: string }>

let nextRowId = 1
const newRow = (): VisitRow => ({
  id: nextRowId++,
  round: 'MORNING',
  start: '08:00',
  end: '08:30',
  days: [0, 1, 2, 3, 4, 5, 6],
  carersNeeded: 1,
  forIds: [],
  tasks: [],
  medicines: [],
  autoMedicines: 0,
  autoTasks: 0,
  extrasOpen: false,
})

const appliesTo = (r: VisitRow, su: string) => !r.forIds.length || r.forIds.includes(su)

/** Two visits for the same service user that overlap on a shared day (overnight Night visits run to the end of the day). */
function overlaps(a: VisitRow, b: VisitRow): boolean {
  if (!a.days.some((d) => b.days.includes(d))) return false
  const end = (r: VisitRow) => (r.end <= r.start ? '24:00' : r.end)
  return a.start < end(b) && b.start < end(a)
}

function CustomSection({
  running,
  onStart,
  onConfirm,
  result,
}: {
  running: boolean
  onStart: (input: CreateVisitsInput, meta: RunMeta, dryRun: boolean) => void
  onConfirm: (c: Confirmation) => void
  result: React.ReactNode
}) {
  const serviceUserOptions = useScriptServiceUserOptions()
  const carerOptions = useScriptCarerOptions()
  const { data: rounds = [] } = useMedicationRounds()
  const [serviceUserIds, setServiceUserIds] = React.useState<string[]>([])
  const [carerIds, setCarerIds] = React.useState<string[]>([])
  const [rows, setRows] = React.useState<VisitRow[]>(() => [newRow()])
  /** The row Add visit just put at the top: scrolled to and briefly highlighted, so it is easy to spot. */
  const [justAdded, setJustAdded] = React.useState<number | null>(null)
  const justAddedRef = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    if (justAdded == null) return
    justAddedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    const t = window.setTimeout(() => setJustAdded(null), 2500)
    return () => window.clearTimeout(t)
  }, [justAdded])
  const addVisit = () => {
    const row = newRow()
    setRows((prev) => [row, ...prev])
    setJustAdded(row.id)
  }
  const [mapping, setMapping] = React.useState<Mapping>({})
  const [showErrors, setShowErrors] = React.useState(false)

  const suLabel = (id: string) => serviceUserOptions.data?.find((o) => o.value === id)?.label ?? id
  const carerLabel = (id: string) => (carerOptions.data?.find((o) => o.value === id)?.label ?? id).split(' — ')[0]!
  const rowsFor = (su: string) => rows.filter((r) => appliesTo(r, su))
  const needsSecondaryFor = (su: string) => rowsFor(su).some((r) => r.carersNeeded === 2)
  const needsSecondary = serviceUserIds.some(needsSecondaryFor)

  // A service user taken off the selection is no longer a visit's "For".
  React.useEffect(() => {
    setRows((prev) =>
      prev.some((r) => r.forIds.some((id) => !serviceUserIds.includes(id)))
        ? prev.map((r) => ({ ...r, forIds: r.forIds.filter((id) => serviceUserIds.includes(id)) }))
        : prev,
    )
  }, [serviceUserIds])

  // A carer taken off the selection no longer leads or supports anyone.
  React.useEffect(() => {
    setMapping((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([su, m]) => [
          su,
          {
            lead: m.lead && carerIds.includes(m.lead) ? m.lead : undefined,
            secondary: m.secondary && carerIds.includes(m.secondary) ? m.secondary : undefined,
          },
        ]),
      ),
    )
  }, [carerIds])

  const errors: string[] = []
  if (!serviceUserIds.length) errors.push('Select at least one service user.')
  if (!carerIds.length) errors.push('Select at least one carer.')
  if (!rows.length) errors.push('Add at least one visit.')
  rows.forEach((r, i) => {
    const n = `Visit ${i + 1}`
    if (!r.round) errors.push(`${n}: choose its round.`)
    if (!HM.test(r.start) || !HM.test(r.end)) errors.push(`${n}: enter start and end times.`)
    else if (r.start === r.end) errors.push(`${n}: the end must differ from the start.`)
    // An end before the start runs past midnight: only Night visits do that — otherwise it is an AM/PM slip.
    else if (r.end < r.start && r.round !== 'NIGHT')
      errors.push(
        `${n}: ends at ${clock12(r.end)}, before it starts at ${clock12(r.start)} — check AM/PM (only Night visits can run past midnight).`,
      )
    if (!r.days.length) errors.push(`${n}: choose at least one day.`)
    r.medicines.forEach((m, j) => {
      const mn = `${n}, medicine ${j + 1}${m.name.trim() ? ` (${m.name.trim()})` : ''}`
      if (!m.name.trim()) errors.push(`${mn}: enter its name.`)
      if (!m.dose.trim()) errors.push(`${mn}: enter its dose.`)
      if (!m.route) errors.push(`${mn}: choose its route.`)
      if (m.kind === 'REGULAR') {
        if (!HM.test(m.time)) errors.push(`${mn}: enter its time.`)
        else if (HM.test(r.start) && HM.test(r.end) && !medicineTimeInVisit(m.time, r.start, r.end))
          errors.push(`${mn}: ${clock12(m.time)} is outside the visit (${clock12(r.start)}–${clock12(r.end)}) — choose a time within it.`)
      }
    })
    const names = r.medicines.map((m) => m.name.trim().toLowerCase()).filter(Boolean)
    if (new Set(names).size < names.length) errors.push(`${n}: the same medicine is added twice.`)
  })
  for (const su of serviceUserIds) {
    const m = mapping[su] ?? {}
    const own = rowsFor(su)
    if (!own.length) errors.push(`${suLabel(su)}: no visit is for them — set a visit's "For" to include them, or remove them.`)
    // Several visits in the same round are fine (as on the visit plan screen); at overlapping times they are not.
    own.forEach((a, i) =>
      own.slice(i + 1).forEach((b) => {
        if (HM.test(a.start) && HM.test(a.end) && HM.test(b.start) && HM.test(b.end) && overlaps(a, b))
          errors.push(
            `${suLabel(su)}: Visit ${rows.indexOf(a) + 1} and Visit ${rows.indexOf(b) + 1} overlap (${clock12(a.start)}–${clock12(a.end)} and ${clock12(b.start)}–${clock12(b.end)}).`,
          )
      }),
    )
    if (!m.lead) errors.push(`${suLabel(su)}: choose the Lead carer.`)
    if (needsSecondaryFor(su) && !m.secondary) errors.push(`${suLabel(su)}: choose the Secondary carer (a visit needs 2 carers).`)
    if (m.lead && m.secondary && m.lead === m.secondary) errors.push(`${suLabel(su)}: Lead and Secondary must be different carers.`)
  }

  const buildInput = (): CreateVisitsInput => ({
    amendmentReason: 'Visits set up from Scripts → Custom Visit Creation',
    // A mapped carer who is not available is replaced by another selected carer first.
    carerPool: carerIds,
    serviceUsers: serviceUserIds.map((su) => {
      const m = mapping[su]!
      return {
        serviceUser: su,
        visits: rowsFor(su).map((r) => ({
          round: r.round,
          start: r.start,
          end: r.end,
          days: r.days,
          // Lead first (the plan's Lead carer), then Secondary on double-up visits.
          carers: r.carersNeeded === 2 ? [m.lead!, m.secondary!] : [m.lead!],
          requiredCarers: r.carersNeeded,
          ...(r.tasks.length
            ? {
                tasks: r.tasks.map((t) => ({
                  task: t.name,
                  priority: t.priority,
                  ...(t.instructions.trim() ? { instructions: t.instructions.trim() } : {}),
                })),
              }
            : {}),
          ...(r.medicines.length
            ? {
                medicines: r.medicines.map((m) => ({
                  name: m.name.trim(),
                  dose: m.dose.trim(),
                  route: m.route,
                  kind: m.kind,
                  ...(m.kind === 'REGULAR' ? { time: m.time } : {}),
                  ...(m.instructions.trim() ? { instructions: m.instructions.trim() } : {}),
                })),
              }
            : {}),
          ...(r.autoMedicines ? { autoMedicines: r.autoMedicines } : {}),
          ...(r.autoTasks ? { autoTasks: r.autoTasks } : {}),
        })),
      }
    }),
  })
  const meta: RunMeta = { mode: 'CUSTOM', serviceUserIds, carerIds }
  const forText = (r: VisitRow) =>
    !r.forIds.length || r.forIds.length === serviceUserIds.length ? 'all selected service users' : listText(r.forIds.map(suLabel))
  const visitText = (r: VisitRow) =>
    `${r.round} ${clock12(r.start)}–${clock12(r.end)} · ${daysText(r.days)} · ${r.carersNeeded === 2 ? 'Lead + Secondary (double-up)' : 'Lead'} · for ${forText(r)}`

  const attempt = (dryRun: boolean) => {
    setShowErrors(true)
    if (errors.length) return
    const input = buildInput()
    if (dryRun) {
      onStart(input, meta, true)
      return
    }
    onConfirm({
      mode: 'CUSTOM',
      input,
      meta,
      lines: [
        { label: 'Mode', value: 'Custom — the service users and carers selected here' },
        { label: `Service users (${serviceUserIds.length})`, value: listText(serviceUserIds.map(suLabel)) },
        {
          label: 'Carers',
          value: (
            <ul className="list-disc pl-5">
              {serviceUserIds.map((su) => (
                <li key={su}>
                  {suLabel(su)}: Lead {carerLabel(mapping[su]!.lead!)}
                  {needsSecondaryFor(su) ? `, Secondary ${carerLabel(mapping[su]!.secondary!)}` : ''}
                </li>
              ))}
            </ul>
          ),
        },
        {
          label: `Visits (${rows.length})`,
          value: (
            <ul className="list-disc pl-5">
              {rows.map((r) => (
                <li key={r.id}>
                  {visitText(r)}
                  {r.tasks.length ? (
                    <div className="text-xs text-muted-foreground">
                      Tasks: {r.tasks.map((t) => `${t.name} (${t.priority})`).join(', ')}
                    </div>
                  ) : null}
                  {r.medicines.length ? (
                    <div className="text-xs text-muted-foreground">
                      Medicines:{' '}
                      {r.medicines
                        .map((m) => `${m.name.trim()} ${m.dose.trim()} — ${m.kind === 'PRN' ? 'when needed' : clock12(m.time)}`)
                        .join(', ')}
                    </div>
                  ) : null}
                  {r.autoTasks ? (
                    <div className="text-xs text-muted-foreground">
                      Auto-add: {r.autoTasks} everyday task{r.autoTasks === 1 ? '' : 's'} for the {r.round.toLowerCase()} round, picked for each
                      service user when the script runs (ones they already have on this round are left out)
                    </div>
                  ) : null}
                  {r.autoMedicines ? (
                    <div className="text-xs text-muted-foreground">
                      Auto-add: {r.autoMedicines} medicine{r.autoMedicines === 1 ? '' : 's'} from the built-in list, picked for each service user
                      when the script runs (at {clock12(r.start)}; ones they already have active are left out)
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ),
        },
        {
          label: 'Tasks and medicines',
          value: rows.some((r) => r.tasks.length || r.medicines.length || r.autoMedicines || r.autoTasks)
            ? 'Added as listed for every service user each visit is for (tasks are updated, not duplicated; a medicine they already have active is skipped). Visits with none use the service user’s own.'
            : 'Each service user’s own (already set up per round) — none are added or invented.',
        },
      ],
    })
  }

  const setRow = (id: number, patch: Partial<VisitRow>) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const selectedCarers = (carerOptions.data ?? []).filter((o) => carerIds.includes(o.value))

  return (
    <Card data-testid="visit-creation-custom">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" aria-hidden />
          Custom Visit Creation
        </CardTitle>
        <CardDescription>
          Select one or multiple service users and carers, then automatically create their visits using the existing CareFlow visit creation
          workflow.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>
              Service users <span className="text-destructive">*</span>
            </Label>
            <MultiSelect
              options={serviceUserOptions.data ?? []}
              value={serviceUserIds}
              onChange={setServiceUserIds}
              placeholder={serviceUserOptions.isLoading ? 'Loading service users…' : 'Select service users'}
              searchPlaceholder="Search service users…"
              disabled={running || serviceUserOptions.isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Carers <span className="text-destructive">*</span>
            </Label>
            <MultiSelect
              options={carerOptions.data ?? []}
              value={carerIds}
              onChange={setCarerIds}
              placeholder={carerOptions.isLoading ? 'Loading carers…' : 'Select carers'}
              searchPlaceholder="Search carers…"
              disabled={running || carerOptions.isLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>
              Visits <span className="text-destructive">*</span>
            </Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={running}
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={addVisit}
            >
              Add visit
            </Button>
          </div>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div
                key={r.id}
                ref={r.id === justAdded ? justAddedRef : undefined}
                className={cn(
                  'grid gap-2 rounded-md border p-3 transition-colors duration-700 md:grid-cols-12 md:items-end',
                  r.id === justAdded ? 'border-primary bg-primary/5 ring-2 ring-primary/40' : 'border-border',
                )}
              >
                <div className="flex flex-col gap-1 md:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">Round</span>
                  <Select value={r.round} onValueChange={(v) => setRow(r.id, { round: v })} disabled={running}>
                    <SelectTrigger aria-label={`Visit ${i + 1} round`}>
                      <SelectValue placeholder="Round" />
                    </SelectTrigger>
                    <SelectContent>
                      {rounds.map((round) => (
                        <SelectItem key={round.code} value={round.code}>
                          {round.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">Start</span>
                  <Input type="time" aria-label={`Visit ${i + 1} start`} value={r.start} disabled={running} onChange={(e) => setRow(r.id, { start: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">End</span>
                  <Input type="time" aria-label={`Visit ${i + 1} end`} value={r.end} disabled={running} onChange={(e) => setRow(r.id, { end: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1 md:col-span-4">
                  <span className="text-xs font-medium text-muted-foreground">Days</span>
                  <div className="flex flex-wrap gap-1" role="group" aria-label={`Visit ${i + 1} days`}>
                    {DAY_CHIPS.map((d) => {
                      const on = r.days.includes(d.value)
                      return (
                        <Button
                          key={d.value}
                          type="button"
                          size="sm"
                          variant={on ? 'default' : 'outline'}
                          className="h-8 px-2"
                          aria-pressed={on}
                          disabled={running}
                          onClick={() => setRow(r.id, { days: on ? r.days.filter((x) => x !== d.value) : [...r.days, d.value] })}
                        >
                          {d.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>
                <div className="flex flex-col gap-1 md:col-span-1">
                  <span className="text-xs font-medium text-muted-foreground">Carers</span>
                  <Select
                    value={String(r.carersNeeded)}
                    onValueChange={(v) => setRow(r.id, { carersNeeded: v === '2' ? 2 : 1 })}
                    disabled={running}
                  >
                    <SelectTrigger aria-label={`Visit ${i + 1} carers needed`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2 (double-up)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end md:col-span-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove visit ${i + 1}`}
                    disabled={running || rows.length === 1}
                    onClick={() => setRows((prev) => prev.filter((x) => x.id !== r.id))}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
                {serviceUserIds.length > 1 ? (
                  <div className="flex flex-col gap-1 md:col-span-12">
                    <span className="text-xs font-medium text-muted-foreground">For</span>
                    <MultiSelect
                      options={serviceUserIds.map((id) => ({ value: id, label: suLabel(id) }))}
                      value={r.forIds}
                      onChange={(forIds) => setRow(r.id, { forIds })}
                      placeholder="All selected service users"
                      searchPlaceholder="Search the selected service users…"
                      disabled={running}
                    />
                  </div>
                ) : null}
                <VisitExtrasEditor
                  label={`Visit ${i + 1}`}
                  visitStart={r.start}
                  visitEnd={r.end}
                  tasks={r.tasks}
                  medicines={r.medicines}
                  autoMedicines={r.autoMedicines}
                  onAutoMedicinesChange={(autoMedicines) => setRow(r.id, { autoMedicines })}
                  autoTasks={r.autoTasks}
                  onAutoTasksChange={(autoTasks) => setRow(r.id, { autoTasks })}
                  open={r.extrasOpen}
                  disabled={running}
                  onToggle={() => setRow(r.id, { extrasOpen: !r.extrasOpen })}
                  onTasksChange={(tasks) => setRow(r.id, { tasks })}
                  onMedicinesChange={(medicines) => setRow(r.id, { medicines })}
                />
              </div>
            ))}
          </div>
        </div>

        {serviceUserIds.length ? (
          <div className="space-y-2">
            <Label>
              Carers for each service user <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              The Lead carer goes on every visit; the Secondary joins the double-up visits. A carer the app counts as unavailable at a
              visit’s time is swapped for an available one — another selected carer first — and the result lists every swap.
            </p>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Service user</th>
                    <th className="px-3 py-2 font-medium">Lead carer</th>
                    {needsSecondary ? <th className="px-3 py-2 font-medium">Secondary carer</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {serviceUserIds.map((su) => {
                    const m = mapping[su] ?? {}
                    const pick = (role: 'lead' | 'secondary', value: string) =>
                      setMapping((prev) => ({ ...prev, [su]: { ...prev[su], [role]: value } }))
                    return (
                      <tr key={su}>
                        <td className="px-3 py-2 font-medium text-foreground">{suLabel(su)}</td>
                        <td className="px-3 py-2">
                          <CarerSelect label={`${suLabel(su)} lead carer`} value={m.lead} options={selectedCarers} onChange={(v) => pick('lead', v)} disabled={running} />
                        </td>
                        {needsSecondary && !needsSecondaryFor(su) ? (
                          <td className="px-3 py-2 text-xs text-muted-foreground">Not needed (no double-up visit)</td>
                        ) : needsSecondary ? (
                          <td className="px-3 py-2">
                            <CarerSelect
                              label={`${suLabel(su)} secondary carer`}
                              value={m.secondary}
                              options={selectedCarers.filter((o) => o.value !== m.lead)}
                              onChange={(v) => pick('secondary', v)}
                              disabled={running}
                            />
                          </td>
                        ) : null}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {showErrors && errors.length ? (
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-destructive" role="alert">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={running} leftIcon={<FlaskConical className="h-4 w-4" />} onClick={() => attempt(true)}>
            Check first (nothing saved)
          </Button>
          <Button
            type="button"
            disabled={running}
            leftIcon={running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            onClick={() => attempt(false)}
          >
            {running ? 'Running…' : 'Run Automation'}
          </Button>
        </div>
        {result}
      </CardContent>
    </Card>
  )
}

function CarerSelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string
  value: string | undefined
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  disabled: boolean
}) {
  return (
    <Select value={value ?? ''} onValueChange={onChange} disabled={disabled || !options.length}>
      <SelectTrigger aria-label={label} className="min-w-[12rem]">
        <SelectValue placeholder={options.length ? 'Choose a carer' : 'Select carers above'} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
