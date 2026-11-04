import type { SpecialistPathwayType } from '@/features/specialist-pathways/types/specialist-pathway.types'

/**
 * Pathway registry + assessment section layouts.
 *
 * v1 ships Learning Disability only. Adding another pathway later = append an
 * entry to PATHWAY_META and a section list to PATHWAY_SECTIONS — no backend,
 * route or component changes needed (the pages are generic).
 */

export type PathwayFieldType = 'text' | 'textarea' | 'select'

export type PathwayField = {
  id: string
  label: string
  type: PathwayFieldType
  options?: string[]
}

export type PathwaySectionSpec = {
  key: string
  title: string
  fields: PathwayField[]
}

export type PathwayMeta = {
  type: SpecialistPathwayType
  label: string
  refPrefix: string
  /** List route slug under /specialist-pathways/<slug>. */
  slug: string
}

export const PATHWAY_META: Record<SpecialistPathwayType, PathwayMeta> = {
  LEARNING_DISABILITY: {
    type: 'LEARNING_DISABILITY',
    label: 'Learning Disability',
    refPrefix: 'LD',
    slug: 'learning-disability',
  },
  DEMENTIA: { type: 'DEMENTIA', label: 'Dementia', refPrefix: 'DEM', slug: 'dementia' },
  END_OF_LIFE: { type: 'END_OF_LIFE', label: 'End of Life', refPrefix: 'EOL', slug: 'end-of-life' },
  CHILDREN: { type: 'CHILDREN', label: 'Children & Young People', refPrefix: 'CYP', slug: 'children' },
  SUPPORTED_LIVING: { type: 'SUPPORTED_LIVING', label: 'Supported Living', refPrefix: 'SL', slug: 'supported-living' },
}

const LEARNING_DISABILITY_SECTIONS: PathwaySectionSpec[] = [
  {
    key: 'about',
    title: 'About the person',
    fields: [
      { id: 'summary', label: 'A short introduction', type: 'textarea' },
      { id: 'importantToKnow', label: 'The most important things to know', type: 'textarea' },
    ],
  },
  {
    key: 'communication',
    title: 'Communication & accessible information',
    fields: [
      { id: 'howToCommunicate', label: 'How the person communicates', type: 'textarea' },
      {
        id: 'preferredFormat',
        label: 'Preferred information format',
        type: 'select',
        options: ['Easy Read', 'Large print', 'Spoken / verbal', 'Pictures / symbols', 'Standard print'],
      },
      { id: 'supportNeeded', label: 'Support needed to understand information', type: 'textarea' },
    ],
  },
  {
    key: 'health',
    title: 'Health & conditions',
    fields: [
      { id: 'conditions', label: 'Health conditions', type: 'textarea' },
      { id: 'medications', label: 'Medication support', type: 'textarea' },
      { id: 'appointments', label: 'Appointments & monitoring', type: 'textarea' },
    ],
  },
  {
    key: 'capacity',
    title: 'Mental capacity & decisions',
    fields: [
      { id: 'decisionsSupported', label: 'Decisions the person needs support with', type: 'textarea' },
      { id: 'bestInterest', label: 'Best-interest / capacity notes', type: 'textarea' },
    ],
  },
  {
    key: 'dailyLiving',
    title: 'Daily living & independence',
    fields: [
      { id: 'skills', label: 'What the person can do independently', type: 'textarea' },
      { id: 'supportAreas', label: 'Where support is needed', type: 'textarea' },
    ],
  },
  {
    key: 'behaviour',
    title: 'Behaviour & positive support',
    fields: [
      { id: 'triggers', label: 'Things that may cause distress', type: 'textarea' },
      { id: 'strategies', label: 'What helps / positive strategies', type: 'textarea' },
    ],
  },
  {
    key: 'risks',
    title: 'Risks & safety',
    fields: [
      { id: 'keyRisks', label: 'Key risks', type: 'textarea' },
      { id: 'mitigations', label: 'How risks are managed', type: 'textarea' },
    ],
  },
  {
    key: 'goals',
    title: 'Goals & outcomes',
    fields: [
      { id: 'shortTerm', label: 'Short-term goals', type: 'textarea' },
      { id: 'longTerm', label: 'Long-term goals', type: 'textarea' },
    ],
  },
  {
    key: 'network',
    title: 'People & professionals',
    fields: [
      { id: 'family', label: 'Family & important people', type: 'textarea' },
      { id: 'professionals', label: 'Professionals involved', type: 'textarea' },
    ],
  },
]

