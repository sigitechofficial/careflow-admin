import { describe, expect, it } from 'vitest'
import { formToUpdatePayload, type ContactFormState } from './ServiceUserContactsTab'

const form = (over: Partial<ContactFormState> = {}): ContactFormState => ({
  firstName: 'Layla',
  lastName: 'Al-Rashid',
  relationshipTypeId: 'rel-sister',
  phone: '',
  mobile: '07700904002',
  email: 'layla@example.test',
  address: '',
  notes: 'POA',
  isPrimary: true,
  isEmergencyContact: true,
  canReceiveUpdates: false,
  ...over,
})

describe('editing a family contact', () => {
  it('sends an emptied email, mobile or other detail as null, so it is removed', () => {
    const body = formToUpdatePayload(form({ email: '', mobile: '  ', lastName: '', notes: '' }))
    expect(body).toMatchObject({ email: null, mobile: null, lastName: null, notes: null, phone: null, address: null })
  })

  it('keeps what is filled in, trimmed', () => {
    const body = formToUpdatePayload(form({ email: ' layla@example.test ' }))
    expect(body).toMatchObject({ firstName: 'Layla', email: 'layla@example.test', mobile: '07700904002', relationshipTypeId: 'rel-sister' })
  })

  it('never sends Can receive care updates (it follows Privacy)', () => {
    expect(formToUpdatePayload(form())).not.toHaveProperty('canReceiveUpdates')
  })
})
