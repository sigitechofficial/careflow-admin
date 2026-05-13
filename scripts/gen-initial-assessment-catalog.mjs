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
    [
      '{name} is able to walk',
      '{name} uses a frame ( 4 -wheel trolley)',
      '{name} uses sticks',
      '{name} needs assistance to mobilise',
      '{name} needs assistance to settle into bed',
      '{name} can change position in bed',
      '{name} uses a wheel chair',
      '{name} uses a hoist',
      '{name} is restricted to bed',
      '{name} used a sling',
      '{name} uses Handrails/Bedrails',
      '{name} uses scooter/walker',
    ],
  ],
  [
    'Amputation',
    [
      '{name} has an amputation of the left leg, below knee',
      '{name} has an amputation of the left leg above knee',
      '{name} has an amputation of the right leg below knee',
      '{name} has an amputation of the right leg above knee',
    ],
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
    [
      'Level Entrance?',
      'Level Exit?',
      'One or more steps?',
      'Is there lift access to the front door?',
      'Back door to be used?',
      'Key Pad Entry (enter secure code below)?',
      'Shared environment?',
      'Good lighting at the entrance?',
      'Good lighting at the exit?',
      'Key safe fitted?',
      'Clean and tidy work area for the staff?',
      'Safe area to work when care is required?',
      'Are staff required to move equipment into position?',
      'Is there level access throughout?',
      'Have access hazards been identified ? (add below)',
      'Are there trailing wires or leads?',
      'Are all sockets secure?',
      'Are all sockets in good working order?',
      'Is a smoke alarm fitted?',
      'Is the smoke alarm in good working order?',
      'Is a carbon monoxide alarm fitted?',
      'Is the carbon monoxide alarm in good working order?',
      'Is a referral required for a smoke or CM alarm?',
      '{name} is a hoarder',
      'Is Fire alarm fitted?',
      'Is Fire Alarm in good working order',
    ],
  ],
  [
    'Flooring',
    [
      'Thick carpet?',
      'Worn carpet?',
      'Rugs?',
      'Wooden flooring?',
      'Laminate flooring?',
      'Tiles?',
      'Other?',
    ],
  ],
  [
    'Equipment',
    [
      'Are all mobilising aids in good working order?',
      'If a hoist is supplied, has it been serviced?',
      'Oxford Medi or similar?',
      'Ceiling track hoist?',
      'Standing hoist?',
      'Does our training cover the hoist type?',
      'Is additional training or guidance required from the OT?',
      'Do you require an electric wheel chair?',
      'Has it been serviced?',
      'Are Staff required to place it on charge?',
      'If manual hoist, does it move on the flooring easily?',
      'IS a profiling bed provided?',
      'Has it been serviced?',
      'Is an air mattress being used?',
      'Is it electric?',
      'Has it been serviced?',
      'If not an electric bed, is the bed at the correct height?',
      '{name} Does not require any transfer aid?',
      '{name} Fully Weight Bearing?',
      'High back Chair',
      'Reclining chair',
      'Commode',
      'Shower',
    ],
  ],
  [
    'Transfer Requirements',
    [
      'Bed to chair?',
      'Chair to bed?',
      'Commode to chair?',
      'Commode to bed?',
      'Commode or chair to shower?',
      'Commode or chair to bath?',
      '{name} Independent with all transfers',
    ],
  ],
  [
    'Where is personal Care Completed?',
    ['Bed?', 'Commode?', 'Bathroom?', 'Other?'],
  ],
  [
    'Pets',
    [
      'Does {name} have any pets?',
      'Will they be put away when the care staff work?',
      'Has there been any pet infestations?',
      'Are the pets treated to prevent infestation?',
    ],
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
    [
      '{name} No concern / need identified',
      '{name} is Mild on exertion',
      '{name} is moderate on exertion',
      '{name} is mild at rest',
      '{name} is Severe on exertion',
      '{name} is Mild at rest',
      '{name} is Severe at rest',
      'Is {name} Oxygen dependent',
      '{name} required GP/Specialist nurse review ?',
      '{name} experiences difficulty',
    ],
  ],
  [
    'Distress / Pain (physical state)',
    [
      'No Concern / Need Identified with {name}',
      'Mild on movement',
      'Moderate On Movement',
      'Severe on Movement',
      'Mild at Rest',
      'Moderate at Rest',
      'Severe at rest',
      'Pain assesment completed',
      'GP review requested',
      'In particular area',
    ],
  ],
  [
    'Swallowing',
    [
      'No concern / need identified with {name}',
      'Coughing episodes when swallowing liquids',
      'Coughing episodes when swallowing solids',
      'Choking episodes',
      'All occasions',
      'Intermittent',
      'Referral to SALT required',
      'Referral to SALT made',
      'GP review requested',
      'Requires aids /Special equipment for eating or drinking',
      'yes',
      'no',
      'Enterally fed',
      'Any routine state see care plan',
    ],
  ],
  [
    'Appetite',
    [
      '{name} has No concern / need identified',
      '{name} has very good appetite',
      'good appetite',
      '{name} has poor appetite',
      '{name} take Nutritional Supplements',
      'Nutritional Supplements required',
      'Referral made to Dietitian',
      'GP review requested',
    ],
  ],
  [
    'Hydration',
    [
      'Is the client drinking enough/adequately hydrated — Yes',
      'Is the client drinking enough/adequately hydrated — No',
    ],
  ],
  [
    'Nutrition',
    [
      '{name} is Nourished',
      '{name} is Malnourished',
      '{name} is Severely malnourished',
      '{name} is Obese',
      '{name} is Average',
      'Body Mass Index completed?',
      'MUST assessment completed ?',
      'Referral made to Dietician ?',
      'GP review requested ?',
      'Any comment see care plan',
    ],
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
