import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { cn } from '@/shared/lib/utils'

type Props = {
  label: string
  tooltip: string
  required?: boolean
  className?: string
  size?: 'sm' | 'md'
}

export function BillingFieldLabel({ label, tooltip, required, className, size = 'md' }: Props) {
  return (
    <span
      className={cn(
        'flex items-center gap-1 font-medium',
        size === 'sm' ? 'text-xs text-muted-foreground' : 'text-sm text-foreground',
        className,
      )}
    >
      {label}
      {required ? <span className="text-destructive">*</span> : null}
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
        <TooltipContent side="top" className="max-w-sm text-left text-xs leading-snug">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </span>
  )
}
