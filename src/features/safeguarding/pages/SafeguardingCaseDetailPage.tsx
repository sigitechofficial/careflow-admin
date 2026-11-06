import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { AlertTriangle, Check, CheckCircle2, ChevronRight, ShieldCheck, Zap } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { EmptyState, LoadingSpinner } from '@/shared/ui/page-elements'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { SafeguardingSectionLayout } from '@/features/safeguarding/components/SafeguardingSectionLayout'
import { SafeguardingInvestigationCard } from '@/features/safeguarding/components/SafeguardingInvestigationCard'
import {
  AlertList,
  ChecklistCard,
  ImmediateSafetyCard,
  LeadReviewCard,
  MultiAgencyCard,
  SectionCard,
  View,
  VoiceCard,
  initials,
  openSafeguardingSection,
  scoreClass,
  useOpenSectionListener,
} from '@/features/safeguarding/components/SafeguardingSections'
import {
  useAddSafeguardingNote,
  useSafeguardingCase,
  useTransitionSafeguarding,
  useUpdateSafeguarding,
} from '@/features/safeguarding/hooks/useSafeguarding'
import {
  ACTION_LABELS,
  CATEGORY_LABELS,
  REFERRAL_LABELS,
  REFERRAL_OPTIONS,
  RISK_CLASS,
  RISK_LABELS,
  RISK_OPTIONS,
  STATUS_CLASS,
  STATUS_LABELS,
  STATUS_STEPS,
  availableActions,
  fmtDate,
  fmtDateTime,
} from '@/features/safeguarding/safeguarding-labels'
import type {
  SafeguardingAction,
  SafeguardingCase,
  SafeguardingReferralDecision,
  SafeguardingRisk,
} from '@/features/safeguarding/types/safeguarding.types'

const areaClass = 'min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

