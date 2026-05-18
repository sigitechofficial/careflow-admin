import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const TOOLTIP_TEXT =
  'Customer events are general service-user calendar entries such as appointments, birthdays, family and social visits, care and medication reviews, assessments, and reminders. This calendar is separate from Scheduling, which manages visits, jobs, and carer allocation.'

export function CalendarInfoTooltip() {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="About customer events on the service user calendar"
          >
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm text-left leading-snug">
          {TOOLTIP_TEXT}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
