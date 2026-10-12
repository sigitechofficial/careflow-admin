import { describe, expect, it } from 'vitest'

import { earningCorrectionNote, earningStageLabel, earningTone } from './earning-stage'

describe('earning stage display', () => {
  it('uses the wording the server sends', () => {
    expect(
      earningStageLabel({
        paymentState: 'IN_UK_PAYROLL',
        earningStage: 'IN_CLOSED_UK_RUN',
        earningStageLabel: 'Payroll processed',
        earningPhase: 'PAYROLL_PROCESSED',
      }),
    ).toBe('Payroll processed')
  })

  it('never calls an earning paid or bank paid, also for an older response', () => {
    for (const paymentState of ['PAID', 'REMAINING', 'PENDING', 'REJECTED', 'BANK_PAID', 'IN_UK_PAYROLL'] as const) {
      expect(earningStageLabel({ paymentState })).not.toMatch(/bank|\bpaid\b/i)
    }
    expect(earningStageLabel({ paymentState: 'BANK_PAID' })).toBe('Payment recorded')
  })

  it('a closed UK run is not shown in the "payment recorded" colour', () => {
    expect(
      earningTone({ paymentState: 'IN_UK_PAYROLL', earningStage: 'IN_CLOSED_UK_RUN', earningPhase: 'PAYROLL_PROCESSED' }),
    ).toBe('processed')
    expect(
      earningTone({ paymentState: 'BANK_PAID', earningStage: 'PAYMENT_RECORDED', earningPhase: 'PAYMENT_RECORDED' }),
    ).toBe('recorded')
    expect(earningTone({ paymentState: 'REMAINING', earningStage: 'APPROVED', earningPhase: 'EARNED' })).toBe('waiting')
    expect(earningTone({ paymentState: 'PENDING', earningStage: 'RECONCILED', earningPhase: 'EARNED' })).toBe('pending')
    expect(earningTone({ paymentState: 'REJECTED', earningStage: 'REJECTED', earningPhase: 'NOT_PAYABLE' })).toBe('rejected')
  })

  it('describes a correction on a settled visit', () => {
    expect(earningCorrectionNote({ correctionState: 'NONE' })).toBeNull()
    expect(earningCorrectionNote({})).toBeNull()
    expect(earningCorrectionNote({ correctionState: 'PENDING_APPROVAL' })).toBe('Correction awaiting approval')
    expect(earningCorrectionNote({ correctionState: 'ADJUSTED', correctionAdjustmentValue: 7 })).toBe('Corrected +£7.00')
    expect(earningCorrectionNote({ correctionState: 'ADJUSTED', correctionAdjustmentValue: -3.5 })).toBe('Corrected −£3.50')
    expect(earningCorrectionNote({ correctionState: 'ADJUSTED', correctionAdjustmentValue: 0 })).toBe('Corrected (reversed)')
  })
})
