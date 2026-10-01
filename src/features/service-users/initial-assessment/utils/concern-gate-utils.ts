import { findQuestionByFieldKey, findQuestionByTextIncludes, fieldKeyOf } from '@/features/service-users/initial-assessment/utils/question-lookup'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

type DeriveKind =
  | 'multi_no_concern'
  | 'pain_present'
  | 'appetite_poor'
  | 'emotional_mood'
  | 'sleeping_pattern'
  | 'impairment_moderate_or_worse'
  | 'nutrition_at_risk'
  | 'doubly_incontinent'
  | 'yes_no_mirror'

type DerivedConcernGateRule = {
  sourceFieldKey: string
  gateTextIncludes: string
  derive: DeriveKind
  /** Optional second multi-select source (e.g. bowel for double incontinence). */
  secondarySourceFieldKey?: string
}

const MODERATE_OR_WORSE = new Set(['moderate', 'severe', 'very_severe'])
const NUTRITION_AT_RISK = new Set(['malnourished', 'severely_malnourished'])
// Waterlow treats catheter / stoma as continent and pads alone aren't proof of incontinence.
const CONTINENCE_INCONTINENT = new Set(['incontinence', 'stress', 'nocturnal'])

const DERIVED_CONCERN_GATES: DerivedConcernGateRule[] = [
  { sourceFieldKey: 'painConcerns', gateTextIncludes: 'pain or distress identified', derive: 'pain_present' },
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
  // C40 — hide trigger Yes/No; derive from sensory level SELECTs
  {
    sourceFieldKey: 'hearingLevel',
    gateTextIncludes: 'hearing impairment (moderate or worse)',
    derive: 'impairment_moderate_or_worse',
  },
  {
    sourceFieldKey: 'sightLevel',
    gateTextIncludes: 'sight impairment (moderate or worse)',
    derive: 'impairment_moderate_or_worse',
  },
  // C41
  {
    sourceFieldKey: 'nutritionStatus',
    gateTextIncludes: 'malnourished or at nutrition risk',
    derive: 'nutrition_at_risk',
  },
  // C44 — bladder + bowel both signal incontinence
  {
    sourceFieldKey: 'bladderContinenceOptions',
    secondarySourceFieldKey: 'bowelContinenceOptions',
    gateTextIncludes: 'doubly incontinent',
    derive: 'doubly_incontinent',
  },
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
  secondaryAnswer?: InitialAssessmentAnswerInput,
): boolean | undefined {
  if (kind === 'emotional_mood') {
    const depressed = findQuestionByFieldKey(sections, 'feelsDepressed')
    const wellbeing = findQuestionByFieldKey(sections, 'emotionalWellbeing')

    let hasSignal = false
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

  if (kind === 'impairment_moderate_or_worse') {
    const value = singleSelectValue(answer)
    if (!value) return undefined
    if (value === 'no_concern' || value === 'mild' || value === 'not_known') return false
    return MODERATE_OR_WORSE.has(value) || value === 'onward_referral'
  }

  if (kind === 'nutrition_at_risk') {
    const value = singleSelectValue(answer)
    if (!value) return undefined
    return NUTRITION_AT_RISK.has(value)
  }

  if (kind === 'doubly_incontinent') {
    const bladder = selectedValues(answer)
    const bowel = selectedValues(secondaryAnswer)
    if (bladder.length === 0 && bowel.length === 0) return undefined
    const bladderIncontinent = bladder.some((v) => CONTINENCE_INCONTINENT.has(v))
    const bowelIncontinent = bowel.some((v) => CONTINENCE_INCONTINENT.has(v))
    return bladderIncontinent && bowelIncontinent
  }

  if (kind === 'yes_no_mirror') {
    if (!answer) return undefined
    if (typeof answer.booleanValue === 'boolean') return answer.booleanValue
    if (typeof answer.checked === 'boolean') return answer.checked
    return undefined
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
    case 'pain_present': {
      // Pain is present only when a severity, "unable to self-report" or a GP review is chosen —
      // ticking "Pain assessment completed" on its own is an admin note, not pain.
      const raw = answer.selectedOptions
      if (Array.isArray(raw) && raw.length === 0) return false
      if (raw == null) return undefined
      const vals = selectedValues(answer).filter((v) => v !== 'pain_assessment_completed')
      if (vals.length === 0) return selectedValues(answer).length ? false : undefined
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
  // C43 — Moving & Handling / Equipment Selection own hoist; hide template trigger.
  if (fieldKeyOf(q) === 'usesHoistOrSling' || text.includes('uses hoist or sling')) {
    return true
  }
  // §11 "Further pressure equipment required?" stays a visible question (its own pressure-relief
  // care-plan trigger): daily-living "further equipment" (§12.10) is a different need, so it is not
  // mirrored from there.
  return DERIVED_CONCERN_GATES.some((rule) => {
    if (!text.includes(rule.gateTextIncludes.toLowerCase())) return false
    if (!findQuestionByFieldKey(sections, rule.sourceFieldKey)) return false
    if (rule.secondarySourceFieldKey) {
      return Boolean(findQuestionByFieldKey(sections, rule.secondarySourceFieldKey))
    }
    return true
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

    const secondary = rule.secondarySourceFieldKey
      ? findQuestionByFieldKey(sections, rule.secondarySourceFieldKey)
      : undefined
    // For dual-source rules, both sources must exist.
    if (rule.secondarySourceFieldKey && !secondary) continue

    const concern = deriveConcern(
      rule.derive,
      next[source.id],
      sections,
      next,
      secondary ? next[secondary.id] : undefined,
    )
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
