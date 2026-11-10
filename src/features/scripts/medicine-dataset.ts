/**
 * Built-in medicines for Scripts → Visit Creation: a visit can auto-add some of these, or a medicine row
 * can be filled from this list. Common medicines in UK domiciliary care, as DEMO / TEST data for setting
 * up visits — not clinical or prescribing guidance. Add or change entries here.
 *
 * route: a route code from Settings → Medication (ORAL, TOPICAL, INHALATION, EYE, …).
 * rounds: the round(s) it is usually given in (MORNING, MIDDAY, AFTERNOON, EVENING, NIGHT); auto-add
 * prefers medicines usual for the visit's round.
 */
export type DatasetMedicine = {
  name: string
  dose: string
  form: string
  route: string
  kind: 'REGULAR' | 'PRN'
  rounds: string[]
  instructions?: string
}

export const MEDICINE_DATASET: DatasetMedicine[] = [
  // Pain and fever
  { name: 'Paracetamol', dose: '500mg', form: 'tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING', 'MIDDAY', 'EVENING', 'NIGHT'], instructions: 'Two tablets; no more than 8 in 24 hours' },
  { name: 'Co-codamol', dose: '8mg/500mg', form: 'tablet', route: 'ORAL', kind: 'PRN', rounds: ['MORNING', 'EVENING'], instructions: 'When needed for pain' },
  { name: 'Ibuprofen gel', dose: '5%', form: 'gel', route: 'TOPICAL', kind: 'PRN', rounds: ['MORNING', 'EVENING'], instructions: 'Apply thinly to the painful area' },
  // Heart and blood pressure
  { name: 'Amlodipine', dose: '5mg', form: 'tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING'] },
  { name: 'Ramipril', dose: '2.5mg', form: 'capsule', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING'] },
  { name: 'Bisoprolol', dose: '2.5mg', form: 'tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING'] },
  { name: 'Lisinopril', dose: '10mg', form: 'tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING'] },
  { name: 'Losartan', dose: '50mg', form: 'tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING'] },
  { name: 'Furosemide', dose: '40mg', form: 'tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING'], instructions: 'Give in the morning' },
  { name: 'Bendroflumethiazide', dose: '2.5mg', form: 'tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING'] },
  { name: 'Aspirin', dose: '75mg', form: 'dispersible tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING'], instructions: 'With or after food' },
  { name: 'Clopidogrel', dose: '75mg', form: 'tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING'] },
  { name: 'Atorvastatin', dose: '20mg', form: 'tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['EVENING', 'NIGHT'] },
  { name: 'Simvastatin', dose: '40mg', form: 'tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['EVENING', 'NIGHT'] },
  { name: 'Glyceryl trinitrate spray', dose: '400mcg per dose', form: 'spray', route: 'SUBLINGUAL', kind: 'PRN', rounds: ['MORNING'], instructions: 'When needed for chest pain' },
  // Diabetes and thyroid
  { name: 'Metformin', dose: '500mg', form: 'tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING', 'EVENING'], instructions: 'With food' },
  { name: 'Gliclazide', dose: '40mg', form: 'tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING'], instructions: 'With breakfast' },
  { name: 'Levothyroxine', dose: '50mcg', form: 'tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING'], instructions: '30 minutes before breakfast' },
  // Stomach and bowels
  { name: 'Omeprazole', dose: '20mg', form: 'capsule', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING'], instructions: 'Before breakfast' },
  { name: 'Lansoprazole', dose: '15mg', form: 'capsule', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING'] },
  { name: 'Senna', dose: '7.5mg', form: 'tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['NIGHT', 'EVENING'], instructions: 'Two tablets at night' },
  { name: 'Lactulose', dose: '15ml', form: 'oral solution', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING', 'EVENING'] },
  { name: 'Macrogol', dose: '1 sachet', form: 'oral powder', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING'], instructions: 'Mix with water' },
  // Memory, mood and sleep
  { name: 'Donepezil', dose: '5mg', form: 'tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['NIGHT', 'EVENING'] },
  { name: 'Memantine', dose: '10mg', form: 'tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING'] },
  { name: 'Sertraline', dose: '50mg', form: 'tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING'] },
  { name: 'Mirtazapine', dose: '15mg', form: 'tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['NIGHT', 'EVENING'] },
  { name: 'Citalopram', dose: '20mg', form: 'tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING'] },
  // Bones, vitamins and supplements
  { name: 'Calcium and vitamin D (Adcal-D3)', dose: '1 tablet', form: 'chewable tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING', 'MIDDAY', 'EVENING'], instructions: 'Chew' },
  { name: 'Colecalciferol', dose: '800 units', form: 'capsule', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING', 'MIDDAY'] },
  { name: 'Ferrous fumarate', dose: '210mg', form: 'tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING', 'MIDDAY'] },
  { name: 'Folic acid', dose: '5mg', form: 'tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING'] },
  // Breathing and allergies
  { name: 'Salbutamol inhaler', dose: '100mcg per puff', form: 'inhaler', route: 'INHALATION', kind: 'PRN', rounds: ['MORNING', 'EVENING'], instructions: 'Two puffs when needed' },
  { name: 'Beclometasone inhaler', dose: '100mcg per puff', form: 'inhaler', route: 'INHALATION', kind: 'REGULAR', rounds: ['MORNING', 'EVENING'], instructions: 'Rinse mouth after use' },
  { name: 'Cetirizine', dose: '10mg', form: 'tablet', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING'] },
  // Skin, eyes and other
  { name: 'Emollient cream (Epimax)', dose: 'Apply thinly', form: 'cream', route: 'TOPICAL', kind: 'REGULAR', rounds: ['MORNING', 'EVENING', 'AFTERNOON'], instructions: 'To dry skin' },
  { name: 'Barrier cream (Cavilon)', dose: 'Apply thinly', form: 'cream', route: 'TOPICAL', kind: 'REGULAR', rounds: ['MORNING', 'AFTERNOON', 'EVENING'], instructions: 'To pressure areas after washing' },
  { name: 'Hypromellose eye drops', dose: '1 drop', form: 'eye drops', route: 'EYE', kind: 'REGULAR', rounds: ['MORNING', 'MIDDAY', 'AFTERNOON', 'EVENING'], instructions: 'Each eye' },
  { name: 'Tamsulosin', dose: '400mcg', form: 'capsule', route: 'ORAL', kind: 'REGULAR', rounds: ['MORNING'], instructions: 'After breakfast' },
  { name: 'Buprenorphine patch', dose: '5mcg/hour', form: 'patch', route: 'TRANSDERMAL', kind: 'REGULAR', rounds: ['MORNING'], instructions: 'Change every 7 days; rotate the site' },
]

/** "Paracetamol 500mg tablet — Oral" for pickers. */
export const datasetMedicineLabel = (m: DatasetMedicine) =>
  `${m.name} ${m.dose} ${m.form}${m.kind === 'PRN' ? ' (PRN)' : ''}`

const normName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/**
 * Up to `count` Regular medicines for one visit, chosen at random: those usual for the visit's round
 * first, never one in `exclude` (already active for the service user, or already on their visits).
 */
export function pickDatasetMedicines(round: string, count: number, exclude: Iterable<string>, random = Math.random): DatasetMedicine[] {
  const skip = new Set([...exclude].map(normName))
  const shuffle = <T,>(list: T[]) =>
    list
      .map((v) => ({ v, k: random() }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.v)
  const candidates = MEDICINE_DATASET.filter((m) => m.kind === 'REGULAR' && !skip.has(normName(m.name)))
  const usual = shuffle(candidates.filter((m) => m.rounds.includes(round.toUpperCase())))
  const other = shuffle(candidates.filter((m) => !m.rounds.includes(round.toUpperCase())))
  return [...usual, ...other].slice(0, Math.max(0, count))
}
