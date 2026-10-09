import * as React from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { ContentCard } from '@/shared/ui/content-section'
import { PayrollRunStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import { usePayrollRun } from '@/features/billing/hooks/usePayrollRuns'
import type { PayrollRunLineDetail, PayrollRunRow } from '@/features/billing/api/payroll-runs.api'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: PayrollRunRow | null
}

function lineTypeLabel(lineType: PayrollRunLineDetail['lineType']): string {
  switch (lineType) {
    case 'MILEAGE':
      return 'Mileage'
    case 'TRAVEL_TIME':
      return 'Travel time'
    case 'WAITING_TIME':
      return 'Waiting time'
    case 'NMW_TOP_UP':
      return 'NMW top-up'
    case 'ADJUSTMENT':
      return 'Adjustment'
    case 'OVERTIME':
      return 'Overtime premium'
    case 'ON_CALL_STANDBY':
      return 'On-call'
    case 'NON_VISIT_ACTIVITY':
      return 'Training / activity'
    case 'HOLIDAY_PAY':
      return 'Holiday pay'
    case 'SICK_PAY':
      return 'Sick pay'
    case 'BONUS':
      return 'Bonus'
    case 'LIVE_IN':
      return 'Live-in'
    default:
      return 'Visit pay'
  }
}

function lineTypeBadgeVariant(
  lineType: PayrollRunLineDetail['lineType'],
): 'default' | 'secondary' | 'outline' | 'info' {
  if (lineType === 'MILEAGE') return 'info'
  if (lineType === 'TRAVEL_TIME') return 'secondary'
  if (lineType === 'VISIT_PAY') return 'default'
  return 'outline'
}

export function PayrollRunDetailDialog({ open, onOpenChange, row }: Props) {
  const detailQuery = usePayrollRun(open && row ? row.id : undefined)
  const detail = detailQuery.data

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Payroll run details</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[75vh] space-y-4 overflow-y-auto">
          {!row ? null : detailQuery.isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading payroll details…
            </div>
          ) : detailQuery.isError || !detail ? (
            <p className="text-sm text-destructive">Could not load payroll run details.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{detail.period}</p>
                  <p className="text-sm text-muted-foreground">
                    {detail.periodStart} – {detail.periodEnd}
                  </p>
                </div>
                <PayrollRunStatusBadge status={detail.status} />
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <ContentCard className="p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Carers</p>
                  <p className="text-lg font-semibold tabular-nums">{detail.carers}</p>
                </ContentCard>
                <ContentCard className="p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Visit lines</p>
                  <p className="text-lg font-semibold tabular-nums">{detail.visitLines}</p>
                </ContentCard>
                <ContentCard className="p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Gross pay</p>
                  <p className="text-lg font-semibold tabular-nums text-primary">{detail.grossPay}</p>
                </ContentCard>
                <ContentCard className="p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">NMW top-up</p>
                  <p className="text-lg font-semibold tabular-nums">{detail.nmwTopUp}</p>
                </ContentCard>
              </div>

              {detail.carerSummaries.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Pay by carer</h4>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            Carer
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                            Visits
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                            Hours
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                            Gross pay
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.carerSummaries.map(carer => (
                          <tr key={carer.employeeId} className="border-b border-border last:border-0">
                            <td className="px-3 py-2 font-medium">{carer.carerName}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{carer.visitCount}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{carer.totalHours}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-medium">
                              {carer.grossPay}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Pay lines</h4>
                {detail.lines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No lines calculated yet. Run calculate to pull approved visits for this period.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[960px] text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            Type
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            Visit
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            Carer
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            Service user
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            Detail
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                            Qty / hours
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                            Rate
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                            Pay
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.lines.map(line => (
                          <tr key={line.id} className="border-b border-border last:border-0">
                            <td className="px-3 py-2">
                              <Badge variant={lineTypeBadgeVariant(line.lineType)} size="sm">
                                {lineTypeLabel(line.lineType)}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">{line.visitRef ?? '—'}</td>
                            <td className="px-3 py-2">{line.carerName}</td>
                            <td className="px-3 py-2 text-muted-foreground">{line.serviceUserName}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{line.payableTime}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {line.hoursLabel ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                              {line.unitRate ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums font-medium">
                              {line.amount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {detail.lines.some(l => l.formula) ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/10 p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">How pay is calculated</p>
                    {detail.lines
                      .filter(l => l.formula)
                      .slice(0, 6)
                      .map(l => (
                        <p key={l.id} className="font-mono">
                          {l.visitRef ? `${l.visitRef} · ` : ''}
                          {lineTypeLabel(l.lineType)}: {l.formula}
                        </p>
                      ))}
                    {detail.lines.filter(l => l.formula).length > 6 ? (
                      <p>…and {detail.lines.filter(l => l.formula).length - 6} more lines</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
