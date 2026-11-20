import * as React from 'react'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'
import { feedbackSelectClass, feedbackTextareaClass } from '@/features/complaints/components/FeedbackFormDialog'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import type { CheckAnswer, MockInspectionDetail } from '../types'
import { useCreateMockAction, useUpdateMockAction } from '../hooks'
import { HELP } from '../help'
import { FieldWithInfo, InfoTip } from './InfoTip'

/** The check of a statement an action is created from. */
export type ActionCheck = { text: string; answer: CheckAnswer | null; note: string | null }

const ANSWER_BADGE: Record<CheckAnswer, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  MET: { label: 'Met', variant: 'success' },
  PARTIALLY_MET: { label: 'Partially met', variant: 'warning' },
  NOT_MET: { label: 'Not met', variant: 'destructive' },
}

export function AddActionDialog({
  inspection,
  statementId,
  check,
  open,
  onOpenChange,
}: {
  inspection: MockInspectionDetail
  statementId: string | null
  /** When set, the action is for this check of the statement. */
  check?: ActionCheck
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const mutation = useCreateMockAction(inspection.id)
  const statements = inspection.keyQuestions.flatMap(k => k.statements.map(s => ({ ...s, kq: k.title })))
  const [title, setTitle] = React.useState('')
  const [detail, setDetail] = React.useState('')
  const [forStatement, setForStatement] = React.useState('')
  const [dueAt, setDueAt] = React.useState('')
  const [assignee, setAssignee] = React.useState<ComboboxOption | null>(null)
  const [staffSearch, setStaffSearch] = React.useState('')
  const staffQuery = useEmployees({ limit: 50, search: staffSearch || undefined }, open)
  const staffOptions = React.useMemo(() => {
    const rows: ComboboxOption[] = (staffQuery.data?.rows ?? []).map(r => ({
      value: r.id,
      label: r.fullName || [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
      description: r.jobTitle?.name ?? undefined,
    }))
    // Keep the chosen person listed when a later search does not return them.
    if (assignee && !rows.some(r => r.value === assignee.value)) rows.unshift(assignee)
    return rows
  }, [staffQuery.data, assignee])
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setTitle('')
    setDetail('')
    setForStatement(statementId ?? '')
    setDueAt('')
    setAssignee(null)
    setStaffSearch('')
    setError(null)
  }, [open, statementId])

  const onSave = async () => {
    if (title.trim().length < 3) return setError('Say what needs to be done.')
    setError(null)
    try {
      await mutation.mutateAsync({
        title: title.trim(),
        detail: detail.trim() || undefined,
        statementId: forStatement || undefined,
        checkText: check ? check.text : undefined,
        assignedEmployeeId: assignee?.value,
        dueAt: dueAt || undefined,
      })
      toastSuccess('Action added')
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add the action.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="mock-action-dialog">
        <DialogHeader>
          <DialogTitle>Add an improvement action</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {check ? (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm" data-testid="mock-action-check">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Quality statement</p>
                <p className="text-foreground">{statements.find(s => s.id === statementId)?.title ?? 'Quality statement'}</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  Check
                  {check.answer ? (
                    <Badge size="sm" variant={ANSWER_BADGE[check.answer].variant}>
                      {ANSWER_BADGE[check.answer].label}
                    </Badge>
                  ) : null}
                </p>
                <p className="text-foreground">{check.text}</p>
              </div>
              {check.note ? (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Findings</p>
                  <p className="whitespace-pre-line text-foreground">{check.note}</p>
                </div>
              ) : null}
            </div>
          ) : null}
          <FieldWithInfo id="mock-action-title" label="What needs to be done" help={HELP.actionTitle}>
            <Input id="mock-action-title" value={title} onChange={e => setTitle(e.target.value)} data-testid="mock-action-title" />
          </FieldWithInfo>
          {check ? null : (
          <FieldWithInfo id="mock-action-statement" label="Quality statement" help={HELP.actionStatement}>
            <select
              id="mock-action-statement"
              className={feedbackSelectClass}
              value={forStatement}
              onChange={e => setForStatement(e.target.value)}
            >
              <option value="">Not about one statement</option>
              {statements.map(s => (
                <option key={s.id} value={s.id}>
                  {s.kq}: {s.title}
                </option>
              ))}
            </select>
          </FieldWithInfo>
          )}
          <FieldWithInfo id="mock-action-assignee" label="Assign to (optional)" help={HELP.actionAssignee}>
            <Combobox
              id="mock-action-assignee"
              value={assignee?.value ?? ''}
              onChange={id => setAssignee(staffOptions.find(o => o.value === id) ?? null)}
              options={staffOptions}
              onSearchChange={setStaffSearch}
              loading={staffQuery.isLoading}
              placeholder="Choose a staff member"
              searchPlaceholder="Search staff…"
              emptyText="No staff match your search."
              allowDeselect
            />
          </FieldWithInfo>
          <FieldWithInfo id="mock-action-due" label="Due by (optional)" help={HELP.actionDue}>
            <Input id="mock-action-due" type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} />
          </FieldWithInfo>
          <FieldWithInfo id="mock-action-detail" label="Details (optional)" help={HELP.actionDetail}>
            <textarea
              id="mock-action-detail"
              className={feedbackTextareaClass}
              rows={3}
              value={detail}
              onChange={e => setDetail(e.target.value)}
            />
          </FieldWithInfo>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void onSave()} disabled={mutation.isPending} data-testid="mock-action-save">
            {mutation.isPending ? 'Adding…' : 'Add action'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Improvement actions from the inspection; they can be added and ticked off after it is completed. */
export function ActionsSection({
  inspection,
  canEdit,
  onAdd,
}: {
  inspection: MockInspectionDetail
  canEdit: boolean
  onAdd: () => void
}) {
  const mutation = useUpdateMockAction(inspection.id)
  const titles = new Map(inspection.keyQuestions.flatMap(k => k.statements.map(s => [s.id, s.title] as const)))
  const toggle = async (actionId: string, done: boolean) => {
    try {
      await mutation.mutateAsync({ actionId, body: { status: done ? 'DONE' : 'OPEN' } })
    } catch (e) {
      toastApiError(e, 'Could not update the action')
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm" data-testid="mock-actions">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-foreground">Improvement actions</h2>
          <InfoTip label="improvement actions">{HELP.actions}</InfoTip>
        </div>
        {canEdit ? (
          <Button size="sm" variant="outline" onClick={onAdd} data-testid="mock-add-action">
            Add action
          </Button>
        ) : null}
      </div>
      {inspection.actions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No actions yet. Add one for any statement scored 1 or 2, so the gap is closed before CQC visits.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {inspection.actions.map(a => (
            <li key={a.id} className="flex items-start justify-between gap-3 py-2.5" data-testid="mock-action-row">
              <label className="flex min-w-0 items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={a.status === 'DONE'}
                  disabled={!canEdit || mutation.isPending}
                  onChange={e => void toggle(a.id, e.target.checked)}
                  aria-label={`Done: ${a.title}`}
                />
                <span className="min-w-0">
                  <span className={a.status === 'DONE' ? 'text-muted-foreground line-through' : 'font-medium text-foreground'}>
                    {a.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {a.statementId ? titles.get(a.statementId) ?? 'Quality statement' : 'General'}
                    {a.assignedEmployee ? ` · For ${a.assignedEmployee.name ?? 'a staff member'}` : ''}
                    {a.detail ? ` · ${a.detail}` : ''}
                  </span>
                </span>
              </label>
              <div className="shrink-0 text-right text-xs">
                {a.status === 'DONE' ? (
                  <Badge size="sm" variant="success">
                    Done {a.completedAt ? formatOrganisationDate(a.completedAt) : ''}
                  </Badge>
                ) : a.dueAt ? (
                  <span className="text-muted-foreground">Due {formatOrganisationDate(a.dueAt)}</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
