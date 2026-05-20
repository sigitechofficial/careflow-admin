import type { ComponentProps, ReactNode } from 'react'
import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { NoYesToggle } from '@/components/ui/no-yes-toggle'

/** YES/NO toggle styled like legacy Care settings (brand primary green = Yes). */
export function SettingsNoYesToggle(props: ComponentProps<typeof NoYesToggle>) {
  return <NoYesToggle activeTone="primary" {...props} />
}

export function SettingsHint({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            aria-label="More information"
          >
            <Info className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

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
  hint,
  children,
  helperText,
}: {
  label: ReactNode
  hint?: string
  children: ReactNode
  helperText?: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-foreground">
          <span>{label}</span>
          {hint ? <SettingsHint text={hint} /> : null}
        </span>
        <div className="shrink-0">{children}</div>
      </div>
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
    </div>
  )
}
