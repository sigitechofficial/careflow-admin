/**
 * Frontend canonical filters for Phase 1 legacy duplicate removal (§1, §4, §7–§9, §11, §13).
 * Lists must match backend seed question text exactly.
 */

import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import { SECTION_1_HOLISTIC_EXTRA_CANONICAL } from '@/features/service-users/initial-assessment/utils/section-1-holistic-canonical'

function filterByCanonical(
  questions: InitialAssessmentQuestion[],
  canonical: readonly string[],
  legacySections: readonly string[],
  specPrefix: string,
): InitialAssessmentQuestion[] {
  const allowed = new Set<string>(canonical)
  const legacy = new Set<string>(legacySections)

  const isSectionQuestion = (q: InitialAssessmentQuestion): boolean => {
    const meta = q.metadata
    if (!meta || typeof meta !== 'object') return false
    const legacySection = meta.legacyCatalogSection ?? meta.legacyCatalog
    if (typeof legacySection === 'string' && legacy.has(legacySection)) return true
    const ref = meta.specRef
    return typeof ref === 'string' && ref.startsWith(specPrefix)
  }

  return questions.filter((q) => {
    if (!isSectionQuestion(q)) return true
    const meta = q.metadata
    if (meta && typeof meta === 'object' && meta.aboutMeProfileField === true) return true
    return allowed.has(q.questionText.trim())
  })
}

export const SECTION_1_CANONICAL_QUESTION_TEXT = [
  'Preferred name',
  'Date of birth',
  'Gender',
  'Address and contact details',
  'Funding type',
  'Referral source',
  'Assessment location',
  'Local authority ID (if funded)',
  'Family, representative, next of kin, advocate, key contacts',
  'Representative involved in assessment?',
  'Representative name',
  'Representative relationship',
  'What matters most to the Service User?',
  'What are they worried about?',
  'What do they want support to achieve?',
  'Personal priorities, goals, independence goals',
  'Things they want to keep doing independently',
  'Things they do not want support with',
  'Important routines (meals, prayer, medication, bedtime)',
  'Preferred visit times',
  'Morning, meal, evening and bedtime routine',
  'Bathing / shower and dressing preferences',
  'Known triggers (anxiety, distress, confusion)',
  'Food likes and dislikes',
  'Activity likes and dislikes',
  'Care preferences and dislikes',
  'How should staff support privacy during personal care?',
  'Staff gender preference for personal care',
  'Will the Service User accept care from the opposite sex?',
  'Comfortable with double-up care?',
  'Modesty requirements',
  'How does the person prefer to be addressed?',
  'Religion, culture, language, reasonable adjustments',
  'Religious or spiritual needs',
  'Prayer routine or worship needs',
  'Religious or cultural dietary requirements',
  'Any equality related risk or need',
  'Preferred communication format',
  'Interpreter required?',
  'Language required',
  'Easy read or large print required?',
  'BSL required?',
  'Hearing support required?',
  'Visual support required?',
  'Reason for admission / starting care',
  'Previous medical history (summary)',
  'Care instructions for staff',
  'Planned number of carers',
  'Carer numbers / rota note',
  ...SECTION_1_HOLISTIC_EXTRA_CANONICAL,
] as const

export const SECTION_4_CANONICAL_QUESTION_TEXT = [
  'Assessor competent to record vital signs?',
  'Clinical observations completed?',
  'Temperature (°C)',
  'Pulse (bpm)',
  'Pulse rhythm',
  'Respirations (per minute)',
  'Blood pressure — systolic (mmHg)',
  'Blood pressure — diastolic (mmHg)',
  'Standing blood pressure required?',
  'Blood pressure — lying systolic (mmHg)',
  'Blood pressure — lying diastolic (mmHg)',
  'Blood pressure — sitting systolic (mmHg)',
  'Blood pressure — sitting diastolic (mmHg)',
  'Blood pressure — standing systolic (mmHg)',
  'Blood pressure — standing diastolic (mmHg)',
  'Oxygen saturation (SpO2 %)',
  'Blood glucose (mmol/L)',
  'Service User is diabetic?',
  'Type of diabetes',
  'Ongoing vital signs monitoring required?',
  'Monitoring schedule / frequency',
  'General physical wellbeing status',
  'GP review requested for physical wellbeing?',
  'General physical wellbeing comment',
  'Build type (frail / small / medium / large / obese)',
  'Height band or height (cm)',
  'Unable to weigh using standard scales?',
  'Weight (kg)',
  'Reason unable to weigh',
  'Mid upper arm circumference (MUAC) (cm)',
  'MUAC nutritional risk band',
  'Physical assessment additional comments',
] as const

export const SECTION_7_CANONICAL_QUESTION_TEXT = [
  'No concerns identified in this section',
  'Oral health options',
  'Oral health concern?',
  'Mouth-care routine or support required',
  'Last dental contact known?',
  'Last dental contact date',
  'Dentures fit well?',
  'Denture cleaning support required?',
  'Toothbrushing support required?',
  'Dental referral required?',
  'Bladder continence options',
  'Bladder continence concern?',
  'Continence products in use?',
  'Continence product details',
  'Pads supplied by family?',
  'Pads supplied by district nurses?',
  'Urgency?',
  'Doubly incontinent?',
  'Catheter in situ?',
  'Catheter type and care instructions',
  'Urostomy or stoma present?',
  'Bowel continence options',
  'Bowel continence concern?',
  'Stoma care instructions',
  'Continence service referral required?',
  'Continence referral date',
  'Continence / oral care notes',
] as const

