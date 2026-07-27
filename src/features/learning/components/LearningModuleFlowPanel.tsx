import { Link } from '@tanstack/react-router'
import { ArrowRight, BookOpen } from 'lucide-react'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'
import { LEARNING_PATHS } from '@/features/learning/learning-routes'

const CORE_STEPS = [
  { step: 1, title: 'Organise & create courses', href: LEARNING_PATHS.courses },
  { step: 2, title: 'Build content & assessments', href: LEARNING_PATHS.courses },
  { step: 3, title: 'Publish the course', href: LEARNING_PATHS.courses },
  { step: 4, title: 'Assign to staff', href: LEARNING_PATHS.assignments },
  { step: 5, title: 'Track compliance', href: LEARNING_PATHS.compliance },
  { step: 6, title: 'Certificates & evidence', href: LEARNING_PATHS.certificates },
] as const

export function LearningModuleFlowPanel() {
  return (
    <div className="space-y-4" data-testid="learning-module-flow">
      <ContentSectionHeader
        title="Learning module flow"
        description="End-to-end path from course creation to compliance evidence."
        icon={<BookOpen className="h-5 w-5" />}
      />

      <div className="overflow-x-auto rounded-xl border border-border bg-muted/20 p-4">
        <ol className="flex min-w-[720px] items-stretch gap-2">
          {CORE_STEPS.map((step, index) => (
            <li key={step.step} className="flex flex-1 items-center gap-2">
              <Link
                to={step.href}
                className={cn(
                  'flex h-full min-w-0 flex-1 flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2.5',
                  'transition-colors hover:border-primary/40 hover:bg-muted/30',
                )}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Step {step.step}
                </span>
                <span className="text-xs font-semibold leading-snug text-foreground">{step.title}</span>
              </Link>
              {index < CORE_STEPS.length - 1 ? (
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
