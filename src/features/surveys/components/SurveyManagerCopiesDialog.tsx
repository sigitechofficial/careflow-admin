import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Loader2, Users } from 'lucide-react'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { surveyKeys } from '@/features/surveys/keys'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

/** Where a survey about each manager says the manager's name. */
export const MANAGER_TOKEN = '{{manager}}'

/** Whether a survey's text names a manager with {{manager}} (it is then made into a copy per manager). */
export function namesManager(survey: {
  title: string
  description?: string | null
  closingMessage?: string | null
  sectionIntros?: Record<string, string> | null
  questions: ReadonlyArray<object>
}): boolean {
  return [
    survey.title,
    survey.description,
    survey.closingMessage,
    JSON.stringify(survey.sectionIntros ?? null),
    ...survey.questions.map(q => JSON.stringify(q)),
  ].some(t => typeof t === 'string' && t.includes(MANAGER_TOKEN))
}

export type ManagerCopyPlan = {
  surveyId: string
  title: string
  isAnonymous: boolean
  copies: Array<{ managerUserId: string; managerName: string; employeeIds: string[]; staffNames: string[]; holdsSurveyAccess: boolean }>
  pooled: { managerNames: string[]; employeeIds: string[]; staffNames: string[]; holdsSurveyAccess: string[] } | null
  notSent: Array<{ managerName: string; reason: string }>
  recentlyNamed: Array<{ managerName: string; count: number }>
  accessWarnings: string[]
  /** Library roles whose own staff are left out now; the ready-made survey's default; every role. */
  exclude: string[]
  /** Left-out roles no organisation role stands for (their managers cannot be found, so they get a copy). */
  excludeNotFound?: string[]
  libraryExclude: string[]
  /** The fewest staff a manager's own copy (and the smaller-teams copy) goes to: 5 unless the ready-made survey asks for more. */
  minTeam?: number
  /** The ready-made survey's minimum team (raised to the floor): where the field starts. */
  defaultMinTeam?: number
  /** The range it may be set to: the floor is the survey's reporting threshold for results, never below 5. */
  minTeamMin?: number
  minTeamMax?: number
  /** Why it cannot go lower, e.g. "Below 10, answers could be traced to one person." */
  minTeamFloorReason?: string
  owners: Array<{ key: string; label: string }>
}

type CreatedCopies = { created: Array<{ surveyId: string; title: string; managerNames: string[]; people: number }> }

/** The plan's address: `exclude` and `minTeam` null = the ready-made survey's choice. */
export function managerCopyPlanUrl(surveyId: string, exclude: string[] | null, minTeam: number | null): string {
  const q = [
    exclude ? `exclude=${encodeURIComponent(exclude.join(','))}` : null,
    minTeam !== null ? `minTeam=${minTeam}` : null,
  ].filter(Boolean)
  return `/surveys/${encodeURIComponent(surveyId)}/manager-copies${q.length ? `?${q.join('&')}` : ''}`
}

/** `exclude` null = the ready-made survey's choice of roles whose own staff are not asked; `minTeam` null = its team size. */
function useManagerCopyPlan(surveyId: string, enabled: boolean, exclude: string[] | null, minTeam: number | null) {
  return useQuery({
    queryKey: [...surveyKeys.all(), 'manager-copies', surveyId, exclude?.join(',') ?? 'default', minTeam ?? 'default'],
    queryFn: async () => (await apiJson<ApiEnvelope<ManagerCopyPlan>>(managerCopyPlanUrl(surveyId, exclude, minTeam), { method: 'GET' })).data,
    enabled,
    staleTime: 0,
    placeholderData: previous => previous,
  })
}

function useCreateManagerCopies(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { label?: string; confirmAccess?: boolean; exclude?: string[]; minTeam?: number }) =>
      (
        await apiJson<ApiEnvelope<CreatedCopies>>(`/surveys/${encodeURIComponent(surveyId)}/manager-copies`, {
          method: 'POST',
          body: JSON.stringify(body),
        })
      ).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: surveyKeys.all() }),
  })
}

/**
 * "Make a copy for each manager": one draft per manager for the staff whose record names them as
 * supervisor, one pooled copy for smaller teams when it cannot point at anyone, and who gets none
 * and why. The copies are then checked and sent like any survey.
 */
