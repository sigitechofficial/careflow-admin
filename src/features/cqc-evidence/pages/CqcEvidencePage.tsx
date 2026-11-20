import * as React from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, FileArchive, Paperclip, PlusCircle, ShieldCheck } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { cn } from '@/shared/lib/utils'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'
import { PageHeader } from '@/shared/ui/page-elements'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'
import { feedbackSelectClass } from '@/features/complaints/components/FeedbackFormDialog'
import { InfoTip } from '@/features/cqc-mock-inspection/components/InfoTip'
import { useBranchOptions } from '@/features/cqc-mock-inspection/components/StartInspectionDialog'
import {
  EvidencePackDialog,
  useCanDownloadEvidencePack,
} from '@/features/cqc-mock-inspection/components/EvidencePackDialog'
import { CATEGORY_LABEL, SOURCE_LABEL } from '@/features/cqc-mock-inspection/labels'
import type { CqcEvidenceStatus, EvidenceDetail, EvidenceRow, OverviewKeyQuestion } from '../types'
import { EvidenceFormDialog } from '../components/EvidenceFormDialog'
import { EvidenceDetailDialog } from '../components/EvidenceDetailDialog'
import { useEvidenceList, useEvidenceOverview } from '../hooks'
import { HELP } from '../help'

const PAGE_SIZE = 20

/** "12 Sep 2026" for one day, "1 Jul 2026 – 30 Sep 2026" for a period. */
function periodLabel(start: string | null, end: string | null) {
  if (start && end) {
    const a = formatOrganisationDate(start)
    const b = formatOrganisationDate(end)
    return a === b ? b : `${a} – ${b}`
  }
  if (end) return `Up to ${formatOrganisationDate(end)}`
  if (start) return `From ${formatOrganisationDate(start)}`
  return '—'
}

function Tile({ label, value, tone, sub, testId }: { label: string; value: React.ReactNode; tone?: 'warning'; sub?: string; testId: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-3 shadow-sm" data-testid={testId}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('mt-1 text-2xl font-semibold tabular-nums', tone === 'warning' && 'text-warning')}>{value}</div>
      {sub ? <div className="text-xs text-muted-foreground">{sub}</div> : null}
    </div>
  )
}

