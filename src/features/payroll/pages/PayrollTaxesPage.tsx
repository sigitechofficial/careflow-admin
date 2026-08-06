import * as React from 'react'
import { Info, Pencil, Plus, Trash2 } from 'lucide-react'
import { PayrollSectionLayout } from '@/features/payroll/components/PayrollSectionLayout'
import {
  useCreatePayrollTaxCode,
  useDeletePayrollTaxCode,
  usePayrollStatutoryRates,
  usePayrollTaxCodes,
  usePayrollTaxYears,
  useUpdatePayrollStatutoryRates,
  useUpdatePayrollTaxCode,
} from '@/features/payroll/hooks/usePayroll'
import { useAuthStore } from '@/features/auth/store'
import type {
  PayrollStatutoryRateSet,
  PayrollTaxCode,
  PayrollTaxCodeGroup,
} from '@/features/payroll/types/payroll.types'
import type { UpdatePayrollStatutoryRatesInput } from '@/features/payroll/types/payroll-api.types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { cn } from '@/shared/lib/utils'

const GROUPS: PayrollTaxCodeGroup[] = ['STANDARD', 'SPECIAL', 'SCOTLAND', 'WALES']

const GROUP_LABEL: Record<PayrollTaxCodeGroup, string> = {
  STANDARD: 'Standard',
  SPECIAL: 'Special',
  SCOTLAND: 'Scotland',
  WALES: 'Wales',
}

type FormState = {
  code: string
  label: string
  description: string
  group: PayrollTaxCodeGroup
  sortOrder: number
  isActive: boolean
}

const emptyForm = (): FormState => ({
  code: '',
  label: '',
  description: '',
  group: 'STANDARD',
  sortOrder: 0,
  isActive: true,
})

type RatesForm = {
  personalAllowanceAnnual: string
  basicRateBandAnnual: string
  higherRateThresholdAnnual: string
  additionalRateThresholdAnnual: string
  basicRatePercent: string
  higherRatePercent: string
  additionalRatePercent: string
  niEmployeeRateMainPercent: string
  niEmployeeRateUpperPercent: string
  niEmployerRatePercent: string
  niPtMonthly: string
  niUelMonthly: string
  sourceNote: string
}

function ratesToForm(row: PayrollStatutoryRateSet): RatesForm {
  return {
    personalAllowanceAnnual: String(row.personalAllowanceAnnual),
    basicRateBandAnnual: String(row.basicRateBandAnnual),
    higherRateThresholdAnnual: String(row.higherRateThresholdAnnual),
    additionalRateThresholdAnnual: String(row.additionalRateThresholdAnnual),
    basicRatePercent: String(row.basicRatePercent),
    higherRatePercent: String(row.higherRatePercent),
    additionalRatePercent: String(row.additionalRatePercent),
    niEmployeeRateMainPercent: String(row.niEmployeeRateMainPercent),
    niEmployeeRateUpperPercent: String(row.niEmployeeRateUpperPercent),
    niEmployerRatePercent: String(row.niEmployerRatePercent),
    niPtMonthly: String(row.niPtMonthly),
    niUelMonthly: String(row.niUelMonthly),
    sourceNote: row.sourceNote ?? '',
  }
}

