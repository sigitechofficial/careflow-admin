import * as React from 'react'
import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'

/** ⓘ beside a heading or label: a plain-words explanation, shown on hover or keyboard focus. */
export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex shrink-0 align-middle text-muted-foreground transition-colors hover:text-foreground"
            aria-label={`About ${label}`}
            data-testid="mock-info-tip"
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
    </TooltipProvider>
  )
}

/** A form label with its own ⓘ, joined to the field by id. */
export function FieldWithInfo({
  id,
  label,
  help,
  children,
}: {
  id: string
  label: string
  help: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
        <InfoTip label={label}>{help}</InfoTip>
      </div>
      {children}
    </div>
  )
}
