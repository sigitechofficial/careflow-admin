import { Input } from '@/shared/ui/input'
import { NoYesToggle } from '@/shared/ui/no-yes-toggle'
import { MedicationFieldLabelWithTooltip } from '@/features/service-users/medication/MedicationFieldLabelWithTooltip'
import { TIME_SENSITIVE_MEDICATION_TOOLTIP } from '@/features/service-users/medication/medication-field-help'

type Props = {
  timeCritical: boolean
  timeToleranceMinutes: number
  disabled?: boolean
  onTimeCriticalChange: (value: boolean) => void
  onToleranceChange: (value: number) => void
}

export function TimeSensitiveMedicationFields({
  timeCritical,
  timeToleranceMinutes,
  disabled,
  onTimeCriticalChange,
  onToleranceChange,
}: Props) {
  return (
    <>
      <div className="space-y-1">
        <MedicationFieldLabelWithTooltip
          label="Time-sensitive medicine"
          tooltip={TIME_SENSITIVE_MEDICATION_TOOLTIP}
        />
        <NoYesToggle
          value={timeCritical}
          onChange={onTimeCriticalChange}
          disabled={disabled}
          activeTone="success"
        />
      </div>
      {timeCritical ? (
        <div className="space-y-1">
          <label className="text-sm font-medium">Time tolerance (minutes)</label>
          <Input
            type="number"
            min={0}
            max={240}
            disabled={disabled}
            value={timeToleranceMinutes}
            onChange={(event) => onToleranceChange(Number(event.target.value) || 0)}
            className="w-24"
          />
        </div>
      ) : null}
    </>
  )
}
