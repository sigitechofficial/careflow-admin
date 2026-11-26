import { Info } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

/** Plain-words box at the top of a section: what it is for and how it works. */
export function SectionIntro({
  purpose,
  steps,
  testId,
  className,
}: {
  purpose: string
  steps: string[]
  testId?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex gap-2.5 rounded-md border border-sky-200 bg-sky-50/70 px-3.5 py-3 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100',
        className,
      )}
      data-testid={testId}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden />
      <div className="space-y-1.5">
        <p className="font-medium">{purpose}</p>
        <ul className="list-disc space-y-0.5 pl-4 text-[13px] leading-snug text-sky-900/90 dark:text-sky-100/90">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
