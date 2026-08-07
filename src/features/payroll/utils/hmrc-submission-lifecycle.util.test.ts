import { buildHmrcLifecycleSteps, mapHmrcStatusToLifecycle } from './hmrc-submission-lifecycle.util'

describe('hmrc-submission-lifecycle.util', () => {
  it('maps accepted statuses for retry=false', () => {
    expect(mapHmrcStatusToLifecycle('ACCEPTED').isTerminalSuccess).toBe(true)
    expect(mapHmrcStatusToLifecycle('ERROR').canRetry).toBe(true)
    expect(mapHmrcStatusToLifecycle('PENDING_APPROVAL').tone).toBe('warning')
  })

  it('builds validated → rejected strip for failed send', () => {
    const steps = buildHmrcLifecycleSteps({
      isValidated: true,
      latestStatus: 'ERROR',
    })
    expect(steps.map((s) => s.id)).toEqual(['validated', 'built', 'sent', 'rejected'])
    expect(steps[3].state).toBe('error')
  })

  it('shows pending approval as current step', () => {
    const steps = buildHmrcLifecycleSteps({
      isValidated: true,
      latestStatus: 'PENDING_APPROVAL',
    })
    expect(steps.find((s) => s.id === 'pending_approval')?.state).toBe('current')
  })
})
