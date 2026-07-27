import * as React from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { useLearningAssignments } from '@/features/learning/hooks/useLearning'
import { LearningStatusBadge } from '@/features/learning/components/LearningStatusBadge'
import { AssignmentWizardDialog } from '@/features/learning/components/AssignmentWizardDialog'
import { useAuthStore } from '@/features/auth/store'

export function AssignmentsPanel() {
  const canManage = useAuthStore(s => s.can('learning.assignments.manage'))
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const [wizardOpen, setWizardOpen] = React.useState(false)

  const query = useLearningAssignments({ page, limit: 20, search: search || undefined })
  const rows = query.data?.rows ?? []
  const meta = query.data?.meta

  return (
    <div className="space-y-4" data-testid="learning-assignments-panel">
      <ContentSectionHeader
        title="Assignments"
        description="Track course assignments across the organisation. Use Assign training for individuals, roles, locations, or work areas."
        action={
          canManage ? (
            <Button size="sm" onClick={() => setWizardOpen(true)}>
              <UserPlus className="mr-1 h-4 w-4" />
              Assign training
            </Button>
          ) : undefined
        }
      />

      <Input
        placeholder="Search assignments…"
        value={search}
        onChange={e => {
          setSearch(e.target.value)
          setPage(1)
        }}
        className="max-w-sm"
      />

      {query.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No assignments found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Employee</th>
                <th className="px-3 py-2">Course</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Assigned</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <div className="font-medium text-foreground">{row.employeeName || '—'}</div>
                    {row.employeeId ? (
                      <div className="font-mono text-[11px] text-muted-foreground">{row.employeeId.slice(0, 8)}…</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-foreground">{row.courseTitle || '—'}</div>
                    {row.courseCode ? (
                      <div className="text-[11px] text-muted-foreground">{row.courseCode}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <LearningStatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.dueAt ? new Date(row.dueAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(row.assignedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {meta.page} of {meta.totalPages}</span>
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

      <AssignmentWizardDialog open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  )
}
