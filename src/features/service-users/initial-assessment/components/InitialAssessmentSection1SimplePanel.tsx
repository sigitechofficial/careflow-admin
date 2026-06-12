import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import {
  HOLISTIC_SECTION_BODY_CLASS,
  HOLISTIC_SECTION_SHELL_CLASS,
} from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import type { SpecRefGroup } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'

type Props = {
  group: SpecRefGroup
  children: ReactNode
}

const REASON_FOR_REFERRAL_TEXT = 'Reason for admission / starting care'
const MEDICAL_HISTORY_TEXT = 'Previous medical history (summary)'
const ALLERGIES_TEXT = 'Allergies (summary)'

/** Paper document headers — aligned to Section 3 HolisticSectionHeader styling. */
export function resolveSection1PaperHeader(group: SpecRefGroup): { title: string; subtitle?: string } {
  const texts = new Set(group.questions.map((q) => q.questionText.trim()))

  if (texts.has(REASON_FOR_REFERRAL_TEXT) && !texts.has(MEDICAL_HISTORY_TEXT) && !texts.has(ALLERGIES_TEXT)) {
    return {
      title: 'Section 1 — Reason for referral',
      subtitle: 'Why care is starting and the referral context.',
    }
  }

  if (texts.has(MEDICAL_HISTORY_TEXT) || texts.has(ALLERGIES_TEXT)) {
    return {
      title: 'Section 2 — Relevant health history and background information',
      subtitle: 'Medical history summary and known allergies.',
    }
  }

  if (group.actDivider?.title) {
    return { title: group.actDivider.title, subtitle: group.actDivider.hint }
  }

  return { title: group.label.replace(/^\d+\.\d+\s+/, '') }
}

export function shouldHidePaperSectionFieldLabel(questionText: string): boolean {
  const text = questionText.trim()
  // Section header covers referral; health history fields keep their own labels.
  return text === REASON_FOR_REFERRAL_TEXT
}

export function InitialAssessmentSection1SimplePanel({ group, children }: Props) {
  const { title, subtitle } = resolveSection1PaperHeader(group)

  return (
    <section className={HOLISTIC_SECTION_SHELL_CLASS} data-testid={`ia-section1-simple-${group.specRef}`}>
      <HolisticSectionHeader title={title} subtitle={subtitle} />
      <div className={cn(HOLISTIC_SECTION_BODY_CLASS, 'space-y-5')}>{children}</div>
    </section>
  )
}
