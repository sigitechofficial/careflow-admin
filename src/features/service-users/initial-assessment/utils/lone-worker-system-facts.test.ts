import { describe, expect, it } from 'vitest'
import { ENVIRONMENT_ASSESSMENT_LONE_WORKER_FACTORS } from '@/features/service-users/initial-assessment/utils/environment-assessment'
import {
  fillLoneWorkerFactorsFromFacts,
  loneWorkerFactsByFactor,
} from '@/features/service-users/initial-assessment/utils/lone-worker-system-facts'

const detailsKeyOf = (id: string) => ENVIRONMENT_ASSESSMENT_LONE_WORKER_FACTORS.find((f) => f.id === id)!.detailsKey

describe('lone-worker system facts', () => {
  const facts = loneWorkerFactsByFactor({
    isNewServiceUser: true,
    plannedCarersPerVisit: 1,
    plannedCarersSource: 'visit_plan',
    hasNightOrLateVisits: false,
    longestVisitMinutes: null,
    sosEventCount: 0,
    safeguardingIncidentCount: 2,
  })

  it('answers only what the system knows', () => {
    expect(facts.newServiceUser?.value).toBe(true)
    expect(facts.carerWorksAlone).toEqual({ value: true, note: 'Visit plan: 1 carer per visit' })
    expect(facts.nightVisits?.value).toBe(false)
    expect(facts.longDurationVisits).toBeUndefined()
    expect(facts.pastSafeguardingIncident?.value).toBe(true)
  })

  it('fills unanswered factors only, with a "From system" note on a Yes', () => {
    const next = fillLoneWorkerFactorsFromFacts({ nightVisits: true }, facts, detailsKeyOf)
    expect(next.nightVisits).toBe(true)
    expect(next.newServiceUser).toBe(true)
    expect(next.newServiceUserDetails).toBe('From system: Service started in the last 4 weeks.')
    expect(next.previousSosEvent).toBe(false)
  })
})
