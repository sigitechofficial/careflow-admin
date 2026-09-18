import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CalendarDays,
  FileText,
  Landmark,
  Receipt,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react'
import { PayrollSectionLayout } from '@/features/payroll/components/PayrollSectionLayout'
import { usePayrollOverview, usePurgeAllPayrollData } from '@/features/payroll/hooks/usePayroll'
import { PAYROLL_PATHS } from '@/features/payroll/payroll-routes'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { StatCard, type StatCardTone } from '@/shared/ui/card'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/dialog'

const CONFIRM_PHRASE = 'DELETE ALL PAYROLL'

type OverviewCard = {
  label: string
  hint: string
  value: number
  href: string
  icon: React.ReactNode
  tone: StatCardTone
}

export default function PayrollOverviewPage() {
  const canManage = useAuthStore((s) => s.can('payroll.settings.manage'))
  const { data, isLoading, isError } = usePayrollOverview()
  const purgeMut = usePurgeAllPayrollData()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [confirmText, setConfirmText] = React.useState('')

  const cards: OverviewCard[] = data
    ? [
        {
          label: 'Tax years',
          hint: 'UK 6 Apr – 5 Apr windows & rates',
          value: data.taxYearCount,
          href: PAYROLL_PATHS.taxYears,
          icon: <CalendarDays className="h-5 w-5" aria-hidden />,
          tone: 'sky',
        },
        {
          label: 'Pay schedules',
          hint: 'Weekly / monthly pay calendars',
          value: data.scheduleCount,
          href: PAYROLL_PATHS.schedules,
          icon: <CalendarClock className="h-5 w-5" aria-hidden />,
          tone: 'emerald',
        },
        {
          label: 'Pay periods',
          hint: 'Generated periods for runs',
          value: data.periodCount,
          href: PAYROLL_PATHS.schedules,
          icon: <CalendarClock className="h-5 w-5" aria-hidden />,
          tone: 'amber',
        },
        {
          label: 'Ready employees',
          hint: 'Profiles ready to enrol',
          value: data.readyEmployeeProfiles,
          href: PAYROLL_PATHS.employees,
          icon: <Users className="h-5 w-5" aria-hidden />,
          tone: 'violet',
        },
        {
          label: 'Open UK runs',
          hint: 'Gross, tax & NI in progress',
          value: data.openRuns,
          href: PAYROLL_PATHS.runs,
          icon: <Wallet className="h-5 w-5" aria-hidden />,
          tone: 'rose',
        },
      ]
    : []

  return (
    <PayrollSectionLayout
      title="Overview"
      description="Native UK payroll — tax years, schedules, employee setup, gross pay, and PAYE / NI. Separate from Billing visit-pay."
      testId="payroll-overview-page"
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading overview…</p>
      ) : isError || !data ? (
        <p className="text-sm text-destructive">Unable to load payroll overview.</p>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Landmark className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">UK Payroll hub</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{data.phaseNote}</p>
              </div>
            </div>
            {canManage ? (
              <Button
                size="sm"
                variant="destructive"
                disabled={purgeMut.isPending}
                onClick={() => {
                  setConfirmText('')
                  setConfirmOpen(true)
                }}
              >
                <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
                Delete all payroll data
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <StatCard
                key={card.label}
                label={card.label}
                value={card.value}
                hint={card.hint}
                icon={card.icon}
                tone={card.tone}
                to={card.href}
              />
            ))}
          </div>

          <Link
            to={PAYROLL_PATHS.employer}
            className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground">Employer PAYE (HMRC)</p>
                <span
                  className={
                    data.employerSettingsComplete
                      ? 'rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                      : 'rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100'
                  }
                >
                  {data.employerSettingsComplete ? 'Complete' : 'Needs setup'}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {data.employerFullPayeReference
                  ? `PAYE reference ${data.employerFullPayeReference}. Used on future FPS/EPS filings.`
                  : 'Add office number, PAYE reference, and Accounts Office reference from your HMRC letter.'}
              </p>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            {data.currentTaxYear ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
                  <CalendarDays className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Current tax year</p>
                  <p className="text-sm text-muted-foreground">
                    {data.currentTaxYear.label} ({data.currentTaxYear.startDate} –{' '}
                    {data.currentTaxYear.endDate})
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to={PAYROLL_PATHS.taxYears}>
                    Manage
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300">
                  <CalendarDays className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">No current tax year active</p>
                  <p className="text-sm text-muted-foreground">
                    Add UK tax years, then activate the current year before creating runs.
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link to={PAYROLL_PATHS.taxYears}>
                    Set up tax years
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Button>
              </div>
            )}
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-foreground">Quick links</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  href: PAYROLL_PATHS.runs,
                  label: 'UK payroll runs',
                  icon: <Wallet className="h-4 w-4" aria-hidden />,
                },
                {
                  href: PAYROLL_PATHS.payslips,
                  label: 'Payslips',
                  icon: <FileText className="h-4 w-4" aria-hidden />,
                },
                {
                  href: PAYROLL_PATHS.taxes,
                  label: 'Taxes',
                  icon: <Receipt className="h-4 w-4" aria-hidden />,
                },
                {
                  href: PAYROLL_PATHS.employees,
                  label: 'Employee setup',
                  icon: <Users className="h-4 w-4" aria-hidden />,
                },
                {
                  href: PAYROLL_PATHS.schedules,
                  label: 'Schedules & periods',
                  icon: <CalendarClock className="h-4 w-4" aria-hidden />,
                },
                {
                  href: PAYROLL_PATHS.taxYears,
                  label: 'Tax years',
                  icon: <CalendarDays className="h-4 w-4" aria-hidden />,
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:bg-muted/40"
                >
                  <span className="text-muted-foreground">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open) setConfirmText('')
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all UK payroll data?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>This permanently deletes:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Tax years</li>
                  <li>Pay schedules and periods</li>
                  <li>Employee payroll profiles and pay agreements</li>
                  <li>UK payroll runs</li>
                </ul>
                <p>
                  Employer PAYE settings (HMRC references) are kept. Billing visit-pay and employee
                  HR records are not touched.
                </p>
                <p>
                  It does <span className="font-medium text-foreground">not</span> delete employees,
                  billing visit-pay runs, or pay cards.
                </p>
                <label className="block space-y-1.5 text-foreground">
                  <span className="text-sm">
                    Type <span className="font-mono text-xs">{CONFIRM_PHRASE}</span> to confirm
                  </span>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={CONFIRM_PHRASE}
                    autoComplete="off"
                  />
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={purgeMut.isPending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={confirmText !== CONFIRM_PHRASE || purgeMut.isPending}
              onClick={() =>
                purgeMut.mutate(undefined, {
                  onSuccess: () => {
                    setConfirmOpen(false)
                    setConfirmText('')
                  },
                })
              }
            >
              {purgeMut.isPending ? 'Deleting…' : 'Delete everything'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PayrollSectionLayout>
  )
}
