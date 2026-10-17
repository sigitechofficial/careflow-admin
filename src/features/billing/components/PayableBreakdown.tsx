const gbp = (value: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value)

/**
 * What an employee is paid for a run, with wages and reimbursement kept apart (TR-13). Mileage and
 * expenses are not wages: they are shown on their own line and added once to the amount payable.
 * Shows nothing when there is no reimbursement, so screens without one look as they did.
 */
export function PayableBreakdown({
  netPay,
  reimbursement,
  notVerified = 0,
}: {
  netPay: number
  reimbursement: number
  /** Part of the reimbursement whose tax treatment nobody has verified. */
  notVerified?: number
}) {
  if (!(reimbursement > 0)) return null
  return (
    <div className="mt-0.5 text-xs font-normal text-muted-foreground" data-testid="payable-breakdown">
      <div>
        Net pay {gbp(netPay)} + mileage and expenses {gbp(reimbursement)}
      </div>
      <div className="font-medium text-foreground">Payable {gbp(netPay + reimbursement)}</div>
      {notVerified > 0 ? (
        <div className="text-amber-700 dark:text-amber-300" data-testid="payable-breakdown-not-verified">
          Tax treatment of {gbp(notVerified)} mileage not verified
        </div>
      ) : null}
    </div>
  )
}
