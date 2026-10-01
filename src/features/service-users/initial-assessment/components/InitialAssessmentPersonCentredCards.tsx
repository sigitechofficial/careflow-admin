import type { ReactNode } from 'react'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import { cn } from '@/shared/lib/utils'
import {
  IA_CARD_TITLE_CLASS,
  IA_HINT_CLASS,
  IA_SIMPLE_FIELD_CLASS,
  IA_SIMPLE_FIELD_STACK_CLASS,
  IA_SUBSECTION_PANEL_CLASS,
  IA_SUBSECTION_PANEL_HEADER_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

type RenderField = (
  q: InitialAssessmentQuestion,
  options?: { hideLabel?: boolean },
) => ReactNode

type Props = {
  questions: InitialAssessmentQuestion[]
  renderField: RenderField
  variant?: 'cards' | 'simple'
}

export function InitialAssessmentPersonCentredCards({
  questions,
  renderField,
  variant = 'cards',
}: Props) {
  if (variant === 'simple') {
    return (
      <div className={IA_SIMPLE_FIELD_STACK_CLASS} data-testid="ia-person-centred-cards">
        {questions.map((q) => {
          const card = personCentredCardLabel(q)
          return (
            <div key={q.id} className={IA_SIMPLE_FIELD_CLASS}>
              {card ? (
                <div>
                  <p className={IA_CARD_TITLE_CLASS}>{card.title}</p>
                  {card.subtitle ? (
                    <p className={cn('mt-0.5 text-xs', IA_HINT_CLASS)}>{card.subtitle}</p>
                  ) : null}
                </div>
              ) : null}
              {renderField(q, { hideLabel: Boolean(card) })}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4" data-testid="ia-person-centred-cards">
      {questions.map((q) => {
        const card = personCentredCardLabel(q)
        return (
          <article key={q.id} className={IA_SUBSECTION_PANEL_CLASS}>
            <div className={IA_SUBSECTION_PANEL_HEADER_CLASS}>
              <h4 className={IA_CARD_TITLE_CLASS}>{card?.title ?? q.questionText}</h4>
              {card?.subtitle ? <p className={cn('mt-0.5', IA_HINT_CLASS)}>{card.subtitle}</p> : null}
            </div>
            <div className="p-4">{renderField(q)}</div>
          </article>
        )
      })}
    </div>
  )
}

function personCentredCardLabel(q: InitialAssessmentQuestion): { title: string; subtitle?: string } | null {
  const fieldKey = q.metadata?.fieldKey
  if (fieldKey === 'whatMattersMost') return { title: 'What matters to me', subtitle: 'Required person-centred field' }
  if (fieldKey === 'supportGoals') return { title: 'My goals', subtitle: 'Outcome focused' }
  const specRef = q.metadata?.specRef
  if (specRef === '1.3') {
    const t = q.questionText.toLowerCase()
    if (t.includes('what matters most')) return { title: 'What matters to me', subtitle: 'Required person-centred field' }
    if (t.includes('worried')) return { title: 'Worries', subtitle: 'Emotional planning' }
    if (t.includes('support to achieve')) return { title: 'My goals', subtitle: 'Outcome focused' }
    if (t.includes('keep doing independently')) return { title: 'What I can do myself', subtitle: 'Avoid over-support' }
    if (t.includes('do not want support')) return { title: 'What I need help with', subtitle: 'Boundaries for staff' }
  }
  if (specRef === '1.4') {
    const t = q.questionText.toLowerCase()
    if (t.includes('morning, meal')) return { title: 'Daily routine', subtitle: 'Morning, meals, evening, bedtime' }
    if (t.includes('bathing')) return { title: 'Personal care preferences', subtitle: 'Bathing & dressing' }
    if (t.includes('triggers')) return { title: 'Known triggers', subtitle: 'Anxiety, distress, confusion' }
  }
  return null
}

export function isPersonCentredCardGroup(specRef: string): boolean {
  return specRef === '1.3' || specRef === '1.4'
}
