import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'
import { fetchInitialAssessmentAnswers } from '@/features/service-users/initial-assessment/api'
import { buildCompareRows } from '@/features/service-users/initial-assessment/utils/compare-answers'
import { InitialAssessmentSubmissionDetailSheet } from '@/features/service-users/initial-assessment/components/InitialAssessmentSubmissionDetailSheet'
import type {
  InitialAssessmentSection,
  InitialAssessmentSubmission,
  InitialAssessmentStatus,
} from '@/features/service-users/initial-assessment/types'

const STATUS_CLASS: Record<InitialAssessmentStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  IN_PROGRESS: 'bg-amber-100 text-amber-900',
  SUBMITTED: 'bg-sky-100 text-sky-900',
  REVIEWED: 'bg-emerald-100 text-emerald-900',
  ARCHIVED: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-destructive/15 text-destructive',
}

type Props = {
  serviceUserId: string
  submissions: InitialAssessmentSubmission[]
  sections: InitialAssessmentSection[]
  activeId: string | null
  onSelect: (id: string) => void
}

export function InitialAssessmentVersionsPanel({
  serviceUserId,
  submissions,
  sections,
  activeId,
  onSelect,
}: Props) {
  const ordered = React.useMemo(
    () => [...submissions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [submissions],
  )

  const [compareA, setCompareA] = React.useState('')
  const [compareB, setCompareB] = React.useState('')
  const [compareOpen, setCompareOpen] = React.useState(false)
  const [detailId, setDetailId] = React.useState<string | null>(null)

  const detailSubmission = React.useMemo(
    () => ordered.find((s) => s.id === detailId) ?? null,
    [ordered, detailId],
  )
  const detailSequence = detailId ? ordered.findIndex((s) => s.id === detailId) + 1 : undefined

  React.useEffect(() => {
    if (ordered.length >= 2) {
      setCompareA(ordered[ordered.length - 2]?.id ?? '')
      setCompareB(ordered[ordered.length - 1]?.id ?? '')
    } else if (ordered.length === 1) {
      const only = ordered[0]
      if (only) {
        setCompareA(only.id)
        setCompareB(only.id)
      }
    }
  }, [ordered])

  const answersAQuery = useQuery({
    queryKey: ['ia-compare', serviceUserId, compareA],
    queryFn: () => fetchInitialAssessmentAnswers(serviceUserId, compareA),
    enabled: compareOpen && Boolean(serviceUserId && compareA),
  })
  const answersBQuery = useQuery({
    queryKey: ['ia-compare', serviceUserId, compareB],
    queryFn: () => fetchInitialAssessmentAnswers(serviceUserId, compareB),
    enabled: compareOpen && Boolean(serviceUserId && compareB),
  })

  const compareRows =
    compareOpen &&
    compareA &&
    compareB &&
    compareA !== compareB &&
    answersAQuery.data &&
    answersBQuery.data
      ? buildCompareRows(sections, answersAQuery.data, answersBQuery.data)
      : []

  const seqOf = (id: string) => {
    const i = ordered.findIndex((s) => s.id === id)
    return i >= 0 ? i + 1 : '—'
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-2">Seq</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Form</th>
              <th className="px-3 py-2">Submitted</th>
              <th className="px-3 py-2">Reviewed</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {ordered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  No submissions yet.
                </td>
              </tr>
            ) : (
              ordered.map((s, idx) => (
                <tr
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    'cursor-pointer border-b transition-colors hover:bg-muted/40',
                    (activeId === s.id || detailId === s.id) && 'bg-teal-50/60 dark:bg-teal-950/20',
                  )}
                  onClick={() => setDetailId(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setDetailId(s.id)
                    }
                  }}
                >
                  <td className="px-3 py-2">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold uppercase', STATUS_CLASS[s.status])}>
                      {s.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {s.template?.name ?? '—'} v{s.template?.version ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {s.reviewedAt ? new Date(s.reviewedAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect(s.id)
                      }}
                    >
                      Open
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <InitialAssessmentSubmissionDetailSheet
        open={detailId != null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null)
        }}
        submission={detailSubmission}
        sequence={detailSequence && detailSequence > 0 ? detailSequence : undefined}
        activeId={activeId}
        onOpenInForm={onSelect}
      />

      {ordered.length >= 2 ? (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h4 className="text-sm font-semibold">Compare assessments</h4>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Select value={compareA || '_'} onValueChange={(v) => setCompareA(v === '_' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Earlier" />
              </SelectTrigger>
              <SelectContent>
                {ordered.map((s, idx) => (
                  <SelectItem key={s.id} value={s.id}>
                    #{idx + 1} — {s.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">compared with</span>
            <Select value={compareB || '_'} onValueChange={(v) => setCompareB(v === '_' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Later" />
              </SelectTrigger>
              <SelectContent>
                {ordered.map((s, idx) => (
                  <SelectItem key={s.id} value={s.id}>
                    #{idx + 1} — {s.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              onClick={() => setCompareOpen(true)}
              disabled={!compareA || !compareB || compareA === compareB}
            >
              Run comparison
            </Button>
          </div>

          {compareOpen ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-border">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
                <span className="text-sm font-semibold">
                  Comparing #{seqOf(compareA)} vs #{seqOf(compareB)}
                </span>
                {(answersAQuery.isLoading || answersBQuery.isLoading) && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">
                  {compareRows.length} difference{compareRows.length === 1 ? '' : 's'}
                </span>
              </div>
              {compareRows.length === 0 && !answersAQuery.isLoading ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">No answer differences for this pair.</p>
              ) : (
                <div className="max-h-80 overflow-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                        <th className="px-3 py-2">Ref</th>
                        <th className="px-3 py-2">Question</th>
                        <th className="px-3 py-2">#{seqOf(compareA)}</th>
                        <th className="px-3 py-2">#{seqOf(compareB)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compareRows.map((r) => (
                        <tr key={r.specRef + r.questionText} className="border-b bg-amber-50/50">
                          <td className="px-3 py-2 font-mono text-xs">{r.specRef}</td>
                          <td className="px-3 py-2">{r.questionText}</td>
                          <td className="px-3 py-2 font-mono text-xs">{r.valueA}</td>
                          <td className="px-3 py-2 font-mono text-xs text-amber-800">{r.valueB}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
