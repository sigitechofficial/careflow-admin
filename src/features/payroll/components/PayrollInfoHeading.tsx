import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { cn } from '@/shared/lib/utils'

type Props = {
  title: string
  purpose: string
  description?: string
  className?: string
  as?: 'h4' | 'h5'
}

/** Section heading with an info icon explaining purpose (for payroll setup). */
export function PayrollInfoHeading({
  title,
  purpose,
  description,
  className,
  as = 'h4',
}: Props) {
  const HeadingTag = as
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-1.5">
        <HeadingTag
          className={cn(
            'font-medium text-foreground',
            as === 'h4' ? 'text-sm' : 'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
          )}
        >
          {title}
        </HeadingTag>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`About ${title}`}
            >
              <Info className={as === 'h4' ? 'h-3.5 w-3.5' : 'h-3 w-3'} aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="z-[110] max-w-sm text-left text-xs leading-snug"
          >
            <p className="mb-1 font-medium text-popover-foreground">Purpose</p>
            <p>{purpose}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
    </div>
  )
}
