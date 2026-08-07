import * as React from 'react'
import { Info } from 'lucide-react'
import { PayrollSectionLayout } from '@/features/payroll/components/PayrollSectionLayout'
import { PayrollEpsPreviewPanel } from '@/features/payroll/components/PayrollEpsPreviewPanel'
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
  activeHmrcEnvironment: 'TEST' | 'LIVE'
  gatewayTestUserId: string
  gatewayTestPassword: string
  clearTestPassword: boolean
  gatewayLiveUserId: string
  gatewayLivePassword: string
  clearLivePassword: boolean
  employmentAllowanceClaimed: boolean
}

function emptyForm(): FormState {
  return {
    hmrcOfficeNumber: '',
    employerPayeReference: '',
    accountsOfficeReference: '',
    taxDistrict: '',
    employerTradingName: '',
    notes: '',
    activeHmrcEnvironment: 'TEST',
    gatewayTestUserId: '',
    gatewayTestPassword: '',
    clearTestPassword: false,
    gatewayLiveUserId: '',
    gatewayLivePassword: '',
    clearLivePassword: false,
    employmentAllowanceClaimed: false,
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
      activeHmrcEnvironment: data.activeHmrcEnvironment ?? 'TEST',
      gatewayTestUserId: data.gatewayTestUserId ?? '',
      gatewayTestPassword: '',
      clearTestPassword: false,
      gatewayLiveUserId: data.gatewayLiveUserId ?? '',
      gatewayLivePassword: '',
      clearLivePassword: false,
      employmentAllowanceClaimed: Boolean(data.employmentAllowanceClaimed),
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
    updateMut.mutate(
      {
        hmrcOfficeNumber: form.hmrcOfficeNumber.trim() || null,
        employerPayeReference: form.employerPayeReference.trim() || null,
        accountsOfficeReference: form.accountsOfficeReference.trim() || null,
        taxDistrict: form.taxDistrict.trim() || null,
        employerTradingName: form.employerTradingName.trim() || null,
        notes: form.notes.trim() || null,
        activeHmrcEnvironment: form.activeHmrcEnvironment,
        gatewayTestUserId: form.gatewayTestUserId.trim() || null,
        gatewayLiveUserId: form.gatewayLiveUserId.trim() || null,
        ...(form.clearTestPassword
          ? { clearTestPassword: true }
          : form.gatewayTestPassword.trim()
            ? { gatewayTestPassword: form.gatewayTestPassword.trim() }
            : {}),
        ...(form.clearLivePassword
          ? { clearLivePassword: true }
          : form.gatewayLivePassword.trim()
            ? { gatewayLivePassword: form.gatewayLivePassword.trim() }
            : {}),
        employmentAllowanceClaimed: form.employmentAllowanceClaimed,
      },
      {
        onSuccess: () => {
          setForm((f) => ({
            ...f,
            gatewayTestPassword: '',
            gatewayLivePassword: '',
            clearTestPassword: false,
            clearLivePassword: false,
          }))
        },
      },
    )
  }

  return (
    <PayrollSectionLayout
      title="Employer PAYE"
      description="Your company HMRC employer identity and Gateway login for future filing. Passwords are stored encrypted and never shown again after save."
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
                Ready for FPS identity — full PAYE reference{' '}
                <span className="font-semibold tabular-nums">{data.fullPayeReference}</span>.
                {data.gatewayCredentialsReady
                  ? ' Gateway login for the selected environment is also ready.'
                  : ' Add Gateway user ID + password below when you are ready to file (later step).'}
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
            <>
              <div className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
                <p className="text-sm font-semibold text-foreground sm:col-span-2">
                  Employer identity
                </p>
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
              </div>

              <div className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-sm font-semibold text-foreground">HMRC Gateway login</p>
                  <p className="text-xs text-muted-foreground">
                    PAYE Online credentials for Care FPS test and live sends. Live send also needs a
                    second approver and HMRC_RTI_LIVE_ENABLED on the server. Leave password blank to
                    keep the current one. Passwords are never shown after save.
                  </p>
                </div>

                <label className="block space-y-1 text-sm sm:col-span-2">
                  <FieldLabel
                    label="Active environment"
                    info="Test = HMRC sandbox practice filing. Live = real filings to HMRC. Keep Test until you are ready."
                  />
                  <select
                    className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm"
                    value={form.activeHmrcEnvironment}
                    disabled={!canManage}
                    onChange={(e) =>
                      setField('activeHmrcEnvironment', e.target.value as 'TEST' | 'LIVE')
                    }
                  >
                    <option value="TEST">Test (sandbox)</option>
                    <option value="LIVE">Live (real HMRC)</option>
                  </select>
                </label>

                <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3 sm:col-span-2 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:col-span-2">
                    Test environment
                    {data?.hasTestPassword ? (
                      <span className="ml-2 rounded bg-emerald-500/15 px-1.5 py-0.5 font-normal normal-case text-emerald-800 dark:text-emerald-200">
                        Password saved
                      </span>
                    ) : (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-normal normal-case text-muted-foreground">
                        No password yet
                      </span>
                    )}
                  </p>
                  <label className="block space-y-1 text-sm">
                    <FieldLabel
                      label="Test Gateway user ID"
                      info="The user ID from your HMRC PAYE Online / Government Gateway enrolment for the test service."
                    />
                    <Input
                      value={form.gatewayTestUserId}
                      onChange={(e) => setField('gatewayTestUserId', e.target.value)}
                      disabled={!canManage}
                      autoComplete="off"
                      placeholder="Gateway user ID"
                    />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <FieldLabel
                      label="Test Gateway password"
                      info="Leave blank to keep the saved password. Tick clear below to remove it."
                    />
                    <Input
                      type="password"
                      value={form.gatewayTestPassword}
                      onChange={(e) => {
                        setField('gatewayTestPassword', e.target.value)
                        if (e.target.value) setField('clearTestPassword', false)
                      }}
                      disabled={!canManage || form.clearTestPassword}
                      autoComplete="new-password"
                      placeholder={data?.hasTestPassword ? '•••••••• (unchanged)' : 'Enter password'}
                    />
                    {canManage && data?.hasTestPassword ? (
                      <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={form.clearTestPassword}
                          onChange={(e) => {
                            setField('clearTestPassword', e.target.checked)
                            if (e.target.checked) setField('gatewayTestPassword', '')
                          }}
                        />
                        Clear saved test password
                      </label>
                    ) : null}
                  </label>
                </div>

                <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3 sm:col-span-2 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:col-span-2">
                    Live environment
                    {data?.hasLivePassword ? (
                      <span className="ml-2 rounded bg-emerald-500/15 px-1.5 py-0.5 font-normal normal-case text-emerald-800 dark:text-emerald-200">
                        Password saved
                      </span>
                    ) : (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-normal normal-case text-muted-foreground">
                        No password yet
                      </span>
                    )}
                  </p>
                  <label className="block space-y-1 text-sm">
                    <FieldLabel
                      label="Live Gateway user ID"
                      info="Gateway user ID for real HMRC PAYE Online filings. Keep this empty until you are ready for live."
                    />
                    <Input
                      value={form.gatewayLiveUserId}
                      onChange={(e) => setField('gatewayLiveUserId', e.target.value)}
                      disabled={!canManage}
                      autoComplete="off"
                      placeholder="Gateway user ID"
                    />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <FieldLabel
                      label="Live Gateway password"
                      info="Leave blank to keep the saved password. Tick clear below to remove it."
                    />
                    <Input
                      type="password"
                      value={form.gatewayLivePassword}
                      onChange={(e) => {
                        setField('gatewayLivePassword', e.target.value)
                        if (e.target.value) setField('clearLivePassword', false)
                      }}
                      disabled={!canManage || form.clearLivePassword}
                      autoComplete="new-password"
                      placeholder={data?.hasLivePassword ? '•••••••• (unchanged)' : 'Enter password'}
                    />
                    {canManage && data?.hasLivePassword ? (
                      <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={form.clearLivePassword}
                          onChange={(e) => {
                            setField('clearLivePassword', e.target.checked)
                            if (e.target.checked) setField('gatewayLivePassword', '')
                          }}
                        />
                        Clear saved live password
                      </label>
                    ) : null}
                  </label>
                </div>
              </div>

              <div className="grid gap-4 rounded-xl border border-border p-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Employment Allowance</p>
                  <p className="text-xs text-muted-foreground">
                    If your organisation can claim Employment Allowance, tick this so EPS previews
                    include the claim (you are responsible for eligibility).
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={form.employmentAllowanceClaimed}
                    disabled={!canManage}
                    onChange={(e) => setField('employmentAllowanceClaimed', e.target.checked)}
                  />
                  Claim Employment Allowance on EPS
                </label>
              </div>

              <PayrollEpsPreviewPanel
                employmentAllowanceClaimedDefault={Boolean(
                  data?.employmentAllowanceClaimed ?? form.employmentAllowanceClaimed,
                )}
              />

              {canManage ? (
                <Button size="sm" disabled={updateMut.isPending} onClick={handleSave}>
                  {updateMut.isPending ? 'Saving…' : 'Save employer settings'}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You can view these settings. Ask an admin with payroll settings manage to edit.
                </p>
              )}
            </>
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
