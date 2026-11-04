import * as React from 'react'
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleSlash,
  MessageSquare,
  PenLine,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
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

export function View({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm font-medium text-foreground">
        {value || <span className="font-normal italic text-muted-foreground/70">Not recorded</span>}
      </dd>
    </div>
  )
}

const CHIP_CLASS = {
  good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  bad: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  neutral: 'bg-muted text-foreground',
}

function Chip({ tone, children }: { tone: keyof typeof CHIP_CLASS; children: React.ReactNode }) {
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-sm font-medium ${CHIP_CLASS[tone]}`}>{children}</span>
}

export const TONE_CLASS = {
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
  pink: 'bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
}

export function initials(name: string | null | undefined) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase() || '?'
}

/**
 * The case page's card shell: an icon and title over a bordered body.
 * `compact` is the narrower side-rail style (no icon, no header rule).
 */
export function SectionCard({
  title,
  icon: Icon,
  tone,
  action,
  section,
  testId,
  compact,
  children,
}: {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  tone?: keyof typeof TONE_CLASS
  action?: React.ReactNode
  section?: string
  testId?: string
  compact?: boolean
  children: React.ReactNode
}) {
  return (
    <section
      data-section={section}
      data-testid={testId}
      className="scroll-mt-20 rounded-2xl border border-border bg-card shadow-sm transition-shadow"
    >
      {compact ? (
        <div className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {action}
          </div>
          <div className="mt-4">{children}</div>
        </div>
      ) : (
        <>
          <header className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
            {Icon ? (
              <span className={`grid h-8 w-8 place-items-center rounded-lg ${tone ? TONE_CLASS[tone] : 'bg-muted'}`}>
                <Icon className="h-4 w-4" />
              </span>
            ) : null}
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {action ? <div className="ml-auto flex items-center gap-2">{action}</div> : null}
          </header>
          <div className="p-6">{children}</div>
        </>
      )}
    </section>
  )
}

const OPEN_SECTION_EVENT = 'safeguarding:open-section'

/** Which case card fixes each records-checklist item. */
const CHECK_SECTION: Record<string, string> = {
  logged: 'concern',
  laDecision: 'referrals',
  laPrompt: 'referrals',
  laRef: 'referrals',
  cqcDecision: 'referrals',
  cqcRef: 'referrals',
  lead: 'safeguarding-lead-card',
  review: 'safeguarding-lead-card',
  safety: 'safeguarding-safety-card',
  voice: 'safeguarding-voice-card',
  closure: 'outcome',
}

/** Scroll to a case card (`data-section`), flash it, and ask it to open its edit form. */
export function openSafeguardingSection(section: string) {
  const el = document.querySelector<HTMLElement>(`[data-section="${section}"]`)
  if (!el) return
  // Open the form first: re-rendering it would cut a scroll that is already under way.
  window.dispatchEvent(new CustomEvent(OPEN_SECTION_EVENT, { detail: section }))
  window.setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  el.classList.add('ring-2', 'ring-primary')
  window.setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 1600)
}

/** Runs `onOpen` when the checklist asks this card to open. */
export function useOpenSectionListener(section: string, onOpen: () => void) {
  const ref = React.useRef(onOpen)
  ref.current = onOpen
  React.useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<string>).detail === section) ref.current()
    }
    window.addEventListener(OPEN_SECTION_EVENT, handler)
    return () => window.removeEventListener(OPEN_SECTION_EVENT, handler)
  }, [section])
}

/**
 * A card that shows its fields read-only and switches to a form on "Edit".
 * `toForm` seeds the form from the case; `toInput` turns it into the PATCH body.
 */
function EditableCard<F>({
  title,
  icon,
  tone,
  compact,
  caseData,
  toForm,
  toInput,
  view,
  form,
  testId,
}: {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  tone?: keyof typeof TONE_CLASS
  /** Side-rail card: single column, and `view` is laid out by the caller. */
  compact?: boolean
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
  useOpenSectionListener(testId, () => {
    if (canManage && !editing) start()
  })
  const save = () =>
    update.mutate(toInput(f), {
      onSuccess: () => {
        toastSuccess(`${title} saved`)
        setEditing(false)
      },
      onError: e => toastApiError(e, `Could not save ${title.toLowerCase()}`),
    })

  return (
    <SectionCard
      title={title}
      icon={icon}
      tone={tone}
      compact={compact}
      section={testId}
      testId={testId}
      action={
        canManage && !editing ? (
          <Button size="sm" variant="outline" leftIcon={<PenLine className="h-3.5 w-3.5" />} onClick={start}>
            Edit
          </Button>
        ) : null
      }
    >
      {editing ? (
        <div className={`grid gap-3 text-sm ${compact ? '' : 'sm:grid-cols-2'}`}>
          {form(f, set)}
          <div className={`flex gap-2 ${compact ? '' : 'sm:col-span-2'}`}>
            <Button size="sm" onClick={save} disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : compact ? (
        view
      ) : (
        <dl className="grid gap-5 sm:grid-cols-2">{view}</dl>
      )}
    </SectionCard>
  )
}

/* ─── Case lead & review ─────────────────────────────────────────────── */

export function LeadReviewCard({ caseData }: { caseData: SafeguardingCase }) {
  const { data: leads = [], isLoading } = useSafeguardingLeads()
  return (
    <EditableCard
      title="Case lead & review"
      testId="safeguarding-lead-card"
      compact
      caseData={caseData}
      toForm={c => ({ leadUserId: c.leadUserId ?? '', reviewDate: toDate(c.reviewDate) })}
      toInput={f => ({ leadUserId: f.leadUserId || null, reviewDate: f.reviewDate || null })}
      view={
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {caseData.leadName ? initials(caseData.leadName) : '?'}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {caseData.leadName ?? <span className="text-amber-700">Not allocated</span>}
              </p>
              <p className="text-xs text-muted-foreground">Case lead</p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" aria-hidden />
              Next review
            </span>
            {caseData.reviewDate ? (
              <span className={`text-sm font-semibold ${caseData.reviewOverdue ? 'text-red-600' : 'text-foreground'}`}>
                {fmtDate(caseData.reviewDate)}
                {caseData.reviewOverdue && ' · Overdue'}
              </span>
            ) : (
              <span className="text-sm font-semibold text-amber-700">Not set</span>
            )}
          </div>
        </div>
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
      icon={ShieldCheck}
      tone="sky"
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
          <View
            label="Was the person safe straight away?"
            value={
              caseData.personSafe ? (
                <Chip tone={caseData.personSafe === 'YES' ? 'good' : caseData.personSafe === 'NO' ? 'bad' : 'neutral'}>
                  {PERSON_SAFE_LABELS[caseData.personSafe]}
                </Chip>
              ) : null
            }
          />
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
      icon={Building2}
      tone="indigo"
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
      icon={MessageSquare}
      tone="pink"
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
          {caseData.personWords ? (
            <figure className="rounded-xl border-l-4 border-pink-300 bg-pink-50/50 p-4 sm:col-span-2 dark:border-pink-800 dark:bg-pink-950/20">
              <figcaption className="text-xs font-medium uppercase tracking-wide text-pink-700 dark:text-pink-300">
                In their own words
              </figcaption>
              <blockquote className="mt-1.5 whitespace-pre-wrap text-sm italic text-foreground">
                “{caseData.personWords}”
              </blockquote>
            </figure>
          ) : (
            <View label="What they said (in their own words)" value={null} wide />
          )}
          <View label="What does the person want to happen?" value={caseData.personWants} wide />
          <View
            label="Capacity to make decisions about their safety"
            value={
              caseData.capacity ? (
                <Chip tone={caseData.capacity === 'YES' ? 'good' : 'neutral'}>{CAPACITY_LABELS[caseData.capacity]}</Chip>
              ) : null
            }
          />
          <View label="Evidence (physical / documents)" value={caseData.evidence} />
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
  const barClass = pct === null ? 'bg-muted-foreground/40' : pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <SectionCard
      title="CQC records checklist"
      compact
      section="checklist"
      testId="safeguarding-checklist-card"
      action={
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreClass(pct)}`}>
          {passed} / {of}
        </span>
      }
    >
      <div className="-mt-1 h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct ?? 0}%` }} />
      </div>
      <ul className="mt-4 flex flex-col gap-2.5 text-sm">
          {caseData.checks.map(c => (
            <li key={c.key} className={`flex items-start gap-2.5 ${c.ok === null ? 'text-muted-foreground' : 'text-foreground'}`}>
              {c.ok === null ? (
                <CircleSlash className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" aria-label="Not applicable" />
              ) : c.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Done" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-label="Missing" />
              )}
              {c.ok === false && CHECK_SECTION[c.key] ? (
                <button
                  type="button"
                  className="text-left underline-offset-2 hover:text-primary hover:underline"
                  title="Go to the section to fill this in"
                  onClick={() => openSafeguardingSection(CHECK_SECTION[c.key] ?? '')}
                >
                  {c.label}
                </button>
              ) : (
                <span>
                  {c.label}
                  {c.ok === null && ' (not applicable)'}
                </span>
              )}
            </li>
          ))}
      </ul>
    </SectionCard>
  )
}
