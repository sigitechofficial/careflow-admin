import * as React from 'react'
import { Check, Loader2, Plus, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField } from '@/shared/ui/form-field'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useCreateLearningExternalTraining,
  useLearningExternalTraining,
  useRejectLearningExternalTraining,
  useVerifyLearningExternalTraining,
} from '@/features/learning/hooks/useLearning'
import { listEmployees } from '@/features/employees/api/employees.api'
import { employeeListRowDisplayName } from '@/features/employees/lib/employee-display-name'
import { useQuery } from '@tanstack/react-query'
import { Combobox } from '@/shared/ui/combobox'
import type { LearningExternalTrainingInput } from '@/features/learning/types/learning.types'
import { LearningStatusBadge } from '@/features/learning/components/LearningStatusBadge'
import { useAuthStore } from '@/features/auth/store'
import { ApiError } from '@/shared/api/api-client'

export function ExternalTrainingPanel() {
  const canManage = useAuthStore(s => s.can('learning.external_training.manage'))
  const [page, setPage] = React.useState(1)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const createMut = useCreateLearningExternalTraining()
  const verifyMut = useVerifyLearningExternalTraining()
  const rejectMut = useRejectLearningExternalTraining()
  const [form, setForm] = React.useState<LearningExternalTrainingInput>({
    employeeId: '',
    courseName: '',
    completedAt: new Date().toISOString().slice(0, 10),
  })

  const query = useLearningExternalTraining({ page, limit: 20 })
  const employeesQuery = useQuery({
    queryKey: ['learning', 'external-training-employees'],
    queryFn: () => listEmployees({ limit: 200 }),
    enabled: dialogOpen,
  })

  const rows = query.data?.rows ?? []
  const meta = query.data?.meta

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createMut.mutateAsync(form)
      toastSuccess('External training recorded')
      setDialogOpen(false)
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Create failed'))
    }
  }

  return (
    <div className="space-y-4" data-testid="learning-external-training-panel">
      <ContentSectionHeader
        title="External training"
        description="Training completed outside the LMS — verify before counting toward compliance."
        action={
          canManage ? (
            <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="mr-1 h-4 w-4" /> Record training</Button>
          ) : undefined
        }
      />

      {query.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No external training records.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Course</th>
                <th className="px-3 py-2">Employee</th>
                <th className="px-3 py-2">Completed</th>
                <th className="px-3 py-2">Status</th>
                {canManage ? <th className="px-3 py-2 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{row.courseName}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.employeeId}</td>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(row.completedAt).toLocaleDateString()}</td>
                  <td className="px-3 py-2"><LearningStatusBadge status={row.verificationStatus} /></td>
                  {canManage && row.verificationStatus === 'PENDING' ? (
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="icon-sm" variant="ghost" aria-label="Verify" onClick={() => void verifyMut.mutateAsync({ id: row.id }).then(() => toastSuccess('Verified'))}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" aria-label="Reject" onClick={() => void rejectMut.mutateAsync({ id: row.id, notes: 'Rejected by admin' }).then(() => toastSuccess('Rejected'))}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  ) : canManage ? <td className="px-3 py-2" /> : null}
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
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={!meta.hasNextPage} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="md">
          <form onSubmit={onCreate}>
            <DialogHeader><DialogTitle>Record external training</DialogTitle></DialogHeader>
            <DialogBody className="space-y-4">
              <FormField label="Employee" required>
                <Combobox
                  value={form.employeeId}
                  onChange={v => setForm(p => ({ ...p, employeeId: v }))}
                  options={(employeesQuery.data?.rows ?? []).map(emp => ({
                    value: emp.id,
                    label: employeeListRowDisplayName(emp),
                  }))}
                />
              </FormField>
              <FormField label="Course name" required><Input value={form.courseName} onChange={e => setForm(p => ({ ...p, courseName: e.target.value }))} required /></FormField>
              <FormField label="Provider"><Input value={form.trainingProvider ?? ''} onChange={e => setForm(p => ({ ...p, trainingProvider: e.target.value }))} /></FormField>
              <FormField label="Completed" required><Input type="date" value={form.completedAt.slice(0, 10)} onChange={e => setForm(p => ({ ...p, completedAt: e.target.value }))} required /></FormField>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
