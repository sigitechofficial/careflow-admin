import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { PayrollSectionLayout } from '@/features/payroll/components/PayrollSectionLayout'
import { usePayrollOverview, usePurgeAllPayrollData } from '@/features/payroll/hooks/usePayroll'
import { PAYROLL_PATHS } from '@/features/payroll/payroll-routes'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
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

export default function PayrollOverviewPage() {
  const canManage = useAuthStore((s) => s.can('payroll.settings.manage'))
  const { data, isLoading, isError } = usePayrollOverview()
  const purgeMut = usePurgeAllPayrollData()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [confirmText, setConfirmText] = React.useState('')

  return (
    <PayrollSectionLayout
      title="Overview"
      description="Native UK payroll foundation — tax years, schedules, employee setup, and run shells. Separate from Billing visit-pay."
      testId="payroll-overview-page"
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading overview…</p>
      ) : isError || !data ? (
        <p className="text-sm text-destructive">Unable to load payroll overview.</p>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-sm text-muted-foreground">{data.phaseNote}</p>
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

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Tax years', value: data.taxYearCount, href: PAYROLL_PATHS.taxYears },
              { label: 'Pay schedules', value: data.scheduleCount, href: PAYROLL_PATHS.schedules },
              { label: 'Pay periods', value: data.periodCount, href: PAYROLL_PATHS.schedules },
              {
                label: 'Ready employee profiles',
                value: data.readyEmployeeProfiles,
                href: PAYROLL_PATHS.employees,
              },
              { label: 'Open UK runs', value: data.openRuns, href: PAYROLL_PATHS.runs },
            ].map((card) => (
              <Link
                key={card.label}
                to={card.href}
                className="rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted/40"
              >
                <div className="text-2xl font-semibold tabular-nums">{card.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{card.label}</div>
              </Link>
            ))}
          </div>
          {data.currentTaxYear ? (
            <p className="text-sm">
              Current tax year:{' '}
              <span className="font-medium">
                {data.currentTaxYear.label} ({data.currentTaxYear.startDate} –{' '}
                {data.currentTaxYear.endDate})
              </span>
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">No current tax year is active yet.</p>
              <Button asChild size="sm" variant="outline">
                <Link to={PAYROLL_PATHS.taxYears}>Set up tax years</Link>
              </Button>
            </div>
          )}
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
