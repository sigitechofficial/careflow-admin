/** How carers enter the property (UK domiciliary access). */
export const HOME_ACCESS_METHODS = [
  { value: 'key_safe', label: 'Key safe' },
  { value: 'answers_door', label: 'Person answers door' },
  { value: 'family_keyholder', label: 'Family / keyholder' },
  { value: 'agency_holds_key', label: 'Agency holds key' },
  { value: 'intercom', label: 'Intercom / call on arrival' },
  { value: 'other', label: 'Other' },
] as const

export type HomeAccessMethod = (typeof HOME_ACCESS_METHODS)[number]['value']

export function homeAccessMethodLabel(value: string | null | undefined): string | null {
  const code = value?.trim()
  if (!code) return null
  return HOME_ACCESS_METHODS.find(row => row.value === code)?.label ?? code
}

export function showsKeySafeFields(method: string | null | undefined): boolean {
  return method?.trim() === 'key_safe'
}

export function homeAccessNotesCopy(method: string | null | undefined): {
  label: string
  hint: string
  placeholder: string
} {
  switch (method?.trim()) {
    case 'key_safe':
      return {
        label: 'How to enter the property',
        hint: 'Extra notes for carers (which door, dogs, parking). Do not put the code here.',
        placeholder: 'e.g. Ring twice, then use the key safe. Leave the side gate locked.',
      }
    case 'answers_door':
      return {
        label: 'How to enter the property',
        hint: 'How carers should knock, wait, or announce themselves.',
        placeholder: 'e.g. Knock once and wait. Allow extra time if they use a walking frame.',
      }
    case 'family_keyholder':
      return {
        label: 'How to enter the property',
        hint: 'Who lets carers in, and how to contact them on arrival.',
        placeholder: 'e.g. Call the daughter on arrival — she lets carers in.',
      }
    case 'agency_holds_key':
      return {
        label: 'How to enter the property',
        hint: 'How the office key is collected, tagged, and returned.',
        placeholder: 'e.g. Collect the tagged key from the office before the visit. Return after clock-out.',
      }
    case 'intercom':
      return {
        label: 'How to enter the property',
        hint: 'Buzzer, flat number, or who to call if there is no answer.',
        placeholder: 'e.g. Press buzzer for Flat 2. If no answer, call the mobile on file.',
      }
    case 'other':
      return {
        label: 'How to enter the property',
        hint: 'Describe the agreed way in for scheduled visits.',
        placeholder: 'Describe how carers should enter.',
      }
    default:
      return {
        label: 'How to enter the property',
        hint: 'Choose an access method first, then add any notes carers need.',
        placeholder: '',
      }
  }
}
