import { describe, expect, it } from 'vitest'
import { assessVisitDeliveryFromJobLike } from '@/features/scheduling/utils/visit-delivery-assessment.util'
import {
  buildVisitStatusSampleJobs,
  isVisitStatusSampleJob,
} from '@/features/employees/utils/visit-status-sample-jobs.util'

describe('buildVisitStatusSampleJobs', () => {
  it('builds one sample per major status and marks sample ids', () => {
    const jobs = buildVisitStatusSampleJobs('2026-07', 'emp-1')
    expect(jobs.length).toBeGreaterThanOrEqual(20)
    expect(jobs.every((j) => isVisitStatusSampleJob(j))).toBe(true)

    const lifecycles = new Set(
      jobs.map((j) => j.deliveryAssessment?.lifecycleStatus).filter(Boolean),
    )
    expect(lifecycles.has('EN_ROUTE')).toBe(true)
    expect(lifecycles.has('MISSED')).toBe(true)
    expect(lifecycles.has('COMPLETED')).toBe(true)

    const timings = new Set(jobs.map((j) => j.deliveryAssessment?.timingStatus).filter(Boolean))
    expect(timings.has('LATE_START')).toBe(true)
    expect(timings.has('CRITICALLY_LATE')).toBe(true)
    expect(timings.has('EARLY_ARRIVAL')).toBe(true)

    const durations = new Set(
      jobs.flatMap((j) => j.deliveryAssessment?.durationExceptions ?? []),
    )
    expect(durations.has('OVERRUN')).toBe(true)
    expect(durations.has('ACTUAL_SHORT_VISIT')).toBe(true)
    expect(durations.has('PLANNED_SHORT_VISIT')).toBe(true)
  })

  it('uses administration round lookup for slot labels and codes', () => {
    const jobs = buildVisitStatusSampleJobs('2026-07', 'emp-1')
    const withPlan = jobs.filter((j) => j.visitPlan)
    const slotLabels = new Set(withPlan.map((j) => j.visitPlan?.label))
    expect(slotLabels.has('Morning')).toBe(true)
    expect(slotLabels.has('Midday')).toBe(true)
    expect(slotLabels.has('Afternoon')).toBe(true)
    expect(slotLabels.has('Evening')).toBe(true)
    expect(slotLabels.has('Night')).toBe(true)

    const codes = new Set(withPlan.map((j) => j.visitPlan?.slotCode))
    expect(codes.has('MORNING')).toBe(true)
    expect(codes.has('MIDDAY')).toBe(true)
  })

  it('recomputes consistently via assessVisitDeliveryFromJobLike', () => {
    const late = buildVisitStatusSampleJobs('2026-07', 'emp-1').find((j) =>
      j.id.endsWith('late-start'),
    )
    expect(late).toBeTruthy()
    const again = assessVisitDeliveryFromJobLike(late!)
    expect(again.timingStatus).toBe('LATE_START')
  })
})
