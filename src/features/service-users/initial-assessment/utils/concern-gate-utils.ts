import { findQuestionByFieldKey, findQuestionByTextIncludes } from '@/features/service-users/initial-assessment/utils/question-lookup'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

type DeriveKind = 'multi_no_concern' | 'appetite_poor' | 'emotional_mood' | 'sleeping_pattern'

type DerivedConcernGateRule = {
  sourceFieldKey: string
  gateTextIncludes: string
  derive: DeriveKind
}

const DERIVED_CONCERN_GATES: DerivedConcernGateRule[] = [
  { sourceFieldKey: 'painConcerns', gateTextIncludes: 'pain or distress identified', derive: 'multi_no_concern' },
  {
    sourceFieldKey: 'swallowingConcerns',
    gateTextIncludes: 'swallowing or choking concerns',
    derive: 'multi_no_concern',
  },
  { sourceFieldKey: 'oralHealthOptions', gateTextIncludes: 'oral health concern', derive: 'multi_no_concern' },
  {
    sourceFieldKey: 'bladderContinenceOptions',
    gateTextIncludes: 'bladder continence concern',
    derive: 'multi_no_concern',
  },
  {
    sourceFieldKey: 'bowelContinenceOptions',
    gateTextIncludes: 'bowel continence concern',
    derive: 'multi_no_concern',
  },
  {
    sourceFieldKey: 'speechOptions',
    gateTextIncludes: 'speech impairment or concern',
    derive: 'multi_no_concern',
  },
  { sourceFieldKey: 'appetiteStatus', gateTextIncludes: 'appetite concern', derive: 'appetite_poor' },
  {
    sourceFieldKey: 'emotionalWellbeing',
    gateTextIncludes: 'low mood or depression concern',
    derive: 'emotional_mood',
  },
  { sourceFieldKey: 'sleepingPattern', gateTextIncludes: 'sleeping pattern concern', derive: 'sleeping_pattern' },
]

function selectedValues(answer: InitialAssessmentAnswerInput | undefined): string[] {
  const sel = answer?.selectedOptions
  if (Array.isArray(sel)) return sel.map(String)
  if (typeof sel === 'string' && sel.trim()) return [sel]
  return []
}

function singleSelectValue(answer: InitialAssessmentAnswerInput | undefined): string | undefined {
  const sel = answer?.selectedOptions
  if (typeof sel === 'string' && sel.trim()) return sel.trim()
  if (Array.isArray(sel) && sel.length > 0) return String(sel[0])
  return answer?.textValue?.trim() || undefined
}

function isYes(answer: InitialAssessmentAnswerInput | undefined): boolean {
  return answer?.booleanValue === true || answer?.checked === true
}

function deriveConcern(
  kind: DeriveKind,
  answer: InitialAssessmentAnswerInput | undefined,
  sections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
): boolean | undefined {
  if (kind === 'emotional_mood') {
    const low = findQuestionByFieldKey(sections, 'feelsLowInMood')
    const depressed = findQuestionByFieldKey(sections, 'feelsDepressed')
    const wellbeing = findQuestionByFieldKey(sections, 'emotionalWellbeing')

    let hasSignal = false
    if (low && answers[low.id] != null) {
      hasSignal = true
      if (isYes(answers[low.id])) return true
    }
    if (depressed && answers[depressed.id] != null) {
      hasSignal = true
      if (isYes(answers[depressed.id])) return true
    }
    if (wellbeing) {
      const value = singleSelectValue(answers[wellbeing.id] ?? answer)
      if (value) {
        hasSignal = true
        if (value.startsWith('sad_')) return true
        if (value.startsWith('content_')) return false
      }
    }
    return hasSignal ? false : undefined
  }

  if (!answer) return undefined

  switch (kind) {
    case 'multi_no_concern': {
      const raw = answer.selectedOptions
      // Only force "No" when the multi-select was explicitly cleared to an empty array.
      // If the field is unset (undefined/null), treat as unknown to avoid hiding follow-ups unexpectedly.
      if (Array.isArray(raw) && raw.length === 0) return false
      if (raw == null) return undefined
      const vals = selectedValues(answer)
      if (vals.length === 0) return undefined
      return vals.some((v) => v !== 'no_concern')
    }
    case 'appetite_poor': {
      const vals = selectedValues(answer)
      if (vals.length === 0) {
        const value = singleSelectValue(answer)
        if (!value) return undefined
        return value === 'poor'
      }
      return vals.includes('poor')
    }
    case 'sleeping_pattern': {
      const value = singleSelectValue(answer)
      if (!value) return undefined
      return value !== 'no_concern'
    }
    default:
      return undefined
  }
}

function boolPatch(q: InitialAssessmentQuestion, yes: boolean): InitialAssessmentAnswerInput {
  return {
    questionId: q.id,
    checked: yes,
    booleanValue: yes,
  }
}

function gateAnswerMatches(q: InitialAssessmentQuestion, yes: boolean, answers: Record<string, InitialAssessmentAnswerInput>): boolean {
  const existing = answers[q.id]
  return existing?.checked === yes && existing?.booleanValue === yes
}

