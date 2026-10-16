import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, UserRound } from 'lucide-react'
import { PayrollSectionLayout } from '@/features/payroll/components/PayrollSectionLayout'
import { PayrollStatusBadge } from '@/features/payroll/components/PayrollStatusBadge'
import { PayrollProfileTaxForm } from '@/features/payroll/components/PayrollProfileTaxForm'
import { PayAgreementsPanel } from '@/features/payroll/components/PayAgreementsPanel'
import { LoanDeclarationSection } from '@/features/payroll/components/LoanDeclarationSection'
import { LoanNoticesSection } from '@/features/payroll/components/LoanNoticesSection'
import { WorkplacePensionSection, pensionStatusLabel } from '@/features/payroll/components/WorkplacePensionSection'
import { PensionAutoEnrolmentSection } from '@/features/payroll/components/PensionAutoEnrolmentSection'
import { LeaveHolidaySection } from '@/features/payroll/components/LeaveHolidaySection'
import { PayrollCorrectionsSection } from '@/features/payroll/components/PayrollCorrectionsSection'
import { usePayrollEmployees } from '@/features/payroll/hooks/usePayroll'
import { useAuthStore } from '@/features/auth/store'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'

const TABS = [
  { id: 'tax', label: 'Tax & NI' },
  { id: 'pay', label: 'Pay agreement' },
  { id: 'loans', label: 'Student loans' },
  { id: 'pension', label: 'Pension' },
  { id: 'leave', label: 'Leave / Holiday' },
  { id: 'corrections', label: 'Corrections' },
] as const
type TabId = (typeof TABS)[number]['id']

const tabFromUrl = (): TabId => {
  if (typeof window === 'undefined') return 'tax'
  const tab = new URLSearchParams(window.location.search).get('tab')
  return (TABS.find((t) => t.id === tab)?.id ?? 'tax') as TabId
}

/**
 * One employee's payroll set-up on its own page, in tabs (it used to be one long dialog): tax and
 * NI, pay agreement, student loans, pension, leave / holiday and corrections. Each tab
 * keeps its own save; nothing about the calculations changed.
 */
export default function PayrollEmployeeDetailPage() {
  const { employeeId } = useParams({ strict: false }) as { employeeId: string }
  const canManage = useAuthStore((s) => s.can('payroll.employees.manage'))
  const { locationId } = useGlobalLocationScope()
  const { data = [], isLoading } = usePayrollEmployees(locationId)
  const row = data.find((r) => r.employeeId === employeeId) ?? null
  const [tab, setTab] = React.useState<TabId>(tabFromUrl)

  const changeTab = (next: string) => {
    setTab(next as TabId)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', next)
      window.history.replaceState(window.history.state, '', url.toString())
    } catch {
      // The tab still changes; only the address bar is not updated.
    }
  }

  return (
    <PayrollSectionLayout
      title={row ? `Payroll — ${row.displayName}` : 'Employee payroll'}
      description="Tax and NI, pay agreement, student loans, pension, leave and corrections for one employee. Each tab saves on its own."
      testId="payroll-employee-detail-page"
    >
      <div className="space-y-4">
        <Link to="/payroll/employees" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All employees
        </Link>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !row ? (
          <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
            This employee is not in the payroll list for the branch selected. Choose another branch or go back to all employees.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/20 p-4" data-testid="payroll-employee-summary">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300">
                <UserRound className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{row.displayName}</p>
                <p className="text-xs text-muted-foreground">
                  Payroll no. {row.payrollNumber ?? '—'} · NI number {row.nationalInsuranceNo ?? '—'}
                  {row.employmentEndDate ? ` · leaving ${row.employmentEndDate}` : ''}
                </p>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
                {row.profile ? <PayrollStatusBadge status={row.profile.status} /> : <span className="text-muted-foreground">Profile not set</span>}
                <span className="rounded-full border border-border px-2 py-0.5">Tax code {row.profile?.taxCode ?? '—'}</span>
                <span className="rounded-full border border-border px-2 py-0.5">NI {row.profile?.niCategory ?? 'not set'}</span>
                <span className="rounded-full border border-border px-2 py-0.5">Pension: {pensionStatusLabel(row.profile)}</span>
              </div>
            </div>

            <Tabs value={tab} onValueChange={changeTab}>
              <TabsList className="flex h-auto flex-wrap justify-start">
                {TABS.map((t) => (
                  <TabsTrigger key={t.id} value={t.id}>
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="tax" className="mt-4">
                <PayrollProfileTaxForm row={row} canManage={canManage} />
              </TabsContent>
              <TabsContent value="pay" className="mt-4">
                <PayAgreementsPanel
                  employeeId={row.employeeId}
                  scheduleId={row.profile?.scheduleId ?? null}
                  defaultPayCardId={row.defaultPayCardId ?? null}
                />
              </TabsContent>
              <TabsContent value="loans" className="mt-4 space-y-4">
                <LoanDeclarationSection employeeId={row.employeeId} profile={row.profile} canEdit={canManage} />
                <LoanNoticesSection employeeId={row.employeeId} profile={row.profile} canEdit={canManage} />
              </TabsContent>
              <TabsContent value="pension" className="mt-4 space-y-4">
                <WorkplacePensionSection employeeId={row.employeeId} profile={row.profile} canEdit={canManage} />
                <PensionAutoEnrolmentSection employeeId={row.employeeId} profile={row.profile} canEdit={canManage} />
              </TabsContent>
              <TabsContent value="leave" className="mt-4">
                <LeaveHolidaySection
                  employeeId={row.employeeId}
                  canEdit={canManage}
                  employmentEndDate={row.employmentEndDate ?? null}
                  annualSalary={row.activeAgreement?.annualSalary ?? null}
                />
              </TabsContent>
              <TabsContent value="corrections" className="mt-4">
                <PayrollCorrectionsSection employeeId={row.employeeId} canPropose={canManage} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </PayrollSectionLayout>
  )
}
