import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle2, Copy, FlaskConical, Loader2, Play, UserPlus, XCircle } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { DateInput } from '@/shared/ui/date-time-input'
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
import { toastSuccess } from '@/shared/lib/toast'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'
import { useScriptEmployeeLookups } from '@/features/scripts/hooks'
import { STAFF_PRESETS, TEST_EMAIL_DOMAIN, presetById, type StaffPresetId } from '@/features/scripts/staff-presets'
import {
  MAX_STAFF_PER_RUN,
  MIN_PASSWORD,
  carerPoolJson,
  inputProblems,
  runStaffCreation,
  signInWords,
  type CreateStaffInput,
  type StaffResult,
  type StaffRunOutcome,
} from '@/features/scripts/create-staff.runner'

type RunState =
  | { kind: 'idle' }
  | { kind: 'running'; dryRun: boolean }
  | { kind: 'done'; dryRun: boolean; outcome: StaffRunOutcome }
  | { kind: 'error'; message: string }

const SIGN_IN_LABEL: Record<string, string> = { none: 'Off', invited: 'Waiting for password', active: 'On', off: 'Switched off' }

/** Scripts → Staff Creation: test staff ready to work — employment, availability, sign-in, compliance. */
export default function StaffCreationPage() {
  const queryClient = useQueryClient()
  const lookups = useScriptEmployeeLookups()
  const branches = React.useMemo(
    () => [...(lookups.data?.locations ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [lookups.data],
  )

  const [preset, setPreset] = React.useState<StaffPresetId>('carer')
  const [count, setCount] = React.useState('3')
  const [locationId, setLocationId] = React.useState('')
  const [startDate, setStartDate] = React.useState(() => operationalTodayIso())
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [namePrefix, setNamePrefix] = React.useState('Test')
  const [compliance, setCompliance] = React.useState(true)
  const [skills, setSkills] = React.useState(true)
  const [contact, setContact] = React.useState(true)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [state, setState] = React.useState<RunState>({ kind: 'idle' })
  const [log, setLog] = React.useState<string[]>([])
  const running = state.kind === 'running'

  React.useEffect(() => {
    if (!locationId && branches.length) setLocationId(branches[0]!.id)
  }, [branches, locationId])

  const chosen = presetById(preset)
  const input: CreateStaffInput = {
    preset,
    count: Number(count),
    locationId,
    startDate,
    password,
    namePrefix,
    compliance,
    skills,
    emergencyContact: contact,
  }
  const problems = [...inputProblems(input), ...(password && confirm !== password ? ['The two passwords are different.'] : [])]
  const branchName = branches.find((b) => b.id === locationId)?.name ?? ''

  const start = async (dryRun: boolean) => {
    if (problems.length || running) return
    setLog([])
    setState({ kind: 'running', dryRun })
    try {
      const outcome = await runStaffCreation(input, { dryRun, log: (line) => setLog((prev) => [...prev, line]) })
      setState({ kind: 'done', dryRun, outcome })
      if (!dryRun) {
        void queryClient.invalidateQueries({ queryKey: ['scripts', 'carer-options'] })
        setPassword('')
        setConfirm('')
      }
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
    }
  }

  const checkbox = (label: string, checked: boolean, set: (v: boolean) => void, hint: string) => (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" aria-label={label} className="mt-0.5" checked={checked} disabled={running} onChange={(e) => set(e.target.checked)} />
      <span>
        <span className="font-medium text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Staff Creation"
        description="Create test staff ready to work — employment, availability, sign-in with a password you set, compliance and skills — the same way the Add employee screens do."
        icon={<UserPlus className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Scripts', href: '/scripts' }, { label: 'Staff Creation' }]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Who to create</CardTitle>
          <CardDescription>
            Each person is named &ldquo;{namePrefix.trim() || 'Test'} {chosen.nameWord} 01&rdquo;, &ldquo;… 02&rdquo; and so on (numbers already used
            are skipped), with an email on <code>@{TEST_EMAIL_DOMAIN}</code>, which can never receive mail.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Kind of staff</Label>
              <Select value={preset} onValueChange={(v) => setPreset(v as StaffPresetId)} disabled={running}>
                <SelectTrigger aria-label="Kind of staff">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-count">How many</Label>
              <Input
                id="staff-count"
                type="number"
                min={1}
                max={MAX_STAFF_PER_RUN}
                value={count}
                disabled={running}
                onChange={(e) => setCount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Branch</Label>
              <Select value={locationId} onValueChange={setLocationId} disabled={running || lookups.isLoading}>
                <SelectTrigger aria-label="Branch">
                  <SelectValue placeholder={lookups.isLoading ? 'Loading branches…' : 'Choose a branch'} />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm" data-testid="staff-preset-summary">
            <p className="font-medium text-foreground">{chosen.label}</p>
            <p className="text-muted-foreground">
              {chosen.jobTitle} · {chosen.role} · {chosen.workArea}
              {chosen.rbacLevel ? ` · RBAC level ${chosen.rbacLevel}` : ''} · {chosen.contractType}, {chosen.contractedWeeklyHours} h/week
            </p>
            <p className="text-muted-foreground">{chosen.summary}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <DateInput aria-label="Start date" value={startDate} disabled={running} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-prefix">First name (marks them as test)</Label>
              <Input id="staff-prefix" value={namePrefix} disabled={running} onChange={(e) => setNamePrefix(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-password">Password for their sign-in</Label>
              <Input
                id="staff-password"
                type="password"
                autoComplete="new-password"
                value={password}
                disabled={running}
                placeholder={`At least ${MIN_PASSWORD} characters`}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-password-2">Type it again</Label>
              <Input
                id="staff-password-2"
                type="password"
                autoComplete="new-password"
                value={confirm}
                disabled={running}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {checkbox('Fill in compliance', compliance, setCompliance, 'The required checklist, dated from the start date and verified. Untick to test missing-compliance warnings.')}
            {checkbox('Add skills', skills, setSkills, chosen.skills.join(', '))}
            {checkbox('Add an emergency contact', contact, setContact, 'A test contact with a 07700 900 number.')}
          </div>

          {problems.length && (password || confirm) ? (
            <ul className="space-y-0.5 text-xs text-destructive" role="alert">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={running || problems.length > 0}
              leftIcon={<FlaskConical className="h-4 w-4" />}
              onClick={() => void start(true)}
            >
              Check first (nothing saved)
            </Button>
            <Button
              type="button"
              disabled={running || problems.length > 0}
              leftIcon={running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              onClick={() => setConfirmOpen(true)}
            >
              {running ? 'Running…' : `Create ${Number(count) || ''} ${chosen.label}${Number(count) === 1 ? '' : ' staff'}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {state.kind !== 'idle' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
              {log.join('\n') || 'Starting…'}
            </pre>
            {state.kind === 'error' ? (
              <p className="flex items-start gap-1.5 text-sm text-destructive" role="alert">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> Nothing was created: {state.message}
              </p>
            ) : null}
            {state.kind === 'done' ? <StaffResults outcome={state.outcome} dryRun={state.dryRun} /> : null}
          </CardContent>
        </Card>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Create {count} {chosen.label} staff at {branchName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Saved for real, under your name, as the Add employee screens do: staff record, employment, working pattern and{' '}
              {signInWords(chosen)} with the password you typed
              {compliance ? ', compliance verified' : ''}
              {skills ? ', skills' : ''}
              {contact ? ', an emergency contact' : ''}. CareFlow may try to send its usual welcome email to the test address; it can&rsquo;t
              be delivered and doesn&rsquo;t contain the password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false)
                void start(false)
              }}
            >
              Create staff
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StaffResults({ outcome, dryRun }: { outcome: StaffRunOutcome; dryRun: boolean }) {
  const created = outcome.results.filter((r) => r.created)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(carerPoolJson(outcome.results))
      toastSuccess('Copied', 'Paste it into Visit Creation’s JSON to try these people first.')
    } catch {
      // Clipboard blocked: nothing to copy to.
    }
  }
  return (
    <div className="space-y-3" data-testid="staff-creation-results">
      <p className="text-sm font-medium text-foreground">
        {dryRun
          ? `Check finished — nothing was saved. ${outcome.results.length} ${outcome.results.length === 1 ? 'person' : 'people'} would be created.`
          : `${created.length} of ${outcome.results.length} created.`}
      </p>
      {outcome.notes.map((n) => (
        <p key={n} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {n}
        </p>
      ))}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Person</th>
              <th className="px-3 py-2 font-medium">Signs in with</th>
              {!dryRun ? (
                <>
                  <th className="px-3 py-2 font-medium">Office login</th>
                  <th className="px-3 py-2 font-medium">Care app</th>
                  <th className="px-3 py-2 font-medium">Compliance</th>
                </>
              ) : null}
              <th className="px-3 py-2 font-medium">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {outcome.results.map((r) => (
              <ResultRow key={r.username} r={r} dryRun={dryRun} />
            ))}
          </tbody>
        </table>
      </div>
      {!dryRun && created.length ? (
        <Button type="button" size="sm" variant="outline" leftIcon={<Copy className="h-4 w-4" />} onClick={() => void copy()}>
          Copy as Visit Creation carer pool
        </Button>
      ) : null}
    </div>
  )
}

function ResultRow({ r, dryRun }: { r: StaffResult; dryRun: boolean }) {
  return (
    <tr className="align-top">
      <td className="px-3 py-2">
        {r.employeeId ? (
          <Link to="/hr/employees/$employeeId" params={{ employeeId: r.employeeId }} className="font-medium text-primary hover:underline">
            {r.name}
          </Link>
        ) : (
          <span className="font-medium text-foreground">{r.name}</span>
        )}
      </td>
      <td className="px-3 py-2 text-muted-foreground">{r.email}</td>
      {!dryRun ? (
        <>
          <td className="px-3 py-2">
            {r.signIn ? (
              <span>
                {SIGN_IN_LABEL[r.signIn.website] ?? r.signIn.website}
                {r.signIn.roles.length ? <span className="block text-xs text-muted-foreground">{r.signIn.roles.join(', ')}</span> : null}
              </span>
            ) : (
              '—'
            )}
          </td>
          <td className="px-3 py-2">{r.signIn ? SIGN_IN_LABEL[r.signIn.app] ?? r.signIn.app : '—'}</td>
          <td className="px-3 py-2">
            {r.compliance ? (
              <Badge variant={r.compliance.valid === r.compliance.total ? 'secondary' : 'warning'}>
                {r.compliance.valid} of {r.compliance.total} valid
              </Badge>
            ) : (
              '—'
            )}
          </td>
        </>
      ) : null}
      <td className="px-3 py-2">
        <span className="flex items-start gap-1.5">
          {dryRun ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : r.created && !r.warnings.length ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          ) : r.created ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          )}
          <span>
            {r.outcome}
            {r.warnings.map((w) => (
              <span key={w} className="block text-xs text-amber-700 dark:text-amber-400">
                {w}
              </span>
            ))}
          </span>
        </span>
      </td>
    </tr>
  )
}
