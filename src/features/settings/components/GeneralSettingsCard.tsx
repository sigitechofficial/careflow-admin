import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/misc'

export function GeneralSettingsCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

export function SettingsRow({
  label,
  children,
  hint,
  subtext,
  required,
}: {
  label: string
  children: ReactNode
  hint?: string
  subtext?: string
  required?: boolean
}) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-foreground">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {children}
          {hint && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-primary hover:text-primary/80"
                  aria-label="More information"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {hint}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
    </div>
  )
}
