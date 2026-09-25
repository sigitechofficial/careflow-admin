import type { ReactNode } from 'react'
import { HolisticCollapsibleSection } from '@/features/service-users/initial-assessment/components/holistic/HolisticCollapsibleSection'

type Props = {
  title: string
  subtitle?: string
  children: ReactNode
}

/** Wraps multi-select option grids in paper-style bordered subsection. */
export function HolisticCheckboxGroup({ title, subtitle, children }: Props) {
  return (
    <HolisticCollapsibleSection title={title} subtitle={subtitle}>
      {children}
    </HolisticCollapsibleSection>
  )
}
