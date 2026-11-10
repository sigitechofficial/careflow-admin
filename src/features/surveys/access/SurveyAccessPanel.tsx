import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Info, Lock, LockOpen, Search, Users, X } from 'lucide-react'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'

/** API: careflow-api src/surveys/survey-access.service.ts. */
type IdName = { id: string; name: string }
type Level = {
  restricted: boolean
  ownerKeys: Array<{ key: string; label: string }>
  roleIds: string[]
  userIds: string[]
  roles: IdName[]
  people: IdName[]
}
export type SurveyAccessPayload = {
  surveyId: string
  editedOnSurveyId: string | null
  source: 'survey' | 'ready-made' | 'open'
  canConfigure: boolean
  you: { results: boolean; responses: boolean }
  responses: Level
  results: Level
  reportingThreshold: { inForce: number; own: number | null; readyMade: number | null; minimum: number; maximum: number }
  readyMadeDefault: { responses: string[]; results: string[] } | null
  owners: Array<{ key: string; label: string }>
  roles: IdName[]
  alwaysIncluded: string
  /** Never see it, whatever their role (the manager a "Feedback on your manager" copy rates). */
  excludedPeople?: IdName[]
}
type LevelInput = { restricted: boolean; ownerKeys: string[]; roleIds: string[]; userIds: string[] }

const accessKey = (surveyId: string) => ['surveys', 'access', surveyId] as const
const fieldClass =
  'mt-1 w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

function useSurveyAccess(surveyId: string) {
  return useQuery({
    queryKey: accessKey(surveyId),
    queryFn: async () => (await apiJson<ApiEnvelope<SurveyAccessPayload>>(`/surveys/${surveyId}/access`, { method: 'GET' })).data as SurveyAccessPayload,
  })
}

/** "Everyone with survey access" / "Registered Manager, HR and Asha Patel". */
export function levelText(level: Level): string {
  if (!level.restricted) return 'Everyone who can see surveys'
  const names = [...level.ownerKeys.map((o) => o.label), ...level.roles.map((r) => r.name), ...level.people.map((p) => p.name)]
  return names.length ? [...new Set(names)].join(', ') : 'Only admins and the person who made it'
}

/** Everyone named in a restricted level (roles, ready-made roles and people), once each. */
function levelNames(level: Level): string[] {
  return [...new Set([...level.ownerKeys.map((o) => o.label), ...level.roles.map((r) => r.name), ...level.people.map((p) => p.name)])]
}

