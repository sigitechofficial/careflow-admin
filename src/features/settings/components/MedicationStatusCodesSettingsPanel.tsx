import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'
import {
  useMedicationStatusCodesAdmin,
  useUpdateMedicationStatusCode,
} from '@/features/settings/hooks/useMedicationStatusCodesAdmin'
import { SettingsTablePagination } from '@/features/settings/components/SettingsTablePagination'
import { useClientPagination } from '@/features/settings/hooks/useClientPagination'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import type { MedicationStatusCodeRow } from '@/features/service-users/api/medication-mar.api'

function StatusCodePreview({ row }: { row: MedicationStatusCodeRow }) {
  return (
    <span
      className="inline-flex min-w-[2rem] justify-center rounded px-2 py-0.5 text-xs font-bold"
      style={{ backgroundColor: row.color, color: row.textColor }}
    >
      {row.code}
    </span>
  )
}

export function MedicationStatusCodesSettingsPanel() {
  const canEdit = useAuthStore(
    s => s.can('service_users.update') || s.can('lookups.manage'),
  )
  const listQuery = useMedicationStatusCodesAdmin()
  const updateMutation = useUpdateMedicationStatusCode()

  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState<Partial<MedicationStatusCodeRow>>({})

  const rows = listQuery.data?.data ?? []
  const pagination = useClientPagination(rows)

  const startEdit = (row: MedicationStatusCodeRow) => {
    setEditingId(row.id)
    setDraft({
      label: row.label,
      color: row.color,
      textColor: row.textColor,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
    })
  }

  const save = async () => {
    if (!editingId) return
    try {
      await updateMutation.mutateAsync({
        id: editingId,
        body: {
          label: draft.label,
          color: draft.color,
          textColor: draft.textColor,
          isActive: draft.isActive,
          sortOrder: draft.sortOrder,
        },
      })
      toastSuccess('Status code updated')
      setEditingId(null)
    } catch (err) {
      toastApiError(err, 'Could not update status code')
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Medication MAR status codes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Status codes control MAR cell colours and recording rules when documenting administration.
        </p>
      </div>

      <section className="rounded-lg border border-border">
        <div className="border-b border-border bg-muted/40 px-3 py-2 text-sm font-semibold">
          Status codes ({rows.length})
        </div>
        {listQuery.isLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase text-muted-foreground">
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Label</th>
                  <th className="px-3 py-2">Colours</th>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Active</th>
                  {canEdit && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody>
                {pagination.paginatedItems.map(row => {
                  const editing = editingId === row.id
                  const display = editing ? { ...row, ...draft } : row
                  return (
                    <tr key={row.id} className="border-b border-border/80 last:border-0">
                      <td className="px-3 py-2">
                        <StatusCodePreview row={display} />
                      </td>
                      <td className="px-3 py-2">
                        {editing ? (
                          <Input
                            value={draft.label ?? ''}
                            onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
                            className="h-8"
                          />
                        ) : (
                          row.label
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editing ? (
                          <div className="flex gap-2">
                            <Input
                              value={draft.color ?? ''}
                              onChange={e => setDraft(d => ({ ...d, color: e.target.value }))}
                              className="h-8 w-24 font-mono text-xs"
                              placeholder="#000000"
                            />
                            <Input
                              value={draft.textColor ?? ''}
                              onChange={e => setDraft(d => ({ ...d, textColor: e.target.value }))}
                              className="h-8 w-24 font-mono text-xs"
                              placeholder="#ffffff"
                            />
                          </div>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">
                            {row.color} / {row.textColor}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editing ? (
                          <Input
                            type="number"
                            value={draft.sortOrder ?? 0}
                            onChange={e =>
                              setDraft(d => ({ ...d, sortOrder: Number(e.target.value) }))
                            }
                            className="h-8 w-16"
                          />
                        ) : (
                          row.sortOrder
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editing ? (
                          <input
                            type="checkbox"
                            checked={draft.isActive ?? true}
                            onChange={e =>
                              setDraft(d => ({ ...d, isActive: e.target.checked }))
                            }
                          />
                        ) : row.isActive ? (
                          'Yes'
                        ) : (
                          'No'
                        )}
                      </td>
                      {canEdit && (
                        <td className="px-3 py-2 text-right">
                          {editing ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                disabled={updateMutation.isPending}
                                onClick={() => void save()}
                              >
                                Save
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(row)}
                            >
                              Edit
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
            <SettingsTablePagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              rangeStart={pagination.rangeStart}
              rangeEnd={pagination.rangeEnd}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </div>
        )}
      </section>
    </div>
  )
}
