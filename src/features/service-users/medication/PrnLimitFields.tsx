import { Input } from '@/shared/ui/input'
import { MedicationFieldLabelWithTooltip } from '@/features/service-users/medication/MedicationFieldLabelWithTooltip'

/** Form text for the optional PRN limits; blank means "not set". */
export type PrnLimitValues = {
  minGapHours: string
  maxDosesIn24Hours: string
  maxDosePerTime: string
}

export const EMPTY_PRN_LIMITS: PrnLimitValues = {
  minGapHours: '',
  maxDosesIn24Hours: '',
  maxDosePerTime: '',
}

export function prnLimitValuesFromMedication(med: {
  prnMinGapHours?: number | null
  prnMaxDosesIn24Hours?: number | null
  prnMaxDosePerTime?: string | null
}): PrnLimitValues {
  return {
    minGapHours: med.prnMinGapHours != null ? String(med.prnMinGapHours) : '',
    maxDosesIn24Hours: med.prnMaxDosesIn24Hours != null ? String(med.prnMaxDosesIn24Hours) : '',
    maxDosePerTime: med.prnMaxDosePerTime ?? '',
  }
}

/** Message for the first invalid value, or null when all are blank or valid. */
export function validatePrnLimits(values: PrnLimitValues): string | null {
  const gap = values.minGapHours.trim()
  if (gap) {
    const n = Number(gap)
    if (!Number.isFinite(n) || n < 0.25 || n > 168) {
      return 'Minimum gap must be between 0.25 and 168 hours.'
    }
  }
  const max = values.maxDosesIn24Hours.trim()
  if (max) {
    const n = Number(max)
    if (!Number.isInteger(n) || n < 1 || n > 48) {
      return 'Maximum doses in 24 hours must be a whole number between 1 and 48.'
    }
  }
  return null
}

/** API fields: null clears a limit, so an emptied box removes it on save. */
export function prnLimitsPayload(values: PrnLimitValues) {
  const gap = values.minGapHours.trim()
  const max = values.maxDosesIn24Hours.trim()
  return {
    prnMinGapHours: gap ? Number(gap) : null,
    prnMaxDosesIn24Hours: max ? Number(max) : null,
    prnMaxDosePerTime: values.maxDosePerTime.trim() || null,
  }
}

type Props = {
  values: PrnLimitValues
  onChange: (next: PrnLimitValues) => void
  disabled?: boolean
}

/** Optional limits for a PRN medicine. Carers see them and are warned when a dose is outside them. */
export function PrnLimitFields({ values, onChange, disabled }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        PRN limits (optional). Carers see these on the medicine and are warned if a dose is
        too soon or over the maximum. The dose is still recorded and the office is told.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <MedicationFieldLabelWithTooltip
            label="Minimum gap (hours)"
            tooltip="Shortest time allowed between two doses, e.g. 4. Leave blank if there is no minimum gap."
          />
          <Input
            type="number"
            min={0.25}
            max={168}
            step={0.25}
            placeholder="e.g. 4"
            value={values.minGapHours}
            onChange={e => onChange({ ...values, minGapHours: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <MedicationFieldLabelWithTooltip
            label="Max doses in 24 hours"
            tooltip="Most doses allowed in any 24 hours, counted across all visits and carers. Leave blank if there is no maximum."
          />
          <Input
            type="number"
            min={1}
            max={48}
            step={1}
            placeholder="e.g. 4"
            value={values.maxDosesIn24Hours}
            onChange={e => onChange({ ...values, maxDosesIn24Hours: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <MedicationFieldLabelWithTooltip
            label="Max dose per time"
            tooltip="Most to give at one time, e.g. 2 tablets. Shown to carers for information."
          />
          <Input
            maxLength={100}
            placeholder="e.g. 2 tablets"
            value={values.maxDosePerTime}
            onChange={e => onChange({ ...values, maxDosePerTime: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}