function parseNum(value: string): number | undefined {
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export default function PayrollTaxesPage() {
  const canManage = useAuthStore((s) => s.can('payroll.settings.manage'))
  const [tab, setTab] = React.useState<'codes' | 'rates'>('codes')

  const { data = [], isLoading } = usePayrollTaxCodes({ includeInactive: true })
  const createMut = useCreatePayrollTaxCode()
  const updateMut = useUpdatePayrollTaxCode()
  const deleteMut = useDeletePayrollTaxCode()

  const { data: taxYears = [] } = usePayrollTaxYears()
  const currentYear = taxYears.find((t) => t.isCurrent) ?? taxYears[0] ?? null
  const [taxYearId, setTaxYearId] = React.useState('')
  React.useEffect(() => {
    if (!taxYearId && currentYear) setTaxYearId(currentYear.id)
  }, [currentYear, taxYearId])

  const { data: rateSets = [], isLoading: ratesLoading } = usePayrollStatutoryRates(
    taxYearId ? { taxYearId } : undefined,
  )
  const rateSet = rateSets[0] ?? null
  const updateRatesMut = useUpdatePayrollStatutoryRates()
  const [ratesForm, setRatesForm] = React.useState<RatesForm | null>(null)
  React.useEffect(() => {
    if (rateSet) setRatesForm(ratesToForm(rateSet))
    else setRatesForm(null)
  }, [rateSet])

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<PayrollTaxCode | null>(null)
  const [form, setForm] = React.useState<FormState>(emptyForm)

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setOpen(true)
  }

  const openEdit = (row: PayrollTaxCode) => {
    setEditing(row)
    setForm({
      code: row.code,
      label: row.label,
      description: row.description ?? '',
      group: row.group,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
    })
    setOpen(true)
  }

  const isPending = createMut.isPending || updateMut.isPending || deleteMut.isPending

  const handleSave = () => {
    const payload = {
      code: form.code.trim().toUpperCase(),
      label: form.label.trim(),
      description: form.description.trim() || null,
      group: form.group,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    }
    if (!payload.code || !payload.label) return

    if (editing) {
      updateMut.mutate({ id: editing.id, body: payload }, { onSuccess: () => setOpen(false) })
    } else {
      createMut.mutate(payload, { onSuccess: () => setOpen(false) })
    }
  }

  const handleSaveRates = () => {
    if (!rateSet || !ratesForm) return
    const body: UpdatePayrollStatutoryRatesInput = {
      personalAllowanceAnnual: parseNum(ratesForm.personalAllowanceAnnual),
      basicRateBandAnnual: parseNum(ratesForm.basicRateBandAnnual),
      higherRateThresholdAnnual: parseNum(ratesForm.higherRateThresholdAnnual),
      additionalRateThresholdAnnual: parseNum(ratesForm.additionalRateThresholdAnnual),
      basicRatePercent: parseNum(ratesForm.basicRatePercent),
      higherRatePercent: parseNum(ratesForm.higherRatePercent),
      additionalRatePercent: parseNum(ratesForm.additionalRatePercent),
      niEmployeeRateMainPercent: parseNum(ratesForm.niEmployeeRateMainPercent),
      niEmployeeRateUpperPercent: parseNum(ratesForm.niEmployeeRateUpperPercent),
      niEmployerRatePercent: parseNum(ratesForm.niEmployerRatePercent),
      niPtMonthly: parseNum(ratesForm.niPtMonthly),
      niUelMonthly: parseNum(ratesForm.niUelMonthly),
      sourceNote: ratesForm.sourceNote.trim() || null,
    }
    updateRatesMut.mutate({ id: rateSet.id, body })
  }

  const setRateField = (key: keyof RatesForm, value: string) => {
    setRatesForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  return (
    <PayrollSectionLayout
      title="Taxes"
      description="Manage PAYE tax codes and the monthly (Month 1) Income Tax & NI rates used on UK payroll runs."
      testId="payroll-taxes-page"
    >
      <TooltipProvider delayDuration={200}>
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            tab === 'codes'
              ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
              : 'text-muted-foreground hover:bg-muted/40',
          )}
          onClick={() => setTab('codes')}
        >
          Tax codes
        </button>
        <button
          type="button"
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            tab === 'rates'
              ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
              : 'text-muted-foreground hover:bg-muted/40',
          )}
          onClick={() => setTab('rates')}
        >
          Tax &amp; NI rates
        </button>
      </div>

      {tab === 'codes' ? (
        <>
          <div className="mb-4 flex flex-wrap justify-end gap-2">
            {canManage ? (
              <Button size="sm" className="gap-1.5" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add tax code
              </Button>
            ) : null}
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-border bg-muted/10 text-muted-foreground">
                    <tr>
                      <th className="py-2.5 pl-4 pr-3 font-medium">Code</th>
                      <th className="py-2.5 pr-3 font-medium">Label</th>
                      <th className="py-2.5 pr-3 font-medium">Group</th>
                      <th className="py-2.5 pr-3 font-medium">Description</th>
                      <th className="py-2.5 pr-3 font-medium">Active</th>
                      {canManage ? (
                        <th className="py-2.5 pr-4 text-right font-medium">Actions</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <tr
                        key={row.id}
                        className={cn(
                          'border-b border-border/70 transition-colors hover:bg-muted/20',
                          !row.isActive && 'opacity-60',
                        )}
                      >
                        <td className="py-3 pl-4 pr-3 font-mono text-xs font-medium">{row.code}</td>
                        <td className="py-3 pr-3 font-medium">{row.label}</td>
                        <td className="py-3 pr-3 text-muted-foreground">
                          {GROUP_LABEL[row.group] ?? row.group}
                        </td>
                        <td className="py-3 pr-3 text-muted-foreground">
                          {row.description || '—'}
                        </td>
                        <td className="py-3 pr-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                              row.isActive
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {row.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        {canManage ? (
                          <td className="py-3 pr-4 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 gap-1.5"
                                disabled={isPending}
                                onClick={() => openEdit(row)}
                              >
                                <Pencil className="h-3.5 w-3.5" aria-hidden />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                disabled={isPending}
                                onClick={() => {
                                  const ok = window.confirm(
                                    `Delete tax code “${row.code}”? It will no longer appear in employee setup.`,
                                  )
                                  if (!ok) return
                                  deleteMut.mutate(row.id)
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                Delete
                              </Button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                    {data.length === 0 ? (
                      <tr>
                        <td
                          colSpan={canManage ? 6 : 5}
                          className="px-4 py-10 text-center text-muted-foreground"
                        >
                          No tax codes yet. Deploy seeders create the standard HMRC list, or add one
                          manually.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1.5 text-sm">
              <FieldLabel
                label="Tax year"
                info="Which tax year these rates belong to. The current year is used for employees and payroll runs."
              />
              <select
                className="h-9 min-w-[200px] rounded-md border border-input bg-background px-2 text-sm"
                value={taxYearId}
                onChange={(e) => setTaxYearId(e.target.value)}
              >
                {taxYears.length === 0 ? (
                  <option value="">No tax years — add under Tax years first</option>
                ) : null}
                {taxYears.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code}
                    {t.isCurrent ? ' (current)' : ''}
                  </option>
                ))}
              </select>
            </label>
            {canManage && rateSet && ratesForm ? (
              <Button
                size="sm"
                disabled={updateRatesMut.isPending}
                onClick={handleSaveRates}
              >
                {updateRatesMut.isPending ? 'Saving…' : 'Save rates'}
              </Button>
            ) : null}
          </div>

          <p className="text-sm text-muted-foreground">
            Read each step top to bottom: it shows <span className="font-medium text-foreground">which
            pay range</span> gets <span className="font-medium text-foreground">which rate</span>.
            Used for monthly (Month 1) payroll and the employee tax panel.
          </p>

          {ratesLoading ? (
            <p className="text-sm text-muted-foreground">Loading rates…</p>
          ) : !rateSet || !ratesForm ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No rate set for this tax year. Activate/create a tax year (Add UK tax years), then
              reopen this tab — rates are created automatically.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Income Tax ladder */}
              <section className="overflow-hidden rounded-xl border border-border">
                <div className="border-b border-border bg-muted/30 px-4 py-3">
                  <h3 className="text-sm font-semibold text-foreground">Income Tax — yearly pay</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Tax is only charged on the part of pay that sits in each band.
                  </p>
                </div>
                <div className="divide-y divide-border">
                  <RateBandRow
                    step={1}
                    title="Tax-free"
                    summary={`£0 → ${formatMoney(ratesForm.personalAllowanceAnnual)} / year`}
                    rateLabel="0% tax"
                    rateTone="free"
                    disabled={!canManage}
                  >
                    <RateField
                      label="Ends at (personal allowance)"
                      info="Pay up to this amount each year has no Income Tax."
                      value={ratesForm.personalAllowanceAnnual}
                      onChange={(v) => setRateField('personalAllowanceAnnual', v)}
                      disabled={!canManage}
                      prefix="£"
                    />
                  </RateBandRow>

                  <RateBandRow
                    step={2}
                    title="Basic rate"
                    summary={`${formatMoney(ratesForm.personalAllowanceAnnual)} → ${formatMoney(ratesForm.higherRateThresholdAnnual)} / year`}
                    rateLabel={`${ratesForm.basicRatePercent || '—'}% tax`}
                    rateTone="basic"
                    disabled={!canManage}
                  >
                    <RateField
                      label="Ends at (higher rate starts)"
                      info="From the personal allowance up to this amount, basic-rate tax applies."
                      value={ratesForm.higherRateThresholdAnnual}
                      onChange={(v) => setRateField('higherRateThresholdAnnual', v)}
                      disabled={!canManage}
                      prefix="£"
                    />
                    <RateField
                      label="Tax rate"
                      info="The normal tax rate — usually 20%."
                      value={ratesForm.basicRatePercent}
                      onChange={(v) => setRateField('basicRatePercent', v)}
                      disabled={!canManage}
                      suffix="%"
                    />
                    <RateField
                      label="Band size (optional)"
                      info="How wide this band is. Often personal allowance + this size = higher rate start."
                      value={ratesForm.basicRateBandAnnual}
                      onChange={(v) => setRateField('basicRateBandAnnual', v)}
                      disabled={!canManage}
                      prefix="£"
                    />
                  </RateBandRow>

                  <RateBandRow
                    step={3}
                    title="Higher rate"
                    summary={`${formatMoney(ratesForm.higherRateThresholdAnnual)} → ${formatMoney(ratesForm.additionalRateThresholdAnnual)} / year`}
                    rateLabel={`${ratesForm.higherRatePercent || '—'}% tax`}
                    rateTone="higher"
                    disabled={!canManage}
                  >
                    <RateField
                      label="Ends at (top rate starts)"
                      info="From the higher start up to this amount, higher-rate tax applies."
                      value={ratesForm.additionalRateThresholdAnnual}
                      onChange={(v) => setRateField('additionalRateThresholdAnnual', v)}
                      disabled={!canManage}
                      prefix="£"
                    />
                    <RateField
                      label="Tax rate"
                      info="Tax rate for higher earners — usually 40%."
                      value={ratesForm.higherRatePercent}
                      onChange={(v) => setRateField('higherRatePercent', v)}
                      disabled={!canManage}
                      suffix="%"
                    />
                  </RateBandRow>

                  <RateBandRow
                    step={4}
                    title="Additional rate"
                    summary={`Above ${formatMoney(ratesForm.additionalRateThresholdAnnual)} / year`}
                    rateLabel={`${ratesForm.additionalRatePercent || '—'}% tax`}
                    rateTone="additional"
                    disabled={!canManage}
                  >
                    <RateField
                      label="Tax rate"
                      info="The highest tax rate — usually 45%."
                      value={ratesForm.additionalRatePercent}
                      onChange={(v) => setRateField('additionalRatePercent', v)}
                      disabled={!canManage}
                      suffix="%"
                    />
                  </RateBandRow>
                </div>
              </section>

              {/* NI ladder */}
              <section className="overflow-hidden rounded-xl border border-border">
                <div className="border-b border-border bg-muted/30 px-4 py-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    National Insurance — monthly pay (Category A)
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Taken from the employee’s pay. Employer NI is separate and is not deducted from
                    net pay.
                  </p>
                </div>
                <div className="divide-y divide-border">
                  <RateBandRow
                    step={1}
                    title="No employee NI"
                    summary={`£0 → ${formatMoney(ratesForm.niPtMonthly)} / month`}
                    rateLabel="0% NI"
                    rateTone="free"
                    disabled={!canManage}
                  >
                    <RateField
                      label="Ends at (primary threshold)"
                      info="Monthly pay below this has no employee National Insurance."
                      value={ratesForm.niPtMonthly}
                      onChange={(v) => setRateField('niPtMonthly', v)}
                      disabled={!canManage}
                      prefix="£"
                    />
                  </RateBandRow>

                  <RateBandRow
                    step={2}
                    title="Main NI"
                    summary={`${formatMoney(ratesForm.niPtMonthly)} → ${formatMoney(ratesForm.niUelMonthly)} / month`}
                    rateLabel={`${ratesForm.niEmployeeRateMainPercent || '—'}% NI`}
                    rateTone="basic"
                    disabled={!canManage}
                  >
                    <RateField
                      label="Ends at (upper earnings limit)"
                      info="Between the primary threshold and this amount, the main NI rate applies."
                      value={ratesForm.niUelMonthly}
                      onChange={(v) => setRateField('niUelMonthly', v)}
                      disabled={!canManage}
                      prefix="£"
                    />
                    <RateField
                      label="NI rate"
                      info="Usual employee NI rate — often 8%."
                      value={ratesForm.niEmployeeRateMainPercent}
                      onChange={(v) => setRateField('niEmployeeRateMainPercent', v)}
                      disabled={!canManage}
                      suffix="%"
                    />
                  </RateBandRow>

                  <RateBandRow
                    step={3}
                    title="Upper NI"
                    summary={`Above ${formatMoney(ratesForm.niUelMonthly)} / month`}
                    rateLabel={`${ratesForm.niEmployeeRateUpperPercent || '—'}% NI`}
                    rateTone="higher"
                    disabled={!canManage}
                  >
                    <RateField
                      label="NI rate"
                      info="Lower NI rate on very high monthly pay — usually 2%."
                      value={ratesForm.niEmployeeRateUpperPercent}
                      onChange={(v) => setRateField('niEmployeeRateUpperPercent', v)}
                      disabled={!canManage}
                      suffix="%"
                    />
                  </RateBandRow>

                  <RateBandRow
                    step={4}
                    title="Employer NI"
                    summary="Paid by the company (not from employee net pay)"
                    rateLabel={`${ratesForm.niEmployerRatePercent || '—'}%`}
                    rateTone="employer"
                    disabled={!canManage}
                  >
                    <RateField
                      label="Employer NI rate"
                      info="What the company pays to HMRC. Not taken from the employee’s pay."
                      value={ratesForm.niEmployerRatePercent}
                      onChange={(v) => setRateField('niEmployerRatePercent', v)}
                      disabled={!canManage}
                      suffix="%"
                    />
                  </RateBandRow>
                </div>
              </section>

              <label className="block space-y-1 text-sm">
                <FieldLabel
                  label="Source / notes"
                  info="Optional note — where these rates came from (for example GOV.UK 2026/27)."
                />
                <Input
                  value={ratesForm.sourceNote}
                  onChange={(e) => setRateField('sourceNote', e.target.value)}
                  disabled={!canManage}
                  placeholder="e.g. GOV.UK 2026/27 England rates"
                />
              </label>
            </div>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit tax code' : 'Add tax code'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <label className="block space-y-1 text-sm">
              <FieldLabel
                label="Code"
                info="The tax code from HMRC (for example 1257L or BR). Type it exactly as on the letter."
              />
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="e.g. 1257L"
                className="font-mono uppercase"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <FieldLabel
                label="Label"
                info="Simple name shown in the list."
              />
              <Input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Shown in employee setup"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <FieldLabel
                label="Description"
                info="A short extra help note (optional)."
              />
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional help text"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <FieldLabel
                label="Group"
                info="Groups the list — Standard, Special, Scotland, or Wales."
              />
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={form.group}
                onChange={(e) =>
                  setForm((f) => ({ ...f, group: e.target.value as PayrollTaxCodeGroup }))
                }
              >
                {GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {GROUP_LABEL[g]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <FieldLabel
                label="Sort order"
                info="Smaller numbers show first in the list."
              />
              <Input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))
                }
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              <span className="inline-flex items-center gap-1.5">
                Active (shown in employee setup)
                <InfoTip text="If turned off, it will not show in the employee list. It is kept for history." />
              </span>
            </label>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={isPending || !form.code.trim() || !form.label.trim()}
              onClick={handleSave}
            >
              {isPending ? 'Saving…' : editing ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </TooltipProvider>
    </PayrollSectionLayout>
  )
}

function formatMoney(value: string): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '£—'
  return `£${n.toLocaleString('en-GB')}`
}

const RATE_TONE: Record<string, string> = {
  free: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900',
  basic: 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900',
  higher:
    'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900',
  additional:
    'bg-rose-50 text-rose-900 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900',
  employer:
    'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/50 dark:text-slate-200 dark:ring-slate-700',
}

function RateBandRow({
  step,
  title,
  summary,
  rateLabel,
  rateTone,
  children,
}: {
  step: number
  title: string
  summary: string
  rateLabel: string
  rateTone: keyof typeof RATE_TONE
  disabled?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] sm:items-start sm:gap-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
            {step}
          </span>
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          <span
            className={cn(
              'inline-flex rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset',
              RATE_TONE[rateTone],
            )}
          >
            {rateLabel}
          </span>
        </div>
        <p className="pl-8 text-sm font-medium tabular-nums text-foreground">{summary}</p>
        <p className="pl-8 text-xs text-muted-foreground">
          {rateTone === 'free'
            ? 'No deduction on this part of pay.'
            : rateTone === 'employer'
              ? 'Company cost only.'
              : 'This rate applies only to pay inside this range.'}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  )
}

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="More information"
          onClick={(e) => e.preventDefault()}
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="z-[110] max-w-sm text-left text-xs leading-snug">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

function FieldLabel({ label, info }: { label: string; info: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
      {label}
      <InfoTip text={info} />
    </span>
  )
}

function RateField({
  label,
  info,
  value,
  onChange,
  disabled,
  prefix,
  suffix,
}: {
  label: string
  info: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  prefix?: string
  suffix?: string
}) {
  return (
    <label className="block space-y-1 text-sm">
      <FieldLabel label={label} info={info} />
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {prefix}
          </span>
        ) : null}
        <Input
          type="number"
          step="any"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            'tabular-nums',
            prefix ? 'pl-6' : null,
            suffix ? 'pr-8' : null,
          )}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  )
}
