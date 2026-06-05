import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import { HOLISTIC_HEADER_CLASS, HOLISTIC_SUBHEADER_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'

type Props = {
  title: string
  subtitle?: string
  children?: ReactNode
  className?: string
}

export function HolisticSectionHeader({ title, subtitle, children, className }: Props) {
  return (
    <header className={cn(HOLISTIC_HEADER_CLASS, className)}>
      <h3 className="text-sm font-bold tracking-wide text-sky-950 dark:text-sky-100">{title}</h3>
      {subtitle ? <p className={HOLISTIC_SUBHEADER_CLASS}>{subtitle}</p> : null}
      {children}
    </header>
  )
}
