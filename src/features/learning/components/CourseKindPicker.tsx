import { Home, Monitor, Users } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { LEARNING_COURSE_KINDS, type LearningCourseKind } from '@/features/learning/types/learning.types'

const ICONS: Record<LearningCourseKind, typeof Monitor> = {
  ONLINE: Monitor,
  FACE_TO_FACE: Users,
  WORKPLACE: Home,
}

/** One "Course type" choice: Online, Face to face or Workplace (17 Nov 2026). */
export function CourseKindPicker({
  value,
  onChange,
  disabled,
}: {
  value: LearningCourseKind
  onChange: (kind: LearningCourseKind) => void
  disabled?: boolean
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Course type" data-testid="course-kind-picker">
      {LEARNING_COURSE_KINDS.map(k => {
        const Icon = ICONS[k.value]
        const active = value === k.value
        return (
          <button
            key={k.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(k.value)}
            data-testid={`course-kind-${k.value}`}
            className={cn(
              'rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
              active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card hover:bg-muted/40',
            )}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Icon className="h-4 w-4" aria-hidden />
              {k.label}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">{k.description}</span>
          </button>
        )
      })}
    </div>
  )
}
