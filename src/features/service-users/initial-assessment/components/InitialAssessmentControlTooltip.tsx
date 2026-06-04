import type { ReactElement } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

export function iaQuestionTooltipText(question: InitialAssessmentQuestion): string | null {
  const text = question.helpText?.trim()
  return text || null
}

type Props = {
  content: string | null | undefined
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Wrap disabled controls so the tooltip trigger still receives pointer events. */
  disabled?: boolean
  className?: string
  children: ReactElement
}

export function InitialAssessmentControlTooltip({
  content,
  side = 'top',
  disabled,
  className,
  children,
}: Props) {
  if (!content?.trim()) return children

  const trigger = disabled ? (
    <span className={className ?? 'inline-flex w-full max-w-full'}>{children}</span>
  ) : (
    children
  )

  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side={side} className="max-w-sm text-left leading-snug">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
