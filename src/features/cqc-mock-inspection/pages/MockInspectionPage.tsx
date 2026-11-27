import * as React from 'react'
import { useParams } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle2, Download, FileArchive, RefreshCw, Scale, XCircle } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'
import { useAuthStore } from '@/features/auth/store'
import { PageHeader } from '@/shared/ui/page-elements'
import { Badge } from '@/shared/ui/badge'
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
import type { KeyQuestionResult, MockInspectionDetail } from '../types'
import {
  useCancelMockInspection,
  useCompleteMockInspection,
  useDownloadMockInspectionPdf,
  useMockInspection,
  useRefreshMockEvidence,
} from '../hooks'
import { RATING_LABEL, STATUS_LABEL, ratingVariant, scoreVariant, statusVariant } from '../labels'
import { StatementPanel } from '../components/StatementPanel'
import { ActionControls, ActionsSection, AddActionDialog, type ActionCheck } from '../components/ActionsSection'
import { ComparisonCard } from '../components/ComparisonCard'
import { useSurveysByStatement } from '../components/RelatedSurveys'
import { usePoliciesByStatement } from '../components/RelatedPolicies'
import { InfoTip } from '../components/InfoTip'
import { EvidencePackDialog, useCanDownloadEvidencePack, type EvidencePackStart } from '../components/EvidencePackDialog'
import { HELP } from '../help'

function KeyQuestionCard({
  code,
  title,
  result,
  active,
  onClick,
}: {
  code: string
  title: string
  result: KeyQuestionResult | undefined
  active: boolean
  onClick: () => void
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        data-testid="mock-kq-card"
        className={cn(
          'h-full w-full rounded-lg border bg-card px-3 py-3 text-left shadow-sm transition-colors',
          active ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-muted/30',
        )}
      >
        <div className="pr-5 text-sm font-semibold text-foreground">{title}</div>
        <div className="mt-1.5 min-h-[1.5rem]">
          {result?.rating ? (
            <Badge size="sm" variant={ratingVariant(result.rating)}>
              {RATING_LABEL[result.rating]}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Not scored yet</span>
          )}
        </div>
        <div className="mt-1 text-xs text-muted-foreground tabular-nums">
          {result ? `${result.scoredCount}/${result.statementCount} scored` : ''}
          {result?.percent != null ? ` · ${result.percent}%` : ''}
        </div>
        {result?.limitedFrom ? (
          <div className="mt-1 text-[11px] text-warning">Limited from {RATING_LABEL[result.limitedFrom]} by a low score</div>
        ) : null}
      </button>
      {/* Beside the card button, not inside it: a button cannot hold another button. */}
      <span className="absolute right-2.5 top-3.5">
        <InfoTip label={title}>
          <p>{HELP.keyQuestion[code] ?? title}</p>
          <p className="mt-1.5 text-muted-foreground">{HELP.keyQuestionCard}</p>
        </InfoTip>
      </span>
    </div>
  )
}

