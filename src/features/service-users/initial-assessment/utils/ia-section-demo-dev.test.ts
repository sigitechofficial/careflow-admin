import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiJson } from '@/shared/api/api-client'
import {
  generateIaSectionDemoDev,
  iaDemoIdentityFromDetail,
  persistIaDemoProfilePatch,
  profilePatchHasValues,
} from '@/features/service-users/initial-assessment/utils/ia-section-demo-dev'
import {
  createServiceUserContact,
  fetchServiceUserLookups,
  patchServiceUserAddress,
  updateServiceUser,
  updateServiceUserContact,
} from '@/features/service-users/api'

vi.mock('@/shared/api/api-client', () => ({
  apiJson: vi.fn(),
}))

vi.mock('@/features/service-users/api', () => ({
  updateServiceUser: vi.fn(),
  patchServiceUserAddress: vi.fn(),
  createServiceUserContact: vi.fn(),
  updateServiceUserContact: vi.fn(),
  fetchServiceUserLookups: vi.fn(),
}))

const mockApiJson = vi.mocked(apiJson)
const mockUpdateServiceUser = vi.mocked(updateServiceUser)
const mockPatchAddress = vi.mocked(patchServiceUserAddress)
const mockCreateContact = vi.mocked(createServiceUserContact)
const mockUpdateContact = vi.mocked(updateServiceUserContact)
const mockLookups = vi.mocked(fetchServiceUserLookups)

afterEach(() => {
  vi.clearAllMocks()
})

describe('iaDemoIdentityFromDetail', () => {
  it('omits empty demographic fields so the generator can fill them', () => {
    const identity = iaDemoIdentityFromDetail({
      firstName: 'Priya',
      lastName: 'Nair',
      preferredName: '',
      dateOfBirth: null,
      nhsNumber: '  ',
      nationalInsuranceNumber: null,
      gender: null,
      references: [],
    })
    expect(identity).toEqual({
      firstName: 'Priya',
      lastName: 'Nair',
    })
  })

  it('includes ethnicity and language from profile references when present', () => {
    const identity = iaDemoIdentityFromDetail({
      firstName: 'Priya',
      lastName: 'Nair',
      references: [
        { referenceType: 'SU_PROFILE_ETHNICITY', referenceValue: 'ASIAN_INDIAN' },
        { referenceType: 'SU_PROFILE_LANGUAGE', referenceValue: 'ENGLISH' },
      ],
    })
    expect(identity?.ethnicity).toBe('ASIAN_INDIAN')
    expect(identity?.language).toBe('ENGLISH')
  })

  it('includes structured address, contact and GP occupancy from the profile', () => {
    const identity = iaDemoIdentityFromDetail({
      firstName: 'Priya',
      lastName: 'Nair',
      address: {
        addressLine1: '1 Real Street',
        town: 'Leeds',
        postcode: 'LS2 9JT',
      },
      phone: '0113 111 2222',
      contacts: [
        {
          firstName: 'Asha',
          lastName: 'Khan',
          phone: '0113 333 4444',
          notes: 'Riverside Medical Centre',
          relationshipType: { name: 'GP', code: 'GP' },
        },
      ],
    })
    expect(identity?.addressLine1).toBe('1 Real Street')
    expect(identity?.postcode).toBe('LS2 9JT')
    expect(identity?.phone).toBe('0113 111 2222')
    expect(identity?.gpName).toBe('Asha Khan')
    expect(identity?.gpPhone).toBe('0113 333 4444')
    expect(identity?.gpPractice).toBe('Riverside Medical Centre')
    expect(identity?.gpContact).toMatch(/^Name: Asha Khan/)
    expect(identity?.email).toBeUndefined()
    expect(identity?.mobile).toBeUndefined()
  })
})