export function SurveyManagerCopiesDialog({ surveyId, open, onOpenChange }: { surveyId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [exclude, setExclude] = React.useState<string[] | null>(null)
  // The smallest team that gets its own copy: null = the ready-made survey's. The box keeps what is
  // typed; the plan only changes once it is a whole number in range.
  const [minTeam, setMinTeam] = React.useState<number | null>(null)
  const [minTeamDraft, setMinTeamDraft] = React.useState<string | null>(null)
  const plan = useManagerCopyPlan(surveyId, open, exclude, minTeam)
  const create = useCreateManagerCopies(surveyId)
  const [label, setLabel] = React.useState('')
  const [confirmAccess, setConfirmAccess] = React.useState(false)
  const [created, setCreated] = React.useState<CreatedCopies['created'] | null>(null)
  React.useEffect(() => {
    if (!open) {
      setCreated(null)
      setConfirmAccess(false)
      setMinTeam(null)
      setMinTeamDraft(null)
    }
  }, [open])

  const p = plan.data
  const count = p ? p.copies.length + (p.pooled ? 1 : 0) : 0
  const needsConfirm = Boolean(p?.accessWarnings.length)
  const teamMin = p?.minTeamMin ?? 5
  const teamMax = p?.minTeamMax ?? 50
  const teamValue = minTeamDraft ?? String(p?.minTeam ?? 5)
  const teamParsed = /^\d+$/.test(teamValue.trim()) ? Number(teamValue.trim()) : NaN
  const teamInvalid = !(Number.isInteger(teamParsed) && teamParsed >= teamMin && teamParsed <= teamMax)
  const onMinTeam = (v: string) => {
    setMinTeamDraft(v)
    const n = /^\d+$/.test(v.trim()) ? Number(v.trim()) : NaN
    if (Number.isInteger(n) && n >= teamMin && n <= teamMax) setMinTeam(n === p?.defaultMinTeam ? null : n)
  }
  const onCreate = () =>
    create.mutate(
      {
        label: label.trim() || undefined,
        confirmAccess: needsConfirm ? confirmAccess : undefined,
        exclude: p?.exclude ?? [],
        minTeam: p?.minTeam,
      },
      {
        onSuccess: data => {
          setCreated(data.created)
          toastSuccess(`${data.created.length} draft cop${data.created.length === 1 ? 'y' : 'ies'} made`, 'Check each one, then send it.')
        },
        onError: e => toastApiError(e, 'Could not make the copies'),
      },
    )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="manager-copies-dialog">
        <DialogHeader>
          <DialogTitle>Make a copy for each manager</DialogTitle>
          <DialogDescription>
            Each copy has the manager&apos;s name in place of {MANAGER_TOKEN} and goes only to the staff whose staff record
            names them as supervisor. The manager a copy is about never sees its answers or figures, whatever their
            role. The copies are drafts: check each one, then send it.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="max-h-[60vh] space-y-4 overflow-y-auto">
          {created ? (
            <section aria-labelledby="manager-copies-made" className="space-y-2">
              <h3 id="manager-copies-made" className="text-sm font-medium">
                Copies made
              </h3>
              <ul className="space-y-1 text-sm">
                {created.map(c => (
                  <li key={c.surveyId}>
                    <Link to="/surveys/$surveyId" params={{ surveyId: c.surveyId }} className="underline underline-offset-2">
                      {c.title}
                    </Link>{' '}
                    <span className="text-muted-foreground">({c.people} people)</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : plan.isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
          ) : plan.isError || !p ? (
            <p className="text-sm text-destructive" role="alert">
              {(plan.error as Error | null)?.message || 'The managers could not be loaded.'}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground" data-testid="manager-copies-min-team">
                A manager needs at least {p.minTeam ?? 5} staff for their own copy, so the answers cannot point at anyone.
                Smaller teams share one copy when together they are at least {p.minTeam ?? 5} people and no one team is
                more than half of it.
              </p>
              <div className="space-y-1" data-testid="manager-copies-min-team-field">
                <label htmlFor="manager-copies-min-team" className="block text-sm font-medium">
                  Smallest team that gets its own copy
                </label>
                <Input
                  id="manager-copies-min-team"
                  type="number"
                  inputMode="numeric"
                  min={teamMin}
                  max={teamMax}
                  step={1}
                  className="w-28"
                  value={teamValue}
                  onChange={e => onMinTeam(e.target.value)}
                  aria-describedby="manager-copies-min-team-hint"
                  aria-invalid={teamInvalid || undefined}
                />
                <p
                  id="manager-copies-min-team-hint"
                  className={`text-xs ${teamInvalid ? 'text-destructive' : 'text-muted-foreground'}`}
                >
                  {p.minTeamFloorReason ?? `Below ${teamMin}, answers could be traced to one person.`}
                  {teamInvalid ? ` Choose from ${teamMin} to ${teamMax}.` : ''}
                  {p.defaultMinTeam !== undefined && p.minTeam !== p.defaultMinTeam && !teamInvalid
                    ? ` The ready-made survey uses ${p.defaultMinTeam}.`
                    : ''}
                </p>
              </div>
              <section aria-labelledby="manager-copies-list" className="space-y-1">
                <h3 id="manager-copies-list" className="text-sm font-medium">
                  {count ? `${count} cop${count === 1 ? 'y' : 'ies'} will be made` : 'No copies can be made'}
                </h3>
                <ul className="space-y-1 text-sm" data-testid="manager-copies-planned">
                  {p.copies.map(c => (
                    <li key={c.managerUserId}>
                      <span className="font-medium">{c.managerName}</span>: {c.employeeIds.length} staff
                    </li>
                  ))}
                  {p.pooled ? (
                    <li>
                      <span className="font-medium">Smaller teams</span> ({p.pooled.managerNames.join(', ')}): {p.pooled.employeeIds.length}{' '}
                      staff, reported only together, worded &quot;your line manager&quot;
                    </li>
                  ) : null}
                </ul>
              </section>
              {p.notSent.length ? (
                <section aria-labelledby="manager-copies-none" className="space-y-1">
                  <h3 id="manager-copies-none" className="text-sm font-medium">
                    No copy this time
                  </h3>
                  <ul className="list-disc space-y-0.5 pl-5 text-sm" data-testid="manager-copies-not-sent">
                    {p.notSent.map(n => (
                      <li key={n.managerName}>
                        {n.managerName}: {n.reason}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {p.recentlyNamed.length ? (
                <p className="text-sm text-muted-foreground">
                  Left out because they have been named under the manager for less than 3 months:{' '}
                  {p.recentlyNamed.map(r => `${r.count} of ${r.managerName}'s staff`).join('; ')}.
                </p>
              ) : null}
              <fieldset className="space-y-1 rounded-md border p-3" data-testid="manager-copies-exclude">
                <legend className="px-1 text-sm font-medium">Teams not asked</legend>
                <p className="text-xs text-muted-foreground">
                  The staff of managers in these roles get no copy and are never added to the smaller-teams copy.
                  {p.libraryExclude.length
                    ? ` The ready-made survey leaves out: ${p.owners
                        .filter(o => p.libraryExclude.includes(o.key))
                        .map(o => o.label)
                        .join(', ')}.`
                    : ''}
                </p>
                <div className="grid gap-1 sm:grid-cols-2">
                  {p.owners.map(o => (
                    <label key={o.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={p.exclude.includes(o.key)}
                        onChange={e =>
                          setExclude(e.target.checked ? [...p.exclude, o.key] : p.exclude.filter(k => k !== o.key))
                        }
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
                {p.excludeNotFound?.length ? (
                  <p className="text-sm text-destructive" role="alert" data-testid="manager-copies-exclude-not-found">
                    No role in CareFlow is set as the {p.excludeNotFound.join(' or the ')}, so their team cannot be left out and
                    may get a copy. Choose who it is in Surveys, Who handles alerts, then open this again.
                  </p>
                ) : null}
              </fieldset>
              {needsConfirm ? (
                <div className="space-y-2 rounded-md border p-3" data-testid="manager-copies-access">
                  <p className="text-sm">
                    {p.accessWarnings.join(', ')} {p.accessWarnings.length === 1 ? 'is an admin' : 'are admins'}, so{' '}
                    {p.accessWarnings.length === 1 ? 'they' : 'each'} would still see the answers to their own copy. Take
                    away the admin role while their copy is open, or leave them out this year.
                  </p>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={confirmAccess}
                      onChange={e => setConfirmAccess(e.target.checked)}
                      className="mt-0.5 h-4 w-4"
                    />
                    I have arranged this: they will not be an admin while their copy is open.
                  </label>
                </div>
              ) : null}
              <div className="space-y-1">
                <label htmlFor="manager-copies-label" className="block text-sm font-medium">
                  Added to each title (optional)
                </label>
                <Input
                  id="manager-copies-label"
                  value={label}
                  maxLength={60}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="e.g. June 2027"
                />
              </div>
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {created ? 'Close' : 'Cancel'}
          </Button>
          {!created ? (
            <Button type="button" onClick={onCreate} disabled={!count || create.isPending || plan.isFetching || teamInvalid || (needsConfirm && !confirmAccess)}>
              {create.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> : <Users className="mr-1 h-4 w-4" aria-hidden />}
              {count ? `Make ${count} draft cop${count === 1 ? 'y' : 'ies'}` : 'Make copies'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