/** One level as a tile value: open (neutral) or restricted (lock and the names as chips). */
function LevelValue({ level }: { level: Level }) {
  if (!level.restricted) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        Everyone who can see surveys
      </span>
    )
  }
  const names = levelNames(level)
  return (
    <div className="space-y-1.5">
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Lock className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
        Restricted
      </span>
      {names.length ? (
        <ul className="flex flex-wrap gap-1" aria-label="Only">
          {names.map((n) => (
            <li key={n} className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-foreground">
              {n}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-foreground">Only admins and the person who made it</p>
      )}
    </div>
  )
}

function Tile({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-border bg-background p-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
      <dd className="mt-auto text-xs text-muted-foreground">{hint}</dd>
    </div>
  )
}

/**
 * Survey page: who can see this survey's individual responses and its results, and how many answers
 * are needed before figures show. Admins and the survey's maker change it.
 */
export function SurveyAccessPanel({ surveyId }: { surveyId: string }) {
  const { data } = useSurveyAccess(surveyId)
  const [open, setOpen] = React.useState(false)
  const headingId = React.useId()
  if (!data) return null
  const restricted = data.responses.restricted || data.results.restricted
  const threshold = data.reportingThreshold.inForce
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5" aria-labelledby={headingId} data-testid="survey-access">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground sm:flex" aria-hidden>
            {restricted ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <h3 id={headingId} className="text-sm font-semibold text-foreground">
              Who can see the answers
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {data.source === 'ready-made'
                ? 'These are the ready-made survey’s settings.'
                : data.source === 'survey'
                  ? 'Set for this survey.'
                  : 'Open to everyone who can see surveys.'}
              {data.editedOnSurveyId ? ' This period follows the repeating survey.' : ''}
            </p>
          </div>
        </div>
        {data.canConfigure && !data.editedOnSurveyId ? (
          <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => setOpen(true)}>
            Change
          </Button>
        ) : null}
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <Tile label="Individual answers" hint="Each person’s answers, including what they wrote">
          <LevelValue level={data.responses} />
        </Tile>
        <Tile label="Results" hint="Figures, CSV and CQC evidence">
          <LevelValue level={data.results} />
        </Tile>
        <Tile
          label="Results show from"
          hint={threshold > 1 ? 'Fewer answers show no figures, so nobody can be picked out' : 'Figures show as soon as anyone answers'}
        >
          <span className="text-sm font-medium text-foreground">
            {threshold > 0 ? `${threshold} answers` : 'The first answer'}
          </span>
        </Tile>
      </dl>
      <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{data.alwaysIncluded} can always see them.</span>
      </p>
      {data.excludedPeople?.length ? (
        <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground" data-testid="survey-access-excluded">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Never sees this survey, whatever their role (it is about them): {data.excludedPeople.map(p => p.name).join(', ')}.
          </span>
        </p>
      ) : null}
      {open ? <SurveyAccessDialog surveyId={surveyId} data={data} onClose={() => setOpen(false)} /> : null}
    </section>
  )
}

function toInput(level: Level): LevelInput {
  return { restricted: level.restricted, ownerKeys: level.ownerKeys.map((o) => o.key), roleIds: level.roleIds, userIds: level.userIds }
}

function SurveyAccessDialog({ surveyId, data, onClose }: { surveyId: string; data: SurveyAccessPayload; onClose: () => void }) {
  const qc = useQueryClient()
  const [responses, setResponses] = React.useState<LevelInput>(toInput(data.responses))
  const [results, setResults] = React.useState<LevelInput>(toInput(data.results))
  const [people, setPeople] = React.useState<IdName[]>([...data.responses.people, ...data.results.people])
  const [threshold, setThreshold] = React.useState<string>(data.reportingThreshold.own ? String(data.reportingThreshold.own) : '')
  const save = useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      apiJson(`/surveys/${surveyId}/access`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['surveys'] })
    },
  })
  const [affected, setAffected] = React.useState<Array<{ id: string; title: string; role: string | null }> | null>(null)
  const min = data.reportingThreshold.minimum
  const t = threshold.trim() === '' ? null : Number(threshold)
  const thresholdInvalid = t !== null && (!Number.isInteger(t) || t < min || t > data.reportingThreshold.maximum)

  const submit = async (useReadyMadeDefault = false, confirmed = false) => {
    const body = { responses, results, reportingThreshold: t, ...(useReadyMadeDefault ? { useReadyMadeDefault: true } : {}) }
    try {
      // First check which alerts would be left with a role that cannot see the results.
      if (!confirmed) {
        const check = await apiJson<ApiEnvelope<{ affectedRules: Array<{ id: string; title: string; role: string | null }> }>>(
          `/surveys/${surveyId}/access`,
          { method: 'PUT', body: JSON.stringify({ ...body, dryRun: true }) },
        )
        const rules = check.data?.affectedRules ?? []
        if (rules.length) {
          setAffected(rules)
          return
        }
      }
      await save.mutateAsync(body)
      toastSuccess('Saved')
      onClose()
    } catch (e) {
      toastApiError(e, 'Could not save who can see the answers')
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Who can see the answers</DialogTitle>
          <DialogDescription>
            Limit a sensitive survey to the people who need it. {data.alwaysIncluded} can always see it. Every change
            is recorded in the audit log.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-5">
          <LevelEditor
            legend="Individual responses and written answers"
            value={responses}
            onChange={setResponses}
            data={data}
            people={people}
            onPerson={(p) => setPeople((ps) => (ps.some((x) => x.id === p.id) ? ps : [...ps, p]))}
            surveyId={surveyId}
          />
          <LevelEditor
            legend="Results: figures, CSV and CQC evidence"
            hint="Anyone who can see individual responses can see the results too."
            value={results}
            onChange={setResults}
            data={data}
            people={people}
            onPerson={(p) => setPeople((ps) => (ps.some((x) => x.id === p.id) ? ps : [...ps, p]))}
            surveyId={surveyId}
          />
          <div>
            <label className="text-xs font-medium text-foreground" htmlFor="access-threshold">
              Answers needed before results show
            </label>
            <input
              id="access-threshold"
              type="number"
              inputMode="numeric"
              min={min}
              max={data.reportingThreshold.maximum}
              className={fieldClass}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder={
                data.reportingThreshold.readyMade
                  ? `Ready-made: ${data.reportingThreshold.readyMade}`
                  : min > 1
                    ? `Default: ${min}`
                    : 'Default: from the first answer'
              }
              aria-describedby="access-threshold-hint"
              aria-invalid={thresholdInvalid || undefined}
            />
            <p id="access-threshold-hint" className={`mt-0.5 text-xs ${thresholdInvalid ? 'text-destructive' : 'text-muted-foreground'}`}>
              {min > 1
                ? `People can answer this survey without their name, so at least ${min}. Use 10 for equality or other sensitive questions.`
                : `From 1 to ${data.reportingThreshold.maximum}. Leave empty for the default.`}
            </p>
          </div>
          {affected?.length ? (
            <div role="alert" className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100" data-testid="access-affected-rules">
              <p className="font-medium">These alerts go to roles that could no longer see the results:</p>
              <ul className="mt-1 list-disc pl-5">
                {affected.map((r) => (
                  <li key={r.id}>
                    {r.title} ({r.role ?? 'no role'})
                  </li>
                ))}
              </ul>
              <p className="mt-1">
                They would go to another role instead, and their instructions would name the wrong person. Add those
                roles here, or change the alerts first.
              </p>
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          {data.readyMadeDefault ? (
            <Button type="button" variant="ghost" disabled={save.isPending} onClick={() => void submit(true)}>
              Use the ready-made settings
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {affected?.length ? (
            <Button type="button" variant="destructive" disabled={save.isPending || thresholdInvalid} onClick={() => void submit(false, true)}>
              Save anyway
            </Button>
          ) : (
            <Button type="button" disabled={save.isPending || thresholdInvalid} onClick={() => void submit()}>
              Save
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LevelEditor({
  legend,
  hint,
  value,
  onChange,
  data,
  people,
  onPerson,
  surveyId,
}: {
  legend: string
  hint?: string
  value: LevelInput
  onChange: (v: LevelInput) => void
  data: SurveyAccessPayload
  people: IdName[]
  onPerson: (p: IdName) => void
  surveyId: string
}) {
  const id = React.useId()
  const [search, setSearch] = React.useState('')
  const found = useQuery({
    queryKey: ['surveys', 'access', surveyId, 'people', search],
    queryFn: async () =>
      (await apiJson<ApiEnvelope<IdName[]>>(`/surveys/${surveyId}/access/people?search=${encodeURIComponent(search)}`, { method: 'GET' })).data ?? [],
    enabled: value.restricted && search.trim().length >= 2,
  })
  const toggle = (list: keyof Pick<LevelInput, 'ownerKeys' | 'roleIds' | 'userIds'>, item: string, on: boolean) =>
    onChange({ ...value, [list]: on ? [...value[list], item] : value[list].filter((x) => x !== item) })
  return (
    <fieldset className="rounded-md border border-border p-3">
      <legend className="px-1 text-sm font-medium text-foreground">{legend}</legend>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <div className="mt-2 flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="radio" name={`${id}-mode`} checked={!value.restricted} onChange={() => onChange({ ...value, restricted: false })} />
          Everyone who can see surveys
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" name={`${id}-mode`} checked={value.restricted} onChange={() => onChange({ ...value, restricted: true })} />
          Only the roles and people below
        </label>
      </div>
      {value.restricted ? (
        <div className="mt-3 space-y-3">
          <fieldset>
            <legend className="text-xs font-medium text-foreground">Ready-made roles (as set in Who handles alerts)</legend>
            <div className="mt-1 grid gap-1 sm:grid-cols-2">
              {data.owners.map((o) => (
                <label key={o.key} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={value.ownerKeys.includes(o.key)} onChange={(e) => toggle('ownerKeys', o.key, e.target.checked)} />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-xs font-medium text-foreground">Your roles</legend>
            <div className="mt-1 grid gap-1 sm:grid-cols-2">
              {data.roles.map((r) => (
                <label key={r.id} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={value.roleIds.includes(r.id)} onChange={(e) => toggle('roleIds', r.id, e.target.checked)} />
                  {r.name}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="text-xs font-medium text-foreground" htmlFor={`${id}-search`}>
              Named people
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                id={`${id}-search`}
                className={`${fieldClass} pl-8`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type a name or email"
                autoComplete="off"
              />
            </div>
            {found.data?.length ? (
              <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border border-border" aria-label="People found">
                {found.data.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="w-full px-2.5 py-1.5 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                      onClick={() => {
                        onPerson(p)
                        if (!value.userIds.includes(p.id)) toggle('userIds', p.id, true)
                        setSearch('')
                      }}
                    >
                      Add {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {value.userIds.length ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {value.userIds.map((uid) => (
                  <li key={uid} className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs">
                    {people.find((p) => p.id === uid)?.name ?? 'Someone'}
                    <button
                      type="button"
                      className="-mr-1 flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Remove ${people.find((p) => p.id === uid)?.name ?? 'person'}`}
                      onClick={() => toggle('userIds', uid, false)}
                    >
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </fieldset>
  )
}