describe('generateIaSectionDemoDev', () => {
  it('POSTs the generate (no-save) contract to /dev/generate-ia-section', async () => {
    mockApiJson.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        answers: [{ questionId: 'q1', textValue: 'Realistic note' }],
        metadata: { waterlow: { score: 18 } },
      },
    })

    const result = await generateIaSectionDemoDev('critical', 10, ['q1', 'q2'])

    expect(mockApiJson).toHaveBeenCalledTimes(1)
    const [path, init] = mockApiJson.mock.calls[0]!
    expect(path).toBe('/dev/generate-ia-section')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toEqual({
      level: 'critical',
      tabId: 10,
      questionIds: ['q1', 'q2'],
    })
    expect(result.answers).toEqual([{ questionId: 'q1', textValue: 'Realistic note' }])
    expect(result.metadata).toEqual({ waterlow: { score: 18 } })
    expect(result.profilePatch).toEqual({})
  })

  it('POSTs the Service User identity when provided', async () => {
    mockApiJson.mockResolvedValue({
      success: true,
      message: 'ok',
      data: { answers: [], metadata: {} },
    })
    await generateIaSectionDemoDev('low', 18, [], {
      firstName: 'Helen',
      lastName: 'Wright',
      preferredName: 'Helen',
    })
    const [, init] = mockApiJson.mock.calls[0]!
    expect(JSON.parse(init?.body as string)).toEqual({
      level: 'low',
      tabId: 18,
      questionIds: [],
      identity: { firstName: 'Helen', lastName: 'Wright', preferredName: 'Helen' },
    })
  })

  it('POSTs serviceUserId for the currently opened Service User (not an allow-list)', async () => {
    mockApiJson.mockResolvedValue({
      success: true,
      message: 'ok',
      data: { answers: [], metadata: {} },
    })
    await generateIaSectionDemoDev('critical', 10, ['q1'], null, '11111111-1111-4111-8111-111111111111')
    const [, init] = mockApiJson.mock.calls[0]!
    expect(JSON.parse(init?.body as string)).toEqual({
      level: 'critical',
      tabId: 10,
      questionIds: ['q1'],
      serviceUserId: '11111111-1111-4111-8111-111111111111',
    })
  })

  it('falls back to empty answers/metadata when the envelope omits data', async () => {
    mockApiJson.mockResolvedValue({ success: true, message: 'done', data: undefined as never })
    const result = await generateIaSectionDemoDev('low', 5, [])
    expect(result.answers).toEqual([])
    expect(result.metadata).toEqual({})
    expect(result.profilePatch).toEqual({})
  })

  it('propagates API errors to the caller', async () => {
    mockApiJson.mockRejectedValue(new Error('boom'))
    await expect(generateIaSectionDemoDev('normal', 1, ['q1'])).rejects.toThrow('boom')
  })

  it('returns profilePatch from the generate envelope', async () => {
    mockApiJson.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        answers: [],
        metadata: {},
        profilePatch: { address: { addressLine1: '12 Maple Close' }, gp: { name: 'Dr A. Patel' } },
      },
    })
    const result = await generateIaSectionDemoDev('normal', 1, [])
    expect(result.profilePatch).toEqual({
      address: { addressLine1: '12 Maple Close' },
      gp: { name: 'Dr A. Patel' },
    })
  })
})

describe('persistIaDemoProfilePatch', () => {
  it('writes empty address/contact/GP through the profile APIs the widgets use', async () => {
    mockLookups.mockResolvedValue({
      relationshipTypes: [{ id: 'rel-gp', code: 'GP' }],
    } as never)
    mockUpdateServiceUser.mockResolvedValue(undefined as never)
    mockPatchAddress.mockResolvedValue(undefined as never)
    mockCreateContact.mockResolvedValue(undefined as never)

    const patch = {
      address: {
        addressLine1: '12 Maple Close',
        addressLine2: 'Little Woodhouse',
        town: 'Leeds',
        county: 'West Yorkshire',
        postcode: 'LS1 4AP',
      },
      phone: '0113 496 0123',
      mobile: '07700 900123',
      email: 'qa.client@example.net',
      gp: { name: 'Dr A. Patel', phone: '0113 496 0456', practice: 'Oak Tree Medical Practice' },
    }
    expect(profilePatchHasValues(patch)).toBe(true)
    await persistIaDemoProfilePatch('su-1', patch)

    expect(mockUpdateServiceUser).toHaveBeenCalledWith('su-1', {
      phone: '0113 496 0123',
      mobile: '07700 900123',
      email: 'qa.client@example.net',
    })
    expect(mockPatchAddress).toHaveBeenCalledWith('su-1', patch.address)
    expect(mockCreateContact).toHaveBeenCalledWith(
      'su-1',
      expect.objectContaining({
        firstName: 'Dr A.',
        lastName: 'Patel',
        phone: '0113 496 0456',
        notes: 'Oak Tree Medical Practice',
        relationshipTypeId: 'rel-gp',
      }),
    )
    expect(mockUpdateContact).not.toHaveBeenCalled()
  })

  it('patches an existing GP contact without inventing a new name', async () => {
    mockUpdateContact.mockResolvedValue(undefined as never)
    await persistIaDemoProfilePatch(
      'su-1',
      { gp: { phone: '0113 496 0456', practice: 'Oak Tree Medical Practice' } },
      { gpContactId: 'gp-1' },
    )
    expect(mockUpdateContact).toHaveBeenCalledWith('su-1', 'gp-1', {
      phone: '0113 496 0456',
      notes: 'Oak Tree Medical Practice',
    })
    expect(mockCreateContact).not.toHaveBeenCalled()
  })
})