const DEMENTIA_SECTIONS: PathwaySectionSpec[] = [
  {
    key: 'about',
    title: 'About the person',
    fields: [
      { id: 'summary', label: 'A short introduction', type: 'textarea' },
      { id: 'importantToKnow', label: 'The most important things to know', type: 'textarea' },
    ],
  },
  {
    key: 'lifeStory',
    title: 'Life story & routines',
    fields: [
      { id: 'background', label: 'Background & life story', type: 'textarea' },
      { id: 'routines', label: 'Important routines & preferences', type: 'textarea' },
    ],
  },
  {
    key: 'communication',
    title: 'Communication',
    fields: [
      { id: 'howToCommunicate', label: 'How the person communicates', type: 'textarea' },
      { id: 'supportNeeded', label: 'Support needed to understand information', type: 'textarea' },
    ],
  },
  {
    key: 'health',
    title: 'Health & conditions',
    fields: [
      { id: 'conditions', label: 'Health conditions', type: 'textarea' },
      { id: 'medications', label: 'Medication support', type: 'textarea' },
    ],
  },
  {
    key: 'cognition',
    title: 'Memory & orientation',
    fields: [
      { id: 'memoryChanges', label: 'Memory changes & what is typical', type: 'textarea' },
      { id: 'orientation', label: 'Orientation & what helps', type: 'textarea' },
    ],
  },
  {
    key: 'dailyLiving',
    title: 'Daily living & independence',
    fields: [
      { id: 'skills', label: 'What the person can do independently', type: 'textarea' },
      { id: 'supportAreas', label: 'Where support is needed', type: 'textarea' },
    ],
  },
  {
    key: 'distress',
    title: 'Distress & what helps',
    fields: [
      { id: 'triggers', label: 'Things that may cause distress', type: 'textarea' },
      { id: 'whatHelps', label: 'What helps / calming approaches', type: 'textarea' },
    ],
  },
  {
    key: 'risks',
    title: 'Risks & safety',
    fields: [
      { id: 'keyRisks', label: 'Key risks', type: 'textarea' },
      { id: 'mitigations', label: 'How risks are managed', type: 'textarea' },
    ],
  },
  {
    key: 'network',
    title: 'People & professionals',
    fields: [
      { id: 'family', label: 'Family & important people', type: 'textarea' },
      { id: 'professionals', label: 'Professionals involved', type: 'textarea' },
    ],
  },
]

