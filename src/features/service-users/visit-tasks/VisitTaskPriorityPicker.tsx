import { cn } from '@/shared/lib/utils'
import {
  DEFAULT_VISIT_TASK_PRIORITY,
  VISIT_TASK_PRIORITIES,
  visitTaskPrioritySelectedClass,
  type VisitTaskPriorityCode,
} from '@/features/service-users/visit-tasks/visit-task-priority.util'

type Props = {
  value: VisitTaskPriorityCode
  onChange: (value: VisitTaskPriorityCode) => void
  className?: string
  size?: 'sm' | 'md'
}

export function VisitTaskPriorityPicker({ value, onChange, className, size = 'md' }: Props) {
  return (
    <div className={cn('flex gap-1.5', className)}>
      {VISIT_TASK_PRIORITIES.map((priority) => {
        const selected = value === priority.code
        return (
          <button
            key={priority.code}
            type="button"
            onClick={() => onChange(priority.code)}
            className={cn(
              'flex-1 rounded-lg border font-semibold transition',
              size === 'sm' ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-[11px]',
              selected
                ? visitTaskPrioritySelectedClass(priority.code)
                : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5',
            )}
          >
            {priority.label}
          </button>
        )
      })}
    </div>
  )
}

export { DEFAULT_VISIT_TASK_PRIORITY }
