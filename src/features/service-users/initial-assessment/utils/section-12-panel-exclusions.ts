import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

/** Template questions rendered inside custom section 12 panels. */
export function section12PanelExcludedIds(questions: InitialAssessmentQuestion[]): Set<string> {
  const ids = section12TransferMatrixExcludedIds(questions)
  for (const id of section12FallsHistoryExcludedIds(questions)) {
    ids.add(id)
  }
  for (const id of section12EquipmentTemplateExcludedIds(questions)) {
    ids.add(id)
  }
  return ids
}

/** §12.7 fall history — rendered in the falls panel. */
export function section12FallsHistoryExcludedIds(
  questions: InitialAssessmentQuestion[],
): Set<string> {
  const ids = new Set<string>()
  for (const q of questions) {
    if (q.metadata?.specRef === '12.7') ids.add(q.id)
  }
  return ids
}

/** §12.8 equipment template fields — rendered in the equipment panel (legacy ref 12.8a included). */
export function section12EquipmentTemplateExcludedIds(
  questions: InitialAssessmentQuestion[],
): Set<string> {
  const ids = new Set<string>()
  for (const q of questions) {
    const ref = q.metadata?.specRef
    if (ref === '12.8' || ref === '12.8a') ids.add(q.id)
  }
  return ids
}

/** Template questions replaced by the transfer matrix panel (§12.5c). */
export function section12TransferMatrixExcludedIds(
  questions: InitialAssessmentQuestion[],
): Set<string> {
  const ids = new Set<string>()
  for (const q of questions) {
    const ref = q.metadata?.specRef
    if (ref !== '12.5c') continue
    const text = q.questionText.toLowerCase()
    if (
      q.metadata?.fieldKey === 'transferSupportRequired' ||
      text.includes('independent with all transfers') ||
      text.includes('transfer comments')
    ) {
      ids.add(q.id)
    }
  }
  return ids
}
