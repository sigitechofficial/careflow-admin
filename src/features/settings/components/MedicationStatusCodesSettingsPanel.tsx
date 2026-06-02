import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'
import {
  useMedicationStatusCodesAdmin,
  useUpdateMedicationStatusCode,
} from '@/features/settings/hooks/useMedicationStatusCodesAdmin'
import {
  useMedicationRoundsAdmin,
  useUpdateMedicationRound,
} from '@/features/settings/hooks/useMedicationRoundsAdmin'
import type { MedicationRoundRow } from '@/features/settings/api/medication-settings.api'
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
  const roundsQuery = useMedicationRoundsAdmin()
  const updateMutation = useUpdateMedicationStatusCode()
  const updateRoundMutation = useUpdateMedicationRound()

  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState<Partial<MedicationStatusCodeRow>>({})
  const [editingRoundId, setEditingRoundId] = React.useState<string | null>(null)
  const [roundDraft, setRoundDraft] = React.useState<Partial<MedicationRoundRow>>({})

  const rows = listQuery.data?.data ?? []
  const rounds = roundsQuery.data ?? []

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
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h2 className="text-lg font-semibold">Medication MAR settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Status codes control MAR cell colours and recording rules. Time slots define default due
          times and administration windows (spec section 5).
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
                {rows.map(row => {
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
        )}
      </section>

      <section className="rounded-lg border border-border">
        <div className="border-b border-border bg-muted/40 px-3 py-2 text-sm font-semibold">
          Time slots ({rounds.length})
        </div>
        {roundsQuery.isLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : rounds.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No time slots configured.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase text-muted-foreground">
                  <th className="px-3 py-2">Slot</th>
                  <th className="px-3 py-2">Due</th>
                  <th className="px-3 py-2">Window</th>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Active</th>
                  {canEdit && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody>
                {rounds.map(r => {
                  const editing = editingRoundId === r.id
                  const display = editing ? { ...r, ...roundDraft } : r
                  const saveRound = async () => {
                    if (!editingRoundId) return
                    try {
                      await updateRoundMutation.mutateAsync({
                        id: editingRoundId,
                        body: {
                          name: roundDraft.name,
                          time: roundDraft.time,
                          windowStart: roundDraft.windowStart ?? undefined,
                          windowEnd: roundDraft.windowEnd ?? undefined,
                          sortOrder: roundDraft.sortOrder,
                          isActive: roundDraft.isActive,
                        },
                      })
                      toastSuccess('Time slot updated')
                      setEditingRoundId(null)
                    } catch (err) {
                      toastApiError(err, 'Could not update time slot')
                    }
                  }
                  return (
                    <tr key={r.id} className="border-b border-border/80 last:border-0">
                      <td className="px-3 py-2">
                        {editing ? (
                          <Input
                            value={roundDraft.name ?? ''}
                            onChange={e =>
                              setRoundDraft(d => ({ ...d, name: e.target.value }))
                            }
                            className="h-8"
                          />
                        ) : (
                          <span className="font-medium">{r.name}</span>
                        )}
                        <span className="ml-2 font-mono text-xs text-muted-foreground">{r.code}</span>
                      </td>
                      <td className="px-3 py-2">
                        {editing ? (
                          <Input
                            value={roundDraft.time ?? ''}
                            onChange={e =>
                              setRoundDraft(d => ({ ...d, time: e.target.value }))
                            }
                            className="h-8 w-20 font-mono text-xs"
                            placeholder="08:00"
                          />
                        ) : (
                          <span className="font-mono text-xs">{r.time}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {editing ? (
                          <div className="flex gap-1">
                            <Input
                              value={roundDraft.windowStart ?? ''}
                              onChange={e =>
                                setRoundDraft(d => ({ ...d, windowStart: e.target.value }))
                              }
                              className="h-8 w-20 text-xs"
                              placeholder="07:00"
                            />
                            <span className="self-center">–</span>
                            <Input
                              value={roundDraft.windowEnd ?? ''}
                              onChange={e =>
                                setRoundDraft(d => ({ ...d, windowEnd: e.target.value }))
                              }
                              className="h-8 w-20 text-xs"
                              placeholder="10:00"
                            />
                          </div>
                        ) : (
                          `${r.windowStart ?? '—'} – ${r.windowEnd ?? '—'}`
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editing ? (
                          <Input
                            type="number"
                            value={roundDraft.sortOrder ?? 0}
                            onChange={e =>
                              setRoundDraft(d => ({
                                ...d,
                                sortOrder: Number(e.target.value),
                              }))
                            }
                            className="h-8 w-16"
                          />
                        ) : (
                          r.sortOrder
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editing ? (
                          <input
                            type="checkbox"
                            checked={roundDraft.isActive ?? true}
                            onChange={e =>
                              setRoundDraft(d => ({ ...d, isActive: e.target.checked }))
                            }
                          />
                        ) : r.isActive ? (
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
                                onClick={() => setEditingRoundId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                disabled={updateRoundMutation.isPending}
                                onClick={() => void saveRound()}
                              >
                                Save
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingRoundId(r.id)
                                setRoundDraft({
                                  name: r.name,
                                  time: r.time,
                                  windowStart: r.windowStart ?? '',
                                  windowEnd: r.windowEnd ?? '',
                                  sortOrder: r.sortOrder,
                                  isActive: r.isActive,
                                })
                              }}
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
        )}
      </section>
    </div>
  )
}
