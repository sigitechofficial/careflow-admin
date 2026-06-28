import { contentOverlineClass } from '@/shared/ui/content-section'
import { Info } from 'lucide-react'
import { NoYesToggle } from '@/shared/ui/no-yes-toggle'
import { Label } from '@/shared/ui/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { VISIT_PLAN_ANALYSIS_AREAS } from '@/features/service-users/visit-plan/visit-plan-constants'

function FieldHelp({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex text-sky-600 hover:text-sky-800 dark:text-sky-400"
            aria-label="More information"
          >
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function YesNoRow({
  id,
  checked,
  disabled,
  onChange,
  label,
}: {
  id: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <div className="flex flex-col gap-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="min-w-0 flex-1 text-sm text-foreground">{label}</span>
      <NoYesToggle
        id={id}
        value={checked}
        disabled={disabled}
        onChange={onChange}
        labelOff="NO"
        labelOn="YES"
        className="shrink-0"
      />
    </div>
  )
}

type Props = {
  slot: VisitPlanSlot
  disabled?: boolean
  onChange: (patch: Partial<VisitPlanSlot>) => void
}

export function VisitPlanSlotAdditionalDetailsPanel({ slot, disabled, onChange }: Props) {
  return (
    <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-1">
      <YesNoRow
        id="notes-required"
        checked={slot.notesRequired}
        disabled={disabled}
        onChange={(notesRequired) => onChange({ notesRequired })}
        label="Do you want to make the recording of notes mandatory?"
      />
      <YesNoRow
        id="photos-allowed"
        checked={slot.photoAllowed}
        disabled={disabled}
        onChange={(photoAllowed) => onChange({ photoAllowed })}
        label="Are photos allowed for this action?"
      />
      <YesNoRow
        id="share-family"
        checked={slot.shareOutcomeWithFamily}
        disabled={disabled}
        onChange={(shareOutcomeWithFamily) => onChange({ shareOutcomeWithFamily })}
        label="Do you want to share the outcome with the family?"
      />

      <div className="pt-3">
        <div className="flex items-center gap-2">
          <Label className={contentOverlineClass}>
            Do you want this as part of an analysis area report?
          </Label>
          <FieldHelp text="Groups visit outcomes into the selected analysis report category." />
        </div>
        <Select
          value={slot.analysisArea ?? '__none__'}
          disabled={disabled}
          onValueChange={(v) => onChange({ analysisArea: v === '__none__' ? null : v })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select analysis area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Select analysis area</SelectItem>
            {VISIT_PLAN_ANALYSIS_AREAS.filter((a) => a.value).map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
