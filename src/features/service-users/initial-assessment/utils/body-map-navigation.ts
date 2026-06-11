export function initialAssessmentBodyMapSearch(submissionId?: string | null) {
  return submissionId
    ? ({ from: 'initial-assessment' as const, submissionId })
    : ({ from: 'initial-assessment' as const })
}
