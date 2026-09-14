import * as React from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type { LeftAreaAllowReasonRow } from '@/features/settings/api/lookups-admin-api'
import {
  useCreateLeftAreaAllowReason,
  useDeleteLeftAreaAllowReason,
  useLeftAreaAllowReasons,
  useUpdateLeftAreaAllowReason,
} from '@/features/settings/hooks/useLookupsAdmin'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'

const OTHER_CODE = 'OTHER'

export function LeftAreaAllowReasonsSettingsPanel() {
  const canManage = useAuthStore(s => s.can('lookups.manage'))
  const listQuery = useLeftAreaAllowReasons()
  const createMutation = useCreateLeftAreaAllowReason()
  const updateMutation = useUpdateLeftAreaAllowReason()
  const deleteMutation = useDeleteLeftAreaAllowReason()

  const rows = listQuery.data ?? []
  const saving =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  const error =
    listQuery.error instanceof ApiError
      ? listQuery.error.message
      : listQuery.error
        ? 'Could not load left-area allow reasons.'
        : null
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [label, setLabel] = React.useState('')
  const [requiresNotes, setRequiresNotes] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editLabel, setEditLabel] = React.useState('')
  const [editRequiresNotes, setEditRequiresNotes] = React.useState(false)

  const onAdd = async () => {
    setActionError(null)
    try {
      await createMutation.mutateAsync({
        label: label.trim(),
        requiresNotes,
      })
      setLabel('')
      setRequiresNotes(false)
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not add reason.')
    }
  }

  const onSave = async (id: string) => {
    setActionError(null)
    try {
      await updateMutation.mutateAsync({
        id,
        body: { label: editLabel.trim(), requiresNotes: editRequiresNotes },
      })
      setEditingId(null)
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not update reason.')
    }
  }

  const onDelete = async (row: LeftAreaAllowReasonRow) => {
    if (row.code === OTHER_CODE) return
    if (!window.confirm(`Remove “${row.label}” from Left-area allow reasons?`)) return
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(row.id)
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not delete reason.')
    }
  }

  const displayError = actionError ?? error

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Left-area allow reasons</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Reasons the office picks when allowing a carer to continue after leaving the visit
          area. These appear as chips on Allow carer to continue in the exception queue.
        </p>
      </div>

      {displayError ? <p className="text-sm text-destructive">{displayError}</p> : null}

      {canManage ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Reason</label>
            <Input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Accompanying to GP"
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
            onClick={() => void onAdd()}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      ) : null}

      {listQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
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
                      className="px-3 py-6 text-center text-muted-foreground"
                    >
                      No reasons yet.
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
                            disabled={saving}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={row.code === OTHER_CODE ? true : editRequiresNotes}
                              disabled={saving || row.code === OTHER_CODE}
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
                              disabled={saving || !editLabel.trim()}
                              onClick={() => void onSave(row.id)}
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={row.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">
                          {row.label}
                          {row.code === OTHER_CODE ? (
                            <span className="ml-2 text-xs text-muted-foreground">
                              Always last · cannot delete
                            </span>
                          ) : null}
                        </td>
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
                                disabled={saving || row.code === OTHER_CODE}
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
      )}
    </div>
  )
}
