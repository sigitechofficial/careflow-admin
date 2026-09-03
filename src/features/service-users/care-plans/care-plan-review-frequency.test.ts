import { resolveEditorNextReviewDate } from './care-plan-review-frequency'

describe('resolveEditorNextReviewDate', () => {
  it('prefers the staff override, then canonical instance date, then pathway default', () => {
    expect(
      resolveEditorNextReviewDate({
        metaDate: '2026-12-15',
        publishedNextReviewDueAt: '2027-02-28T00:00:00.000Z',
        defaultNextReviewDate: '2027-02-28',
      }),
    ).toBe('2026-12-15')
    expect(
      resolveEditorNextReviewDate({
        metaDate: '',
        publishedNextReviewDueAt: '2027-08-31T12:00:00.000Z',
        defaultNextReviewDate: '2027-02-28',
      }),
    ).toBe('2027-08-31')
    expect(
      resolveEditorNextReviewDate({
        metaDate: null,
        publishedNextReviewDueAt: null,
        defaultNextReviewDate: '2027-02-28',
      }),
    ).toBe('2027-02-28')
  })

  it('does not invent a 180-day fallback', () => {
    expect(
      resolveEditorNextReviewDate({
        metaDate: '',
        publishedNextReviewDueAt: null,
        defaultNextReviewDate: null,
      }),
    ).toBe('')
  })
})