export const SECTION_8_CANONICAL_QUESTION_TEXT = [
  'No concerns identified in this section',
  'Speech impairment options',
  'Speech impairment or concern?',
  'Staff communication instructions',
  'Under SALT for communication?',
  'SALT communication referral required?',
  'SALT referral date',
  'Hearing impairment level',
  'Hearing impairment (moderate or worse)?',
  'Hearing aid in use?',
  'Hearing aid details',
  'Sight impairment level',
  'Sight impairment (moderate or worse)?',
  'Glasses or visual aids in use?',
  'Visual aid details',
  'Interpreter required?',
  'Language required',
  'Professional interpreter needed?',
  'Visual aid in use?',
  'Sign language required?',
  'Auditory aid in use?',
  'Communication aids functioning correctly?',
  'Other communication aid — specify',
  'Communication support notes',
] as const

export const SECTION_9_CANONICAL_QUESTION_TEXT = [
  'Taking prescribed medication?',
  'Knows why they take prescribed medication?',
  'Knows when to take prescribed medication?',
  'Knows how to take prescribed medication?',
  'Recommended medication support level',
  'Prompting or reminding required?',
  'Help removing medicines from packaging required?',
  'Assistance administering medication required?',
  'Medication administered by',
  'Independent self-administration?',
  'Insulin administration required?',
  'Insulin prompting required?',
  'Insulin supervision required?',
  'Covert medication required?',
  'Covert medication legal basis or best-interest notes',
  'Controlled drugs in use?',
  'Medication list available?',
  'Medication list verified?',
  'Date medication list verified',
  'Dispensing method',
  'MAR / eMAR required?',
  'Medication safety notes',
] as const

export const SECTION_11_CANONICAL_QUESTION_TEXT = [
  'Skin condition or concern?',
  'Skin condition comment',
  'Currently has ulcers or wounds?',
  'Ulcers or wounds comment',
  'Pressure ulcer risk assessment completed (including photography)?',
  'Pressure ulcer risk assessment comment',
  'Has wound assessment been completed?',
  'Wound assessment comment',
  'Skin / wound notes',
  'Pressure relieving equipment in use?',
  'Pressure equipment details',
  'Further pressure equipment required?',
  'Further pressure equipment comment',
  'Equipment ordered?',
  'Date equipment ordered',
  'Pressure equipment order additional comments',
  'Fluid chart required?',
  'Weight monitoring required?',
  'Waterlow assessment completed?',
] as const

export const SECTION_13_CANONICAL_QUESTION_TEXT = [
  'Any safeguarding concerns identified?',
  'Safeguarding concern types',
  'Safeguarding concern details',
  'Immediate action taken?',
  'Manager informed?',
  'Manager informed date and time',
  'Local authority safeguarding referral required?',
  'Safeguarding referral made?',
  'Safeguarding referral date',
  'Safeguarding reference number',
  'Emergency contact 1 recorded?',
  'No response procedure agreed?',
  'What should staff do if no answer?',
  'Should staff contact office if no response?',
  'When should emergency services be contacted?',
  'GP name',
  'GP practice and phone',
  'Pharmacy name and phone',
  'Preferred hospital',
  'District nurse involved?',
  'DNACPR or ReSPECT in place?',
  'ReSPECT / DNACPR location and summary',
  'Reviewed monthly (legacy additional risk flag)?',
  'Additional risk guidelines required?',
  'Additional risk guidelines details',
  'Risk matrix entry required for identified risks?',
  'Safeguarding / emergency notes',
] as const

export function filterSection1Questions(questions: InitialAssessmentQuestion[]): InitialAssessmentQuestion[] {
  return filterByCanonical(questions, SECTION_1_CANONICAL_QUESTION_TEXT, ['sec_care_assistance_required'], '1.')
}

export function filterSection4Questions(questions: InitialAssessmentQuestion[]): InitialAssessmentQuestion[] {
  return filterByCanonical(questions, SECTION_4_CANONICAL_QUESTION_TEXT, ['sec_build'], '4.')
}

export function filterSection7Questions(questions: InitialAssessmentQuestion[]): InitialAssessmentQuestion[] {
  return filterByCanonical(questions, SECTION_7_CANONICAL_QUESTION_TEXT, ['sec_incontinence'], '7.')
}

export function filterSection8Questions(questions: InitialAssessmentQuestion[]): InitialAssessmentQuestion[] {
  return filterByCanonical(
    questions,
    SECTION_8_CANONICAL_QUESTION_TEXT,
    ['sec_speech_impairment', 'sec_hearing', 'sec_sight'],
    '8.',
  )
}

export function filterSection9Questions(questions: InitialAssessmentQuestion[]): InitialAssessmentQuestion[] {
  return filterByCanonical(questions, SECTION_9_CANONICAL_QUESTION_TEXT, ['sec_medication'], '9.')
}

export function filterSection11Questions(questions: InitialAssessmentQuestion[]): InitialAssessmentQuestion[] {
  return filterByCanonical(questions, SECTION_11_CANONICAL_QUESTION_TEXT, ['sec_skin_condition'], '11.')
}

export function filterSection13Questions(questions: InitialAssessmentQuestion[]): InitialAssessmentQuestion[] {
  return filterByCanonical(questions, SECTION_13_CANONICAL_QUESTION_TEXT, ['sec_additional_risks'], '13.')
}

/** Apply all Phase 1 section filters (outermost first). */
export function filterPhase1SectionQuestions(
  questions: InitialAssessmentQuestion[],
): InitialAssessmentQuestion[] {
  return filterSection13Questions(
    filterSection11Questions(
      filterSection9Questions(
        filterSection8Questions(
          filterSection7Questions(
            filterSection4Questions(filterSection1Questions(questions)),
          ),
        ),
      ),
    ),
  )
}