function Stepper({ status }: { status: SafeguardingCase['status'] }) {
  const currentIndex = STATUS_STEPS.indexOf(status)
  const closed = status === 'CLOSED'
  return (
    <ol className="flex items-center" aria-label="Case progress">
      {STATUS_STEPS.map((s, i) => {
        const done = i < currentIndex || closed
        const current = i === currentIndex
        return (
          <React.Fragment key={s}>
            {i > 0 ? (
              <li
                aria-hidden
                className={cn('mx-3 h-0.5 flex-1 rounded', i <= currentIndex || closed ? 'bg-primary' : 'bg-border')}
              />
            ) : null}
            <li className="flex items-center gap-2" aria-current={current ? 'step' : undefined}>
              <span
                className={cn(
                  'grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold',
                  done && 'bg-primary text-primary-foreground',
                  current && 'ring-4 ring-primary/15',
                  current && !done && 'border-2 border-primary bg-card text-primary',
                  !done && !current && 'border border-border text-muted-foreground',
                )}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={cn(
                  'hidden text-sm sm:inline',
                  current ? 'font-semibold text-primary' : done ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {STATUS_LABELS[s]}
              </span>
            </li>
          </React.Fragment>
        )
      })}
    </ol>
  )
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 bg-card px-6 py-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-foreground">{children || '—'}</dd>
    </div>
  )
}

/** Sticky jump links; the one for the card in view is highlighted. */
function SectionTabs({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = React.useState(sections[0]?.id)
  const ids = sections.map(s => s.id).join(',')

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const en of entries) {
          const id = (en.target as HTMLElement).dataset.section
          if (en.isIntersecting && id) setActive(id)
        }
      },
      { rootMargin: '-140px 0px -60% 0px' },
    )
    for (const id of ids.split(',')) {
      const el = document.querySelector(`[data-section="${id}"]`)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [ids])

  const jump = (id: string) =>
    document.querySelector<HTMLElement>(`[data-section="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="sticky top-0 z-20 bg-background/95 py-2 backdrop-blur">
      <nav
        aria-label="Case sections"
        className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-sm [scrollbar-width:none]"
      >
        {sections.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => jump(s.id)}
            aria-current={active === s.id ? 'true' : undefined}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active === s.id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {s.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

/** Moves the case on (screen, investigate, refer, close, reopen), asking for a note first. */
function ActionDialog({
  caseData,
  action,
  onClose,
}: {
  caseData: SafeguardingCase
  action: SafeguardingAction | null
  onClose: () => void
}) {
  const transition = useTransitionSafeguarding(caseData.id)
  const [note, setNote] = React.useState('')
  const [outcome, setOutcome] = React.useState('')
  const [lessons, setLessons] = React.useState('')

  React.useEffect(() => {
    setNote('')
    setOutcome('')
    setLessons('')
  }, [action])

  const run = () => {
    if (!action) return
    transition.mutate(
      {
        action,
        note: note.trim() || undefined,
        outcome: action === 'CLOSE' ? outcome.trim() || undefined : undefined,
        lessonsLearned: action === 'CLOSE' ? lessons.trim() || undefined : undefined,
      },
      {
        onSuccess: () => {
          toastSuccess(`${ACTION_LABELS[action]} done`)
          onClose()
        },
        onError: e => toastApiError(e, 'Could not update case'),
      },
    )
  }

  return (
    <Dialog open={action !== null} onOpenChange={open => !open && onClose()}>
      <DialogContent size="md" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {action ? ACTION_LABELS[action] : ''} · {caseData.referenceNumber}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-3 text-sm">
          {action === 'CLOSE' && (
            <>
              <label className="flex flex-col gap-1">
                <span className="font-medium">Outcome (required)</span>
                <textarea className={areaClass} value={outcome} onChange={e => setOutcome(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-medium">Lessons learned (optional)</span>
                <textarea className={areaClass} value={lessons} onChange={e => setLessons(e.target.value)} />
              </label>
            </>
          )}
          <label className="flex flex-col gap-1">
            <span className="font-medium">Note (optional)</span>
            <textarea className={areaClass} value={note} onChange={e => setNote(e.target.value)} />
          </label>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={run} disabled={transition.isPending || (action === 'CLOSE' && outcome.trim() === '')}>
            Confirm {action ? ACTION_LABELS[action] : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const RISK_TILE: Record<SafeguardingRisk, { box: string; text: string; dot: string }> = {
  HIGH: {
    box: 'border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/30',
    text: 'text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500',
  },
  MEDIUM: {
    box: 'border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  LOW: {
    box: 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
}

function ReferralTile({ label, decision, date, reference }: {
  label: string
  decision: SafeguardingReferralDecision
  date?: string | null
  reference: string | null
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">
        {REFERRAL_LABELS[decision]}
        {date ? ` · ${fmtDate(date)}` : ''}
      </p>
      {reference ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Ref <span className="font-mono text-foreground">{reference}</span>
        </p>
      ) : null}
    </div>
  )
}

function ReferralsCard({ caseData }: { caseData: SafeguardingCase }) {
  const canManage = useAuthStore(s => s.can)('safeguarding.manage')
  const update = useUpdateSafeguarding(caseData.id)
  const [editing, setEditing] = React.useState(false)
  const [laReferral, setLaReferral] = React.useState(caseData.laReferral)
  const [laReference, setLaReference] = React.useState(caseData.laReference ?? '')
  const [laReferredAt, setLaReferredAt] = React.useState(caseData.laReferredAt?.slice(0, 10) ?? '')
  const [cqcNotified, setCqcNotified] = React.useState(caseData.cqcNotified)
  const [cqcReference, setCqcReference] = React.useState(caseData.cqcReference ?? '')
  const [riskLevel, setRiskLevel] = React.useState<SafeguardingRisk>(caseData.riskLevel)

  React.useEffect(() => {
    setLaReferral(caseData.laReferral)
    setLaReference(caseData.laReference ?? '')
    setLaReferredAt(caseData.laReferredAt?.slice(0, 10) ?? '')
    setCqcNotified(caseData.cqcNotified)
    setCqcReference(caseData.cqcReference ?? '')
    setRiskLevel(caseData.riskLevel)
  }, [caseData])

  useOpenSectionListener('referrals', () => {
    if (canManage) setEditing(true)
  })

  const save = () => {
    update.mutate(
      { laReferral, laReference, laReferredAt: laReferredAt || null, cqcNotified, cqcReference, riskLevel },
      {
        onSuccess: () => {
          toastSuccess('Case updated')
          setEditing(false)
        },
        onError: e => toastApiError(e, 'Could not update case'),
      },
    )
  }

  const risk = RISK_TILE[caseData.riskLevel]

  return (
    <SectionCard
      title="Risk & referrals"
      icon={Zap}
      tone="rose"
      section="referrals"
      action={
        canManage && !editing ? (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
        ) : null
      }
    >
      {editing ? (
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            Risk level
            <select
              className="h-9 rounded-md border border-input bg-background px-3"
              value={riskLevel}
              onChange={e => setRiskLevel(e.target.value as SafeguardingRisk)}
            >
              {RISK_OPTIONS.map(r => (
                <option key={r} value={r}>
                  {RISK_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <div />
          <label className="flex flex-col gap-1">
            Local Authority referral
            <select
              className="h-9 rounded-md border border-input bg-background px-3"
              value={laReferral}
              onChange={e => setLaReferral(e.target.value as SafeguardingReferralDecision)}
            >
              {REFERRAL_OPTIONS.map(o => (
                <option key={o} value={o}>
                  {REFERRAL_LABELS[o]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            LA reference
            <input
              className="h-9 rounded-md border border-input bg-background px-3"
              value={laReference}
              onChange={e => setLaReference(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            Date referred to LA
            <input
              type="date"
              className="h-9 rounded-md border border-input bg-background px-3"
              value={laReferredAt}
              onChange={e => setLaReferredAt(e.target.value)}
            />
          </label>
          <div />
          <label className="flex flex-col gap-1">
            CQC notification
            <select
              className="h-9 rounded-md border border-input bg-background px-3"
              value={cqcNotified}
              onChange={e => setCqcNotified(e.target.value as SafeguardingReferralDecision)}
            >
              {REFERRAL_OPTIONS.map(o => (
                <option key={o} value={o}>
                  {REFERRAL_LABELS[o]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            CQC reference
            <input
              className="h-9 rounded-md border border-input bg-background px-3"
              value={cqcReference}
              onChange={e => setCqcReference(e.target.value)}
            />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <Button size="sm" onClick={save} disabled={update.isPending}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <div className={cn('rounded-xl border p-4', risk.box)}>
            <p className={cn('text-xs font-medium uppercase tracking-wide', risk.text)}>Risk level</p>
            <p className={cn('mt-2 flex items-center gap-2 text-lg font-semibold', risk.text)}>
              <span className={cn('h-2.5 w-2.5 rounded-full', risk.dot)} />
              {RISK_LABELS[caseData.riskLevel]}
            </p>
          </div>
          <ReferralTile
            label="Local Authority referral"
            decision={caseData.laReferral}
            date={caseData.laReferredAt}
            reference={caseData.laReference}
          />
          <ReferralTile label="CQC notification" decision={caseData.cqcNotified} reference={caseData.cqcReference} />
        </div>
      )}
    </SectionCard>
  )
}

const EVENT_DOT: [RegExp, string][] = [
  [/raised/i, 'bg-rose-500'],
  [/investigation/i, 'bg-violet-500'],
  [/refer/i, 'bg-amber-500'],
  [/screen/i, 'bg-emerald-500'],
  [/closed|reopen/i, 'bg-slate-500'],
  [/updated|lead|review/i, 'bg-sky-500'],
]
const eventDot = (action: string) => EVENT_DOT.find(([re]) => re.test(action))?.[1] ?? 'bg-muted-foreground'

function Timeline({ caseData }: { caseData: SafeguardingCase }) {
  const addNote = useAddSafeguardingNote(caseData.id)
  const [note, setNote] = React.useState('')
  const canManage = useAuthStore(s => s.can)('safeguarding.manage')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim()) return
    addNote.mutate(note.trim(), {
      onSuccess: () => {
        toastSuccess('Note added')
        setNote('')
      },
      onError: err => toastApiError(err, 'Could not add note'),
    })
  }

  return (
    <SectionCard
      title="Timeline"
      compact
      section="timeline"
      action={<span className="text-xs text-muted-foreground">{caseData.events.length} events</span>}
    >
      {canManage && (
        <form className="flex gap-2" onSubmit={submit}>
          <input
            className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
            placeholder="Add a note…"
            aria-label="Add a note"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={addNote.isPending}>
            Add
          </Button>
        </form>
      )}
      <ol className="relative mt-5 max-h-[640px] space-y-5 overflow-y-auto pr-1 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-border">
        {[...caseData.events].reverse().map(ev => (
          <li key={ev.id} className="relative pl-6">
            <span
              className={cn(
                'absolute left-0 top-1 h-[15px] w-[15px] rounded-full border-[3px] border-card ring-1 ring-border',
                eventDot(ev.action),
              )}
            />
            <p className="text-sm font-medium text-foreground">{ev.action}</p>
            {ev.note && <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">{ev.note}</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              {fmtDateTime(ev.at)}
              {ev.userName && ` · ${ev.userName}`}
            </p>
          </li>
        ))}
      </ol>
    </SectionCard>
  )
}

export default function SafeguardingCaseDetailPage() {
  const params = useParams({ strict: false }) as { caseId?: string }
  const { data: caseData, isLoading } = useSafeguardingCase(params.caseId)
  const [action, setAction] = React.useState<SafeguardingAction | null>(null)

  if (isLoading) {
    return (
      <SafeguardingSectionLayout title="Case" description="Loading…" testId="safeguarding-detail-loading">
        <LoadingSpinner />
      </SafeguardingSectionLayout>
    )
  }

  if (!caseData) {
    return (
      <SafeguardingSectionLayout title="Case not found" description="" testId="safeguarding-detail-missing">
        <EmptyState title="Case not found" description="This safeguarding case may have been removed." />
      </SafeguardingSectionLayout>
    )
  }

  const personLabel = caseData.serviceUserName || caseData.personDescription || 'Person not recorded'
  const actions = availableActions(caseData.status)
  const investigationShown = ['INVESTIGATING', 'REFERRED', 'CLOSED'].includes(caseData.status)
  const sections = [
    { id: 'concern', label: 'Concern' },
    { id: 'safeguarding-safety-card', label: 'Immediate safety' },
    ...(investigationShown ? [{ id: 'investigation', label: 'Investigation' }] : []),
    { id: 'referrals', label: 'Risk & referrals' },
    { id: 'safeguarding-agency-card', label: 'Multi-agency' },
    { id: 'safeguarding-voice-card', label: 'Voice of the person' },
    ...(caseData.outcome ? [{ id: 'outcome', label: 'Outcome' }] : []),
    { id: 'safeguarding-lead-card', label: 'Lead & review' },
    { id: 'checklist', label: 'Checklist' },
    { id: 'timeline', label: 'Timeline' },
  ]

  return (
    <div className="flex flex-col" data-testid="safeguarding-detail-page">
      <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <Link to="/safeguarding" className="hover:text-foreground">
          Safeguarding
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <span className="font-medium text-foreground">{caseData.referenceNumber}</span>
      </nav>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-lg font-semibold text-primary-foreground">
              {initials(personLabel)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {caseData.aboutServiceUserId ? (
                    <Link
                      to="/service-users/$serviceUserId"
                      params={{ serviceUserId: caseData.aboutServiceUserId }}
                      className="hover:text-primary hover:underline"
                    >
                      {personLabel}
                    </Link>
                  ) : (
                    personLabel
                  )}
                </h1>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[caseData.status]}`}>
                  {STATUS_LABELS[caseData.status]}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${RISK_CLASS[caseData.riskLevel]}`}
                >
                  {caseData.riskLevel === 'HIGH' ? <AlertTriangle className="h-3 w-3" aria-hidden /> : null}
                  {RISK_LABELS[caseData.riskLevel]} risk
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-mono font-medium text-foreground">{caseData.referenceNumber}</span> · Safeguarding
                case
                {caseData.raisedByRole ? (
                  <>
                    {' '}
                    · Raised by <span className="text-foreground">{caseData.raisedByRole}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openSafeguardingSection('checklist')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${scoreClass(caseData.checkScore.pct)}`}
              title="CQC records checklist"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Records {caseData.checkScore.pct === null ? '—' : `${caseData.checkScore.pct}%`}
            </button>
            {actions.map(a => (
              <Button key={a} variant={a === 'CLOSE' ? 'outline' : 'default'} onClick={() => setAction(a)}>
                {ACTION_LABELS[a]}
              </Button>
            ))}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-px border-t border-border bg-border lg:grid-cols-4">
          <Meta label="Category">{CATEGORY_LABELS[caseData.category]}</Meta>
          <Meta label="Raised">{fmtDate(caseData.raisedAt)}</Meta>
          <Meta label="Branch">{caseData.locationName}</Meta>
          <Meta label="Case lead">
            {caseData.leadName ? (
              <span className="flex items-center gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {initials(caseData.leadName)}
                </span>
                <span className="truncate">{caseData.leadName}</span>
              </span>
            ) : (
              <span className="text-amber-700">Not allocated</span>
            )}
          </Meta>
        </dl>

        <div className="space-y-4 border-t border-border px-6 py-5">
          <Stepper status={caseData.status} />
          <AlertList alerts={caseData.alerts} />
        </div>
      </section>

      <div className="mt-4">
        <SectionTabs sections={sections} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <SectionCard title="Concern" icon={AlertTriangle} tone="amber" section="concern">
            <dl className="grid gap-5 sm:grid-cols-2">
              <View label="Category" value={CATEGORY_LABELS[caseData.category]} />
              <View label="Raised by (role)" value={caseData.raisedByRole} />
            </dl>
            <div className="mt-5 rounded-xl bg-muted/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{caseData.description}</p>
            </div>
          </SectionCard>

          <ImmediateSafetyCard caseData={caseData} />
          <SafeguardingInvestigationCard caseData={caseData} />
          <ReferralsCard caseData={caseData} />
          <MultiAgencyCard caseData={caseData} />
          <VoiceCard caseData={caseData} />

          {caseData.outcome && (
            <SectionCard title="Outcome" icon={CheckCircle2} tone="emerald" section="outcome">
              <dl className="grid gap-5 sm:grid-cols-2">
                <View label="Outcome" value={caseData.outcome} />
                <View label="Lessons learned" value={caseData.lessonsLearned} />
              </dl>
            </SectionCard>
          )}
        </div>

        <aside className="space-y-6">
          <LeadReviewCard caseData={caseData} />
          <ChecklistCard caseData={caseData} />
          <Timeline caseData={caseData} />
        </aside>
      </div>

      <ActionDialog caseData={caseData} action={action} onClose={() => setAction(null)} />
    </div>
  )
}
