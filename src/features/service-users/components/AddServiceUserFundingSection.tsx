import * as React from 'react'
import { Info } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { BillingCardRulesEditor } from '@/features/billing/components/BillingCardRulesEditor'
import type { ChargeCardRule } from '@/features/billing/types/billing-cards.types'
import type { EnterpriseFunderRow } from '@/features/service-users/types'

/** Inline funding + charge-rate capture on the Add Service User page. Optional. */
export type AddFundingRatesState = {
  funderId: string
  authorisedWeeklyHours: string
  cardName: string
  effectiveFrom: string
  rules: ChargeCardRule[]
}

export function emptyFundingRates(): AddFundingRatesState {
  return {
    funderId: '',
    authorisedWeeklyHours: '',
    cardName: '',
    effectiveFrom: '',
    rules: [],
  }
}

/** Nothing worth saving unless a funder is chosen or at least one rate was added. */
export function fundingRatesHasContent(s: AddFundingRatesState): boolean {
  return Boolean(s.funderId || s.rules.length > 0)
}

/** Funding type is taken from the funder record, matching the Funding tab. */
export function funderFundingTypeId(
  funderId: string,
  funders: EnterpriseFunderRow[],
): string | null {
  return funders.find((f) => f.id === funderId)?.fundingType?.id ?? null
}

export function validateFundingRates(
  s: AddFundingRatesState,
  funders: EnterpriseFunderRow[],
): string | null {
  if (!s.funderId) return 'Select the funder these charge rates come from.'
  if (!funderFundingTypeId(s.funderId, funders)) {
    return 'The selected funder has no funding type configured — set it on the funder record first.'
  }
  if (s.rules.length === 0) {
    return 'Add at least one charge rate, or clear the funder to skip rates.'
  }
  if (s.rules.some((r) => !(Number(r.amount) > 0))) {
    return 'Every charge rate needs an amount greater than 0.'
  }
  if (s.authorisedWeeklyHours && !(Number(s.authorisedWeeklyHours) >= 0)) {
    return 'Authorised weekly hours must be a number.'
  }
  return null
}

/** Default rate-card name when the user leaves the field blank. */
export function defaultChargeCardName(funderName: string, suName: string): string {
  const who = suName.trim()
  return `${funderName}${who ? ` – ${who}` : ''} rates`
}

export function AddServiceUserFundingSection({
  value,
  onChange,
  funders,
  loading,
  suName,
}: {
  value: AddFundingRatesState
  onChange: (next: AddFundingRatesState) => void
  funders: EnterpriseFunderRow[]
  loading: boolean
  suName: string
}) {
  const set = <K extends keyof AddFundingRatesState>(k: K) => (v: AddFundingRatesState[K]) =>
    onChange({ ...value, [k]: v })

  const selectedFunder = funders.find((f) => f.id === value.funderId)
  const fundingTypeName = selectedFunder?.fundingType?.name ?? null
  const namePlaceholder = selectedFunder
    ? defaultChargeCardName(selectedFunder.name, suName)
    : 'e.g. Hounslow Council rates'

  return (
    <div className="space-y-5" data-testid="add-funding-rates">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <div className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-muted-foreground">
            <span>Funder / payer</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-primary" aria-label="Help">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-left">
                The local authority or organisation paying for this care. The rates below are saved as a
                charge card attached to this person's funding line.
              </TooltipContent>
            </Tooltip>
          </div>
          <Select
            value={value.funderId || '__none__'}
            onValueChange={(v) => set('funderId')(v === '__none__' ? '' : v)}
            disabled={loading && funders.length === 0}
          >
            <SelectTrigger className="w-full" data-testid="add-funding-funder-select">
              <SelectValue placeholder={loading ? 'Loading funders…' : 'Select funder'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— None —</SelectItem>
              {funders.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fundingTypeName ? (
            <p className="mt-1 text-xs text-muted-foreground">Funding type: {fundingTypeName}</p>
          ) : null}
        </div>

        <div>
          <div className="mb-1.5 text-sm font-medium text-slate-700 dark:text-muted-foreground">
            Authorised weekly hours
          </div>
          <Input
            type="number"
            min={0}
            step="0.25"
            value={value.authorisedWeeklyHours}
            onChange={(e) => set('authorisedWeeklyHours')(e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div>
          <div className="mb-1.5 text-sm font-medium text-slate-700 dark:text-muted-foreground">
            Rates effective from
          </div>
          <Input
            type="date"
            value={value.effectiveFrom}
            onChange={(e) => set('effectiveFrom')(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">Defaults to the service start date / today.</p>
        </div>

        <div className="md:col-span-3">
          <div className="mb-1.5 text-sm font-medium text-slate-700 dark:text-muted-foreground">
            Rate card name
          </div>
          <Input
            value={value.cardName}
            onChange={(e) => set('cardName')(e.target.value)}
            placeholder={namePlaceholder}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-slate-700 dark:text-muted-foreground">
          Charge rates
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <BillingCardRulesEditor
            mode="charge"
            rules={value.rules}
            onChange={(rules) => set('rules')(rules as ChargeCardRule[])}
          />
        </div>
      </div>
    </div>
  )
}
