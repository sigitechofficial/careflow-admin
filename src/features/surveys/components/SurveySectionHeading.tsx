import { cn } from '@/shared/lib/utils'

/**
 * Heading shown before the first question of a section, with its introduction (one or two
 * sentences) when it has one.
 */
export function SurveySectionHeading({
  title,
  introduction,
  className,
  level = 3,
}: {
  title: string
  introduction?: string | null
  className?: string
  /** Heading level in its page: 2 on the survey page (questions are h3 under it), 3 in dialogs. */
  level?: 2 | 3 | 4
}) {
  const Heading = `h${level}` as 'h2' | 'h3' | 'h4'
  return (
    <div className={cn('pt-2 text-sm', className)}>
      <Heading className="font-semibold text-foreground" data-testid="survey-section-heading">
        {title}
      </Heading>
      {introduction ? (
        <p className="mt-0.5 text-sm font-normal text-muted-foreground" data-testid="survey-section-intro">
          {introduction}
        </p>
      ) : null}
    </div>
  )
}
