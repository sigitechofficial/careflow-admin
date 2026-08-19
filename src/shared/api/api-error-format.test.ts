import { describe, expect, it } from 'vitest'
import {
  formatApiErrorMessage,
  parseApiFieldErrors,
  stringifyApiErrorItem,
} from './api-error-format'

describe('stringifyApiErrorItem', () => {
  it('returns class-validator strings as required-field copy', () => {
    expect(stringifyApiErrorItem('firstName should not be empty')).toBe('First name is required')
  })

  it('never stringifies prisma unique objects as [object Object]', () => {
    expect(stringifyApiErrorItem({ target: ['serviceUserNumber'] })).toBe(
      'Service user number is already in use',
    )
    expect(stringifyApiErrorItem({ target: 'ServiceUser_nhsNumber_key' })).toBe(
      'NHS number is already in use',
    )
  })

  it('formats invalid foreign keys', () => {
    expect(stringifyApiErrorItem({ code: 'P2003', field: 'ServiceUser_statusId_fkey' })).toBe(
      'Status is not a valid selection',
    )
  })
})

describe('formatApiErrorMessage', () => {
  it('joins validation error strings', () => {
    expect(
      formatApiErrorMessage(
        { success: false, message: 'Validation failed', errors: ['lastName should not be empty'] },
        'Request failed',
      ),
    ).toBe('Last name is required')
  })

  it('formats prisma unique constraint bodies', () => {
    expect(
      formatApiErrorMessage(
        { success: false, message: 'Unique constraint failed', errors: [{ target: ['email'] }] },
        String({ message: 'Unique constraint failed' }),
      ),
    ).toBe('Email is already in use')
  })

  it('does not use [object Object] as a fallback', () => {
    expect(
      formatApiErrorMessage(
        { message: { nested: true }, errors: [{ target: ['statusId'] }] },
        '[object Object]',
      ),
    ).toBe('Status is already in use')
  })

  it('joins array message payloads from Nest', () => {
    expect(
      formatApiErrorMessage(
        { message: ['nhsNumber must be shorter than or equal to 50 characters'] },
        'Request failed',
      ),
    ).toBe('NHS number: must be shorter than or equal to 50 characters')
  })
})

describe('parseApiFieldErrors', () => {
  it('maps required and unique errors onto field keys', () => {
    expect(
      parseApiFieldErrors({
        message: 'Validation failed',
        errors: ['firstName should not be empty', { target: ['serviceUserNumber'] }],
      }),
    ).toEqual({
      firstName: 'First name is required',
      serviceUserNumber: 'Service user number is already in use',
    })
  })
})
