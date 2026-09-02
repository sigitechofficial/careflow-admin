import * as React from 'react'
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type {
  VisitOutcomeArea,
  VisitOutcomeReasonRow,
  VisitOutcomeRow,
} from '@/features/settings/api/lookups-admin-api'
import {
  useCreateVisitOutcomeReason,
  useDeleteVisitOutcomeReason,
  useUpdateVisitOutcomeReason,
  useVisitOutcomes,
} from '@/features/settings/hooks/useLookupsAdmin'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'
import { cn } from '@/shared/lib/utils'

const AREAS: { id: VisitOutcomeArea; label: string }[] = [
  { id: 'MEDICATION', label: 'Medication' },
  { id: 'TASK', label: 'Tasks' },
  { id: 'OBSERVATION', label: 'Observations' },
]

function OutcomeAccordion({
  outcome,
  open,
  canManage,
  saving,
  onToggle,
  onAdd,
  onSave,
  onDelete,
}: {
  outcome: VisitOutcomeRow
  open: boolean
  canManage: boolean
  saving: boolean
  onToggle: () => void
  onAdd: (body: { label: string; requiresNotes: boolean }) => Promise<void>
  onSave: (id: string, body: { label: string; requiresNotes: boolean }) => Promise<void>
  onDelete: (row: VisitOutcomeReasonRow) => Promise<void>
}) {
  const [label, setLabel] = React.useState('')
  const [requiresNotes, setRequiresNotes] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editLabel, setEditLabel] = React.useState('')
  const [editRequiresNotes, setEditRequiresNotes] = React.useState(false)

  const cancelEdit = () => {
    setEditingId(null)
    setEditLabel('')
    setEditRequiresNotes(false)
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 bg-muted/40 px-3 py-2.5 text-left"
        onClick={onToggle}
      >
        <div>
          <p className="text-sm font-semibold text-foreground">
            {outcome.label}
            <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
              {outcome.code}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {AREAS.find(a => a.id === outcome.area)?.label ?? outcome.area}
            {outcome.area === 'MEDICATION' ? ' · from MAR status codes' : ''}
            {outcome.allowsReasons
              ? ` · ${outcome.reasons.length} reason${outcome.reasons.length === 1 ? '' : 's'}`
              : ' · no reason list'}
          </p>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div className="space-y-3 border-t border-border p-3">
          {!outcome.allowsReasons ? (
            <p className="text-sm text-muted-foreground">
              This outcome does not use a reason list on the carer app.
            </p>
          ) : (
            <>
              {canManage ? (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[220px] flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground">Reason</label>
                    <Input
                      value={label}
                      onChange={e => setLabel(e.target.value)}
                      placeholder={`e.g. reason for ${outcome.label.toLowerCase()}`}
                      disabled={saving}
                    />
                  </div>
                  <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={requiresNotes}
                      onChange={e => setRequiresNotes(e.target.checked)}
                      disabled={saving}
                    />
                    Notes required
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    disabled={saving || !label.trim()}
                    onClick={() => {
                      void onAdd({ label: label.trim(), requiresNotes }).then(() => {
                        setLabel('')
                        setRequiresNotes(false)
                      })
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add
                  </Button>
                </div>
              ) : null}

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 font-medium">Reason</th>
                    <th className="py-2 font-medium">Notes</th>
                    {canManage ? <th className="w-28 py-2 font-medium">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {outcome.reasons.length === 0 ? (
                    <tr>
                      <td
                        colSpan={canManage ? 3 : 2}
                        className="py-6 text-center text-muted-foreground"
                      >
                        No reasons yet. Add one to show it on the carer app.
                      </td>
                    </tr>
                  ) : (
                    outcome.reasons.map(row =>
                      editingId === row.id ? (
                        <tr key={row.id} className="border-b border-border last:border-0">
                          <td className="py-2 pr-2">
                            <Input
                              value={editLabel}
                              onChange={e => setEditLabel(e.target.value)}
                              className="h-8"
                              autoFocus
                            />
                          </td>
                          <td className="py-2">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={editRequiresNotes}
                                onChange={e => setEditRequiresNotes(e.target.checked)}
                              />
                              Required
                            </label>
                          </td>
                          <td className="py-2">
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={saving || !editLabel.trim()}
                                onClick={() => {
                                  void onSave(row.id, {
                                    label: editLabel.trim(),
                                    requiresNotes: editRequiresNotes,
                                  }).then(cancelEdit)
                                }}
                              >
                                Save
                              </Button>
                              <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
                                Cancel
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={row.id} className="border-b border-border last:border-0">
                          <td className="py-2">{row.label}</td>
                          <td className="py-2 text-muted-foreground">
                            {row.requiresNotes ? 'Required' : '—'}
                          </td>
                          {canManage ? (
                            <td className="py-2">
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingId(row.id)
                                    setEditLabel(row.label)
                                    setEditRequiresNotes(row.requiresNotes)
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={saving}
                                  onClick={() => void onDelete(row)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      ),
                    )
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function VisitOutcomeReasonsSettingsPanel() {
  const canManage = useAuthStore(s => s.can('lookups.manage'))
  const listQuery = useVisitOutcomes()
  const createMutation = useCreateVisitOutcomeReason()
  const updateMutation = useUpdateVisitOutcomeReason()
  const deleteMutation = useDeleteVisitOutcomeReason()

  const [area, setArea] = React.useState<VisitOutcomeArea>('MEDICATION')
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const rows = (listQuery.data ?? []).filter(r => r.area === area)
  const saving =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  const error =
    listQuery.error instanceof ApiError
      ? listQuery.error.message
      : listQuery.error
        ? 'Could not load outcome reasons.'
        : null

  const onAdd = async (outcomeId: string, body: { label: string; requiresNotes: boolean }) => {
    setActionError(null)
    try {
      await createMutation.mutateAsync({ outcomeId, body })
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not add reason.')
      throw e
    }
  }

  const onSave = async (id: string, body: { label: string; requiresNotes: boolean }) => {
    setActionError(null)
    try {
      await updateMutation.mutateAsync({ id, body })
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not update reason.')
      throw e
    }
  }

  const onDelete = async (row: VisitOutcomeReasonRow) => {
    if (!window.confirm(`Remove “${row.label}”?`)) return
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(row.id)
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not delete reason.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Outcome reasons</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Reason lists under each visit outcome. Medication outcomes come from{' '}
          <strong className="font-medium text-foreground">Medication (MAR)</strong> status
          codes — edit labels and colours there. Tasks and Observations are managed here.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {AREAS.map(item => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={area === item.id ? 'default' : 'outline'}
            onClick={() => {
              setArea(item.id)
              setOpenId(null)
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {actionError || error ? (
        <p className="text-sm text-destructive">{actionError ?? error}</p>
      ) : null}

      {area === 'MEDICATION' ? (
        <p className="text-sm text-muted-foreground">
          These rows are the same codes as Settings → Medication (MAR). Add
          reasons here; change the label or colour on the MAR tab.
        </p>
      ) : null}

      {listQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No outcomes for this area yet.</p>
          ) : (
            rows.map(outcome => (
              <OutcomeAccordion
                key={outcome.id}
                outcome={outcome}
                open={openId === outcome.id}
                canManage={canManage}
                saving={saving}
                onToggle={() => setOpenId(current => (current === outcome.id ? null : outcome.id))}
                onAdd={body => onAdd(outcome.id, body)}
                onSave={onSave}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
