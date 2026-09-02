import { ExternalLink, Loader2, Pill, RefreshCw } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/shared/ui/button'
import { cn, formatDate } from '@/shared/lib/utils'
import { useServiceUserMedications } from '@/features/service-users/hooks/useServiceUserMedications'
import { findQuestionByFieldKey, isYesAnswer } from '@/features/service-users/initial-assessment/utils/question-lookup'
import {
  IA_CALLOUT_AMBER_CLASS,
  IA_HINT_CLASS,
  IA_SUBSECTION_PANEL_CLASS,
  IA_SUBSECTION_PANEL_HEADER_CLASS,
  IA_SUBSECTION_PANEL_TITLE_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

type Props = {
  serviceUserId: string
  sections: InitialAssessmentSection[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  disabled: boolean
  onMarkVerified: () => void
  /** When true, omit outer panel shell — for embedding in §9.4. */
  embedded?: boolean
}

function formatShortDate(iso: string | null | undefined): string {
  return formatDate(iso)
}

export function InitialAssessmentMedicationListPanel({
  serviceUserId,
  sections,
  draftAnswers,
  disabled,
  onMarkVerified,
  embedded = false,
}: Props) {
  const medsQuery = useServiceUserMedications(serviceUserId, { includeInactive: false })
  const medications = medsQuery.data?.rows ?? []
  const active = medications.filter((m) => m.status === 'ACTIVE' || m.status === 'PAUSED')
  const verifiedQ = sections.flatMap((s) => s.questions).find((q) => q.questionText.toLowerCase().includes('medication list verified'))
  const verified = verifiedQ ? isYesAnswer(draftAnswers[verifiedQ.id]) : false
  const emarQ = findQuestionByFieldKey(sections, 'emarRequired')

  const body = (
    <>
      {!embedded ? (
        <div className={cn(IA_SUBSECTION_PANEL_HEADER_CLASS, 'flex flex-wrap items-start justify-between gap-3')}>
          <div className="flex items-start gap-3">
            <Pill className="mt-0.5 h-5 w-5 shrink-0 text-teal-700 dark:text-teal-300" aria-hidden />
            <div>
              <h3 className={IA_SUBSECTION_PANEL_TITLE_CLASS}>Medication list (from eMAR module)</h3>
              <p className={IA_HINT_CLASS}>
                Read-only view of active prescriptions — configure MAR in the medication module.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={medsQuery.isFetching} onClick={() => void medsQuery.refetch()}>
              <RefreshCw className={cn('mr-2 h-4 w-4', medsQuery.isFetching && 'animate-spin')} />
              Refresh
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to="/service-users/$serviceUserId/medication" params={{ serviceUserId }}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open medication
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
          <p className="text-sm font-medium text-foreground">Active prescriptions (eMAR)</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={medsQuery.isFetching} onClick={() => void medsQuery.refetch()}>
              <RefreshCw className={cn('mr-2 h-4 w-4', medsQuery.isFetching && 'animate-spin')} />
              Refresh
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to="/service-users/$serviceUserId/medication" params={{ serviceUserId }}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open medication
              </Link>
            </Button>
          </div>
        </div>
      )}

      {medsQuery.isLoading ? (
        <div className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading medications…
        </div>
      ) : active.length === 0 ? (
        <div className="space-y-3 px-4 py-6">
          <p className="text-sm text-muted-foreground">
            No active medications on file. Add prescriptions in the medication module before marking the list verified.
          </p>
          {emarQ && isYesAnswer(draftAnswers[emarQ.id]) ? (
            <p className={cn(IA_CALLOUT_AMBER_CLASS, 'text-sm text-amber-950 dark:text-amber-100')}>
              MAR / eMAR is required — an eMAR setup action will be created on submit.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-sm font-semibold uppercase text-muted-foreground">
                <th className="px-3 py-2">Medication</th>
                <th className="px-3 py-2">Dose</th>
                <th className="px-3 py-2">Frequency</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Controlled</th>
              </tr>
            </thead>
            <tbody>
              {active.map((m) => (
                <tr key={m.id} className="border-b align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium">{m.medicationName}</div>
                    {m.strength ? <div className="text-sm text-muted-foreground">{m.strength}</div> : null}
                  </td>
                  <td className="px-3 py-2 text-sm">{m.dose?.trim() || '—'}</td>
                  <td className="px-3 py-2 text-sm">
                    {m.frequency?.name?.trim() || m.frequencyText?.trim() || '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                        m.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                          : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
                      )}
                    >
                      {m.status}
                    </span>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      From {formatShortDate(m.startDate)}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm">{m.isControlledMedication ? 'Yes' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {active.length} active medication{active.length === 1 ? '' : 's'}
          {verified ? ' · List marked verified' : ''}
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled || active.length === 0 || verified}
          onClick={onMarkVerified}
        >
          Mark list verified
        </Button>
      </div>
    </>
  )

  if (embedded) {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-card" data-testid="ia-medication-list">
        {body}
      </div>
    )
  }

  return (
    <section className={IA_SUBSECTION_PANEL_CLASS} data-testid="ia-medication-list">
      {body}
    </section>
  )
}
