import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField } from '@/shared/ui/form-field'
import { Combobox } from '@/shared/ui/combobox'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useIssueManualLearningCertificate,
  useLearningCourses,
} from '@/features/learning/hooks/useLearning'
import { listEmployees } from '@/features/employees/api/employees.api'
import { employeeListRowDisplayName } from '@/features/employees/lib/employee-display-name'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IssueCertificateDialog({ open, onOpenChange }: Props) {
  const issueMut = useIssueManualLearningCertificate()
  const coursesQuery = useLearningCourses({ limit: 100, status: 'PUBLISHED' })
  const employeesQuery = useQuery({
    queryKey: ['learning', 'issue-certificate-employees'],
    queryFn: () => listEmployees({ limit: 200 }),
    enabled: open,
    staleTime: 60_000,
  })

  const [employeeId, setEmployeeId] = React.useState('')
  const [courseId, setCourseId] = React.useState('')
  const [expiresAt, setExpiresAt] = React.useState('')
  const [issueNotes, setIssueNotes] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setEmployeeId('')
    setCourseId('')
    setExpiresAt('')
    setIssueNotes('')
  }, [open])

  const courseOptions = (coursesQuery.data?.rows ?? [])
    .filter(c => c.status === 'PUBLISHED' || c.status === 'ARCHIVED' || !c.status)
    .map(c => ({
      value: c.id,
      label: `${c.title} (${c.code})`,
    }))

  const employeeOptions = (employeesQuery.data?.rows ?? []).map(emp => ({
    value: emp.id,
    label: employeeListRowDisplayName(emp),
  }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId) {
      toastApiError(new Error('Select an employee'))
      return
    }
    if (!courseId) {
      toastApiError(new Error('Select a course'))
      return
    }

    try {
      await issueMut.mutateAsync({
        employeeId,
        courseId,
        expiresAt: expiresAt.trim()
          ? `${expiresAt.trim()}T23:59:59.000Z`
          : undefined,
        issueNotes: issueNotes.trim() || undefined,
      })
      toastSuccess('Certificate issued')
      onOpenChange(false)
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Issue failed'))
    }
  }

  const busy = issueMut.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Issue certificate</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Manually issue a certificate without requiring LMS course completion. Use this for
              recognised prior learning or admin corrections.
            </p>
            <FormField label="Employee" required>
              <Combobox
                value={employeeId}
                onChange={setEmployeeId}
                options={employeeOptions}
                placeholder={employeesQuery.isLoading ? 'Loading employees…' : 'Select employee'}
                disabled={busy || employeesQuery.isLoading}
              />
            </FormField>
            <FormField label="Course" required>
              <Combobox
                value={courseId}
                onChange={setCourseId}
                options={courseOptions}
                placeholder={coursesQuery.isLoading ? 'Loading courses…' : 'Select published course'}
                disabled={busy || coursesQuery.isLoading}
              />
            </FormField>
            <FormField label="Expires on" hint="Leave blank to use the course or organisation default validity.">
              <Input
                type="date"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                disabled={busy}
              />
            </FormField>
            <FormField label="Issue notes" hint="Optional reason for manual issue (kept for audit).">
              <Input
                value={issueNotes}
                onChange={e => setIssueNotes(e.target.value)}
                placeholder="e.g. Prior learning verified by manager"
                disabled={busy}
              />
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !employeeId || !courseId}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Issue certificate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
