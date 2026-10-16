import * as React from 'react'
import { PayrollSectionLayout } from '@/features/payroll/components/PayrollSectionLayout'
import { PayrollFieldLabel } from '@/features/payroll/components/PayrollFieldLabel'
import { PayrollEpsPreviewPanel } from '@/features/payroll/components/PayrollEpsPreviewPanel'
import { SalariedHoursAnnualisationSection } from '@/features/payroll/components/SalariedHoursAnnualisationSection'
import { PAYROLL_SECTION_GUIDANCE } from '@/features/payroll/data/payroll-section-guidance'
import {
  usePayrollEmployerSettings,
  useUpdatePayrollEmployerSettings,
} from '@/features/payroll/hooks/usePayroll'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { TooltipProvider } from '@/shared/ui/tooltip'
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
      description="Your company’s HMRC employer details and Gateway login for FPS/EPS filing. Hover (i) on any field for what it is for. Passwords are encrypted and never shown again after save."
      testId="payroll-employer-settings-page"
      guidance={PAYROLL_SECTION_GUIDANCE.employer}
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
                  : ' Add Gateway user ID + password below when you are ready to file.'}
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
                  <PayrollFieldLabel
                    label="HMRC office number"
                    info="What it is for: the first 3 digits of your Employer PAYE reference. Example: from 123/AB45678, enter 123. HMRC uses this with the reference below to know which tax office you belong to."
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
                  <PayrollFieldLabel
                    label="Employer PAYE reference"
                    info="What it is for: the part after the slash on your PAYE reference. Example: from 123/AB45678, enter AB45678. Together with the office number, this is your company’s unique PAYE ID on FPS filings."
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
                  <PayrollFieldLabel
                    label="Full PAYE reference (preview)"
                    info="What it is for: a read-only check that Care will send office/reference together (for example 123/AB45678). You do not type this — it builds from the two fields above."
                  />
                  <Input
                    value={fullPaye ?? ''}
                    readOnly
                    placeholder="123/AB45678"
                    className="tabular-nums text-muted-foreground"
                  />
                </label>

                <label className="block space-y-1 text-sm sm:col-span-2">
                  <PayrollFieldLabel
                    label="Accounts Office reference"
                    info="What it is for: your HMRC Accounts Office number (often looks like 123PA00012345). It comes from your employer registration letter and must go on every FPS and EPS file so HMRC can match payments to your account."
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
                  <PayrollFieldLabel
                    label="Tax district (optional)"
                    info="What it is for: a friendly name your team can use (for example London). It is for your notes only — it does not replace the office number and is not sent instead of official PAYE details."
                  />
                  <Input
                    value={form.taxDistrict}
                    onChange={(e) => setField('taxDistrict', e.target.value)}
                    disabled={!canManage}
                    placeholder="e.g. London"
                  />
                </label>

                <label className="block space-y-1 text-sm">
                  <PayrollFieldLabel
                    label="Employer trading name (optional)"
                    info="What it is for: the company name you want to show on payroll filings and documents. Use your legal or trading name as staff and HMRC would recognise it."
                  />
                  <Input
                    value={form.employerTradingName}
                    onChange={(e) => setField('employerTradingName', e.target.value)}
                    disabled={!canManage}
                    placeholder="Care Services Ltd"
                  />
                </label>

                <label className="block space-y-1 text-sm sm:col-span-2">
                  <PayrollFieldLabel
                    label="Notes (optional)"
                    info="What it is for: an internal reminder for your team — for example where you found these numbers, or who last updated Gateway. Not sent to HMRC."
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
                    These are the PAYE Online usernames and passwords Care uses to send FPS and EPS
                    to HMRC. Start with Test. Leave a password blank to keep the one already saved.
                  </p>
                </div>

                <label className="block space-y-1 text-sm sm:col-span-2">
                  <PayrollFieldLabel
                    label="Active environment"
                    info="What it is for: chooses which login Care uses. Test = practice with HMRC’s sandbox (safe for training). Live = real filings to HMRC. Keep Test until your process and dual-control are ready."
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
                    <PayrollFieldLabel
                      label="Test Gateway user ID"
                      info="What it is for: the username HMRC gave you for PAYE Online testing. Care uses it to log in when you send a test FPS or EPS (not real filings)."
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
                    <PayrollFieldLabel
                      label="Test Gateway password"
                      info="What it is for: the password for the Test Gateway user ID. Leave blank to keep the saved password. Tick “Clear saved test password” only if you want to remove it."
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
                        <PayrollFieldLabel
                          label="Clear saved test password"
                          info="What it is for: removes the stored Test Gateway password on the next Save. Use this if the password was wrong or must be rotated."
                          className="text-xs font-normal text-muted-foreground"
                        />
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
                    <PayrollFieldLabel
                      label="Live Gateway user ID"
                      info="What it is for: the username for real HMRC PAYE Online filings. Only fill this when you are ready for live. Real sends still need a second approver."
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
                    <PayrollFieldLabel
                      label="Live Gateway password"
                      info="What it is for: the password for real HMRC filings. Leave blank to keep the saved password. Treat this like production access — only trusted payroll admins should change it."
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
                        <PayrollFieldLabel
                          label="Clear saved live password"
                          info="What it is for: removes the stored Live Gateway password on the next Save. Use only when rotating credentials or stopping live filing."
                          className="text-xs font-normal text-muted-foreground"
                        />
                      </label>
                    ) : null}
                  </label>
                </div>
              </div>

              <div className="grid gap-4 rounded-xl border border-border p-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Employment Allowance</p>
                  <p className="text-xs text-muted-foreground">
                    Optional HMRC relief that can reduce employer National Insurance. Only tick if
                    your organisation is eligible — Care does not decide eligibility for you.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={form.employmentAllowanceClaimed}
                    disabled={!canManage}
                    onChange={(e) => setField('employmentAllowanceClaimed', e.target.checked)}
                  />
                  <PayrollFieldLabel
                    label="Claim Employment Allowance on EPS"
                    info="What it is for: tells EPS previews and EPS submissions that you intend to claim Employment Allowance for this employer. Wrong claims can cause HMRC problems — confirm with your accountant if unsure."
                  />
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

          <SalariedHoursAnnualisationSection />
        </div>
      </TooltipProvider>
    </PayrollSectionLayout>
  )
}
