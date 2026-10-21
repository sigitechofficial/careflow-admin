import * as React from 'react'
import { AlertTriangle, CheckCircle2, CircleSlash, XCircle } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Combobox } from '@/shared/ui/combobox'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useSafeguardingLeads, useUpdateSafeguarding } from '@/features/safeguarding/hooks/useSafeguarding'
import {
  AGENCIES,
  CAPACITY_LABELS,
  MEETING_LABELS,
  PERSON_SAFE_LABELS,
  fmtDate,
  fmtDateTime,
} from '@/features/safeguarding/safeguarding-labels'
import type {
  Capacity,
  MeetingHeld,
  PersonSafe,
  SafeguardingAlert,
  SafeguardingCase,
  UpdateSafeguardingInput,
} from '@/features/safeguarding/types/safeguarding.types'

const fieldClass = 'h-9 rounded-md border border-input bg-background px-3 text-sm'
const areaClass = 'min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-sm'

/** `datetime-local` / `date` input values from an ISO string. */
const toLocalDateTime = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const toDate = (iso: string | null) => (iso ? iso.slice(0, 10) : '')

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="font-medium">{label}</span>
      {children}
    </label>
  )
}

function View({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap">{value || '—'}</dd>
    </div>
  )
}

/**
 * A card that shows its fields read-only and switches to a form on "Edit".
 * `toForm` seeds the form from the case; `toInput` turns it into the PATCH body.
 */
