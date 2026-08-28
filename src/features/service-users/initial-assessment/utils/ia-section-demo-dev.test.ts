import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiJson } from '@/shared/api/api-client'
import { runIaSectionDemoDev } from '@/features/service-users/initial-assessment/utils/ia-section-demo-dev'

vi.mock('@/shared/api/api-client', () => ({
  apiJson: vi.fn(),
}))

const mockApiJson = vi.mocked(apiJson)

afterEach(() => {
  vi.clearAllMocks()
})

describe('runIaSectionDemoDev', () => {
  it('POSTs the section fill contract to /dev/run-ia-section (no Playwright)', async () => {
    mockApiJson.mockResolvedValue({
      success: true,
      message: 'ok',
      data: { message: 'Demo data populated for this section (critical).', tabId: 10, answersWritten: 4 },
    })

    const result = await runIaSectionDemoDev('su-1', 'critical', 10, ['q1', 'q2'])

    expect(mockApiJson).toHaveBeenCalledTimes(1)
    const [path, init] = mockApiJson.mock.calls[0]!
    expect(path).toBe('/dev/run-ia-section')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toEqual({
      serviceUserId: 'su-1',
      level: 'critical',
      tabId: 10,
      questionIds: ['q1', 'q2'],
    })
    expect(result).toEqual({
      message: 'Demo data populated for this section (critical).',
      tabId: 10,
      answersWritten: 4,
    })
  })

  it('falls back to sane defaults when the envelope omits data', async () => {
    mockApiJson.mockResolvedValue({ success: true, message: 'done', data: undefined as never })
    const result = await runIaSectionDemoDev('su-1', 'low', 5, [])
    expect(result.tabId).toBe(5)
    expect(result.answersWritten).toBe(0)
    expect(result.message).toBe('done')
  })

  it('propagates API errors to the caller', async () => {
    mockApiJson.mockRejectedValue(new Error('boom'))
    await expect(runIaSectionDemoDev('su-1', 'normal', 1, ['q1'])).rejects.toThrow('boom')
  })
})
