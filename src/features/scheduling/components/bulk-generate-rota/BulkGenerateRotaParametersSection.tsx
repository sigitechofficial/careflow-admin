import { Label } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import type { RotaHorizonMode } from '@/features/settings/types'
import type { ScheduleAreaRow } from '@/features/scheduling/types/scheduling.types'

export const BULK_GENERATE_ROTA_SCHEDULE_AREA_NONE = '__none__'

type Props = {
  generateFrom: string
  generateTo: string
  generateToPlaceholder?: string
  defaultRotaHorizonDays: number
  defaultRotaHorizonMode: RotaHorizonMode
  defaultRotaToDateLabel: string
  showDefaultRotaRange: boolean
  timezoneHint: string
  isFromToday: boolean
  backfillDays: number
  scheduleAreaId: string
  generateReadyOnly: boolean
  scheduleAreas: ScheduleAreaRow[]
  onGenerateFromChange: (value: string) => void
  onGenerateToChange: (value: string) => void
  onUseToday: () => void
  onBackfillDaysChange: (value: number) => void
  onScheduleAreaIdChange: (value: string) => void
  onGenerateReadyOnlyChange: (value: boolean) => void
}

export function BulkGenerateRotaParametersSection({
  generateFrom,
  generateTo,
  generateToPlaceholder = 'Next 28 days',
  defaultRotaHorizonDays,
  defaultRotaHorizonMode,
  defaultRotaToDateLabel,
  showDefaultRotaRange,
  timezoneHint,
  isFromToday,
  backfillDays,
  scheduleAreaId,
  generateReadyOnly,
  scheduleAreas,
  onGenerateFromChange,
  onGenerateToChange,
  onUseToday,
  onBackfillDaysChange,
  onScheduleAreaIdChange,
  onGenerateReadyOnlyChange,
}: Props) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">Generation parameters</h2>
          <span
            className="inline-flex items-center rounded border border-dashed border-border bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            title="From/To dates and visit windows use the organisation operational timezone"
            data-testid="bulk-generate-rota-timezone-hint"
          >
            Times in {timezoneHint}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Dates are organisation operational calendar days ({timezoneHint}). Visit start/end times
          are resolved in that timezone.
        </p>
        {showDefaultRotaRange ? (
          <p className="text-sm text-muted-foreground">
            {defaultRotaHorizonMode === 'CALENDAR_MONTH' ? (
              <>
                Default rota: through end of month ({defaultRotaToDateLabel}). Change in{' '}
                <span className="font-medium text-foreground">Settings → Dom Care</span>.
              </>
            ) : (
              <>
                Default rota: <span className="font-medium text-foreground">{defaultRotaHorizonDays} days</span>{' '}
                ahead (To date empty → {defaultRotaToDateLabel}). Change in{' '}
                <span className="font-medium text-foreground">Settings → Dom Care</span>.
              </>
            )}
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">From date</Label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={generateFrom}
              onChange={(e) => onGenerateFromChange(e.target.value)}
              className="min-w-0 flex-1"
            />
            <Button
              type="button"
              variant={isFromToday ? 'secondary' : 'outline'}
              size="sm"
              className="shrink-0"
              onClick={onUseToday}
            >
              Today
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">To date (optional)</Label>
          <Input
            type="date"
            value={generateTo}
            placeholder={generateToPlaceholder}
            onChange={(e) => onGenerateToChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Backfill days</Label>
          <Input
            type="number"
            min={0}
            max={14}
            value={backfillDays}
            onChange={(e) => onBackfillDaysChange(Number(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Schedule area</Label>
          <Select
            value={scheduleAreaId || BULK_GENERATE_ROTA_SCHEDULE_AREA_NONE}
            onValueChange={(v) =>
              onScheduleAreaIdChange(v === BULK_GENERATE_ROTA_SCHEDULE_AREA_NONE ? '' : v)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={BULK_GENERATE_ROTA_SCHEDULE_AREA_NONE}>Default</SelectItem>
              {scheduleAreas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={generateReadyOnly}
          onChange={(e) => onGenerateReadyOnlyChange(e.target.checked)}
        />
        Skip plans missing enabled slots, times, or visit days
      </label>
    </div>
  )
}
