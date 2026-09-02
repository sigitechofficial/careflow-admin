import * as React from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type {
  ClockOutEndKind,
  ClockOutEndReasonRow,
} from '@/features/settings/api/lookups-admin-api'
import {
  useClockOutEndReasons,
  useCreateClockOutEndReason,
  useDeleteClockOutEndReason,
  useUpdateClockOutEndReason,
} from '@/features/settings/hooks/useLookupsAdmin'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'

function EndReasonList({
  kind,
  title,
  description,
  placeholder,
  rows,
  canManage,
  saving,
  onAdd,
  onSave,
  onDelete,
}: {
  kind: ClockOutEndKind
  title: string
  description: string
  placeholder: string
  rows: ClockOutEndReasonRow[]
  canManage: boolean
  saving: boolean
  onAdd: (body: { kind: ClockOutEndKind; label: string; requiresNotes: boolean }) => Promise<void>
  onSave: (id: string, body: { label: string; requiresNotes: boolean }) => Promise<void>
  onDelete: (row: ClockOutEndReasonRow) => Promise<void>
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

  const startEdit = (row: ClockOutEndReasonRow) => {
    setEditingId(row.id)
    setEditLabel(row.label)
    setEditRequiresNotes(row.requiresNotes)
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>

      {canManage ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Reason</label>
            <Input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder={placeholder}
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
              void onAdd({
                kind,
                label: label.trim(),
                requiresNotes,
              }).then(() => {
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

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium">Reason</th>
                <th className="px-3 py-2 font-medium">Notes</th>
                {canManage ? <th className="w-28 px-3 py-2 font-medium">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 3 : 2}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No reasons yet. Add one to show it on the carer app clock-out sheet.
                  </td>
                </tr>
              ) : (
                rows.map(row =>
                  editingId === row.id ? (
                    <tr key={row.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <Input
                          value={editLabel}
                          onChange={e => setEditLabel(e.target.value)}
                          className="h-8"
                          autoFocus
                        />
                      </td>
                      <td className="px-3 py-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editRequiresNotes}
                            onChange={e => setEditRequiresNotes(e.target.checked)}
                          />
                          Required
                        </label>
                      </td>
                      <td className="px-3 py-2">
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
                      <td className="px-3 py-2">{row.label}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.requiresNotes ? 'Required' : '—'}
                      </td>
                      {canManage ? (
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(row)}
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
        </div>
      </div>
    </div>
  )
}

export function ClockOutEndReasonsSettingsPanel() {
  const canManage = useAuthStore(s => s.can('lookups.manage'))
  const listQuery = useClockOutEndReasons()
  const createMutation = useCreateClockOutEndReason()
  const updateMutation = useUpdateClockOutEndReason()
  const deleteMutation = useDeleteClockOutEndReason()

  const rows = listQuery.data ?? []
  const early = rows.filter(r => r.kind === 'EARLY')
  const late = rows.filter(r => r.kind === 'LATE')
  const saving =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  const error =
    listQuery.error instanceof ApiError
      ? listQuery.error.message
      : listQuery.error
        ? 'Could not load clock-out reasons.'
        : null
  const [actionError, setActionError] = React.useState<string | null>(null)

  const onAdd = async (body: {
    kind: ClockOutEndKind
    label: string
    requiresNotes: boolean
  }) => {
    setActionError(null)
    try {
      await createMutation.mutateAsync(body)
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not add clock-out reason.')
      throw e
    }
  }

  const onSave = async (
    id: string,
    body: { label: string; requiresNotes: boolean },
  ) => {
    setActionError(null)
    try {
      await updateMutation.mutateAsync({ id, body })
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not update clock-out reason.')
      throw e
    }
  }

  const onDelete = async (row: ClockOutEndReasonRow) => {
    if (!window.confirm(`Remove “${row.label}” from the carer app?`)) return
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(row.id)
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not delete clock-out reason.')
    }
  }

  const displayError = actionError ?? error

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Clock-out end reasons</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Options a carer picks when they clock out earlier or later than the planned end.
          Clock-in arrival reasons stay on the clock-in sheet.
        </p>
      </div>

      {displayError ? <p className="text-sm text-destructive">{displayError}</p> : null}

      {listQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <EndReasonList
            kind="EARLY"
            title="Early clock-out"
            description="Shown when the carer clocks out before the planned end."
            placeholder="e.g. Client asked to finish early"
            rows={early}
            canManage={canManage}
            saving={saving}
            onAdd={onAdd}
            onSave={onSave}
            onDelete={onDelete}
          />
          <EndReasonList
            kind="LATE"
            title="Late clock-out"
            description="Shown when the carer clocks out after the planned end."
            placeholder="e.g. Care took longer than planned"
            rows={late}
            canManage={canManage}
            saving={saving}
            onAdd={onAdd}
            onSave={onSave}
            onDelete={onDelete}
          />
        </>
      )}
    </div>
  )
}