export function isHiddenDerivedConcernGate(
  q: InitialAssessmentQuestion,
  sections: InitialAssessmentSection[],
): boolean {
  if (q.questionType !== 'YES_NO' && q.questionType !== 'CHECKBOX') return false
  const text = q.questionText.toLowerCase()
  return DERIVED_CONCERN_GATES.some((rule) => {
    if (!text.includes(rule.gateTextIncludes.toLowerCase())) return false
    return Boolean(findQuestionByFieldKey(sections, rule.sourceFieldKey))
  })
}

export function syncDerivedConcernGates(
  sections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
): { answers: Record<string, InitialAssessmentAnswerInput>; syncedQuestionIds: string[] } {
  const next = { ...answers }
  const synced: string[] = []

  for (const rule of DERIVED_CONCERN_GATES) {
    const source = findQuestionByFieldKey(sections, rule.sourceFieldKey)
    const gate = findQuestionByTextIncludes(sections, rule.gateTextIncludes)
    if (!source || !gate) continue

    const concern = deriveConcern(rule.derive, next[source.id], sections, next)
    if (concern === undefined) continue
    if (gateAnswerMatches(gate, concern, next)) continue

    next[gate.id] = boolPatch(gate, concern)
    synced.push(gate.id)
  }

  syncSleepGpReferrals(sections, next, synced)
  syncAppetiteDerivedFields(sections, next, synced)
  syncMedicationDerivedFields(sections, next, synced)

  return { answers: next, syncedQuestionIds: synced }
}

function syncAppetiteDerivedFields(
  sections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
  synced: string[],
): void {
  const appetite = findQuestionByFieldKey(sections, 'appetiteStatus')
  if (!appetite) return

  const vals = selectedValues(answers[appetite.id])
  if (vals.length === 0) return

  const supplements = findQuestionByFieldKey(sections, 'nutritionalSupplementsPrescribed')
  const dietitian = findQuestionByFieldKey(sections, 'dietitianReferralRequired')
  const gpReview = findQuestionByFieldKey(sections, 'gpReviewAppetite')

  const supplementsYes = vals.includes('supplements_taken') || vals.includes('supplements_required')
  if (supplements && !gateAnswerMatches(supplements, supplementsYes, answers)) {
    answers[supplements.id] = boolPatch(supplements, supplementsYes)
    synced.push(supplements.id)
  }

  const dietitianYes = vals.includes('dietitian_referral')
  if (dietitian && !gateAnswerMatches(dietitian, dietitianYes, answers)) {
    answers[dietitian.id] = boolPatch(dietitian, dietitianYes)
    synced.push(dietitian.id)
  }

  const gpYes = vals.includes('gp_review')
  if (gpReview && !gateAnswerMatches(gpReview, gpYes, answers)) {
    answers[gpReview.id] = boolPatch(gpReview, gpYes)
    synced.push(gpReview.id)
  }
}

function syncMedicationDerivedFields(
  sections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
  synced: string[],
): void {
  const insulinPrompt = findQuestionByFieldKey(sections, 'insulinPromptingRequired')
  const insulinSupervision = findQuestionByFieldKey(sections, 'insulinSupervisionRequired')
  const insulinAdmin = findQuestionByFieldKey(sections, 'insulinAdministrationRequired')
  const glucose = findQuestionByFieldKey(sections, 'bloodGlucoseMonitoringRequired')

  const insulinInvolved =
    (insulinPrompt && isYes(answers[insulinPrompt.id])) ||
    (insulinSupervision && isYes(answers[insulinSupervision.id])) ||
    (insulinAdmin && isYes(answers[insulinAdmin.id]))

  if (glucose && insulinInvolved && !gateAnswerMatches(glucose, true, answers)) {
    answers[glucose.id] = boolPatch(glucose, true)
    synced.push(glucose.id)
  }
}

function syncSleepGpReferrals(
  sections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
  synced: string[],
): void {
  const sleepSource = findQuestionByFieldKey(sections, 'sleepingPattern')
  const referralRequested = findQuestionByTextIncludes(sections, 'gp referral for sleep concern requested')
  const referralMade = findQuestionByTextIncludes(sections, 'gp referral for sleep concern made')
  if (!sleepSource) return

  const pattern = singleSelectValue(answers[sleepSource.id])
  if (pattern === 'gp_referral_required' && referralRequested) {
    if (!gateAnswerMatches(referralRequested, true, answers)) {
      answers[referralRequested.id] = boolPatch(referralRequested, true)
      synced.push(referralRequested.id)
    }
  }
  if (pattern === 'gp_referral_made') {
    if (referralRequested && !gateAnswerMatches(referralRequested, true, answers)) {
      answers[referralRequested.id] = boolPatch(referralRequested, true)
      synced.push(referralRequested.id)
    }
    if (referralMade && !gateAnswerMatches(referralMade, true, answers)) {
      answers[referralMade.id] = boolPatch(referralMade, true)
      synced.push(referralMade.id)
    }
  }
  if (pattern === 'sleeps_well_prescribed' || pattern === 'sleeps_well_otc') {
    const sleepMed = sections
      .flatMap((s) => s.questions)
      .find((q) => q.questionText.toLowerCase().includes('sleep medication prescribed'))
    if (sleepMed && !gateAnswerMatches(sleepMed, true, answers)) {
      answers[sleepMed.id] = boolPatch(sleepMed, true)
      synced.push(sleepMed.id)
    }
  }
}