/** One key question: how many of its statements have evidence, and each statement to pick. */
function KeyQuestionCard({
  kq,
  selected,
  onSelect,
}: {
  kq: OverviewKeyQuestion
  selected: string | null
  onSelect: (statementId: string) => void
}) {
  const pct = kq.statementCount ? (kq.coveredCount / kq.statementCount) * 100 : 0
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm" data-testid="cqc-evidence-kq">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{kq.title}</h3>
        <span className="text-xs text-muted-foreground">
          {kq.coveredCount} of {kq.statementCount} with evidence
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', pct === 100 ? 'bg-primary' : 'bg-warning')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="mt-2 space-y-0.5">
        {kq.statements.map(s => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              aria-pressed={selected === s.id}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors',
                selected === s.id ? 'bg-primary/10 text-foreground ring-1 ring-primary' : 'hover:bg-muted/50',
              )}
              data-testid="cqc-evidence-statement"
            >
              <span className={cn('min-w-0 truncate', s.gap ? 'text-muted-foreground' : 'text-foreground')}>{s.title}</span>
              <span className="flex shrink-0 items-center gap-1">
                {s.reviewOverdue ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-label={`${s.reviewOverdue} past review date`} />
                ) : null}
                {s.gap ? (
                  <Badge size="sm" variant="warning">
                    No evidence
                  </Badge>
                ) : (
                  <Badge size="sm" variant="success">
                    {s.evidenceCount}
                  </Badge>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function EvidenceTableRow({ e, onOpen }: { e: EvidenceRow; onOpen: () => void }) {
  const current = e.statements.filter(s => s.current)
  return (
    <tr className="border-b border-border align-top last:border-0 hover:bg-muted/30" data-testid="cqc-evidence-row">
      <td className="min-w-[16rem] px-3 py-2.5">
        <button
          type="button"
          onClick={onOpen}
          className="text-left font-medium text-foreground hover:text-primary hover:underline"
          data-testid="cqc-evidence-open"
        >
          {e.title}
        </button>
        {e.summary ? <div className="line-clamp-2 text-xs text-muted-foreground">{e.summary}</div> : null}
        {e.source?.kind === 'survey' ? (
          <Link
            to="/surveys/$surveyId"
            params={{ surveyId: e.source.surveyId }}
            className="text-xs font-medium text-primary hover:underline"
          >
            Open the survey
          </Link>
        ) : null}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-xs">
        <div className="text-foreground">{SOURCE_LABEL[e.sourceType] ?? e.sourceType}</div>
        <div className="text-muted-foreground">{CATEGORY_LABEL[e.categoryCode] ?? e.categoryTitle}</div>
      </td>
      <td className="px-3 py-2.5 text-xs">
        <div className="flex max-w-[16rem] flex-wrap gap-1">
          {current.slice(0, 2).map(s => (
            <Badge key={s.id} size="sm" variant="outline" title={`${s.keyQuestionTitle}: ${s.title}`}>
              {s.title}
            </Badge>
          ))}
          {current.length > 2 ? (
            <Badge size="sm" variant="secondary" title={current.slice(2).map(s => s.title).join(', ')}>
              +{current.length - 2}
            </Badge>
          ) : null}
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-foreground">{periodLabel(e.periodStart, e.periodEnd)}</td>
      <td className="px-3 py-2.5 text-xs text-foreground">
        {e.locations.length ? e.locations.map(l => l.name).join(', ') : 'Whole organisation'}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-xs">
        {e.status !== 'CURRENT' ? (
          <Badge size="sm" variant="secondary">
            {e.status === 'SUPERSEDED' ? 'Superseded' : 'Archived'}
          </Badge>
        ) : e.reviewDueAt ? (
          <span className={cn(e.reviewOverdue ? 'font-medium text-warning' : 'text-foreground')}>
            {formatOrganisationDate(e.reviewDueAt)}
            {e.reviewOverdue ? <span className="block text-[11px]">Overdue</span> : null}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">
        {e.attachmentCount ? (
          <span className="inline-flex items-center gap-1" aria-label={`${e.attachmentCount} files`}>
            <Paperclip className="h-3.5 w-3.5" aria-hidden />
            {e.attachmentCount}
          </span>
        ) : (
          '—'
        )}
      </td>
    </tr>
  )
}

/** Governance → CQC evidence: what is kept for each quality statement, the gaps, and every piece of evidence. */
export default function CqcEvidencePage() {
  const canPack = useCanDownloadEvidencePack()
  const canManage = useAuthStore(s => s.can('cqc_evidence.manage'))
  // ?add=<statementId> (from a mock inspection) opens "Add evidence" for that statement.
  const routeSearch = useSearch({ strict: false }) as { add?: string; from?: string }
  const [form, setForm] = React.useState<{ evidence: EvidenceDetail | null; statementIds: string[] } | null>(
    routeSearch.add && canManage ? { evidence: null, statementIds: [routeSearch.add] } : null,
  )
  const [openId, setOpenId] = React.useState<string | null>(null)
  const { wholeOrg, options } = useBranchOptions(true)
  const [locationId, setLocationId] = React.useState('')
  const [statementId, setStatementId] = React.useState<string | null>(null)
  const [keyQuestion, setKeyQuestion] = React.useState('')
  const [sourceType, setSourceType] = React.useState('')
  const [categoryCode, setCategoryCode] = React.useState('')
  const [status, setStatus] = React.useState<CqcEvidenceStatus | 'ALL' | ''>('')
  const [search, setSearch] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [packOpen, setPackOpen] = React.useState(false)

  const overview = useEvidenceOverview(locationId || undefined)
  const list = useEvidenceList({
    page,
    limit: PAGE_SIZE,
    locationId: locationId || undefined,
    statementId: statementId ?? undefined,
    keyQuestion: statementId ? undefined : keyQuestion || undefined,
    sourceType: sourceType || undefined,
    categoryCode: categoryCode || undefined,
    status: status || undefined,
    search: search.trim() || undefined,
  })
  // Back to the first page whenever what is listed changes.
  React.useEffect(() => setPage(1), [locationId, statementId, keyQuestion, sourceType, categoryCode, status, search])

  const o = overview.data
  const selected = statementId ? o?.keyQuestions.flatMap(k => k.statements).find(s => s.id === statementId) : undefined
  const rows = list.data?.rows ?? []
  const meta = list.data?.meta
  const error = (q: { error: unknown }, fallback: string) =>
    q.error instanceof ApiError ? q.error.message : q.error ? fallback : null
  const overviewError = error(overview, 'Could not load the overview.')
  const listError = error(list, 'Could not load the evidence.')

  return (
    <div className="flex flex-col gap-4" data-testid="cqc-evidence-page">
      <PageHeader
        title="CQC evidence"
        description="What you keep to show the CQC, for each quality statement, and where the gaps are."
        icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden />}
        info={HELP.page}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Governance' }, { label: 'CQC evidence' }]}
        actions={[
          ...(canPack
            ? [
                {
                  label: 'Evidence pack',
                  onClick: () => setPackOpen(true),
                  icon: <FileArchive className="h-4 w-4" />,
                  variant: 'outline' as const,
                },
              ]
            : []),
          ...(canManage
            ? [
                {
                  label: 'Add evidence',
                  onClick: () => setForm({ evidence: null, statementIds: statementId ? [statementId] : [] }),
                  icon: <PlusCircle className="h-4 w-4" />,
                },
              ]
            : []),
        ]}
      />

      {routeSearch.from ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm"
          data-testid="cqc-evidence-from-inspection"
        >
          <span className="text-foreground">
            You came here from a mock inspection. When you have added the evidence, go back and press{' '}
            <b>Refresh evidence</b> so the inspection includes it.
          </span>
          <Link
            to="/governance/mock-inspections/$inspectionId"
            params={{ inspectionId: routeSearch.from }}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            data-testid="cqc-evidence-back-to-inspection"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to the mock inspection
          </Link>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="cqc-evidence-branch" className="text-xs font-medium text-muted-foreground">
          Service
        </label>
        <InfoTip label="Service">{HELP.branch}</InfoTip>
        <select
          id="cqc-evidence-branch"
          className={`${feedbackSelectClass} max-w-[18rem]`}
          value={locationId}
          onChange={e => setLocationId(e.target.value)}
          data-testid="cqc-evidence-branch"
        >
          <option value="">{wholeOrg ? 'Every branch' : 'All my branches'}</option>
          {options.map(b => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      {overviewError ? <p className="text-sm text-destructive">{overviewError}</p> : null}

      <section className="space-y-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-foreground">At a glance</h2>
          <InfoTip label="At a glance">{HELP.totals}</InfoTip>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile
            label="Statements with evidence"
            value={o ? `${o.totals.covered} / ${o.totals.statements}` : '–'}
            testId="cqc-evidence-covered"
          />
          <Tile
            label="Gaps"
            value={o?.totals.gaps ?? '–'}
            tone={o?.totals.gaps ? 'warning' : undefined}
            sub="statements with no evidence"
            testId="cqc-evidence-gaps"
          />
          <Tile label="Current evidence" value={o?.totals.currentEvidence ?? '–'} testId="cqc-evidence-count" />
          <Tile
            label="Review overdue"
            value={o?.totals.reviewOverdue ?? '–'}
            tone={o?.totals.reviewOverdue ? 'warning' : undefined}
            testId="cqc-evidence-overdue"
          />
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-foreground">By key question</h2>
          <InfoTip label="By key question">{HELP.keyQuestions}</InfoTip>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {overview.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            o?.keyQuestions.map(k => (
              <KeyQuestionCard
                key={k.id}
                kq={k}
                selected={statementId}
                onSelect={id => setStatementId(cur => (cur === id ? null : id))}
              />
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm" data-testid="cqc-evidence-list">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-semibold text-foreground">
              {selected ? `Evidence for: ${selected.title}` : 'All evidence'}
            </h2>
            <InfoTip label="Evidence">{HELP.list}</InfoTip>
          </div>
          {selected ? (
            <Button variant="ghost" size="sm" onClick={() => setStatementId(null)} data-testid="cqc-evidence-clear-statement">
              Show every statement
            </Button>
          ) : null}
        </div>

        <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search evidence"
            aria-label="Search evidence"
            data-testid="cqc-evidence-search"
          />
          <select
            className={feedbackSelectClass}
            value={keyQuestion}
            onChange={e => setKeyQuestion(e.target.value)}
            aria-label="Key question"
            disabled={!!statementId}
            data-testid="cqc-evidence-kq-filter"
          >
            <option value="">Every key question</option>
            {o?.keyQuestions.map(k => (
              <option key={k.code} value={k.code}>
                {k.title}
              </option>
            ))}
          </select>
          <select
            className={feedbackSelectClass}
            value={sourceType}
            onChange={e => setSourceType(e.target.value)}
            aria-label="Type"
            data-testid="cqc-evidence-type-filter"
          >
            <option value="">Every type</option>
            {Object.entries(SOURCE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            className={feedbackSelectClass}
            value={categoryCode}
            onChange={e => setCategoryCode(e.target.value)}
            aria-label="Category"
            data-testid="cqc-evidence-category-filter"
          >
            <option value="">Every category</option>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            className={feedbackSelectClass}
            value={status}
            onChange={e => setStatus(e.target.value as CqcEvidenceStatus | 'ALL' | '')}
            aria-label="Status"
            data-testid="cqc-evidence-status-filter"
          >
            <option value="">Current only</option>
            <option value="SUPERSEDED">Superseded</option>
            <option value="ARCHIVED">Archived</option>
            <option value="ALL">All statuses</option>
          </select>
        </div>

        {listError ? <p className="mb-2 text-sm text-destructive">{listError}</p> : null}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm" data-testid="cqc-evidence-table">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                {['Evidence', 'Type', 'Statements', 'Period', 'Covers', 'Review by', 'Files'].map(h => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5 font-medium text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map(e => <EvidenceTableRow key={e.id} e={e} onOpen={() => setOpenId(e.id)} />)
              ) : (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground" data-testid="cqc-evidence-empty">
                    {selected
                      ? 'No evidence for this statement yet. An inspector would ask for some.'
                      : 'No evidence matches these filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {meta && meta.totalPages > 1 ? (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground" data-testid="cqc-evidence-pages">
            <span>
              Page {meta.page} of {meta.totalPages} · {meta.total} pieces of evidence
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        ) : meta ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {meta.total} {meta.total === 1 ? 'piece' : 'pieces'} of evidence
          </p>
        ) : null}
      </section>

      {canManage ? (
        <EvidenceFormDialog
          open={!!form}
          onOpenChange={o => !o && setForm(null)}
          keyQuestions={o?.keyQuestions ?? []}
          evidence={form?.evidence ?? null}
          startStatementIds={form?.statementIds ?? []}
          onSaved={(id, created) => {
            // A new piece of evidence opens, ready for its files.
            if (created) setOpenId(id)
          }}
        />
      ) : null}
      <EvidenceDetailDialog
        id={openId}
        onOpenChange={o => !o && setOpenId(null)}
        onEdit={e => {
          setOpenId(null)
          setForm({ evidence: e, statementIds: [] })
        }}
      />

      {canPack ? (
        <EvidencePackDialog
          open={packOpen}
          onOpenChange={setPackOpen}
          start={{
            locationId: locationId || null,
            ...(selected ? { statement: { id: selected.id, code: selected.code, title: selected.title } } : {}),
          }}
        />
      ) : null}
    </div>
  )
}
