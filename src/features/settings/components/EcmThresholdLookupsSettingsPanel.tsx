import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'
import {
  useEcmThresholdLookups,
  useUpdateEcmThresholdLookup,
} from '@/features/ecm/hooks/useEcm'
import type { EcmThresholdLookupRow } from '@/features/ecm/api/ecm.api'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'

const GROUP_LABELS: Record<string, string> = {
  DASHBOARD: 'Live dashboard windows',
  ARRIVAL: 'Arrival (Late / Very late)',
  MISSED: 'Missed visits',
  DURATION: 'Visit duration',
  GEOFENCE: 'Geofence',
}

const GROUP_ORDER = ['DASHBOARD', 'ARRIVAL', 'MISSED', 'DURATION', 'GEOFENCE']

function unitSuffix(unit: string): string {
  if (unit === 'percent') return '%'
  if (unit === 'meters') return 'm'
  return 'min'
}

export function EcmThresholdLookupsSettingsPanel() {
  const canManage = useAuthStore(
    (s) => s.can('ecm.settings.manage' as never) || s.can('lookups.manage'),
  )
  const listQuery = useEcmThresholdLookups()
  const updateMutation = useUpdateEcmThresholdLookup()
  const rows = listQuery.data ?? []

  const [draft, setDraft] = React.useState<Record<string, string>>({})
  React.useEffect(() => {
    if (rows.length === 0) return
    setDraft(Object.fromEntries(rows.map((row) => [row.id, String(row.valueInt)])))
  }, [rows])

  const saveRow = async (row: EcmThresholdLookupRow) => {
    const raw = draft[row.id]
    const valueInt = Number(raw)
    if (!Number.isInteger(valueInt) || valueInt < 0) {
      toastApiError(new Error('Enter a whole number ≥ 0'), 'Invalid value')
      return
    }
    try {
      await updateMutation.mutateAsync({ id: row.id, valueInt })
      toastSuccess('ECM threshold updated', `${row.label} saved.`)
    } catch (err) {
      toastApiError(err, 'Could not update threshold')
    }
  }

  if (listQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading ECM threshold lookups…
      </div>
    )
  }

  if (listQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        Could not load ECM thresholds. Apply the ECM threshold lookups migration and restart the
        API.
      </p>
    )
  }

  const byGroup = GROUP_ORDER.map((groupCode) => ({
    groupCode,
    label: GROUP_LABELS[groupCode] ?? groupCode,
    rows: rows
      .filter((r) => r.groupCode === groupCode)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  })).filter((g) => g.rows.length > 0)

  return (
    <div className="space-y-6" data-testid="ecm-threshold-lookups-settings">
      <div>
        <h2 className="text-base font-semibold text-foreground">ECM categorization thresholds</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These lookups drive Due now / Starting soon windows and Late, Very late, Potential missed,
          and geofence classifications. Changing a value applies to new evaluations; historical
          visit evaluations keep their frozen thresholds.
        </p>
      </div>

      {byGroup.map((group) => (
        <section key={group.groupCode} className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </p>
          <div className="space-y-2">
            {group.rows.map((row) => (
              <div
                key={row.id}
                className="rounded-lg border border-border bg-muted/20 p-3"
                data-testid={`ecm-threshold-row-${row.code}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{row.label}</p>
                    {row.description ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{row.description}</p>
                    ) : null}
                    {row.relatedTile ? (
                      <p className="mt-1 text-[11px] font-medium text-primary">
                        Tile: {row.relatedTile}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="space-y-1 text-xs">
                      <span className="text-muted-foreground">Value ({unitSuffix(row.unit)})</span>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        disabled={!canManage || updateMutation.isPending}
                        value={draft[row.id] ?? String(row.valueInt)}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                        className="h-9 w-28"
                      />
                    </label>
                    {canManage ? (
                      <Button
                        type="button"
                        size="sm"
                        className="h-9"
                        disabled={updateMutation.isPending}
                        onClick={() => void saveRow(row)}
                      >
                        Save
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {!canManage ? (
        <p className="text-xs text-muted-foreground">
          You need <code>ecm.settings.manage</code> or <code>lookups.manage</code> to edit these
          values.
        </p>
      ) : null}
    </div>
  )
}
