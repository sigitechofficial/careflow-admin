import * as React from 'react'
import { ApiError } from '@/shared/api/api-client'
import { toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { DateInput } from '@/shared/ui/date-time-input'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { feedbackTextareaClass } from '@/features/complaints/components/FeedbackFormDialog'
import { FieldWithInfo } from '@/features/cqc-mock-inspection/components/InfoTip'
import type { AnswerValue } from '../types'
import { useCreateAuditAction } from '../hooks'
import { HELP } from '../help'

export type ActionStandard = { id: string; number: number; text: string; answer: AnswerValue | null; note: string | null }

/** Create an action for an audit, or for one of its standards (shown beside the form with what was found). */
export function AuditActionDialog({
  auditId,
  auditTitle,
  branchName,
  standard,
  open,
  onOpenChange,
}: {
  auditId: string
  auditTitle: string
  branchName: string
  standard: ActionStandard | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const mutation = useCreateAuditAction(auditId)
  const [title, setTitle] = React.useState('')
  const [detail, setDetail] = React.useState('')
  const [dueAt, setDueAt] = React.useState('')
  const [urgent, setUrgent] = React.useState(false)
  const [assignee, setAssignee] = React.useState<ComboboxOption | null>(null)
  const [staffSearch, setStaffSearch] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const staff = useEmployees({ limit: 50, search: staffSearch || undefined }, open)
  const staffOptions = React.useMemo(() => {
    const rows: ComboboxOption[] = (staff.data?.rows ?? []).map(r => ({
      value: r.id,
      label: r.fullName || [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
      description: r.jobTitle?.name ?? undefined,
    }))
    if (assignee && !rows.some(r => r.value === assignee.value)) rows.unshift(assignee)
    return rows
  }, [staff.data, assignee])

  React.useEffect(() => {
    if (!open) return
    setTitle('')
    setDetail('')
    setDueAt('')
    setUrgent(false)
    setAssignee(null)
    setStaffSearch('')
    setError(null)
  }, [open, standard?.id])

  const onSave = async () => {
    if (title.trim().length < 3) return setError('Add a short, clear title.')
    setError(null)
    try {
      await mutation.mutateAsync({
        title: title.trim(),
        detail: detail.trim() || undefined,
        standardId: standard?.id,
        assignedEmployeeId: assignee?.value,
        dueAt: dueAt || undefined,
        urgent,
      })
      toastSuccess('Action created')
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create the action.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl" data-testid="audit-action-dialog">
        <DialogHeader>
          <DialogTitle>Create action</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="grid gap-5 md:grid-cols-[1fr_16rem]">
            <div className="space-y-4">
              <div>
                <label htmlFor="audit-action-title" className="text-sm font-medium text-foreground">
                  Action title
                </label>
                <Input
                  id="audit-action-title"
                  className="mt-1"
                  value={title}
                  maxLength={300}
                  onChange={e => setTitle(e.target.value)}
                  data-testid="audit-action-title"
                />
                <p className="mt-1 text-xs text-muted-foreground">A short, clear title that is easy to understand.</p>
              </div>
              <div>
                <label htmlFor="audit-action-detail" className="text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  id="audit-action-detail"
                  className={`${feedbackTextareaClass} mt-1`}
                  rows={4}
                  value={detail}
                  onChange={e => setDetail(e.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldWithInfo id="audit-action-assignee" label="Assign to" help={HELP.actionStaff}>
                  <Combobox
                    id="audit-action-assignee"
                    value={assignee?.value ?? ''}
                    onChange={id => setAssignee(staffOptions.find(o => o.value === id) ?? null)}
                    options={staffOptions}
                    onSearchChange={setStaffSearch}
                    loading={staff.isLoading}
                    placeholder="Choose a staff member"
                    searchPlaceholder="Search staff…"
                    emptyText="No staff match your search."
                    allowDeselect
                  />
                </FieldWithInfo>
                <div>
                  <label htmlFor="audit-action-due" className="text-sm font-medium text-foreground">
                    Due date
                  </label>
                  <DateInput id="audit-action-due" className="mt-1" value={dueAt} onChange={e => setDueAt(e.target.value)} />
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={urgent}
                      onChange={e => setUrgent(e.target.checked)}
                      data-testid="audit-action-urgent"
                    />
                    Urgent action
                  </label>
                </div>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
            <aside className="space-y-3 rounded-lg bg-muted/40 p-3 text-sm" data-testid="audit-action-context">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Audit</p>
                <p className="text-foreground">{auditTitle}</p>
                <p className="text-xs text-muted-foreground">{branchName}</p>
              </div>
              {standard ? (
                <>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Standard {standard.number}</p>
                    <p className="text-foreground">{standard.text}</p>
                  </div>
                  {standard.note ? (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Findings</p>
                      <p className="whitespace-pre-line text-foreground">{standard.note}</p>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">For the audit as a whole.</p>
              )}
            </aside>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void onSave()} disabled={mutation.isPending} data-testid="audit-action-save">
            {mutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
