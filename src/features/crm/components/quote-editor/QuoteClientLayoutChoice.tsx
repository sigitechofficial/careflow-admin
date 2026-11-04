import { ListChecks, ReceiptText } from 'lucide-react'
import type { QuoteClientLayout } from '@/features/crm/types/quotation.types'

const OPTIONS: { value: QuoteClientLayout; title: string; detail: string; icon: typeof ListChecks }[] = [
  {
    value: 'DETAILED',
    title: 'Visits with times & rates',
    detail: 'Add each visit with its time and length; the price is worked out from the rates. The client sees every visit with its time and price.',
    icon: ListChecks,
  },
  {
    value: 'SUMMARY',
    title: 'Total amount & visit slots',
    detail: 'Type the weekly total yourself and list the visits as Morning / Lunchtime / Evening / Night. The client sees no times or per-visit prices.',
    icon: ReceiptText,
  },
]

/** How the quote is priced, which is also what the client's copy shows. */
export function QuoteClientLayoutChoice({
  value,
  onChange,
  readOnly,
}: {
  value: QuoteClientLayout
  onChange: (layout: QuoteClientLayout) => void
  readOnly: boolean
}) {
  return (
    <section className="flex flex-col gap-2" data-testid="quote-client-layout">
      <div>
        <h4 className="text-sm font-semibold">How do you want to price this quote?</h4>
        <p className="text-xs text-muted-foreground">You can switch at any time while the quote is a draft.</p>
      </div>
      <div role="radiogroup" aria-label="How to price this quote" className="grid gap-2 sm:grid-cols-2">
        {OPTIONS.map(o => {
          const selected = value === o.value
          const Icon = o.icon
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={readOnly}
              onClick={() => onChange(o.value)}
              className={`flex items-start gap-3 rounded-lg border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-70 ${
                selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/40'
              }`}
            >
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{o.title}</span>
                <span className="block text-xs text-muted-foreground">{o.detail}</span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
