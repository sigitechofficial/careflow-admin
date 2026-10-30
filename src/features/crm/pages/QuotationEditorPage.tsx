import * as React from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calculator,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  HeartPulse,
  Lock,
  MessagesSquare,
  PoundSterling,
  Save,
  ScrollText,
  Send,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'
import { EmptyState, LoadingSpinner } from '@/shared/ui/page-elements'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { CrmSectionLayout } from '@/features/crm/components/CrmSectionLayout'
import { useEnquiry, useEnquiryOwners } from '@/features/crm/hooks/useCrm'
import { useBranchOptions } from '@/features/crm/hooks/useBranchOptions'
import {
  useCreateQuotation,
  useQuotePricingPreview,
  useQuoteVersion,
  useUpdateQuoteDraft,
} from '@/features/crm/hooks/useQuotations'
import { QUOTE_STATUS_CLASS, QUOTE_TYPE_LABELS, emptyPattern, hours, money } from '@/features/crm/quote-labels'
import { VisitPatternBuilder, patternProblems } from '@/features/crm/components/quote-editor/VisitPatternBuilder'
import { QuoteRatesEditor } from '@/features/crm/components/quote-editor/QuoteRatesEditor'
import { QuoteClientLayoutChoice } from '@/features/crm/components/quote-editor/QuoteClientLayoutChoice'
import { VisitSlotsBuilder } from '@/features/crm/components/quote-editor/VisitSlotsBuilder'
import { CostSummary, FundingAndExtras } from '@/features/crm/components/quote-editor/QuotePricingSections'
import { ResponsesAndActivityPanel, ReviewAndSendPanel } from '@/features/crm/components/quote-editor/QuoteReviewPanels'
import type { Enquiry } from '@/features/crm/types/crm.types'
import type { QuoteDraftInput, QuotePricing, QuoteType, QuoteVersionDetail } from '@/features/crm/types/quotation.types'

/** Three steps to build a quote, then send it. Quote details and terms sit, folded, on the price step. */
const SECTIONS: Array<{ key: SectionKey; label: string; icon: LucideIcon; hint: string }> = [
  { key: 'schedule', label: 'Visits', icon: CalendarClock, hint: 'Add each visit: days, times and how many carers. The price is worked out for you.' },
  { key: 'pricing', label: 'Who pays', icon: Wallet, hint: 'Add any council, NHS or other funder. Whatever they don’t cover, the client pays.' },
  { key: 'cost', label: 'Price & details', icon: Calculator, hint: 'Check the price, then the quote dates and notes if you need to change them.' },
  { key: 'review', label: 'Review & Send', icon: Send, hint: 'Approve, preview, download and send.' },
  { key: 'responses', label: 'Responses & Activity', icon: MessagesSquare, hint: 'Client responses, follow-ups and history.' },
]
type SectionKey = 'schedule' | 'pricing' | 'cost' | 'review' | 'responses'
/** Older links (?section=general etc.) open the step that now holds those fields. */
const SECTION_ALIASES: Record<string, SectionKey> = { general: 'cost', care: 'schedule', terms: 'cost' }
const isSectionKey = (s: string | undefined): s is SectionKey => SECTIONS.some(x => x.key === s)

/** Something to fix before the quote can be issued, and where to fix it. */
/** `field` is the id of the input to scroll to and focus (e.g. the branch select inside Quote details). */
type Issue = { section: SectionKey; message: string; patternIndex?: number; block?: 'funding' | 'extras'; details?: boolean; field?: string }

/** Where a server pricing problem is fixed: the visit it belongs to, the funding or extras block, or the summary. */
function routeForProblem(message: string, pricing: QuotePricing | null): Omit<Issue, 'message'> {
  if (/hourly rate/i.test(message)) return { section: 'schedule', field: 'quote-hourly-rate-input' }
  if (/weekly total/i.test(message)) return { section: 'schedule', field: 'quote-manual-total-input' }
  const patternIndex = pricing?.patterns.findIndex(p => p.issues.includes(message)) ?? -1
  if (patternIndex >= 0) return { section: 'schedule', patternIndex }
  if (/VAT|tax treatment/i.test(message)) return { section: 'cost' }
  if (/fund|percentage|private quote|mixed quote/i.test(message)) return { section: 'pricing', block: 'funding' }
  return { section: 'pricing', block: 'extras' }
}

