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

function panelTitle(group: SpecRefGroup): string {
  if (group.actDivider?.title) return group.actDivider.title
  return group.label.replace(/^\d+\.\d+\s+/, '')
}

export function InitialAssessmentSection1SimplePanel({ group, children }: Props) {
  const title = panelTitle(group)
  const hint = group.actDivider?.hint

  return (
    <section className={HOLISTIC_SECTION_SHELL_CLASS} data-testid={`ia-section1-simple-${group.specRef}`}>
      <HolisticSectionHeader title={title} subtitle={hint} />
      <div className={cn(HOLISTIC_SECTION_BODY_CLASS, 'space-y-5')}>{children}</div>
    </section>
  )
}
