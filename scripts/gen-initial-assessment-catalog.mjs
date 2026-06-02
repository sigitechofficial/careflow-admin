import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function slug(sec, label) {
  const base = `${sec}_${label}`
    .toLowerCase()
    .replace(/\{name\}/g, 'name')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 90)
  return base || 'item'
}

const sections = [
  [
    'Mobility',
    [],
  ],
  [
    'Amputation',
    [],
  ],
  [
    'Skin Condition',
    [
      "{name}'s skin is in good condition",
      "{name}'s skin is tissue paper consistency",
      "{name}'s has skin Dry",
      "{name}'s skin mark or bruise easily",
      "Are {name}'s marks or bruises from medication?",
      'Is a body map advised for {name}?',
      'Has {name} had any Ulcers in the past?',
      'Does {name} currently have any ulcers?',
      'Has {name} had any pressure sores in the past?',
      'Does {name} have any pressure sores now?',
      'Is {name} currently receiving care from the District Nurses?',
      '{name} has sensitive skin',
      '{name} has marks or patches on skin',
      '{name} suffers from a skin condition',
    ],
  ],
  [
    'Incontinence',
    [
      'Urgency?',
      'Urine?',
      'Faecal?',
      'Doubly?',
      'Does {name} use pads?',
      "Are {name}'s pads supplied by family?",
      "Are {name}'s pads supplied by District Nurses?",
      'Is a continence referral to continence service?',
      'No concerns /needs identified',
      'Has a catheter In situ',
      'Concern/need identified',
    ],
  ],
  [
    'Build',
    [
      'Is {name} frail or petite build?',
      'is {name} a small build?',
      'is {name} medium build?',
      'is {name} large build?',
      'Is {name} obese?',
      "Is {name}'s obesity level 1?",
      "Is {name}'s obesity level 2?",
      "Is {name}'s obesity level 3?",
      "Is {name}'s obesity level 4?",
      "Is {name}'s obesity level 5?",
      'Is {name} under 5FT tall?',
      'Is {name} 5FT - 5FT 4 inches tall?',
      'Is {name} 5FT 4 - 5FT 8 inches tall?',
      'Is {name} 5FT 8 - 6FT tall?',
      'is {name} over 6FT tall?',
    ],
  ],
  [
    'Cognitive Ability',
    [
      'Is {name} diagnosed with any form of Dementia?',
      'Does {name} have a learning disability?',
      'Has {name} ever had a brain injury?',
      'Does {name} have good long-term memory recall?',
      'Does {name} have good short-term memory recall?',
      'Is {name} able to follow basic instructions?',
      'Is {name} conscious and co-operative?',
      'Does {name} get agitated with change?',
      'Does {name} have any challenging behaviour issues?',
      'Is {name} fully orientated?',
      'Is {name} de-orientated?',
      'Referral to GP required',
      'Referral to GP made',
      'Mild Cognitive Impairment',
      'Severe Cognitive Impairment',
      'Moderate Cognitive Implement',
    ],
  ],
  [
    'Hearing',
    [
      'Is {name} registered as deaf?',
      'Does {name} wear hearing aids?',
      'Left ear?',
      'Right ear?',
      'Does {name} require assistance positioning the aids?',
      'Does {name} need reminding to wear the aids?',
      '{name} Does not have any hearing impairment?',
      'onward referral required',
      'Not known',
      'Moderate',
      'Mild',
      'Severe',
      'No concern/need identified',
    ],
  ],
  [
    'Sight',
    [
      'Is {name} registered blind?',
      'Does {name} wear glasses?',
      'Does {name} require reminding to wear their glasses?',
      'Has {name} had any form of eye surgery?',
      'Cataracts , left eye',
      'Cataracts, right eye',
      'Glaucoma, left eye',
      'Glaucoma, right eye',
      'Other surgery',
      'No concerns/ needs identified',
      'onward referral required',
      'Mild',
      'Severe',
      'Very Severe',
      'Moderate',
    ],
  ],
  [
    'Environment',
    [],
  ],
  [
    'Flooring',
    [
      'Rugs or worn carpet (flooring risk)?',
      'Worn carpet on stairs?',
    ],
  ],
  [
    'Equipment',
    [],
  ],
  [
    'Transfer Requirements',
    [],
  ],
  [
    'Where is personal Care Completed?',
    [],
  ],
  [
    'Pets',
    [],
  ],
  [
    'Care Assistance Required',
    [
      'Will {name} accept care from the opposite sex?',
    ],
  ],
  [
    'Additional Risks',
    [
      'Are there additional risk assessment guidelines required? (add below)',
      'Reviewed Monthly',
      'Reviewed 3 Monthly',
      'Reviewed 6 Monthly',
    ],
  ],
  [
    'Breathing difficulties',
    [],
  ],
  [
    'Distress / Pain (physical state)',
    [],
  ],
  [
    'Swallowing',
    [],
  ],
  [
    'Appetite',
    [],
  ],
  [
    'Hydration',
    [],
  ],
  [
    'Nutrition',
    [],
  ],
  [
    'Speech impairment',
    [
      '{name} has No concern / need identified',
      '{name} has concern / need identified',
      '{name} has Difficulty in speaking',
      '{name} is Unable to speak',
      'under care of SALT service?',
      'Referral to SALT required ?',
      'Referral to SALT made ?',
      'GP review required ?',
      'GP review requested?',
    ],
  ],
  [
    'Medication',
    [
      'Is {name} taking any prescribed medication ?',
      'Does {name} know why he/she take prescribed medication ?',
      'does {name} know when to take his/her prescribed medication ?',
      'does {name} know how to take his/her prescribed medication ?',
      'What level of support is required with medication ?',
      'prompting or reminding {name} to take her/his medicines ?',
      'Helping him/her remove medicines from packaging ?',
      'Assist to administering some or all of a her/his medicines ?',
      'Carer is to support {name} with medication ?',
      'my family / friends is to support with my medication?',
      '{name} medication is administrate by the district nurse ?',
      '{name} Independent with self administration of all prescribed medications ?',
      'prompting / supervision to self medication required ?',
    ],
  ],
  [
    'Emotional well being (client states)',
    [
      'Feels content all the time',
      'Feels content most of the time',
      'Feels content some of the time',
      'Feels sad all of the time',
      'Feels sad most of the time',
      'Feels sad some of the time',
      'feels low in mood',
      'feels depressed',
      'Referral to GP made',
    ],
  ],
]

