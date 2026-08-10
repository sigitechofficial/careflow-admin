import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { cn } from '@/shared/lib/utils'

type Props = {
  label: string
  info: string
  className?: string
}

/** Label + (i) tip — plain-English purpose for payroll form fields. */
export function PayrollFieldLabel({ label, info, className }: Props) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-medium text-foreground', className)}>
      {label}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`About ${label}`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="z-[110] max-w-sm text-left text-xs leading-snug">
          {info}
        </TooltipContent>
      </Tooltip>
    </span>
  )
}
