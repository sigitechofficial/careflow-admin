import * as React from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'
import {
  useCreateMedicationRound,
  useMedicationRoundsAdmin,
  useUpdateMedicationRound,
} from '@/features/settings/hooks/useMedicationRoundsAdmin'
import type { MedicationRoundRow } from '@/features/settings/api/medication-settings.api'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'

export function MedicationTimeSlotsSettingsPanel() {
  const canEdit = useAuthStore(
    s => s.can('service_users.update') || s.can('lookups.manage'),
  )
  const roundsQuery = useMedicationRoundsAdmin()
  const createRoundMutation = useCreateMedicationRound()
  const updateRoundMutation = useUpdateMedicationRound()

  const [editingRoundId, setEditingRoundId] = React.useState<string | null>(null)
  const [roundDraft, setRoundDraft] = React.useState<Partial<MedicationRoundRow>>({})
  const [newRoundName, setNewRoundName] = React.useState('')
  const [newRoundTime, setNewRoundTime] = React.useState('08:00')
  const [newRoundWindowStart, setNewRoundWindowStart] = React.useState('')
  const [newRoundWindowEnd, setNewRoundWindowEnd] = React.useState('')

  const rounds = roundsQuery.data ?? []

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Time slots</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Administration time slots used when adding medications, MAR schedules, and preferred visit
          times. Each slot has a default due time and optional administration window (spec section 5).
        </p>
      </div>

      <section className="rounded-lg border border-border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
          <span className="text-sm font-semibold">Time slots ({rounds.length})</span>
          <span className="text-xs text-muted-foreground">
            Shown in Add medication and MAR schedules
          </span>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap items-end gap-2 border-b border-border p-3">
            <div className="min-w-[10rem] flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <Input
                value={newRoundName}
                onChange={e => setNewRoundName(e.target.value)}
                placeholder="e.g. Breakfast"
                className="h-9"
              />
            </div>
            <div className="w-24 space-y-1">
              <label className="text-xs text-muted-foreground">Due</label>
              <Input
                value={newRoundTime}
                onChange={e => setNewRoundTime(e.target.value)}
                placeholder="08:00"
                className="h-9 font-mono text-xs"
              />
            </div>
            <div className="w-24 space-y-1">
              <label className="text-xs text-muted-foreground">Window start</label>
              <Input
                value={newRoundWindowStart}
                onChange={e => setNewRoundWindowStart(e.target.value)}
                placeholder="07:00"
                className="h-9 font-mono text-xs"
              />
            </div>
            <div className="w-24 space-y-1">
              <label className="text-xs text-muted-foreground">Window end</label>
              <Input
                value={newRoundWindowEnd}
                onChange={e => setNewRoundWindowEnd(e.target.value)}
                placeholder="10:00"
                className="h-9 font-mono text-xs"
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="h-9"
              disabled={createRoundMutation.isPending || !newRoundName.trim() || !newRoundTime.trim()}
              onClick={async () => {
                try {
                  await createRoundMutation.mutateAsync({
                    name: newRoundName.trim(),
                    time: newRoundTime.trim(),
                    windowStart: newRoundWindowStart.trim() || undefined,
                    windowEnd: newRoundWindowEnd.trim() || undefined,
                  })
                  toastSuccess('Time slot added')
                  setNewRoundName('')
                  setNewRoundTime('08:00')
                  setNewRoundWindowStart('')
                  setNewRoundWindowEnd('')
                } catch (err) {
                  toastApiError(err, 'Could not add time slot')
                }
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add slot
            </Button>
          </div>
        ) : null}
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
