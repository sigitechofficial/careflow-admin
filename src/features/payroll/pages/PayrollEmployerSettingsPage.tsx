import * as React from 'react'
import { Info } from 'lucide-react'
import { PayrollSectionLayout } from '@/features/payroll/components/PayrollSectionLayout'
import {
  usePayrollEmployerSettings,
  useUpdatePayrollEmployerSettings,
} from '@/features/payroll/hooks/usePayroll'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { cn } from '@/shared/lib/utils'

type FormState = {
  hmrcOfficeNumber: string
  employerPayeReference: string
  accountsOfficeReference: string
  taxDistrict: string
  employerTradingName: string
  notes: string
}

function emptyForm(): FormState {
  return {
    hmrcOfficeNumber: '',
    employerPayeReference: '',
    accountsOfficeReference: '',
    taxDistrict: '',
    employerTradingName: '',
    notes: '',
  }
}

export default function PayrollEmployerSettingsPage() {
  const canManage = useAuthStore((s) => s.can('payroll.settings.manage'))
  const { data, isLoading } = usePayrollEmployerSettings()
  const updateMut = useUpdatePayrollEmployerSettings()
  const [form, setForm] = React.useState<FormState>(emptyForm())

  React.useEffect(() => {
    if (!data) return
    setForm({
      hmrcOfficeNumber: data.hmrcOfficeNumber ?? '',
      employerPayeReference: data.employerPayeReference ?? '',
      accountsOfficeReference: data.accountsOfficeReference ?? '',
      taxDistrict: data.taxDistrict ?? '',
      employerTradingName: data.employerTradingName ?? '',
      notes: data.notes ?? '',
    })
  }, [data])

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const fullPaye =
    form.hmrcOfficeNumber.trim() && form.employerPayeReference.trim()
      ? `${form.hmrcOfficeNumber.trim()}/${form.employerPayeReference.trim().toUpperCase()}`
      : null

  const handleSave = () => {
    updateMut.mutate({
      hmrcOfficeNumber: form.hmrcOfficeNumber.trim() || null,
      employerPayeReference: form.employerPayeReference.trim() || null,
      accountsOfficeReference: form.accountsOfficeReference.trim() || null,
      taxDistrict: form.taxDistrict.trim() || null,
      employerTradingName: form.employerTradingName.trim() || null,
      notes: form.notes.trim() || null,
    })
  }

  return (
    <PayrollSectionLayout
      title="Employer PAYE"
      description="Your company HMRC employer identity. These references go on every FPS/EPS when filing is built (T12+)."
      testId="payroll-employer-settings-page"
    >
      <TooltipProvider delayDuration={200}>
        <div className="space-y-4">
          <div
            className={cn(
              'rounded-xl border px-4 py-3 text-sm',
              data?.isComplete
                ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100'
                : 'border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100',
            )}
          >
            {data?.isComplete ? (
              <p>
                Ready for future FPS identity — full PAYE reference{' '}
                <span className="font-semibold tabular-nums">{data.fullPayeReference}</span>.
              </p>
            ) : (
              <p>
                Add the office number, PAYE reference (after the slash), and Accounts Office
                reference from your HMRC employer registration letter.
              </p>
            )}
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading employer settings…</p>
          ) : (
            <div className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <FieldLabel
                  label="HMRC office number"
                  info="First 3 digits of your Employer PAYE reference (for example 123 from 123/AB45678)."
                />
                <Input
                  value={form.hmrcOfficeNumber}
                  onChange={(e) =>
                    setField('hmrcOfficeNumber', e.target.value.replace(/\D/g, '').slice(0, 3))
                  }
                  disabled={!canManage}
                  placeholder="123"
                  className="tabular-nums"
                  inputMode="numeric"
                  maxLength={3}
                />
              </label>

              <label className="block space-y-1 text-sm">
                <FieldLabel
                  label="Employer PAYE reference"
                  info="The part after the slash on your PAYE reference (for example AB45678)."
                />
                <Input
                  value={form.employerPayeReference}
                  onChange={(e) => setField('employerPayeReference', e.target.value.toUpperCase())}
                  disabled={!canManage}
                  placeholder="AB45678"
                  className="font-mono uppercase"
                />
              </label>

              <label className="block space-y-1 text-sm sm:col-span-2">
                <FieldLabel
                  label="Full PAYE reference (preview)"
                  info="Shown as office/reference — this is what HMRC and FPS use together."
                />
                <Input
                  value={fullPaye ?? ''}
                  readOnly
                  placeholder="123/AB45678"
                  className="tabular-nums text-muted-foreground"
                />
              </label>

              <label className="block space-y-1 text-sm sm:col-span-2">
                <FieldLabel
                  label="Accounts Office reference"
                  info="From your HMRC registration letter. Format like 123PA00012345. Needed on every FPS/EPS."
                />
                <Input
                  value={form.accountsOfficeReference}
                  onChange={(e) =>
                    setField('accountsOfficeReference', e.target.value.toUpperCase())
                  }
                  disabled={!canManage}
                  placeholder="123PA00012345"
                  className="font-mono uppercase"
                />
              </label>

              <label className="block space-y-1 text-sm">
                <FieldLabel
                  label="Tax district (optional)"
                  info="Optional office or district name for your team. Not a substitute for the office number."
                />
                <Input
                  value={form.taxDistrict}
                  onChange={(e) => setField('taxDistrict', e.target.value)}
                  disabled={!canManage}
                  placeholder="e.g. London"
                />
              </label>

              <label className="block space-y-1 text-sm">
                <FieldLabel
                  label="Employer trading name (optional)"
                  info="Legal or trading name to use on payroll filings later."
                />
                <Input
                  value={form.employerTradingName}
                  onChange={(e) => setField('employerTradingName', e.target.value)}
                  disabled={!canManage}
                  placeholder="Care Services Ltd"
                />
              </label>

              <label className="block space-y-1 text-sm sm:col-span-2">
                <FieldLabel
                  label="Notes (optional)"
                  info="Internal note — where these references came from."
                />
                <Input
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  disabled={!canManage}
                  placeholder="From HMRC employer registration letter…"
                />
              </label>

              {canManage ? (
                <div className="sm:col-span-2">
                  <Button size="sm" disabled={updateMut.isPending} onClick={handleSave}>
                    {updateMut.isPending ? 'Saving…' : 'Save employer settings'}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground sm:col-span-2">
                  You can view these settings. Ask an admin with payroll settings manage to edit.
                </p>
              )}
            </div>
          )}
        </div>
      </TooltipProvider>
    </PayrollSectionLayout>
  )
}

function FieldLabel({ label, info }: { label: string; info: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
      {label}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`About ${label}`}
            onClick={(e) => e.preventDefault()}
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="z-[110] max-w-sm text-left text-xs leading-snug">
          {info}
        </TooltipContent>
      </Tooltip>
    </span>
  )
}