function EditableCard<F>({
  title,
  caseData,
  toForm,
  toInput,
  view,
  form,
  testId,
}: {
  title: string
  caseData: SafeguardingCase
  toForm: (c: SafeguardingCase) => F
  toInput: (f: F) => UpdateSafeguardingInput
  view: React.ReactNode
  form: (f: F, set: (patch: Partial<F>) => void) => React.ReactNode
  testId: string
}) {
  const canManage = useAuthStore(s => s.can)('safeguarding.manage') && caseData.status !== 'CLOSED'
  const update = useUpdateSafeguarding(caseData.id)
  const [editing, setEditing] = React.useState(false)
  const [f, setF] = React.useState<F>(() => toForm(caseData))
  const set = (patch: Partial<F>) => setF(p => ({ ...p, ...patch }))

  const start = () => {
    setF(toForm(caseData))
    setEditing(true)
  }
  const save = () =>
    update.mutate(toInput(f), {
      onSuccess: () => {
        toastSuccess(`${title} saved`)
        setEditing(false)
      },
      onError: e => toastApiError(e, `Could not save ${title.toLowerCase()}`),
    })

  return (
    <Card data-testid={testId}>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        {canManage && !editing && (
          <Button size="sm" variant="outline" onClick={start}>
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="text-sm">
        {editing ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {form(f, set)}
            <div className="flex gap-2 sm:col-span-2">
              <Button size="sm" onClick={save} disabled={update.isPending}>
                {update.isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{view}</dl>
        )}
      </CardContent>
    </Card>
  )
}

/* ─── Case lead & review ─────────────────────────────────────────────── */

export function LeadReviewCard({ caseData }: { caseData: SafeguardingCase }) {
  const { data: leads = [], isLoading } = useSafeguardingLeads()
  return (
    <EditableCard
      title="Case lead & review"
      testId="safeguarding-lead-card"
      caseData={caseData}
      toForm={c => ({ leadUserId: c.leadUserId ?? '', reviewDate: toDate(c.reviewDate) })}
      toInput={f => ({ leadUserId: f.leadUserId || null, reviewDate: f.reviewDate || null })}
      view={
        <>
          <View label="Case lead" value={caseData.leadName ?? <span className="text-amber-700">Not allocated</span>} />
          <View
            label="Next review"
            value={
              caseData.reviewDate ? (
                <span className={caseData.reviewOverdue ? 'font-semibold text-red-600' : undefined}>
                  {fmtDate(caseData.reviewDate)}
                  {caseData.reviewOverdue && ' · Overdue'}
                </span>
              ) : (
                <span className="text-amber-700">Not set</span>
              )
            }
          />
        </>
      }
      form={(f, set) => (
        <>
          <Field label="Case lead">
            <Combobox
              options={leads.map(l => ({ value: l.id, label: l.name }))}
              value={f.leadUserId}
              onChange={v => set({ leadUserId: v })}
              placeholder="Select a manager…"
              searchPlaceholder="Search people…"
              emptyText="No one found."
              loading={isLoading}
              aria-label="Case lead"
            />
          </Field>
          <Field label="Next review date">
            <Input type="date" value={f.reviewDate} onChange={e => set({ reviewDate: e.target.value })} />
          </Field>
        </>
      )}
    />
  )
}

/* ─── Immediate safety ───────────────────────────────────────────────── */

export function ImmediateSafetyCard({ caseData }: { caseData: SafeguardingCase }) {
  return (
    <EditableCard
      title="Immediate safety"
      testId="safeguarding-safety-card"
      caseData={caseData}
      toForm={c => ({
        reportedToManagerAt: toLocalDateTime(c.reportedToManagerAt),
        personSafe: c.personSafe ?? '',
        safetyMeasures: c.safetyMeasures ?? '',
        immediateAction: c.immediateAction ?? '',
      })}
      toInput={f => ({
        reportedToManagerAt: f.reportedToManagerAt ? new Date(f.reportedToManagerAt).toISOString() : null,
        personSafe: (f.personSafe || null) as PersonSafe | null,
        safetyMeasures: f.safetyMeasures,
        immediateAction: f.immediateAction,
      })}
      view={
        <>
          <View label="Reported to manager" value={caseData.reportedToManagerAt ? fmtDateTime(caseData.reportedToManagerAt) : null} />
          <View label="Was the person safe straight away?" value={caseData.personSafe ? PERSON_SAFE_LABELS[caseData.personSafe] : null} />
          <View label="Immediate action taken" value={caseData.immediateAction} wide />
          <View label="What was done to keep them safe" value={caseData.safetyMeasures} wide />
        </>
      }
      form={(f, set) => (
        <>
          <Field label="Reported to manager (date & time)">
            <Input
              type="datetime-local"
              value={f.reportedToManagerAt}
              onChange={e => set({ reportedToManagerAt: e.target.value })}
            />
          </Field>
          <Field label="Was the person safe straight away?">
            <select className={fieldClass} value={f.personSafe} onChange={e => set({ personSafe: e.target.value })}>
              <option value="">—</option>
              {(Object.keys(PERSON_SAFE_LABELS) as PersonSafe[]).map(k => (
                <option key={k} value={k}>
                  {PERSON_SAFE_LABELS[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Immediate action taken" wide>
            <textarea className={areaClass} value={f.immediateAction} onChange={e => set({ immediateAction: e.target.value })} />
          </Field>
          <Field label="What was done to keep them safe" wide>
            <textarea
              className={areaClass}
              value={f.safetyMeasures}
              onChange={e => set({ safetyMeasures: e.target.value })}
              placeholder="e.g. Carer removed from rota, family informed, GP visit arranged"
            />
          </Field>
        </>
      )}
    />
  )
}

/* ─── Multi-agency ───────────────────────────────────────────────────── */

export function MultiAgencyCard({ caseData }: { caseData: SafeguardingCase }) {
  const agencyText = [...caseData.agencies, ...(caseData.agenciesOther ? [caseData.agenciesOther] : [])].join(', ')
  return (
    <EditableCard
      title="Multi-agency involvement"
      testId="safeguarding-agency-card"
      caseData={caseData}
      toForm={c => ({
        agencies: c.agencies,
        agenciesOther: c.agenciesOther ?? '',
        meetingHeld: c.meetingHeld ?? '',
        meetingDate: toDate(c.meetingDate),
        protectionPlan: c.protectionPlan ?? '',
      })}
      toInput={f => ({
        agencies: f.agencies,
        agenciesOther: f.agenciesOther,
        meetingHeld: (f.meetingHeld || null) as MeetingHeld | null,
        meetingDate: f.meetingDate || null,
        protectionPlan: f.protectionPlan,
      })}
      view={
        <>
          <View label="Agencies involved" value={agencyText} wide />
          <View
            label="Safeguarding meeting"
            value={
              caseData.meetingHeld
                ? `${MEETING_LABELS[caseData.meetingHeld]}${caseData.meetingDate ? ` · ${fmtDate(caseData.meetingDate)}` : ''}`
                : null
            }
          />
          <View label="Protection plan & agreed actions" value={caseData.protectionPlan} wide />
        </>
      }
      form={(f, set) => (
        <>
          <fieldset className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <legend className="font-medium">Agencies involved</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {AGENCIES.map(a => (
                <label key={a} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={f.agencies.includes(a)}
                    onChange={e =>
                      set({ agencies: e.target.checked ? [...f.agencies, a] : f.agencies.filter(x => x !== a) })
                    }
                  />
                  {a}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Other agencies" wide>
            <Input value={f.agenciesOther} onChange={e => set({ agenciesOther: e.target.value })} />
          </Field>
          <Field label="Safeguarding meeting held?">
            <select className={fieldClass} value={f.meetingHeld} onChange={e => set({ meetingHeld: e.target.value })}>
              <option value="">—</option>
              {(Object.keys(MEETING_LABELS) as MeetingHeld[]).map(k => (
                <option key={k} value={k}>
                  {MEETING_LABELS[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Meeting date">
            <Input type="date" value={f.meetingDate} onChange={e => set({ meetingDate: e.target.value })} />
          </Field>
          <Field label="Protection plan & agreed actions" wide>
            <textarea className={areaClass} value={f.protectionPlan} onChange={e => set({ protectionPlan: e.target.value })} />
          </Field>
        </>
      )}
    />
  )
}

/* ─── Voice of the person ────────────────────────────────────────────── */

export function VoiceCard({ caseData }: { caseData: SafeguardingCase }) {
  return (
    <EditableCard
      title="Voice of the person"
      testId="safeguarding-voice-card"
      caseData={caseData}
      toForm={c => ({
        personWants: c.personWants ?? '',
        capacity: c.capacity ?? '',
        personWords: c.personWords ?? '',
        evidence: c.evidence ?? '',
      })}
      toInput={f => ({
        personWants: f.personWants,
        capacity: (f.capacity || null) as Capacity | null,
        personWords: f.personWords,
        evidence: f.evidence,
      })}
      view={
        <>
          <View label="What does the person want to happen?" value={caseData.personWants} wide />
          <View label="Capacity to make decisions about their safety" value={caseData.capacity ? CAPACITY_LABELS[caseData.capacity] : null} />
          <View label="What they said (in their own words)" value={caseData.personWords} wide />
          <View label="Evidence (physical / documents)" value={caseData.evidence} wide />
        </>
      }
      form={(f, set) => (
        <>
          <Field label="What does the person want to happen?" wide>
            <textarea className={areaClass} value={f.personWants} onChange={e => set({ personWants: e.target.value })} />
          </Field>
          <Field label="Capacity to make decisions about their safety">
            <select className={fieldClass} value={f.capacity} onChange={e => set({ capacity: e.target.value })}>
              <option value="">—</option>
              {(Object.keys(CAPACITY_LABELS) as Capacity[]).map(k => (
                <option key={k} value={k}>
                  {CAPACITY_LABELS[k]}
                </option>
              ))}
            </select>
          </Field>
          <div />
          <Field label="What they said (in their own words)" wide>
            <textarea className={areaClass} value={f.personWords} onChange={e => set({ personWords: e.target.value })} />
          </Field>
          <Field label="Evidence (physical / documents)" wide>
            <textarea className={areaClass} value={f.evidence} onChange={e => set({ evidence: e.target.value })} />
          </Field>
        </>
      )}
    />
  )
}

/* ─── Alerts & records checklist ─────────────────────────────────────── */

export function AlertList({ alerts }: { alerts: SafeguardingAlert[] }) {
  if (alerts.length === 0) return null
  return (
    <ul className="flex flex-col gap-1.5" data-testid="safeguarding-case-alerts">
      {alerts.map(a => (
        <li
          key={a.text}
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
            a.tone === 'bad'
              ? 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300'
              : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
          }`}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          {a.text}
        </li>
      ))}
    </ul>
  )
}

export function scoreClass(pct: number | null) {
  if (pct === null) return 'bg-muted text-muted-foreground'
  if (pct >= 90) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
  if (pct >= 70) return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
  return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
}

export function ChecklistCard({ caseData }: { caseData: SafeguardingCase }) {
  const { passed, of, pct } = caseData.checkScore
  return (
    <Card data-testid="safeguarding-checklist-card">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">CQC records checklist</CardTitle>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${scoreClass(pct)}`}>
          {pct === null ? '—' : `${pct}%`} · {passed}/{of}
        </span>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-1.5 text-sm">
          {caseData.checks.map(c => (
            <li key={c.key} className={`flex items-start gap-2 ${c.ok === null ? 'text-muted-foreground' : ''}`}>
              {c.ok === null ? (
                <CircleSlash className="mt-0.5 h-4 w-4 shrink-0" aria-label="Not applicable" />
              ) : c.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Done" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-label="Missing" />
              )}
              <span>
                {c.label}
                {c.ok === null && ' (not applicable)'}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