function Confirm({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Go back</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function Workspace({ inspection }: { inspection: MockInspectionDetail }) {
  const canManage = useAuthStore(s => s.can('cqc_mock_inspection.manage'))
  const inProgress = inspection.status === 'IN_PROGRESS'
  const editable = canManage && inProgress
  const refresh = useRefreshMockEvidence(inspection.id)
  const complete = useCompleteMockInspection(inspection.id)
  const cancel = useCancelMockInspection(inspection.id)
  const pdf = useDownloadMockInspectionPdf()
  const { byStatement: surveysByStatement } = useSurveysByStatement()
  const { byStatement: policiesByStatement } = usePoliciesByStatement()

  const [kqCode, setKqCode] = React.useState(inspection.keyQuestions[0]?.code ?? '')
  const kq = inspection.keyQuestions.find(k => k.code === kqCode) ?? inspection.keyQuestions[0]
  const [statementId, setStatementId] = React.useState(kq?.statements[0]?.id ?? '')
  const statement = kq?.statements.find(s => s.id === statementId) ?? kq?.statements[0]
  // The statement (and check) a new action is for; undefined = the dialog is closed.
  const [actionFor, setActionFor] = React.useState<{ statementId: string | null; check?: ActionCheck } | undefined>(
    undefined,
  )
  const canPack = useCanDownloadEvidencePack()
  const [pack, setPack] = React.useState<EvidencePackStart | null>(null)
  const [confirm, setConfirm] = React.useState<'complete' | 'cancel' | null>(null)

  const result = inspection.result
  /** Leaves out a key question, so (like CQC) no overall rating. Older results have no flag: treat them as full. */
  const focused = result?.overallApplies === false
  const kqResult = (code: string) => result?.keyQuestions.find(k => k.keyQuestionCode === code)
  const all = inspection.keyQuestions.flatMap(k => k.statements)
  const scored = all.filter(s => s.score !== null).length
  const gaps = all.filter(s => s.gap).length

  const pickKq = (code: string) => {
    setKqCode(code)
    setStatementId(inspection.keyQuestions.find(k => k.code === code)?.statements[0]?.id ?? '')
  }
  /** After saving, move to the next statement not scored yet in this key question. */
  const nextUnscored = () => {
    const list = kq?.statements ?? []
    const at = list.findIndex(s => s.id === statement?.id)
    const next = [...list.slice(at + 1), ...list.slice(0, at)].find(s => s.score === null && s.id !== statement?.id)
    if (next) setStatementId(next.id)
  }

  const run = async (what: 'refresh' | 'complete' | 'cancel') => {
    try {
      if (what === 'refresh') {
        await refresh.mutateAsync()
        toastSuccess('Evidence refreshed', 'Each statement now shows the current CQC evidence. Scores are kept.')
      } else if (what === 'complete') {
        await complete.mutateAsync()
        toastSuccess('Mock inspection completed', 'The ratings are now fixed.')
      } else {
        await cancel.mutateAsync()
        toastSuccess('Mock inspection cancelled')
      }
    } catch (e) {
      toastApiError(e, 'Could not do that')
    }
  }

  const downloadPdf = async () => {
    try {
      await pdf.mutateAsync({ id: inspection.id, title: inspection.title })
    } catch (e) {
      toastApiError(e, 'Could not download the report')
    }
  }

  const actions = [
    {
      label: pdf.isPending ? 'Preparing PDF…' : 'Download PDF',
      onClick: () => void downloadPdf(),
      icon: <Download className="h-4 w-4" />,
      variant: 'outline' as const,
    },
    ...(canPack
      ? [
          {
            label: 'Evidence pack',
            onClick: () => setPack({ locationId: inspection.location?.id ?? null }),
            icon: <FileArchive className="h-4 w-4" />,
            variant: 'outline' as const,
          },
        ]
      : []),
    ...(editable
      ? [
          { label: 'Refresh evidence', onClick: () => void run('refresh'), icon: <RefreshCw className="h-4 w-4" />, variant: 'outline' as const },
          { label: 'Cancel inspection', onClick: () => setConfirm('cancel'), icon: <XCircle className="h-4 w-4" />, variant: 'outline' as const },
          { label: 'Complete', onClick: () => setConfirm('complete'), icon: <CheckCircle2 className="h-4 w-4" /> },
        ]
      : []),
  ]

  return (
    <div className="flex flex-col gap-4" data-testid="mock-inspection-page">
      <PageHeader
        title={inspection.title}
        description={`${inspection.location?.name ?? 'Whole organisation'} · ${inspection.framework.title} v${inspection.framework.version} · started ${formatOrganisationDate(inspection.startedAt)}`}
        icon={<Scale className="h-4 w-4 text-muted-foreground" aria-hidden />}
        info={HELP.page}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Governance' },
          { label: 'Mock CQC inspection', href: '/governance/mock-inspections' },
          { label: inspection.title },
        ]}
        actions={actions}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <span className="inline-flex items-center gap-1.5">
          <Badge variant={statusVariant(inspection.status)}>{STATUS_LABEL[inspection.status]}</Badge>
          <InfoTip label="status">{HELP.status}</InfoTip>
        </span>
        {inspection.template ? (
          <span className="inline-flex items-center gap-1.5 text-sm" data-testid="mock-template-name">
            <span className="text-muted-foreground">Ready-made:</span>
            <span className="font-medium">{inspection.template.title}</span>
            <InfoTip label="ready-made inspection">{HELP.template}</InfoTip>
          </span>
        ) : null}
        <div className="inline-flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">Overall rating: </span>
          {result?.overall ? (
            <Badge variant={ratingVariant(result.overall)} data-testid="mock-overall-rating">
              {RATING_LABEL[result.overall]}
            </Badge>
          ) : focused ? (
            <span className="font-medium" data-testid="mock-overall-rating">
              not given for a focused inspection
            </span>
          ) : (
            <span className="font-medium" data-testid="mock-overall-rating">
              when every statement is scored ({scored}/{all.length})
            </span>
          )}
          <InfoTip label="overall rating">{focused ? HELP.overallFocused : HELP.overall}</InfoTip>
        </div>
        {gaps ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-warning">
            <AlertTriangle className="h-4 w-4" />
            <span>
              {gaps} statement{gaps === 1 ? '' : 's'} with no evidence
            </span>
            <InfoTip label="statements with no evidence">{HELP.gaps}</InfoTip>
          </span>
        ) : null}
      </div>

      <div className="-mb-2 flex items-center gap-1.5">
        <h2 className="text-sm font-semibold text-foreground">Key questions</h2>
        <InfoTip label="key questions">{HELP.keyQuestions}</InfoTip>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {inspection.keyQuestions.map(k => (
          <KeyQuestionCard key={k.code} code={k.code} title={k.title} result={kqResult(k.code)} active={k.code === kq?.code} onClick={() => pickKq(k.code)} />
        ))}
      </div>

      {kq && statement ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(14rem,20rem)_1fr]">
          <nav className="rounded-xl border border-border bg-card p-2 shadow-sm" aria-label={`${kq.title} quality statements`}>
            <div className="flex items-center gap-1.5 px-2.5 pb-1.5 pt-1">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {kq.title}: quality statements
              </h2>
              <InfoTip label="quality statements">{HELP.statements}</InfoTip>
            </div>
            <ul className="space-y-1">
              {kq.statements.map(s => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setStatementId(s.id)}
                    aria-current={s.id === statement.id ? 'true' : undefined}
                    data-testid="mock-statement-item"
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm',
                      s.id === statement.id ? 'bg-primary/10 font-medium text-foreground' : 'hover:bg-muted/40',
                    )}
                  >
                    <span className="min-w-0 truncate">{s.title}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {s.gap ? <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-label="No evidence" /> : null}
                      <Badge size="sm" variant={scoreVariant(s.score)}>
                        {s.score ?? '–'}
                      </Badge>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <StatementPanel
              key={statement.id}
              inspectionId={inspection.id}
              statement={statement}
              scale={inspection.scale}
              checkScoring={inspection.checkScoring}
              editable={editable}
              onAddAction={() => setActionFor({ statementId: statement.id })}
              actions={inspection.actions.filter(a => a.statementId === statement.id)}
              onCheckAction={
                canManage && inspection.status !== 'CANCELLED'
                  ? check => setActionFor({ statementId: statement.id, check })
                  : undefined
              }
              actionControls={
                canManage && inspection.status !== 'CANCELLED'
                  ? a => <ActionControls inspection={inspection} action={a} />
                  : undefined
              }
              onSaved={nextUnscored}
              surveys={surveysByStatement[statement.code]}
              policies={policiesByStatement[statement.code]}
              onEvidencePack={
                canPack
                  ? () =>
                      setPack({
                        statement: { id: statement.id, code: statement.code, title: statement.title },
                        locationId: inspection.location?.id ?? null,
                      })
                  : undefined
              }
            />
          </div>
        </div>
      ) : null}

      <ComparisonCard inspectionId={inspection.id} />

      <ActionsSection
        inspection={inspection}
        canEdit={canManage && inspection.status !== 'CANCELLED'}
        onAdd={() => setActionFor({ statementId: null })}
      />

      <AddActionDialog
        inspection={inspection}
        statementId={actionFor?.statementId ?? null}
        check={actionFor?.check}
        open={actionFor !== undefined}
        onOpenChange={o => {
          if (!o) setActionFor(undefined)
        }}
      />
      {canPack ? (
        <EvidencePackDialog open={pack !== null} onOpenChange={o => !o && setPack(null)} start={pack ?? undefined} />
      ) : null}
      <Confirm
        open={confirm === 'complete'}
        onOpenChange={o => !o && setConfirm(null)}
        title="Complete this mock inspection?"
        description={
          scored < all.length
            ? `${all.length - scored} statement(s) are not scored yet. Score every statement before completing.`
            : `The ${focused ? 'key question ratings' : 'ratings'} will be fixed and scores can no longer change. You can still add and tick off actions.`
        }
        confirmLabel="Complete"
        onConfirm={() => void run('complete')}
      />
      <Confirm
        open={confirm === 'cancel'}
        onOpenChange={o => !o && setConfirm(null)}
        title="Cancel this mock inspection?"
        description="It stays in the list as cancelled, and can no longer be scored."
        confirmLabel="Cancel inspection"
        onConfirm={() => void run('cancel')}
      />
    </div>
  )
}

/** Governance → Mock CQC inspection → one inspection. */
export default function MockInspectionPage() {
  const { inspectionId } = useParams({ strict: false }) as { inspectionId: string }
  const query = useMockInspection(inspectionId)
  if (query.isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>
  if (query.error || !query.data) {
    return (
      <p className="p-6 text-sm text-destructive">
        {query.error instanceof ApiError ? query.error.message : 'Could not load the mock inspection.'}
      </p>
    )
  }
  return <Workspace inspection={query.data} />
}
