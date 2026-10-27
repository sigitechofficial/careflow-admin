import * as React from 'react'
import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

/** ⓘ next to a section heading: the section's explanation, shown on hover or focus. */
export function SectionInfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={`About ${label}`}
          onClick={e => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm text-left text-xs font-normal leading-snug">
        {children}
      </TooltipContent>
    </Tooltip>
  )
}
