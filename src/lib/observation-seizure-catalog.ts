export type SeizureOption = { value: string; label: string }

export const SEIZURE_TRIGGERS: SeizureOption[] = [
  { value: 'UNKNOWN', label: 'Unknown' },
  { value: 'ILLNESS', label: 'Illness' },
  { value: 'CONSTIPATION', label: 'Constipation' },
  { value: 'SLEEP_PATTERN', label: 'Sleep (pattern)' },
  { value: 'MEDICATION_CHANGE', label: 'Changes in medication' },
  { value: 'STRESS', label: 'Associated with stress' },
  { value: 'OTHER', label: 'Other (record below)' },
]

export const SEIZURE_PRE_WARNING: SeizureOption[] = [
  { value: 'UNKNOWN', label: 'Unknown' },
  { value: 'NONE', label: 'None' },
  { value: 'BEHAVIOUR_CHANGES', label: 'Behaviour Changes' },
  { value: 'LETHARGY', label: 'Lethargy' },
  { value: 'MOOD_CHANGE', label: 'Mood Change' },
  { value: 'TASTE', label: 'Taste' },
  { value: 'SMELL', label: 'Smell' },
  { value: 'NAUSEA', label: 'Nausea' },
  { value: 'TINGLING', label: 'Tingling' },
  { value: 'PINS_NEEDLES', label: 'Pins and needles' },
  { value: 'NUMBNESS', label: 'Numbness' },
  { value: 'WEAKNESS', label: 'Weakness' },
  { value: 'OTHER', label: 'Other (record below)' },
]

export const SEIZURE_DURING: SeizureOption[] = [
  { value: 'UNKNOWN', label: 'Unknown' },
  { value: 'MUMBLING', label: 'Mumbling (automatism)' },
  { value: 'LAUGHING', label: 'Laughing (automatism)' },
  { value: 'WANDERING', label: 'Wandering around (automatism)' },
  { value: 'CONFUSION', label: 'Confusion (automatism)' },
  { value: 'BEHAVIOUR_CHANGE', label: 'Behaviour change (record below)' },
  { value: 'EYE_MOVEMENT', label: 'Eye movement (which eye/direction?)' },
  { value: 'EYE_DEVIATION', label: 'Eye deviation (which eye/direction?)' },
  { value: 'BLANK_STARE', label: 'Blank stare' },
  { value: 'HEAD_TURNING', label: 'Head movement/turning (direction?)' },
  { value: 'FELL', label: 'Fell' },
  { value: 'RIGID_TONIC', label: 'Rigid (tonic) (where?)' },
  { value: 'FLOPPY_ATONIC', label: 'Floppy (atonic) (where?)' },
  { value: 'SPASMS', label: 'Spasms (where?)' },
  { value: 'SPASMS_BRIEF', label: 'Spasms brief (where?)' },
  { value: 'RHYTHMIC_JERKING', label: 'Rhythmic jerking (convulsion) (where?)' },
  { value: 'INCONTINENT_URINE', label: 'Incontinent of urine' },
  { value: 'INCONTINENT_FAECES', label: 'Incontinent of faeces' },
  { value: 'CYANOSIS', label: 'Cyanosis (blue)' },
  { value: 'CONSCIOUS', label: 'Conscious' },
  { value: 'UNCONSCIOUS', label: 'Unconscious' },
  { value: 'RESPONSIVE_TOUCH', label: 'Responsive to touch' },
  { value: 'RESPONSIVE_SOUND', label: 'Responsive to sound' },
  { value: 'RESPONSIVE_VISUAL', label: 'Responsive to visual stimuli' },
  { value: 'UNRESPONSIVE', label: 'Unresponsive (how long?)' },
  { value: 'PALE_FACE', label: 'Pale face' },
  { value: 'FACE_FLUSHED', label: 'Face flushed' },
  { value: 'STARING_ONSET', label: 'Staring on onset' },
  { value: 'OTHER_COLOUR', label: 'Other colour changes (record below)' },
  { value: 'MOUTH_FROTHING', label: 'Mouth frothing' },
  { value: 'SALIVA', label: 'Saliva from mouth' },
  { value: 'TONGUE_BITTEN', label: 'Tongue bitten' },
  { value: 'CHEWING', label: 'Chewing (automatism)' },
  { value: 'LIP_SMACKING', label: 'Lip smacking (automatism)' },
  { value: 'SCREAMING', label: 'Screaming (automatism)' },
  { value: 'CRYING', label: 'Crying (automatism)' },
  { value: 'OTHER', label: 'Other (record below)' },
]

export const SEIZURE_AFTER: SeizureOption[] = [
  { value: 'IMMEDIATE_RECOVERY', label: 'Immediate recovery' },
  { value: 'CONFUSION', label: 'Confusion' },
  { value: 'SLEPT', label: 'Slept' },
  { value: 'AGGRESSIVE', label: 'Aggressive' },
  { value: 'AUTOMATISMS', label: 'Automatisms (record which)' },
  { value: 'HEADACHE', label: 'Headache' },
  { value: 'VOMITING', label: 'Vomiting' },
  { value: 'PARALYSIS', label: 'Paralysis' },
  { value: 'AMNESIA', label: 'Amnesia' },
  { value: 'OTHER', label: 'Other (record below)' },
]

export const SEIZURE_INTERVENTIONS: SeizureOption[] = [
  { value: 'PRN_GIVEN', label: 'PRN given (record below)' },
  { value: 'GP_VISIT', label: 'GP visit' },
  { value: 'AMBULANCE', label: 'Ambulance called' },
  { value: 'HOSPITAL', label: 'Hospital admission' },
  { value: 'OTHER', label: 'Other (record below)' },
]

export function seizureOptionLabel(options: SeizureOption[], value: string | undefined): string {
  if (!value) return '—'
  return options.find(o => o.value === value)?.label ?? value.replace(/_/g, ' ')
}
