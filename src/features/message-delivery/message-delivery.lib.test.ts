import { describe, expect, it } from 'vitest'
import { changedFields, deliverySummary, parseList, saveProblems } from './message-delivery.lib'
import type { DeliveryRules } from './message-delivery.api'

const base: DeliveryRules = {
  emailEnabled: true,
  textEnabled: true,
  whatsappEnabled: true,
  pushEnabled: true,
  emailAudience: 'EVERYONE',
  textAudience: 'EVERYONE',
  pushAudience: 'EVERYONE',
  allowedEmails: [],
  allowedPhones: [],
  disabledKinds: [],
  heldEmailsTo: null,
}

describe('message delivery page helpers', () => {
  it('reads lists one per line or comma, without blanks or duplicates', () => {
    expect(parseList('a@x.com\n\n A@X.com, @allforcare.co.uk;', true)).toEqual(['a@x.com', '@allforcare.co.uk'])
  })

  it('says what stops a save', () => {
    expect(saveProblems({ ...base, emailAudience: 'ALLOWED_ONLY' })).toEqual(['Emails are limited to the allowed list, but the list has no emails.'])
    expect(saveProblems({ ...base, allowedEmails: ['nope'], allowedPhones: ['abc'], heldEmailsTo: 'a@x.com, b@y.com' })).toHaveLength(3)
    expect(saveProblems({ ...base, emailAudience: 'ALLOWED_ONLY', allowedEmails: ['@allforcare.co.uk'] })).toEqual([])
  })

  it('sends only what changed', () => {
    expect(changedFields(base, { ...base, pushEnabled: false, allowedEmails: ['a@x.com'] })).toEqual({ pushEnabled: false, allowedEmails: ['a@x.com'] })
    expect(changedFields(base, { ...base })).toEqual({})
  })

  it('sums up where sending stands', () => {
    expect(deliverySummary(base).tone).toBe('success')
    expect(deliverySummary({ ...base, emailEnabled: false, textEnabled: false, whatsappEnabled: false, pushEnabled: false }).tone).toBe('destructive')
    const limited = deliverySummary({ ...base, emailAudience: 'ALLOWED_ONLY', disabledKinds: ['EMAIL:quotes'] })
    expect(limited).toEqual({ tone: 'warning', text: 'Only to the allowed list: Email. 1 message type switched off.' })
  })
})
