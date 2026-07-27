import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import {
  useLearningReportAssignments,
  useLearningReportCompliance,
  useLearningReportCompletions,
} from '@/features/learning/hooks/useLearning'
import { LearningStatusBadge } from '@/features/learning/components/LearningStatusBadge'

type ReportTab = 'assignments' | 'completions' | 'compliance'

export function LearningReportsPanel() {
  const [tab, setTab] = React.useState<ReportTab>('assignments')
  const [page, setPage] = React.useState(1)

  const assignmentsQuery = useLearningReportAssignments({ page, limit: 20 })
  const completionsQuery = useLearningReportCompletions({ page, limit: 20 })
  const complianceQuery = useLearningReportCompliance({ page, limit: 20 })

  const activeQuery =
    tab === 'assignments' ? assignmentsQuery : tab === 'completions' ? completionsQuery : complianceQuery
  const rows = activeQuery.data?.rows ?? []
  const meta = activeQuery.data?.meta

  return (
    <div className="space-y-4" data-testid="learning-reports-panel">
      <ContentSectionHeader
        title="Reports"
        description="Assignment, completion, and compliance reporting views."
      />

      <div className="flex flex-wrap gap-2">
        {(['assignments', 'completions', 'compliance'] as ReportTab[]).map(id => (
          <Button
            key={id}
            size="sm"
            variant={tab === id ? 'default' : 'outline'}
            onClick={() => {
              setTab(id)
              setPage(1)
            }}
          >
            {id.charAt(0).toUpperCase() + id.slice(1)}
          </Button>
        ))}
      </div>

      {activeQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No report rows for this view.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {tab === 'compliance' ? (
                  <>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Course</th>
                    <th className="px-3 py-2">Status</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Course</th>
                    <th className="px-3 py-2">Status</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const r = row as Record<string, unknown>
                const status = String(r.status ?? r.complianceStatus ?? r.courseCompletionStatus ?? '—')
                return (
                  <tr key={String(r.id ?? idx)} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{String(r.employeeId ?? '—')}</td>
                    <td className="px-3 py-2 font-mono text-xs">{String(r.courseId ?? '—')}</td>
                    <td className="px-3 py-2">
                      <LearningStatusBadge status={status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="outline" disabled={!meta.hasNextPage} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
