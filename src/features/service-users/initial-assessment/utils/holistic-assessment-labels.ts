/** Display labels aligned to the paper “Initial Holistic Assessment and Care Needs Assessment”. */

export const HOLISTIC_FORM_TITLE = 'Initial Holistic Assessment and Care Needs Assessment'

/** Section nav titles (enterprise §1–§14). */
export const HOLISTIC_SECTION_TITLES: Record<number, string> = {
  1: 'Personal Details & Preferences',
  2: 'Consent, Capacity & Information Sharing',
  3: 'Environmental / Home Safety',
  4: 'Physical Assessment / Vital Signs',
  5: 'Breathing, Distress/Pain & Swallowing',
  6: 'Eating, Drinking, Nutrition & Hydration',
  7: 'Oral Health & Continence',
  8: 'Communication & Sensory Needs',
  9: 'Medication',
  10: 'Emotional Health & Cognition',
  11: 'Skin Integrity',
  12: 'Mobility, ADL & Practical Support',
  13: 'Safeguarding & Risk Management',
  14: 'Review, Actions & Sign Off',
}

/** Override question labels for document wording without changing stored questionText keys. */
export const HOLISTIC_QUESTION_LABELS: Record<string, string> = {
  'Preferred name': "Like to be called",
  'Date of birth': 'Date of Birth',
  'Address and contact details': 'Client Address and Postcode',
  'Previous medical history (summary)': 'Details',
  'Allergies (summary)': 'Allergies',
  'Family, representative, next of kin, advocate, key contacts':
    'Contact details for next of kin / significant other',
  'Representative relationship': 'Relationship to client',
  'Staff gender preference for personal care': 'Gender preference if staff',
  'Religion, culture, language, reasonable adjustments': 'Beliefs / culture / reasonable adjustments',
  'Language required': 'Languages',
  'Interpreter required?': 'Interpreter required?',
  'Reason for admission / starting care': 'Section 1 — Reason for referral',
  'No concerns identified in this section': 'No concern/need identified',
  'Languages spoken': 'Languages',
  'NHS number': "Client NHS Number",
  'NI number': 'NI Number',
  'PO number': 'PO Number',
  'GP contact details': "Client's GP Contact Details",
  'Key safe present?': 'Keysafe Yes/No',
  'Key safe code': 'Keysafe Number',
  'Pendant / telecare in use?': 'Pendant/Telecare Yes/No',
  'Assessment completed date and time': 'Date and Time of Completion of Assessment',
  'Assessor name': 'Assessor Name',
  'Assessor designation': 'Assessor Designation',
  'LPOA appointed?': 'LPOA appointed Yes/No: Health, Finance, both',
  'LPOA contact details': 'LPOA Contact Details',
  'LPOA designation': 'LPOA Designation',
  'LPOA name': 'LPOA Name',
  'Social worker contact': 'Social Worker',
  'Care manager contact': 'Care Manager',
  'Mental health team contact': 'Mental Health Team',
  'Advocate contact': 'Advocate',
  'Does the client receive support from an informal carer?': 'Does the client receive support from an informal carer? Yes/No',
  'Informal carer name': 'Name',
  'Informal carer contact (if different)': 'Contact details (if different to section above)',
  'Is the client receiving a care package?': 'Is the client receiving a care package? Yes/No',
  'Care package comments': 'Comments',
  'Details of other care agencies involved with client':
    'Details of other care agencies involved with client',
  'Does the carer require a carer’s assessment?': 'Does the carer require a carer’s assessment? Yes/No',
  'Carer assessment referral made?': 'Referral made',
  'Carer assessment referral date': 'Date',
  'Other accommodation (please state)': 'Other (please state)',
  'Type of living accommodation': 'Type of living accommodation',
  'Is client able to answer front door?': 'Is client able to answer front door? Yes/No',
  'Does the client live alone?': 'Does the client live alone? Yes/No',
  'Instructions for gaining access to client’s home': 'Instructions for gaining access to client’s home',
  'Any identified risks to visiting staff members?': 'Any identified risks to visiting staff members? Please state',
  'Lifestyle, role and choices': 'Lifestyle role and choices, e.g. employment, dependants, smoking etc.',
  'Breathing concern options': 'b. Breathing difficulties',
  'Pain / distress options': 'c. Distress/Pain caused by a physical state',
  'Swallowing concern options': 'd. Swallowing',
  'General physical wellbeing': 'a. General physical wellbeing — feels well/unwell',
  'Does client require ongoing monitoring of vital signs?':
    'Does client require ongoing monitoring of vital signs?',
  'Pressure ulcer risk assessment completed?':
    'Has a pressure ulcer risk assessment been completed? Including photography.',
  'Oral health options': 'i. Oral health',
  'Bladder continence options': 'Bladder continence',
  'Bowel continence options': 'k. Continent-bowel',
  'Speech impairment options': 'l. Speech impairment',
  'Hearing impairment level': 'Hearing level',
  'Sight impairment level': 'n. Sight impairment',
  'Visual aid in use?': 'Visual?',
  'Sign language required?': 'Sign Language?',
  'Auditory aid in use?': 'Auditory?',
  'Communication aids functioning correctly?': 'Aids function correctly?',
  'Other communication aid — specify': 'Other — please specify',
  'Taking prescribed medication?': 'Is the client taking any prescribed medication?',
  'Knows why they take prescribed medication?':
    'Does the client know why they are taking prescribed medication?',
  'Knows when they take prescribed medication?':
    'Does the client know when to take their prescribed medication?',
  'Knows how to take prescribed medication?':
    'Does the client know how to take their prescribed medication?',
  'Recommended medication support level': 'What level of support is required?',
  'Prompting or reminding required?': 'Prompting or reminding person to take their medicines',
  'Help removing medicines from packaging required?':
    'Helping person remove medicines from packaging',
  'Assistance administering medication?':
    'Assist to administering some or all of a person’s medicines',
  'Independent with self-administration of all prescribed medications?':
    'Independent with self administration of all prescribed medications',
  'Current medication list available?': 'Current Medication',
  'Prompting for insulin self-administration required?':
    'Prompting to self administer medications required',
  'Supervision during insulin self-administration required?':
    'Supervision with self administration of Insulin required',
  'Insulin administration required?': 'Administration of Insulin required',
  'Medication safety notes': 'Physical assessment additional comments',
  'Current mental health issues reported?':
    'Does the client report any current mental health issues?',
  'Community psychiatric nurse involved?': 'Does the client have a Community Psychiatric Nurse?',
  'Previous mental health issues reported?':
    'Does the client report any previous mental health issues?',
  'Emotional wellbeing options': 'a. Emotional well being — client states:',
  'Cognitive impairment level': 'b. Cognitive/Memory Impairment',
  'Sleeping pattern options': 'Sleeping — Client states:',
  'Emotional health additional comments': 'Emotional health additional comments',
  'Emotional health comments': 'Emotional health additional comments',
  'GP referral for mental health made?': 'Referral to GP made',
  'GP referral for cognition requested?': 'Referral to GP required',
  'GP referral for cognition made?': 'Referral to GP made',
  'Skin condition or concern?': 'Does the client suffer from a skin condition?',
  'Currently has ulcers or wounds?': 'Does the client have any ulcers or wounds?',
  'Has wound assessment been completed?': 'Has a wound assessment been completed?',
  'Skin condition comment': 'Comment',
  'Ulcers or wounds comment': 'Comment',
  'Pressure ulcer risk assessment comment': 'Comment',
  'Wound assessment comment': 'Comment',
  'Skin / wound notes': 'Skin integrity additional comments',
  'Pressure relieving equipment in use?': 'Does client have any pressure relieving equipment?',
  'Pressure equipment details': 'If YES, provide details',
  'Further pressure equipment required?':
    'Does the client require any further pressure relieving equipment to be ordered?',
  'Equipment ordered?': 'Equipment ordered',
  'Date equipment ordered': 'Date ordered',
  'Pressure equipment order additional comments': 'Additional comments',
  'Requires aids for eating or drinking?': 'e. Requires aids/special equipment for eating or drinking',
  'Appetite status': 'f. Appetite',
  'Appetite options': 'f. Appetite',
  'Adequately hydrated?': 'g. Is the client drinking enough/adequately hydrated',
  'Nutrition status options': 'h. Nutrition',
  'Any fire safety risks identified?': 'Any fire safety risks identified?',
  'Any fire safety risks identified? (Please state)': 'Please state the fire safety risks',
  'London Fire Brigade informed?': 'London Fire Brigade informed?',
  'London Fire Brigade informed — details': 'Details',
  Details: 'Details',
  'Can client manage home environment safely?': 'Can client manage home environment safely?',
  'If no, what measure should be taken?': 'If no, what measure should be taken?',
  'Outcome of the mental capacity screening tool': 'Outcome of the mental capacity screening tool',
  'MCA screening tool comments': 'Comments',
}

export function holisticSectionTitle(sectionNumber: number, fallback: string): string {
  return HOLISTIC_SECTION_TITLES[sectionNumber] ?? fallback
}

export function holisticQuestionLabel(questionText: string): string {
  return HOLISTIC_QUESTION_LABELS[questionText.trim()] ?? questionText
}

/** Placeholder hints for paper-style §1 simple text areas. */
export function holisticSimpleTextareaPlaceholder(questionText: string): string {
  const text = questionText.trim()
  if (text === 'Previous medical history (summary)') return 'Enter medical history details…'
  if (text === 'Allergies (summary)') return 'Enter known allergies…'
  return 'Enter details…'
}
