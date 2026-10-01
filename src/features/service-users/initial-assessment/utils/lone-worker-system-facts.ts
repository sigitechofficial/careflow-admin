import type { LoneWorkerSystemFacts } from '@/features/service-users/initial-assessment/api'
import type {
  EnvironmentAssessmentLoneWorkerFactorId,
  EnvironmentAssessmentMetadata,
} from '@/features/service-users/initial-assessment/utils/environment-assessment'

/** Mirrors careflow-api LONG_VISIT_MINUTES. */
const LONG_VISIT_MINUTES = 90

type FactorFact = { value: boolean; note: string }

/**
 * Lone-worker factors the system can answer from what it already holds. Only definite facts are
 * returned; anything the system cannot know is left for the assessor.
 */
export function loneWorkerFactsByFactor(
  facts: LoneWorkerSystemFacts | undefined,
): Partial<Record<EnvironmentAssessmentLoneWorkerFactorId, FactorFact>> {
  if (!facts) return {}
  const out: Partial<Record<EnvironmentAssessmentLoneWorkerFactorId, FactorFact>> = {}
  if (facts.isNewServiceUser != null) {
    out.newServiceUser = {
      value: facts.isNewServiceUser,
      note: facts.isNewServiceUser ? 'Service started in the last 4 weeks' : 'Established service user',
    }
  }
  if (facts.plannedCarersPerVisit != null) {
    const source = facts.plannedCarersSource === 'visit_plan' ? 'Visit plan' : 'DOM Care'
    out.carerWorksAlone = {
      value: facts.plannedCarersPerVisit <= 1,
      note: `${source}: ${facts.plannedCarersPerVisit} carer${facts.plannedCarersPerVisit === 1 ? '' : 's'} per visit`,
    }
  }
  if (facts.hasNightOrLateVisits != null) {
    out.nightVisits = {
      value: facts.hasNightOrLateVisits,
      note: facts.hasNightOrLateVisits ? 'Visit plan has visits between 8pm and 7am' : 'No night or late visits planned',
    }
  }
  if (facts.longestVisitMinutes != null) {
    out.longDurationVisits = {
      value: facts.longestVisitMinutes >= LONG_VISIT_MINUTES,
      note: `Longest planned visit ${facts.longestVisitMinutes} minutes`,
    }
  }
  out.previousSosEvent = {
    value: facts.sosEventCount > 0,
    note: facts.sosEventCount ? `${facts.sosEventCount} SOS event(s) recorded` : 'No SOS events recorded',
  }
  out.pastSafeguardingIncident = {
    value: facts.safeguardingIncidentCount > 0,
    note: facts.safeguardingIncidentCount
      ? `${facts.safeguardingIncidentCount} safeguarding incident(s) recorded`
      : 'No safeguarding incidents recorded',
  }
  return out
}

/** Fill only unanswered factors from system facts; a Yes gets its "From system" detail note. */
export function fillLoneWorkerFactorsFromFacts(
  meta: EnvironmentAssessmentMetadata,
  facts: Partial<Record<EnvironmentAssessmentLoneWorkerFactorId, FactorFact>>,
  detailsKeyOf: (id: EnvironmentAssessmentLoneWorkerFactorId) => keyof EnvironmentAssessmentMetadata,
): EnvironmentAssessmentMetadata {
  let next = meta
  for (const [id, fact] of Object.entries(facts) as Array<[EnvironmentAssessmentLoneWorkerFactorId, FactorFact]>) {
    if (meta[id] === true || meta[id] === false) continue
    const detailsKey = detailsKeyOf(id)
    const details = meta[detailsKey]
    next = {
      ...next,
      [id]: fact.value,
      ...(fact.value && !(typeof details === 'string' && details.trim())
        ? { [detailsKey]: `From system: ${fact.note}.` }
        : {}),
    }
  }
  return next
}
