import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'

type Props = {
  label: string
  tooltip: string
  required?: boolean
}

export function MedicationFieldLabelWithTooltip({ label, tooltip, required }: Props) {
  return (
    <span className="flex items-center gap-1 text-sm font-medium">
      {label}
      {required ? <span className="text-destructive">*</span> : null}
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`About ${label}`}
            >
              <Info className="h-3.5 w-3.5" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-sm text-left leading-snug">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  )
}
