import { Wrench } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'
import type { EquipmentChecklistMetadata } from '@/features/service-users/initial-assessment/utils/mobility-metadata'
import {
  IA_CHECKBOX_CLASS,
  IA_HINT_CLASS,
  IA_OPTION_LABEL_CLASS,
  IA_QUESTION_LABEL_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

type Props = {
  visible: boolean
  value: EquipmentChecklistMetadata
  /** A hoist is recorded in use (Moving & Handling tasks / §12.5a). The hoist warning needs it. */
  hoistInUse?: boolean
  disabled?: boolean
  /** When true, omit outer card title (parent §12.8 panel provides context). */
  embedded?: boolean
  onChange: (next: EquipmentChecklistMetadata) => void
}

export function InitialAssessmentEquipmentChecklistPanel({
  visible,
  value,
  hoistInUse = false,
  disabled,
  embedded,
  onChange,
}: Props) {
  if (!visible) return null

  return (
    <div className={embedded ? 'space-y-3 pt-1' : 'space-y-4 rounded-xl border border-border bg-muted/20 p-4'} data-testid="ia-equipment-checklist">
      {!embedded ? (
        <div className="flex items-start gap-3">
          <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-sky-100">Equipment checklist</h3>
            <p className={IA_HINT_CLASS}>
              Hoist, profiling bed or air mattress in use — confirm servicing and staff training before
              care start.
            </p>
          </div>
        </div>
      ) : (
        <p className={cn(IA_HINT_CLASS, 'text-xs')}>
          Servicing and staff training — confirm before hoist or profiling bed tasks.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <label className={cn('flex items-center gap-2.5 text-[13px]', IA_OPTION_LABEL_CLASS)}>
          <input
            type="checkbox"
            className={IA_CHECKBOX_CLASS}
            disabled={disabled}
            checked={value.hoistServiced === true}
            onChange={(e) => onChange({ ...value, hoistServiced: e.target.checked })}
          />
          Hoist supplied and serviced
        </label>
        <label className={cn('flex items-center gap-2.5 text-[13px]', IA_OPTION_LABEL_CLASS)}>
          <input
            type="checkbox"
            className={IA_CHECKBOX_CLASS}
            disabled={disabled}
            checked={value.profilingBedServiced === true}
            onChange={(e) => onChange({ ...value, profilingBedServiced: e.target.checked })}
          />
          Profiling bed / air mattress serviced
        </label>
        <label className={cn('flex items-center gap-2.5 text-[13px]', IA_OPTION_LABEL_CLASS)}>
          <input
            type="checkbox"
            className={IA_CHECKBOX_CLASS}
            disabled={disabled}
            checked={value.staffTrainingCoversHoist === true}
            onChange={(e) => onChange({ ...value, staffTrainingCoversHoist: e.target.checked })}
          />
          Staff training covers hoist type
        </label>
        <label className={cn('flex items-center gap-2.5 text-[13px]', IA_OPTION_LABEL_CLASS)}>
          <input
            type="checkbox"
            className={IA_CHECKBOX_CLASS}
            disabled={disabled}
            checked={value.otGuidanceRequired === true}
            onChange={(e) => onChange({ ...value, otGuidanceRequired: e.target.checked })}
          />
          Additional OT guidance required
        </label>
      </div>

      {hoistInUse && (!value.hoistServiced || !value.staffTrainingCoversHoist) ? (
        <p className="text-xs text-amber-800 dark:text-amber-200">
          Hoist in use without confirmed servicing or training — manager review recommended before hoist tasks.
        </p>
      ) : null}

      <div>
        <Label className={cn(IA_QUESTION_LABEL_CLASS, 'text-[13px]')}>Equipment comments</Label>
        <Input
          className="mt-1 h-9 text-sm"
          disabled={disabled}
          placeholder="Hoist type, mattress model…"
          value={value.comments ?? ''}
          onChange={(e) => onChange({ ...value, comments: e.target.value })}
        />
      </div>
    </div>
  )
}
