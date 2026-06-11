import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'
import {
  useUpdateVitalAcceptedRangeCatalog,
  useVitalAcceptedRangesCatalog,
} from '@/features/settings/hooks/useLookupsAdmin'
import type { VitalAcceptedRangeCatalogRow } from '@/features/settings/api/lookups-admin-api'
import { formatVitalAcceptedRangeValue } from '@/features/service-users/initial-assessment/utils/vital-accepted-ranges.lookup'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'

type Draft = Record<string, { min: string; max: string }>

function toDraft(rows: VitalAcceptedRangeCatalogRow[]): Draft {
  return Object.fromEntries(rows.map((row) => [row.id, { min: String(row.min), max: String(row.max) }]))
}

export function VitalAcceptedRangesSettingsPanel() {
  const canManage = useAuthStore((s) => s.can('lookups.manage'))
  const listQuery = useVitalAcceptedRangesCatalog()
  const updateMutation = useUpdateVitalAcceptedRangeCatalog()
  const rows = listQuery.data ?? []

  const [draft, setDraft] = React.useState<Draft>({})
  React.useEffect(() => {
    if (rows.length > 0) setDraft(toDraft(rows))
  }, [rows])

  const setField = (id: string, side: 'min' | 'max', value: string) => {
    setDraft((prev) => ({
      ...prev,
      [id]: { ...prev[id], [side]: value },
    }))
  }

  const saveRow = async (row: VitalAcceptedRangeCatalogRow) => {
    const values = draft[row.id]
    if (!values) return
    const min = Number(values.min)
    const max = Number(values.max)
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
      toastApiError(new Error('Min must be lower than max'), 'Invalid range')
      return
    }
    try {
      await updateMutation.mutateAsync({ id: row.id, body: { min, max } })
      toastSuccess('Range updated', `${row.label} saved.`)
    } catch (err) {
      toastApiError(err, 'Could not update range')
    }
  }

  const leftRows = rows.filter((r) => r.column === 'left').sort((a, b) => a.sortOrder - b.sortOrder)
  const rightRows = rows.filter((r) => r.column === 'right').sort((a, b) => a.sortOrder - b.sortOrder)

  const renderColumn = (columnRows: VitalAcceptedRangeCatalogRow[], title: string) => (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {columnRows.map((row) => {
        const values = draft[row.id] ?? { min: String(row.min), max: String(row.max) }
        const previewMin = Number(values.min)
        const previewMax = Number(values.max)
        const preview =
          Number.isFinite(previewMin) && Number.isFinite(previewMax)
            ? formatVitalAcceptedRangeValue(previewMin, previewMax, row.unit)
            : '—'
        return (
          <div
            key={row.id}
            className="rounded-lg border border-border bg-muted/20 p-3"
            data-testid={`vital-range-row-${row.fieldKey}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{row.label}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{preview}</p>
              </div>
              {canManage ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={updateMutation.isPending}
                  onClick={() => void saveRow(row)}
                >
                  Save
                </Button>
              ) : null}
            </div>
            {canManage ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor={`${row.id}-min`}>
                    Min ({row.unit})
                  </label>
                  <Input
                    id={`${row.id}-min`}
                    inputMode="decimal"
                    className="h-9"
                    value={values.min}
                    onChange={(e) => setField(row.id, 'min', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor={`${row.id}-max`}>
                    Max ({row.unit})
                  </label>
                  <Input
                    id={`${row.id}-max`}
                    inputMode="decimal"
                    className="h-9"
                    value={values.max}
                    onChange={(e) => setField(row.id, 'max', e.target.value)}
                  />
                </div>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-6" data-testid="vital-accepted-ranges-settings">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Accepted ranges</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Guidance limits shown on initial assessment Section 4 (Physical assessment). These are reference
          ranges for assessors — they do not block data entry.
        </p>
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading ranges…
        </div>
      ) : listQuery.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load accepted ranges.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {renderColumn(leftRows, 'Left column')}
          {renderColumn(rightRows, 'Right column')}
        </div>
      )}
    </div>
  )
}