const used = new Set()
function uniqueId(sec, label) {
  let id = slug(sec, label)
  let n = 0
  while (used.has(id)) {
    n += 1
    id = `${slug(sec, label)}_${n}`
  }
  used.add(id)
  return id
}

const outSections = sections.map(([title, labels]) => {
  const secKey = slug('sec', title)
  return {
    id: secKey,
    title,
    items: labels.map((label) => ({
      id: uniqueId(title, label),
      label,
    })),
  }
})

const targetJson = path.join(__dirname, '..', 'src', 'lib', 'initial-assessment-catalog.json')
const targetTs = path.join(__dirname, '..', 'src', 'lib', 'initial-assessment-catalog.ts')

fs.writeFileSync(targetJson, JSON.stringify(outSections, null, 2), 'utf8')

const ts = `/** Generated by scripts/gen-initial-assessment-catalog.mjs */
import raw from './initial-assessment-catalog.json'

export type InitialAssessmentItem = { id: string; label: string }
export type InitialAssessmentSection = { id: string; title: string; items: InitialAssessmentItem[] }

export const INITIAL_ASSESSMENT_CATALOG = raw as InitialAssessmentSection[]

export const INITIAL_ASSESSMENT_ITEM_IDS: string[] = INITIAL_ASSESSMENT_CATALOG.flatMap((s) =>
  s.items.map((i) => i.id),
)
`
fs.writeFileSync(targetTs, ts, 'utf8')
console.log('Wrote', targetJson, targetTs, 'sections', outSections.length, 'items', used.size)
