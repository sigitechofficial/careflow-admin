import * as React from 'react'
import { CalendarDays, MapPin } from 'lucide-react'
import { ContentCard } from '@/shared/ui/content-section'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { flattenLocationOptionsFromTree } from '@/features/locations/utils/flatten-location-options.util'
import { useLocationManagementTree } from '@/features/settings/hooks/useLocationManagement'
import {
  type EcmOperationalPeriodPreset,
  formatPeriodDayShort,
  presetOptionLabel,
} from '@/features/ecm/utils/ecm-operational-period.util'
import { formatOperationalDayLabel } from '@/shared/lib/operational-day.util'

const PERIOD_PRESETS: EcmOperationalPeriodPreset[] = [
  'today',
  'yesterday',
  'this_week',
  'last_week',
  'last_14_days',
  'last_30_days',
  'this_month',
  'last_month',
  'month_to_date',
  'quarter_to_date',
  'year_to_date',
  'custom',
]

export type EcmOperationalPeriodCardProps = {
  preset: EcmOperationalPeriodPreset
  dateFrom: string
  dateTo: string
  periodLabel: string
  operationalToday: string
  operationalTimezone?: string
  onPresetChange: (preset: EcmOperationalPeriodPreset) => void
  onApplyPreset: (preset: Exclude<EcmOperationalPeriodPreset, 'custom'>) => void
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
  /** Hide location when scoped to a service user or when parent owns location elsewhere. */
  hideLocation?: boolean
  /** Extra controls (search, branch, refresh) rendered in the same row. */
  children?: React.ReactNode
  /** Optional footnote under the controls. */
  footnote?: React.ReactNode
  testIdPrefix?: string
}

/**
 * Single SSOT control for ECM Live / Graphs / Reports (Compliance reads the same period):
 * operational period presets + optional location (global scope).
 */
export function EcmOperationalPeriodCard({
  preset,
  dateFrom,
  dateTo,
  periodLabel,
  operationalToday,
  operationalTimezone,
  onPresetChange,
  onApplyPreset,
  onDateFromChange,
  onDateToChange,
  hideLocation = false,
  children,
  footnote,
  testIdPrefix = 'ecm-period',
}: EcmOperationalPeriodCardProps) {
  const { locationId, setSelectedLocationId } = useGlobalLocationScope()
  const assignedLocationIds = useAuthStore((s) => s.user?.assignedLocationIds)
  const locationTreeQuery = useLocationManagementTree(!hideLocation)
  const locationOptions = React.useMemo(() => {
    const all = flattenLocationOptionsFromTree(locationTreeQuery.data)
    if (!assignedLocationIds?.length) return all
    const allowed = new Set(assignedLocationIds)
    return all.filter((o) => allowed.has(o.id))
  }, [locationTreeQuery.data, assignedLocationIds])
  const showAllLocationsOption = !assignedLocationIds?.length
  const locationLabel = React.useMemo(() => {
    if (!locationId) return 'All locations'
    return locationOptions.find((o) => o.id === locationId)?.label ?? 'Location'
  }, [locationId, locationOptions])

  return (
    <ContentCard className="p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            Operational period
          </span>
          <select
            className="flex h-9 w-[12.5rem] rounded-md border border-input bg-background px-2 text-sm"
            value={preset}
            onChange={(e) => {
              const v = e.target.value as EcmOperationalPeriodPreset
              if (v === 'custom') {
                onPresetChange('custom')
                return
              }
              onApplyPreset(v)
            }}
            data-testid={`${testIdPrefix}-preset`}
          >
            {PERIOD_PRESETS.map((p) => (
              <option key={p} value={p}>
                {presetOptionLabel(p)}
              </option>
            ))}
          </select>
        </label>

        {hideLocation ? null : (
          <label className="space-y-1 text-xs">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              Location
            </span>
            <select
              className="flex h-9 w-[16rem] max-w-full rounded-md border border-input bg-background px-2 text-sm"
              value={locationId ?? '__all__'}
              disabled={locationTreeQuery.isLoading}
              onChange={(e) => {
                const v = e.target.value
                setSelectedLocationId(v === '__all__' ? null : v)
              }}
              data-testid={`${testIdPrefix}-location`}
              title={locationLabel}
            >
              {showAllLocationsOption ? <option value="__all__">All locations</option> : null}
              {locationOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {preset === 'custom' ? (
          <>
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">From</span>
              <Input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="h-9 w-[11rem]"
                data-testid={`${testIdPrefix}-date-from`}
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">To</span>
              <Input
                type="date"
                value={dateTo}
                min={dateFrom}
                onChange={(e) => onDateToChange(e.target.value)}
                className="h-9 w-[11rem]"
                data-testid={`${testIdPrefix}-date-to`}
              />
            </label>
          </>
        ) : (
          <p className="pb-2 text-xs text-muted-foreground tabular-nums">
            {dateFrom === dateTo
              ? periodLabel
              : `${formatPeriodDayShort(dateFrom)} – ${formatPeriodDayShort(dateTo)}`}
          </p>
        )}

        {children}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground" data-testid={`${testIdPrefix}-ops-day-note`}>
        {formatOperationalDayLabel(operationalToday, operationalTimezone)}
        {hideLocation ? null : (
          <>
            {' · '}
            Scope: <span className="font-medium text-foreground">{locationLabel}</span>
          </>
        )}
        {footnote ? (
          <>
            {' · '}
            {footnote}
          </>
        ) : null}
      </p>
    </ContentCard>
  )
}