const END_OF_LIFE_SECTIONS: PathwaySectionSpec[] = [
  {
    key: 'about',
    title: 'About the person',
    fields: [
      { id: 'summary', label: 'A short introduction', type: 'textarea' },
      { id: 'importantToKnow', label: 'The most important things to know', type: 'textarea' },
    ],
  },
  {
    key: 'wishes',
    title: 'Wishes & preferences',
    fields: [
      {
        id: 'preferredPlaceOfCare',
        label: 'Preferred place of care',
        type: 'select',
        options: ['Own home', 'Care home', 'Hospice', 'Hospital', 'Not yet decided'],
      },
      { id: 'priorities', label: 'Priorities and wishes', type: 'textarea' },
    ],
  },
  {
    key: 'health',
    title: 'Health & symptoms',
    fields: [
      { id: 'conditions', label: 'Health conditions', type: 'textarea' },
      { id: 'symptomsToWatch', label: 'Symptoms to watch for', type: 'textarea' },
    ],
  },
  {
    key: 'comfort',
    title: 'Comfort & support in place',
    fields: [
      { id: 'comfortMeasures', label: 'Comfort measures that help', type: 'textarea' },
      { id: 'equipment', label: 'Equipment / support in place', type: 'textarea' },
    ],
  },
  {
    key: 'spiritual',
    title: 'Spiritual & cultural',
    fields: [
      { id: 'spiritualCultural', label: 'Spiritual & cultural needs', type: 'textarea' },
      { id: 'faithSupport', label: 'Faith / community support', type: 'textarea' },
    ],
  },
  {
    key: 'people',
    title: 'Important people',
    fields: [
      { id: 'importantPeople', label: 'Family & important people', type: 'textarea' },
      { id: 'whoToContact', label: 'Who to contact and when', type: 'textarea' },
    ],
  },
  {
    key: 'advanceDecisions',
    title: 'Advance decisions & documents',
    fields: [
      { id: 'advanceDecisions', label: 'Advance decisions (e.g. DNACPR / ReSPECT) — reference notes', type: 'textarea' },
      { id: 'legalDocuments', label: 'Legal documents in place', type: 'textarea' },
    ],
  },
  {
    key: 'dailySupport',
    title: 'Daily support',
    fields: [
      { id: 'dailyRoutine', label: 'Daily routine', type: 'textarea' },
      { id: 'supportAreas', label: 'Where support is needed', type: 'textarea' },
    ],
  },
  {
    key: 'afterDeath',
    title: 'After-death wishes',
    fields: [{ id: 'afterDeathWishes', label: 'Wishes for after death', type: 'textarea' }],
  },
  {
    key: 'professionals',
    title: 'Professionals involved',
    fields: [{ id: 'professionalsInvolved', label: 'Professionals involved', type: 'textarea' }],
  },
]

const CHILDREN_SECTIONS: PathwaySectionSpec[] = [
  {
    key: 'aboutChild',
    title: 'About the child or young person',
    fields: [
      { id: 'summary', label: 'A short introduction', type: 'textarea' },
      { id: 'importantToKnow', label: 'The most important things to know', type: 'textarea' },
    ],
  },
  {
    key: 'communication',
    title: 'Communication',
    fields: [
      { id: 'howToCommunicate', label: 'How the child communicates', type: 'textarea' },
      { id: 'supportNeeded', label: 'Support needed to understand information', type: 'textarea' },
    ],
  },
  {
    key: 'education',
    title: 'Education',
    fields: [
      { id: 'schoolSetting', label: 'School / education setting', type: 'textarea' },
      { id: 'ehcpNotes', label: 'EHCP / education plan notes', type: 'textarea' },
    ],
  },
  {
    key: 'health',
    title: 'Health & conditions',
    fields: [
      { id: 'conditions', label: 'Health conditions', type: 'textarea' },
      { id: 'medications', label: 'Medication support', type: 'textarea' },
    ],
  },
  {
    key: 'family',
    title: 'Family & parental responsibility',
    fields: [
      { id: 'parentalResponsibility', label: 'Who holds parental responsibility', type: 'textarea' },
      { id: 'importantPeople', label: 'Family & important people', type: 'textarea' },
    ],
  },
  {
    key: 'dailyRoutine',
    title: 'Daily routine & support',
    fields: [
      { id: 'routine', label: 'Daily routine', type: 'textarea' },
      { id: 'supportAreas', label: 'Where support is needed', type: 'textarea' },
    ],
  },
  {
    key: 'behaviour',
    title: 'Behaviour & positive support',
    fields: [
      { id: 'triggers', label: 'Things that may cause distress', type: 'textarea' },
      { id: 'whatHelps', label: 'What helps / positive strategies', type: 'textarea' },
    ],
  },
  {
    key: 'safeguarding',
    title: 'Risks & safeguarding',
    fields: [
      { id: 'keyRisks', label: 'Key risks', type: 'textarea' },
      { id: 'safeguardingNotes', label: 'Safeguarding notes', type: 'textarea' },
    ],
  },
  {
    key: 'goals',
    title: 'Goals & outcomes',
    fields: [
      { id: 'shortTerm', label: 'Short-term goals', type: 'textarea' },
      { id: 'longTerm', label: 'Long-term goals', type: 'textarea' },
    ],
  },
  {
    key: 'professionals',
    title: 'Professionals involved',
    fields: [{ id: 'professionalsInvolved', label: 'Professionals involved', type: 'textarea' }],
  },
]

