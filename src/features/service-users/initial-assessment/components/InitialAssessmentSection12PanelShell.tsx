import { HolisticCollapsibleSection } from '@/features/service-users/initial-assessment/components/holistic/HolisticCollapsibleSection'
import {
  IA_HINT_CLASS,
  IA_SUBSECTION_PANEL_CLASS,
  IA_SUBSECTION_PANEL_HEADER_CLASS,
  IA_SUBSECTION_PANEL_TITLE_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import { cn } from '@/shared/lib/utils'
import type { ReactNode } from 'react'

type Props = {
  title: string
  hint?: string
  children: ReactNode
  testId?: string
  /** Default `rows` = compact yes/no list; `content` = padded block (ADL grid, comments). */
  bodyVariant?: 'rows' | 'content'
  /** Paper holistic assessment document styling. */
  variant?: 'default' | 'holistic'
}

export function InitialAssessmentSection12PanelShell({
  title,
  hint,
  children,
  testId,
  bodyVariant = 'rows',
  variant = 'holistic',
}: Props) {
  if (variant === 'holistic') {
    return (
      <HolisticCollapsibleSection
        title={title}
        subtitle={hint}
        testId={testId}
        bodyClassName={cn(
          bodyVariant === 'rows' && 'divide-y divide-slate-200 space-y-0 p-0 dark:divide-slate-700',
        )}
      >
        <div
          className={cn(
            bodyVariant === 'rows' ? 'divide-y divide-slate-200 px-3 dark:divide-slate-700' : 'space-y-4',
          )}
        >
          {children}
        </div>
      </HolisticCollapsibleSection>
    )
  }

  return (
    <section className={IA_SUBSECTION_PANEL_CLASS} data-testid={testId}>
      <div className={IA_SUBSECTION_PANEL_HEADER_CLASS}>
        <h3 className={IA_SUBSECTION_PANEL_TITLE_CLASS}>{title}</h3>
        {hint ? <p className={cn(IA_HINT_CLASS, 'mt-0.5 text-xs')}>{hint}</p> : null}
      </div>
      <div
        className={cn(
          bodyVariant === 'rows'
            ? 'divide-y divide-border/60 px-3 dark:divide-border/80'
            : 'space-y-3 p-4',
        )}
      >
        {children}
      </div>
    </section>
  )
}

/** Standard row divider for yes/no and template fields inside §12 panels. */
export function InitialAssessmentSection12FieldRow({ children }: { children: ReactNode }) {
  return <div className="py-2">{children}</div>
}