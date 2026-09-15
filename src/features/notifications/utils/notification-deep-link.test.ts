import { describe, expect, it } from 'vitest'
import { ecmExceptionQueueHref, notificationDeepLink } from './notification-deep-link'

describe('notificationDeepLink', () => {
  it('routes urgent ECM alerts to the exception queue', () => {
    expect(
      notificationDeepLink({
        recordType: 'EcmException',
        metadata: { kind: 'LEFT_VISIT_AREA', scheduledJobId: 'job-1' },
      }),
    ).toBe('/ecm/live?tab=exceptions&period=today&jobId=job-1')
    expect(
      notificationDeepLink({
        metadata: { kind: 'OUTSIDE_AREA_CHECK_IN_REQUEST', scheduledJobId: 'job-2' },
      }),
    ).toBe('/ecm/live?tab=exceptions&period=today&jobId=job-2')
  })

  it('prefers metadata href when it is an ECM live path', () => {
    expect(
      notificationDeepLink({
        metadata: { href: '/ecm/live?tab=exceptions&jobId=abc' },
      }),
    ).toBe('/ecm/live?tab=exceptions&jobId=abc')
  })

  it('returns null for unrelated notifications', () => {
    expect(
      notificationDeepLink({
        recordType: 'Invoice',
        metadata: { kind: 'REPORT_READY' },
      }),
    ).toBeNull()
  })
})

describe('ecmExceptionQueueHref', () => {
  it('includes today period so the visit is in range', () => {
    expect(ecmExceptionQueueHref()).toBe('/ecm/live?tab=exceptions&period=today')
  })
})