const SUPPORTED_LIVING_SECTIONS: PathwaySectionSpec[] = [
  {
    key: 'about',
    title: 'About the person',
    fields: [
      { id: 'summary', label: 'A short introduction', type: 'textarea' },
      { id: 'importantToKnow', label: 'The most important things to know', type: 'textarea' },
    ],
  },
  {
    key: 'home',
    title: 'Home & tenancy',
    fields: [
      { id: 'tenancyNotes', label: 'Tenancy notes', type: 'textarea' },
      { id: 'aboutTheHome', label: 'About the home & who they live with', type: 'textarea' },
    ],
  },
  {
    key: 'communication',
    title: 'Communication',
    fields: [
      { id: 'howToCommunicate', label: 'How the person communicates', type: 'textarea' },
      { id: 'supportNeeded', label: 'Support needed to understand information', type: 'textarea' },
    ],
  },
  {
    key: 'health',
    title: 'Health & conditions',
    fields: [
      { id: 'conditions', label: 'Health conditions', type: 'textarea' },
      { id: 'medications', label: 'Medication support', type: 'textarea' },
    ],
  },
  {
    key: 'independence',
    title: 'Daily living & independence',
    fields: [
      { id: 'skills', label: 'What the person can do independently', type: 'textarea' },
      { id: 'supportAreas', label: 'Where support is needed', type: 'textarea' },
    ],
  },
  {
    key: 'moneyBenefits',
    title: 'Money & benefits',
    fields: [
      { id: 'moneyManagement', label: 'Money management support', type: 'textarea' },
      { id: 'benefitsSupport', label: 'Benefits & finance support', type: 'textarea' },
    ],
  },
  {
    key: 'community',
    title: 'Community & relationships',
    fields: [
      { id: 'relationships', label: 'Relationships & important people', type: 'textarea' },
      { id: 'communityActivities', label: 'Community activities & interests', type: 'textarea' },
    ],
  },
  {
    key: 'risks',
    title: 'Risks & safety',
    fields: [
      { id: 'keyRisks', label: 'Key risks', type: 'textarea' },
      { id: 'mitigations', label: 'How risks are managed', type: 'textarea' },
    ],
  },
  {
    key: 'goals',
    title: 'Goals & outcomes',
    fields: [
      { id: 'shortTerm', label: 'Short-term goals', type: 'textarea' },
      { id: 'longTerm', label: 'Long-term goals', type: 'textarea' },
    ],
  },
]

export const PATHWAY_SECTIONS: Partial<Record<SpecialistPathwayType, PathwaySectionSpec[]>> = {
  LEARNING_DISABILITY: LEARNING_DISABILITY_SECTIONS,
  DEMENTIA: DEMENTIA_SECTIONS,
  END_OF_LIFE: END_OF_LIFE_SECTIONS,
  CHILDREN: CHILDREN_SECTIONS,
  SUPPORTED_LIVING: SUPPORTED_LIVING_SECTIONS,
}

export function sectionsFor(type: SpecialistPathwayType): PathwaySectionSpec[] {
  return PATHWAY_SECTIONS[type] ?? []
}

export function metaForSlug(slug: string): PathwayMeta | undefined {
  return Object.values(PATHWAY_META).find(m => m.slug === slug)
}
