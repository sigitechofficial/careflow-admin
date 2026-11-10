import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/surveys/hooks/useSurveys', () => ({}))

import { recordCandidateDescription } from '@/features/surveys/components/RecordSurveyResponseDialog'

const base = { id: 'su-1', name: 'Bob Smith', recipientStatus: null, hasResponse: false } as const

describe('recordCandidateDescription', () => {
  it('marks people sent it without a portal account so the office phones, visits or posts', () => {
    expect(recordCandidateDescription({ ...base, recipientStatus: 'SENT', hasPortal: false })).toBe(
      'Sent: no portal account — phone, visit or post',
    )
  })

  it('keeps the other states as they were', () => {
    expect(recordCandidateDescription({ ...base, recipientStatus: 'SENT', hasPortal: true })).toBe(
      'Survey sent — not answered yet',
    )
    expect(recordCandidateDescription({ ...base, recipientStatus: 'SENT' })).toBe('Survey sent — not answered yet')
    expect(recordCandidateDescription({ ...base, hasPortal: false })).toBe('Not sent yet')
    expect(recordCandidateDescription({ ...base, recipientStatus: 'COMPLETED', hasResponse: true })).toBe(
      'Already answered',
    )
    expect(recordCandidateDescription({ ...base, statusHidden: true, hasPortal: false })).toMatch(/Anonymous survey/)
  })
})
