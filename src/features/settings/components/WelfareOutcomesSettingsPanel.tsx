import * as React from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type {
  WelfareOutcomeRow,
  WelfareOutcomeTone,
} from '@/features/settings/api/lookups-admin-api'
import {
  useCreateWelfareOutcome,
  useDeleteWelfareOutcome,
  useUpdateWelfareOutcome,
  useWelfareOutcomes,
} from '@/features/settings/hooks/useLookupsAdmin'
import { SettingsTablePagination } from '@/features/settings/components/SettingsTablePagination'
import { useClientPagination } from '@/features/settings/hooks/useClientPagination'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'
import { cn } from '@/shared/lib/utils'

const TONES: { value: WelfareOutcomeTone; label: string }[] = [
  { value: 'ok', label: 'OK (green)' },
  { value: 'warn', label: 'Warn (amber)' },
  { value: 'bad', label: 'Concern (red)' },
]

const TONE_BADGE: Record<WelfareOutcomeTone, string> = {
  ok: 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-100',
  warn: 'bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100',
  bad: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100',
}

function kebabCode(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function ToneSelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: WelfareOutcomeTone
  onChange: (t: WelfareOutcomeTone) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value as WelfareOutcomeTone)}
      className={cn(
        'rounded-md border border-input bg-background px-2 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60',
        className,
      )}
    >
      {TONES.map(t => (
        <option key={t.value} value={t.value}>
          {t.label}
        </option>
      ))}
    </select>
  )
}

export function WelfareOutcomesSettingsPanel() {
  const canManage = useAuthStore(s => s.can('lookups.manage'))
  const listQuery = useWelfareOutcomes()
  const createMutation = useCreateWelfareOutcome()
  const updateMutation = useUpdateWelfareOutcome()
  const deleteMutation = useDeleteWelfareOutcome()

  const rows = listQuery.data ?? []
  const loading = listQuery.isLoading
  const saving =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  const error =
    listQuery.error instanceof ApiError
      ? listQuery.error.message
      : listQuery.error
        ? 'Could not load welfare outcomes.'
        : null

  const [label, setLabel] = React.useState('')
  const [code, setCode] = React.useState('')
  const [tone, setTone] = React.useState<WelfareOutcomeTone>('ok')
  const [filter, setFilter] = React.useState('')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editLabel, setEditLabel] = React.useState('')
  const [editCode, setEditCode] = React.useState('')
  const [editTone, setEditTone] = React.useState<WelfareOutcomeTone>('ok')
  const [actionError, setActionError] = React.useState<string | null>(null)

  const filtered = React.useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      r => r.label.toLowerCase().includes(q) || r.code.toLowerCase().includes(q),
    )
  }, [filter, rows])

  const pagination = useClientPagination(filtered, { resetDeps: [filter] })

  const cancelEdit = () => {
    setEditingId(null)
    setEditLabel('')
    setEditCode('')
    setEditTone('ok')
  }

  const startEdit = (row: WelfareOutcomeRow) => {
    setEditingId(row.id)
    setEditLabel(row.label)
    setEditCode(row.code)
    setEditTone(row.tone)
  }

  const onAdd = async () => {
    const l = label.trim()
    const c = (code.trim() || kebabCode(l)).toLowerCase()
    if (!l || !c || !canManage) return
    setActionError(null)
    try {
      await createMutation.mutateAsync({
        label: l,
        code: c,
        tone,
        sortOrder: rows.length,
      })
      setLabel('')
      setCode('')
      setTone('ok')
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not add welfare outcome.')
    }
  }

  const onSaveEdit = async () => {
    if (!editingId || !canManage) return
    const l = editLabel.trim()
    const c = editCode.trim().toLowerCase()
    if (!l || !c) return
    setActionError(null)
    try {
      await updateMutation.mutateAsync({
        id: editingId,
        body: { label: l, code: c, tone: editTone },
      })
      cancelEdit()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not save changes.')
    }
  }

  const onDelete = async (row: WelfareOutcomeRow) => {
    if (!canManage) return
    if (!window.confirm(`Remove "${row.label}"? Carers will no longer see this option.`)) return
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(row.id)
      if (editingId === row.id) cancelEdit()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not delete welfare outcome.')
    }
  }

  const displayError = actionError ?? error

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">On-entry welfare outcomes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Options a carer picks in the app clock-in sheet to record the person’s welfare on
          arrival (for example “Person seen — as expected”). Tone sets the option colour.
        </p>
      </div>

      {displayError ? <p className="text-sm text-destructive">{displayError}</p> : null}

      {canManage ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Label</label>
            <Input
              value={label}
              onChange={e => {
                setLabel(e.target.value)
                if (!code.trim()) setCode(kebabCode(e.target.value))
              }}
              placeholder="e.g. Person seen — as expected"
              disabled={saving}
            />
          </div>
          <div className="min-w-[140px] flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Code</label>
            <Input
              value={code}
              onChange={e => setCode(e.target.value.toLowerCase())}
              placeholder="e.g. seen-ok"
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Tone</label>
            <div>
              <ToneSelect value={tone} onChange={setTone} disabled={saving} />
            </div>
          </div>
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

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Filter</label>
        <Input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search…"
          className="max-w-xs"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Label</th>
                  <th className="px-3 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Tone</th>
                  {canManage ? <th className="w-28 px-3 py-2 font-medium">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canManage ? 4 : 3}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      {rows.length === 0 ? 'No welfare outcomes yet.' : 'No matches.'}
                    </td>
                  </tr>
                ) : (
                  pagination.paginatedItems.map(row =>
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
                          <Input
                            value={editCode}
                            onChange={e => setEditCode(e.target.value.toLowerCase())}
                            className="h-8 font-mono text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <ToneSelect value={editTone} onChange={setEditTone} className="h-8 py-0" />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={saving}
                              onClick={() => void onSaveEdit()}
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
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                          {row.code}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                              TONE_BADGE[row.tone],
                            )}
                          >
                            {row.tone}
                          </span>
                        </td>
                        {canManage ? (
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                title="Edit"
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={() => startEdit(row)}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Remove"
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => void onDelete(row)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
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
    </div>
  )
}
