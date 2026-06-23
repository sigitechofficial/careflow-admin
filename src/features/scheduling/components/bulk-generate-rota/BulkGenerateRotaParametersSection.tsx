import { Label } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import type { ScheduleAreaRow } from '@/features/scheduling/types/scheduling.types'

export const BULK_GENERATE_ROTA_SCHEDULE_AREA_NONE = '__none__'

type Props = {
  generateFrom: string
  generateTo: string
  backfillDays: number
  scheduleAreaId: string
  generateReadyOnly: boolean
  scheduleAreas: ScheduleAreaRow[]
  onGenerateFromChange: (value: string) => void
  onGenerateToChange: (value: string) => void
  onBackfillDaysChange: (value: number) => void
  onScheduleAreaIdChange: (value: string) => void
  onGenerateReadyOnlyChange: (value: boolean) => void
}

export function BulkGenerateRotaParametersSection({
  generateFrom,
  generateTo,
  backfillDays,
  scheduleAreaId,
  generateReadyOnly,
  scheduleAreas,
  onGenerateFromChange,
  onGenerateToChange,
  onBackfillDaysChange,
  onScheduleAreaIdChange,
  onGenerateReadyOnlyChange,
}: Props) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold">Generation parameters</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">From date</Label>
          <Input
            type="date"
            value={generateFrom}
            onChange={(e) => onGenerateFromChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">To date (optional)</Label>
          <Input
            type="date"
            value={generateTo}
            placeholder="Next 14 days"
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
