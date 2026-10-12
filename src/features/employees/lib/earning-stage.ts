import type { EmployeeEarningVisitRow } from '@/features/billing/api/payroll-runs.api'

/**
 * How far the pay for one visit has got. The server decides the stage; older responses only
 * carry `paymentState`, which is mapped to the same wording.
 */
export type EarningTone = 'recorded' | 'processed' | 'earned' | 'waiting' | 'rejected' | 'pending'

type Row = Pick<EmployeeEarningVisitRow, 'paymentState' | 'earningStage' | 'earningStageLabel' | 'earningPhase'>

export function earningStageLabel(row: Row): string {
  if (row.earningStageLabel) return row.earningStageLabel
  switch (row.paymentState) {
    case 'BANK_PAID':
      return 'Payment recorded'
    case 'IN_UK_PAYROLL':
      return 'In UK payroll'
    case 'PAID':
      return 'In locked pay run'
    case 'REMAINING':
      return 'Approved for payroll'
    case 'REJECTED':
      return 'Rejected'
    default:
      return 'Pending'
  }
}

export function earningTone(row: Row): EarningTone {
  if (row.earningPhase === 'PAYMENT_RECORDED' || (!row.earningPhase && row.paymentState === 'BANK_PAID'))
    return 'recorded'
  if (row.earningPhase === 'PAYROLL_PROCESSED' || row.earningPhase === 'PAYMENT_PREPARED') return 'processed'
  if (row.earningPhase === 'NOT_PAYABLE' || row.paymentState === 'REJECTED') return 'rejected'
  if (row.earningStage === 'RECORDED' || row.earningStage === 'RECONCILED') return 'pending'
  if (row.earningStage === 'APPROVED' || (!row.earningStage && row.paymentState === 'REMAINING')) return 'waiting'
  if (!row.earningStage && row.paymentState === 'PENDING') return 'pending'
  return 'earned'
}

const TONE_CLASS: Record<EarningTone, string> = {
  recorded: 'bg-success/10 text-success border-success/20',
  processed: 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300',
  earned: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300',
  waiting: 'bg-warning/10 text-warning border-warning/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  pending: 'bg-muted text-muted-foreground border-border',
}

export function earningToneBadgeClass(row: Row): string {
  return TONE_CLASS[earningTone(row)]
}

/** A correction or reversal recorded against a settled visit, as a short note for the row. */
export function earningCorrectionNote(
  row: Pick<EmployeeEarningVisitRow, 'correctionState' | 'correctionAdjustmentValue'>,
): string | null {
  if (row.correctionState === 'PENDING_APPROVAL') return 'Correction awaiting approval'
  if (row.correctionState === 'ADJUSTED') {
    const value = row.correctionAdjustmentValue ?? 0
    const amount = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(Math.abs(value))
    return value === 0 ? 'Corrected (reversed)' : `Corrected ${value > 0 ? '+' : '−'}${amount}`
  }
  return null
}