const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm'

function Field({ label, children, hint, required }: { label: string; children: React.ReactNode; hint?: string; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

function formFromDetail(d: QuoteVersionDetail): QuoteDraftInput {
  return {
    quoteType: d.quoteType,
    locationId: d.locationId ?? undefined,
    ownerId: d.ownerId,
    proposedStartDate: d.proposedStartDate,
    proposedEndDate: d.proposedEndDate,
    issueDate: d.issueDate,
    validUntil: d.validUntil,
    assessmentReference: d.assessmentReference,
    fundingCategory: d.fundingCategory,
    hourlyRate: d.hourlyRate,
    rates: d.rates,
    clientLayout: d.clientLayout,
    manualWeeklyTotal: d.manualWeeklyTotal,
    internalNotes: d.internalNotes,
    clientNotes: d.clientNotes,
    terms: d.terms,
    patterns: d.patterns.map(p => ({
      label: p.label,
      careType: p.careType,
      startTime: p.startTime,
      endTime: p.endTime,
      windowEndTime: p.windowEndTime,
      durationMinutes: p.durationMinutes,
      daysOfWeek: p.daysOfWeek,
      frequency: p.frequency,
      effectiveFrom: p.effectiveFrom,
      effectiveTo: p.effectiveTo,
      oneOffDates: p.oneOffDates,
      carersPerVisit: p.carersPerVisit,
      nightDuty: p.nightDuty,
      activities: p.activities,
      notes: p.notes,
      manualChargePerVisit: p.manualChargePerVisit,
      overrideReason: p.overrideReason,
    })),
    fundings: d.fundings.map(f => ({ payerType: f.payerType, payerName: f.payerName, funderId: f.funderId, reference: f.reference, method: f.method, amount: f.amount, status: f.status })),
    extras: d.extras.map(e => ({ kind: e.kind, description: e.description, frequency: e.frequency, amount: e.amount, quantity: e.quantity, isPercentage: e.isPercentage })),
  }
}

function newForm(enquiry: Enquiry): QuoteDraftInput {
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  return {
    quoteType: 'PROVISIONAL_ESTIMATE',
    locationId: enquiry.locationId ?? undefined,
    ownerId: enquiry.ownerId,
    proposedStartDate: enquiry.requestedStartDate?.slice(0, 10) ?? null,
    validUntil: in30,
    fundingCategory: 'PRIVATE',
    hourlyRate: enquiry.quoteHourlyRate ?? null,
    rates: null,
    clientLayout: 'DETAILED',
    manualWeeklyTotal: null,
    patterns: [emptyPattern()],
    fundings: [],
    extras: [],
  }
}

/** Strip empty strings so optional fields go to the API as null / absent. */
function cleanForm(f: QuoteDraftInput): QuoteDraftInput {
  const blank = (v: string | null | undefined) => (v == null || v === '' ? null : v)
  return {
    ...f,
    proposedStartDate: blank(f.proposedStartDate),
    proposedEndDate: blank(f.proposedEndDate),
    issueDate: blank(f.issueDate),
    validUntil: blank(f.validUntil),
    ownerId: blank(f.ownerId),
    patterns: f.patterns?.map(p => ({
      ...p,
      careType: blank(p.careType),
      endTime: blank(p.endTime),
      windowEndTime: blank(p.windowEndTime),
      effectiveFrom: blank(p.effectiveFrom),
      effectiveTo: blank(p.effectiveTo),
      notes: blank(p.notes),
      // Quotes are priced from the hourly rate only; an own price per visit is no longer offered.
      manualChargePerVisit: null,
      overrideReason: null,
      daysOfWeek: p.frequency === 'ONE_OFF' ? [] : p.daysOfWeek,
      oneOffDates: p.frequency === 'ONE_OFF' ? p.oneOffDates : [],
    })),
  }
}

/** Everything that blocks issuing, each tied to the section (and visit) where it is fixed. */
function collectIssues(form: QuoteDraftInput, pricing: QuotePricing | null): Issue[] {
  const out: Issue[] = []
  if (!form.locationId) out.push({ section: 'cost', details: true, field: 'quote-branch', message: 'Choose the branch' })
  if (!form.validUntil) out.push({ section: 'cost', details: true, field: 'quote-valid-until', message: 'Set the valid-until date' })
  if (form.proposedStartDate && form.proposedEndDate && form.proposedEndDate < form.proposedStartDate) {
    out.push({ section: 'cost', details: true, field: 'quote-end-date', message: 'The proposed end date is before the start date' })
  }
  if (form.issueDate && form.validUntil && form.validUntil < form.issueDate) {
    out.push({ section: 'cost', details: true, field: 'quote-valid-until', message: 'Valid until is before the issue date' })
  }
  const patterns = form.patterns ?? []
  if (!patterns.length) out.push({ section: 'schedule', message: 'Add at least one visit' })
  // Listed first so the server's per-visit copies of this message (filtered below) don't point at a visit.
  // Visits priced by a night or short-visit rate need no hourly rate; the server says which do.
  if (
    form.clientLayout !== 'SUMMARY' &&
    form.hourlyRate == null &&
    patterns.length > 0 &&
    (!pricing || pricing.issues.includes('Set the hourly rate for this quote'))
  ) {
    out.push({ section: 'schedule', field: 'quote-hourly-rate-input', message: 'Set the hourly rate for this quote' })
  }
  if ((form.fundings ?? []).some(f => !f.funderId && !f.payerName?.trim())) {
    out.push({ section: 'pricing', block: 'funding', message: 'Choose the funder for each funding line' })
  }
  // Pattern problems come from the browser check first; the server adds missing-rate problems.
  const patternIssues = new Set<string>()
  patterns.forEach((p, i) => {
    const name = p.label.trim() || `Visit ${i + 1}`
    const local = patternProblems(p)
    const server = pricing?.patterns[i]?.issues ?? []
    server.forEach(m => patternIssues.add(m))
    for (const m of local) out.push({ section: 'schedule', message: `${name}: ${m}`, patternIndex: i })
    if (!local.length) for (const m of server) out.push({ section: 'schedule', message: m, patternIndex: i })
  })
  for (const m of pricing?.issues ?? []) {
    if (patternIssues.has(m)) continue
    out.push({ ...routeForProblem(m, pricing), message: m })
  }
  return out.filter((issue, i) => out.findIndex(o => o.message === issue.message) === i)
}

/** A folded block with a one-line summary, for fields most quotes leave as they are. */
function Fold({
  icon: Icon,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  icon: LucideIcon
  title: string
  summary: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border">
      <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={open} onClick={onToggle}>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{title}</span>
          {!open && <span className="block truncate text-xs text-muted-foreground">{summary}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && <div className="border-t border-border px-4 py-4">{children}</div>}
    </div>
  )
}

function Stat({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-base font-semibold">{value}</p>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

function QuoteEditor({ enquiry, detail }: { enquiry: Enquiry; detail: QuoteVersionDetail | null }) {
  const navigate = useNavigate()
  const canManage = useAuthStore(s => s.can)('crm.manage')
  const { options: branches } = useBranchOptions()
  const { data: owners } = useEnquiryOwners()
  const create = useCreateQuotation(enquiry.id)
  const update = useUpdateQuoteDraft(enquiry.id, detail?.quotationId ?? '', detail?.id ?? '')
  const preview = useQuotePricingPreview(enquiry.id)
  const editable = canManage && (!detail || detail.editable)
  const requestedRaw = (useSearch({ strict: false }) as { section?: string }).section
  const requested = requestedRaw ? (SECTION_ALIASES[requestedRaw] ?? requestedRaw) : undefined
  const [section, setSection] = React.useState<SectionKey>(
    isSectionKey(requested) ? requested : detail && !detail.editable ? 'review' : 'schedule',
  )
  // Quote details (branch, dates) and notes & terms are folded on the price step; open them when asked for.
  const [detailsOpen, setDetailsOpen] = React.useState(requestedRaw === 'general')
  const [termsOpen, setTermsOpen] = React.useState(requestedRaw === 'terms')
  const [focus, setFocus] = React.useState<{ index: number; seq: number } | null>(null)
  const [form, setForm] = React.useState<QuoteDraftInput>(() => (detail ? formFromDetail(detail) : newForm(enquiry)))
  const [dirty, setDirty] = React.useState(!detail)
  const [live, setLive] = React.useState<{ pricing: QuotePricing } | null>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)

  // A reload (save, status change) replaces the form with the server copy.
  const loadedKey = detail ? `${detail.id}:${detail.status}:${detail.totals.calculatedAt}` : 'new'
  React.useEffect(() => {
    if (detail) {
      setForm(formFromDetail(detail))
      setDirty(false)
    }
  }, [loadedKey])

  // Live price while editing (server-side, the same engine that issues the quote).
  const previewMutate = preview.mutate
  React.useEffect(() => {
    if (!editable) return
    const t = window.setTimeout(() => {
      previewMutate(cleanForm(form), { onSuccess: r => setLive({ pricing: r.pricing }) })
    }, 600)
    return () => window.clearTimeout(t)
  }, [form, editable, previewMutate])

  const pricing: QuotePricing | null = editable ? (live?.pricing ?? detail?.pricing ?? null) : (detail?.pricing ?? null)
  const manualTotal = form.clientLayout === 'SUMMARY'
  const rateLabel = manualTotal
    ? 'Total amount quote'
    : (form.hourlyRate != null ? `${money(form.hourlyRate)} per carer per hour` : 'No hourly rate yet') +
      (form.rates ? ' + other rates' : '')
  const issues = editable ? collectIssues(form, pricing) : []
  const issuesBySection = (key: SectionKey) => issues.filter(i => i.section === key).length

  const patch = (p: Partial<QuoteDraftInput>) => {
    setForm(f => ({ ...f, ...p }))
    setDirty(true)
  }
  const [highlight, setHighlight] = React.useState<{ block: 'funding' | 'extras'; seq: number } | null>(null)
  const [fieldFocus, setFieldFocus] = React.useState<{ id: string; seq: number } | null>(null)
  const go = (key: SectionKey, patternIndex?: number, block?: 'funding' | 'extras', details?: boolean, field?: string) => {
    setSection(key)
    if (details) setDetailsOpen(true)
    if (patternIndex != null) setFocus(f => ({ index: patternIndex, seq: (f?.seq ?? 0) + 1 }))
    if (field) setFieldFocus(f => ({ id: field, seq: (f?.seq ?? 0) + 1 }))
    else if (block) setHighlight(h => ({ block, seq: (h?.seq ?? 0) + 1 }))
    else contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  // After the step (and any fold) has rendered: bring the field into view, focus it and flash it.
  React.useEffect(() => {
    if (!fieldFocus) return
    let timer = 0
    const frame = window.requestAnimationFrame(() => {
      const el = document.getElementById(fieldFocus.id)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.focus({ preventScroll: true })
      el.classList.add('ring-2', 'ring-amber-400', 'ring-offset-2')
      timer = window.setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400', 'ring-offset-2'), 2500)
    })
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [fieldFocus])
  const resolve = (message: string) => {
    const r = routeForProblem(message, pricing)
    go(r.section, r.patternIndex, r.block, r.details, r.field)
  }
  const openVersion = (versionId: string) =>
    navigate({ to: '/crm/$enquiryId/quotes/$quotationId/$versionId', params: { enquiryId: enquiry.id, quotationId: detail!.quotationId, versionId } })

  const save = () => {
    const body = cleanForm(form)
    if (!detail) {
      create.mutate(body, {
        onSuccess: d => {
          toastSuccess(`Draft ${d.label} saved`)
          navigate({ to: '/crm/$enquiryId/quotes/$quotationId/$versionId', params: { enquiryId: enquiry.id, quotationId: d.quotationId, versionId: d.id } })
        },
        onError: e => toastApiError(e, 'Could not save the quotation'),
      })
    } else {
      update.mutate(body, {
        onSuccess: () => {
          toastSuccess('Draft saved')
          setDirty(false)
        },
        onError: e => toastApiError(e, 'Could not save the draft'),
      })
    }
  }
  const saving = create.isPending || update.isPending

  const visible = SECTIONS.filter(s => detail || (s.key !== 'review' && s.key !== 'responses'))
  const index = visible.findIndex(s => s.key === section)
  const current = visible[index] ?? visible[0]!
  const prev = visible[index - 1]
  const next = visible[index + 1]
  const CurrentIcon = current.icon

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate({ to: '/crm/$enquiryId', params: { enquiryId: enquiry.id } })}>
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
          Back to {enquiry.firstName} {enquiry.lastName}
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {detail && (
            <>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${QUOTE_STATUS_CLASS[detail.status]}`}>{detail.statusLabel}</span>
              {detail.allVersions.length > 1 && (
                <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={detail.id} onChange={e => openVersion(e.target.value)} aria-label="Version">
                  {detail.allVersions.map(v => <option key={v.id} value={v.id}>Version {v.versionNumber} · {v.statusLabel}</option>)}
                </select>
              )}
            </>
          )}
          {editable && (
            <>
              {dirty && <span className="text-xs text-amber-700 dark:text-amber-300">Unsaved changes</span>}
              <Button onClick={save} disabled={saving || (!dirty && !!detail)}>
                {dirty ? <Save className="mr-1.5 h-4 w-4" aria-hidden /> : <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden />}
                {saving ? 'Saving…' : dirty ? 'Save draft' : 'Saved'}
              </Button>
            </>
          )}
        </div>
      </div>

      {detail && !detail.editable && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>
            This version has been issued and can’t be changed.{' '}
            {canManage && <>To change it, go to <button type="button" className="font-medium text-primary hover:underline" onClick={() => go('review')}>Review &amp; Send</button> and choose <strong>Revise</strong>.</>}
          </span>
        </div>
      )}

      {/* At a glance */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={PoundSterling} label="Weekly total" value={money(pricing?.weeklyTotal ?? null)} sub={pricing?.oneOffTotal ? `+ ${money(pricing.oneOffTotal)} one-off` : undefined} />
        <Stat icon={CalendarClock} label="Average month" value={money(pricing?.estimates.find(e => e.key === 'monthlyAverage')?.amount ?? null)} sub="Weekly × 52 ÷ 12" />
        {pricing?.manual ? (
          <Stat
            icon={Users}
            label="Visits per week"
            value={String(pricing.patterns.reduce((n, p) => n + p.weeklyOccurrences, 0))}
            sub="Total amount quote (no times)"
          />
        ) : (
          <Stat
            icon={Users}
            label="Hours per week"
            value={pricing ? `${hours(pricing.weeklyCoverageMinutes)} cover` : '—'}
            sub={pricing ? `${hours(pricing.weeklyCarerMinutes)} carer time` : undefined}
          />
        )}
        <Stat icon={Wallet} label="Client pays per week" value={money(pricing?.clientWeeklyLiability ?? null)} sub={`Rate: ${rateLabel}`} />
      </div>

      {/* What still needs doing, with a link to each place */}
      {editable && issues.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/70 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30" data-testid="quote-issues">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            {issues.length === 1 ? '1 thing to fix' : `${issues.length} things to fix`} before this quote can be approved
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {issues.map(issue => (
              <li key={issue.message}>
                <button
                  type="button"
                  className="group flex w-full items-center justify-between gap-3 rounded-md px-2 py-1 text-left text-sm hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  onClick={() => go(issue.section, issue.patternIndex, issue.block, issue.details, issue.field)}
                >
                  <span>{issue.message}</span>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                    {issue.details ? 'Quote details' : SECTIONS.find(s => s.key === issue.section)!.label}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {editable && detail && issues.length === 0 && pricing && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 text-sm dark:border-emerald-900 dark:bg-emerald-950/20">
          <span className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {dirty ? 'Everything is filled in — save the draft, then approve it.' : 'Everything is filled in. Ready to approve.'}
          </span>
          {!dirty && (
            <button type="button" className="flex items-center gap-1 font-medium text-primary hover:underline" onClick={() => go('review')}>
              Review &amp; Send <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>
      )}

      <div ref={contentRef} className="grid items-start gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:sticky lg:top-4 lg:flex-col" aria-label="Quotation sections">
          {visible.map((s, i) => {
            const Icon = s.icon
            const count = issuesBySection(s.key as SectionKey)
            const active = section === s.key
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => go(s.key as SectionKey)}
                aria-current={active ? 'step' : undefined}
                className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  active ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${active ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="flex-1">
                  {s.key !== 'responses' && <span className="mr-1 text-xs text-muted-foreground">{i + 1}.</span>}
                  {s.label}
                </span>
                {count > 0 && (
                  <span className="rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold text-white" aria-label={`${count} to fix`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <Card>
          <CardContent className="flex flex-col gap-6 py-5">
            <div className="flex items-start gap-3 border-b border-border pb-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CurrentIcon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h3 className="text-lg font-semibold">{current.label}</h3>
                <p className="text-sm text-muted-foreground">{current.hint}</p>
              </div>
            </div>

            {section === 'schedule' && (
              <>
                <div className="flex flex-col gap-1 rounded-lg bg-muted/40 px-4 py-3 text-sm" data-testid="quote-asked-for">
                  <p className="flex items-center gap-2 font-medium"><HeartPulse className="h-4 w-4 text-muted-foreground" aria-hidden />What they asked for</p>
                  <p className="text-muted-foreground">
                    {[
                      enquiry.hoursPerWeek != null && `${enquiry.hoursPerWeek} hours a week`,
                      enquiry.visitsPerDay != null && `${enquiry.visitsPerDay} visit${enquiry.visitsPerDay === 1 ? '' : 's'} a day`,
                      enquiry.carePlans.length > 0 && enquiry.carePlans.map(c => c.name).join(', '),
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'No hours or visits recorded on the enquiry.'}
                  </p>
                  {enquiry.needs && <p className="whitespace-pre-wrap">{enquiry.needs}</p>}
                </div>
                <QuoteClientLayoutChoice
                  value={form.clientLayout ?? 'DETAILED'}
                  onChange={clientLayout =>
                    patch({
                      clientLayout,
                      // Start the typed total from the price worked out so far.
                      ...(clientLayout === 'SUMMARY' && form.manualWeeklyTotal == null && pricing?.visitsWeekly
                        ? { manualWeeklyTotal: pricing.visitsWeekly }
                        : {}),
                    })
                  }
                  readOnly={!editable}
                />
                {manualTotal ? (
                  <>
                    <fieldset disabled={!editable} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm" data-testid="quote-manual-total">
                      <Field label="Weekly total for the visits (£)" required hint="The price of all the visits below for one week. Extras, discounts and funding are added in the next steps.">
                        <div className="relative w-44">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className={`pl-7 ${form.manualWeeklyTotal == null ? 'border-amber-400' : ''}`}
                            id="quote-manual-total-input"
                            placeholder="e.g. 350.00"
                            value={form.manualWeeklyTotal ?? ''}
                            onChange={e => patch({ manualWeeklyTotal: e.target.value === '' ? null : Number(e.target.value) })}
                          />
                        </div>
                      </Field>
                    </fieldset>
                    <VisitSlotsBuilder patterns={form.patterns ?? []} onChange={patterns => patch({ patterns })} readOnly={!editable} />
                  </>
                ) : (
                <>
                <fieldset disabled={!editable} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm" data-testid="quote-hourly-rate">
                  <Field label="Hourly rate (£ per carer per hour)" required hint="Visits are priced as rate × visit length × carers, unless another rate below applies.">
                    <div className="relative w-44">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className={`pl-7 ${form.hourlyRate == null ? 'border-amber-400' : ''}`}
                        id="quote-hourly-rate-input"
                        placeholder="e.g. 25.00"
                        value={form.hourlyRate ?? ''}
                        onChange={e => patch({ hourlyRate: e.target.value === '' ? null : Number(e.target.value) })}
                      />
                    </div>
                  </Field>
                </fieldset>
                <QuoteRatesEditor value={form.rates} onChange={rates => patch({ rates })} readOnly={!editable} />
                <VisitPatternBuilder
                  patterns={form.patterns ?? []}
                  onChange={patterns => patch({ patterns })}
                  readOnly={!editable}
                  pricing={pricing}
                  hourlyRate={form.hourlyRate ?? null}
                  rates={form.rates ?? null}
                  focusIndex={focus?.index}
                  focusKey={focus?.seq}
                />
                </>
                )}
              </>
            )}

            {section === 'pricing' && (
              <FundingAndExtras
                category={form.fundingCategory ?? 'PRIVATE'}
                onCategory={fundingCategory => patch({ fundingCategory })}
                fundings={form.fundings ?? []}
                onFundings={fundings => patch({ fundings })}
                extras={form.extras ?? []}
                onExtras={extras => patch({ extras })}
                readOnly={!editable}
                pricing={pricing}
                rateLabel={rateLabel}
                highlight={highlight}
              />
            )}

            {section === 'cost' && (
              <div className="flex flex-col gap-4">
                <CostSummary pricing={pricing} calculating={preview.isPending} onResolve={editable ? resolve : undefined} />
                <Fold
                  icon={FileText}
                  title="Quote details"
                  summary={[
                    QUOTE_TYPE_LABELS[form.quoteType ?? 'PROVISIONAL_ESTIMATE'],
                    branches.find(b => b.id === form.locationId)?.label ?? 'No branch',
                    form.proposedStartDate ? `starts ${form.proposedStartDate}` : null,
                    form.validUntil ? `valid until ${form.validUntil}` : 'no valid-until date',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  open={detailsOpen}
                  onToggle={() => setDetailsOpen(v => !v)}
                >
              <fieldset disabled={!editable} className="grid gap-5 sm:grid-cols-2">
                <Field label="Quote type">
                  <select className={selectClass} value={form.quoteType} onChange={e => patch({ quoteType: e.target.value as QuoteType })}>
                    {(Object.keys(QUOTE_TYPE_LABELS) as QuoteType[]).map(t => <option key={t} value={t}>{QUOTE_TYPE_LABELS[t]}</option>)}
                  </select>
                </Field>
                <Field label="Branch" required>
                  <select id="quote-branch" className={selectClass} value={form.locationId ?? ''} onChange={e => patch({ locationId: e.target.value || undefined })}>
                    <option value="">Select branch…</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                  </select>
                </Field>
                <Field label="Owner">
                  <select className={selectClass} value={form.ownerId ?? ''} onChange={e => patch({ ownerId: e.target.value || null })}>
                    <option value="">Unassigned</option>
                    {(owners ?? []).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </Field>
                <Field label="Currency"><Input value="GBP (£)" readOnly /></Field>
                <div className="sm:col-span-2">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden />Dates</p>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Proposed start"><Input type="date" value={form.proposedStartDate ?? ''} onChange={e => patch({ proposedStartDate: e.target.value })} /></Field>
                    <Field label="Proposed end" hint="Leave empty for ongoing care"><Input id="quote-end-date" type="date" value={form.proposedEndDate ?? ''} onChange={e => patch({ proposedEndDate: e.target.value })} /></Field>
                    <Field label="Issue date" hint="Leave empty to use the day it is approved"><Input type="date" value={form.issueDate ?? ''} onChange={e => patch({ issueDate: e.target.value })} /></Field>
                    <Field label="Valid until" required><Input id="quote-valid-until" type="date" value={form.validUntil ?? ''} onChange={e => patch({ validUntil: e.target.value })} /></Field>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Assessment reference" hint="The assessment this quote is based on">
                    <Input value={form.assessmentReference ?? ''} onChange={e => patch({ assessmentReference: e.target.value })} />
                  </Field>
                </div>
                {detail?.approvedAt && (
                  <p className="text-sm text-muted-foreground sm:col-span-2">
                    Approved {new Date(detail.approvedAt).toLocaleString()}{detail.approvedByName ? ` by ${detail.approvedByName}` : ''}{detail.approvalNote ? ` — ${detail.approvalNote}` : ''}
                  </p>
                )}
              </fieldset>
                </Fold>
                <Fold
                  icon={ScrollText}
                  title="Notes and terms"
                  summary={[form.clientNotes?.trim() && 'client notes', form.terms?.trim() && 'terms', form.internalNotes?.trim() && 'internal notes'].filter(Boolean).join(', ') || 'Optional'}
                  open={termsOpen}
                  onToggle={() => setTermsOpen(v => !v)}
                >
              <fieldset disabled={!editable} className="flex flex-col gap-5">
                <Field label="Notes for the client" hint="Shown on the preview, PDF and email."><Textarea value={form.clientNotes ?? ''} onChange={e => patch({ clientNotes: e.target.value })} /></Field>
                <Field label="Terms"><Textarea className="min-h-[140px]" value={form.terms ?? ''} onChange={e => patch({ terms: e.target.value })} /></Field>
                <div className="rounded-lg border border-dashed border-border p-4">
                  <Field label="Internal notes" hint="Staff only — never shown on the preview, PDF or email.">
                    <Textarea value={form.internalNotes ?? ''} onChange={e => patch({ internalNotes: e.target.value })} />
                  </Field>
                </div>
              </fieldset>
                </Fold>
              </div>
            )}

            {section === 'review' && detail && (
              dirty && detail.editable ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50/70 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
                  <span>You have unsaved changes. Save the draft before approving it.</span>
                  <Button size="sm" onClick={save} disabled={saving}><Save className="mr-1.5 h-4 w-4" aria-hidden />Save draft</Button>
                </div>
              ) : (
                <ReviewAndSendPanel enquiryId={enquiry.id} detail={detail} onOpenVersion={openVersion} onRecordResponse={() => go('responses')} />
              )
            )}
            {section === 'responses' && detail && <ResponsesAndActivityPanel enquiryId={enquiry.id} detail={detail} onOpenVersion={openVersion} />}

            {/* Step through the sections in order */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              {prev ? (
                <Button variant="outline" size="sm" onClick={() => go(prev.key as SectionKey)}>
                  <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
                  {prev.label}
                </Button>
              ) : <span />}
              {next && (
                <Button variant="outline" size="sm" onClick={() => go(next.key as SectionKey)}>
                  {next.label}
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {!detail && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ClipboardList className="h-3.5 w-3.5" aria-hidden />
          Save the draft to unlock Review &amp; Send and Responses.
        </p>
      )}
    </div>
  )
}

export default function QuotationEditorPage() {
  const params = useParams({ strict: false }) as { enquiryId?: string; quotationId?: string; versionId?: string }
  const { data: enquiry, isLoading } = useEnquiry(params.enquiryId)
  const isNew = !params.versionId
  const version = useQuoteVersion(params.enquiryId ?? '', params.quotationId ?? '', params.versionId ?? '')

  if (isLoading || (!isNew && version.isLoading)) {
    return (
      <CrmSectionLayout title="Quotation" description="Loading…" testId="crm-quote-loading">
        <LoadingSpinner />
      </CrmSectionLayout>
    )
  }
  if (!enquiry || (!isNew && !version.data)) {
    return (
      <CrmSectionLayout title="Quotation not found" description="" testId="crm-quote-missing">
        <EmptyState title="Quotation not found" description="It may have been removed, or it belongs to a branch you cannot access." />
      </CrmSectionLayout>
    )
  }
  const title = version.data ? version.data.label : 'New quotation'
  return (
    <CrmSectionLayout
      title={title}
      description={`Care quotation for ${enquiry.firstName} ${enquiry.lastName}`}
      testId="crm-quote-editor"
      breadcrumbTail={[
        { label: 'Enquiries & Referrals', href: '/crm' },
        { label: enquiry.referenceNumber, href: `/crm/${enquiry.id}` },
        { label: title },
      ]}
    >
      <QuoteEditor key={version.data?.id ?? 'new'} enquiry={enquiry} detail={version.data ?? null} />
    </CrmSectionLayout>
  )
}
