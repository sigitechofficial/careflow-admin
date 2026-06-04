export const MEDICATION_ASSESSMENT_SECTION_INFO =
  "It is important to assess a service user's ability to take their medications safely. Do they have capacity or lack capacity will help to determine the level of support — independent with all medication tasks (Level 0), required prompting and support with packaging (Level 1 or 1B), or required full support (Level 2 or 2B). Ask whether they know what each medicine is for, how to take it, what to do if a dose is missed, and how medication is stored. Document GP and pharmacy details, dispensing method, and the 6 R's of medication support promoted by CQC."

export type MedicationAssessmentField =
  | {
      kind: 'textarea'
      id: string
      label: string
      help?: string
      rows?: number
    }
  | {
      kind: 'branch'
      id: string
      label: string
      help?: string
      offLabel: string
      onLabel: string
      followUp?: {
        id: string
        label: string
        help?: string
      }[]
    }
  | {
      kind: 'checklist'
      id: string
      label: string
    }

export const MEDICATION_HOME_CARE_ASSESSMENT_FIELDS: MedicationAssessmentField[] = [
  {
    kind: 'textarea',
    id: 'ability',
    label: '1 Services user ability or understanding',
    help: 'Client has capacity and can manage independently, or does not have capacity and needs full support, or has capacity but is unable to open packages.',
    rows: 3,
  },
  {
    kind: 'textarea',
    id: 'gpReferral',
    label: '2 GP or pharmacy referral support',
    rows: 3,
  },
  {
    kind: 'textarea',
    id: 'dispensing',
    label: 'Dispensing Methods for Medication Support',
    rows: 3,
  },
  {
    kind: 'branch',
    id: 'level0',
    label:
      'LEVEL 0: THE SERVICE USER RETAINS TOTAL RESPONSIBILITY FOR THE MANAGEMENT OF THEIR MEDICATION',
    help: 'Record on the support plan that the service user is Level 0. Document assistive technology or pharmacy support used.',
    offLabel: 'LEVEL 0',
    onLabel: 'NOT APPLICABLE',
    followUp: [
      {
        id: 'level0Detail',
        label: 'LEVEL 0 INDEPENDENT WITH MEDICATION',
        help: 'Record assistive technology and pharmacy support methods used to facilitate independence.',
      },
    ],
  },
  {
    kind: 'branch',
    id: 'level1',
    label:
      'LEVEL 1: THE SERVICE USER RETAINS OVERALL RESPONSIBILITY FOR MAKING DECISIONS ABOUT THE MANAGEMENT OF THEIR MEDICATION, HOWEVER THEY REQUIRE PHYSICAL ASSISTANCE OR A REMINDER',
    offLabel: 'LEVEL 1A',
    onLabel: 'LEVEL 1B',
    followUp: [
      {
        id: 'level1Provider',
        label: 'REQUIRED SUPPORT WITH MEDICATION FOR CARER / PROVIDER',
        help: 'Level 1A — provider support with physical assistance or reminders.',
      },
      {
        id: 'level1Family',
        label: 'LEVEL 1 B FAMILY / INFORMAL CARER',
        help: 'Level 1B — informal carer manages support with medication.',
      },
    ],
  },
  {
    kind: 'branch',
    id: 'level2',
    label:
      'LEVEL 2: THE SERVICE USER LACKS CAPACITY FOR MAKING DECISIONS ABOUT THE MANAGEMENT OF THEIR MEDICATION',
    help: 'Ensure capacity assessment and best-interest decision are documented where applicable.',
    offLabel: 'LEVEL 2A',
    onLabel: 'LEVEL 2B',
    followUp: [
      {
        id: 'level2Family',
        label: 'Level 2 B - Family / informal carer',
        help: 'Informal carer manages all aspects of medication.',
      },
    ],
  },
  {
    kind: 'textarea',
    id: 'supportTool',
    label: '5. Medication Support - Assessment Tool Service Ability / Capability',
    rows: 3,
  },
  {
    kind: 'branch',
    id: 'collectPrescriptions',
    label: 'Able to collect prescriptions/medication from GP/Pharmacy?',
    offLabel: 'Yes',
    onLabel: 'No',
    followUp: [
      {
        id: 'collectPrescriptionsPlan',
        label:
          'If not already in place, arrange for informal carer or pharmacy to collect prescriptions and deliver medication.',
        help: 'Providers will not perform this role except in emergency situations.',
      },
    ],
  },
  {
    kind: 'branch',
    id: 'repeatPrescriptions',
    label: 'Able to obtain/organise repeat prescriptions?',
    offLabel: 'YES',
    onLabel: 'NO',
    followUp: [
      {
        id: 'repeatPrescriptionsPlan',
        label: 'If not already in place, arrange for informal carer / pharmacy / GP to organise.',
      },
    ],
  },
  {
    kind: 'branch',
    id: 'returnUnused',
    label: 'Able to return unused/out of date medications to pharmacy?',
    offLabel: 'YES',
    onLabel: 'NO',
    followUp: [
      {
        id: 'returnUnusedPlan',
        label: 'If not already in place, arrange for informal carer / pharmacy / GP to organise.',
      },
    ],
  },
  {
    kind: 'branch',
    id: 'readLabels',
    label: 'Able to read labels & directions on medication containers?',
    offLabel: 'YES',
    onLabel: 'NO',
    followUp: [
      {
        id: 'readLabelsPlan',
        label: 'Arrange for pharmacy to provide large print labels.',
      },
    ],
  },
  {
    kind: 'textarea',
    id: 'otherComment',
    label: 'Any other Comment',
    rows: 3,
  },
  { kind: 'checklist', id: 'gpDetails', label: 'Name and contact details of GP, Pharmacist and any other relevant healthcare professional' },
  { kind: 'checklist', id: 'allergies', label: 'Relevant health details and any medication allergies' },
  {
    kind: 'checklist',
    id: 'otcMeds',
    label:
      "Highlighting if known any homeopathic and 'over the counter' medications.",
  },
  {
    kind: 'checklist',
    id: 'prnMeds',
    label: "Highlighting any 'as required medication' (PRN) such as pain relief and details such as how often this can be taken.",
  },
  {
    kind: 'checklist',
    id: 'prescribeFrequency',
    label:
      'The service user or informal carer will need to check with their GP or pharmacist if medication can be prescribed less frequently.',
  },
  {
    kind: 'checklist',
    id: 'timeSpecific',
    label: 'Details of any time specific medication instructions.',
  },
  {
    kind: 'checklist',
    id: 'controlledDrugs',
    label: 'Highlighting (if known) any controlled drugs.',
  },
  {
    kind: 'checklist',
    id: 'patchDisposal',
    label: 'Highlighting (if known) any special arrangements for disposal of controlled drugs supplied in patch form.',
  },
  {
    kind: 'checklist',
    id: 'supportLevelRecorded',
    label:
      'Level of medication support required and description of the support required with each medication.',
  },
  {
    kind: 'checklist',
    id: 'capacityRecorded',
    label:
      'If service user is assessed as Level 2A, capacity assessment recorded and best interest decision documented.',
  },
  {
    kind: 'checklist',
    id: 'storage',
    label: 'Where medication is stored and if it is (or needs to be) stored securely or refrigerated.',
  },
  {
    kind: 'checklist',
    id: 'delivery',
    label: 'How medication is delivered/collected/reordered.',
  },
  {
    kind: 'checklist',
    id: 'providerRisk',
    label: "Providers' medication risk assessment (if appropriate).",
  },
  {
    kind: 'checklist',
    id: 'timeAllocated',
    label: 'Time allocated for medication support.',
  },
]

export const CHECKLIST_YNNA_OPTIONS = ['Yes', 'No', 'N/A'] as const
