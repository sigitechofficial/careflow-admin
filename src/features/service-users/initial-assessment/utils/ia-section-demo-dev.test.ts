import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiJson } from '@/shared/api/api-client'
import {
  generateIaSectionDemoDev,
  iaDemoIdentityFromDetail,
} from '@/features/service-users/initial-assessment/utils/ia-section-demo-dev'

vi.mock('@/shared/api/api-client', () => ({
  apiJson: vi.fn(),
}))

const mockApiJson = vi.mocked(apiJson)

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
    // No serviceUserId — nothing is persisted, so none is needed.
    expect(JSON.parse(init?.body as string)).toEqual({
      level: 'critical',
      tabId: 10,
      questionIds: ['q1', 'q2'],
    })
    expect(result.answers).toEqual([{ questionId: 'q1', textValue: 'Realistic note' }])
    expect(result.metadata).toEqual({ waterlow: { score: 18 } })
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

  it('falls back to empty answers/metadata when the envelope omits data', async () => {
    mockApiJson.mockResolvedValue({ success: true, message: 'done', data: undefined as never })
    const result = await generateIaSectionDemoDev('low', 5, [])
    expect(result.answers).toEqual([])
    expect(result.metadata).toEqual({})
  })

  it('propagates API errors to the caller', async () => {
    mockApiJson.mockRejectedValue(new Error('boom'))
    await expect(generateIaSectionDemoDev('normal', 1, ['q1'])).rejects.toThrow('boom')
  })
})
