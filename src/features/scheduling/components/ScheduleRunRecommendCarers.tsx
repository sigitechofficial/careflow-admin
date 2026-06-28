import {
  ScheduleRecommendCarers,
  type ScheduleRecommendCarersProps,
} from '@/features/scheduling/components/ScheduleRecommendCarers'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'

type Props = {
  job: TimelineJob | null
  selectedEmployeeId: string
  onSelectCarer: (employeeId: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ScheduleRunRecommendCarers(props: Props) {
  const recommendProps: Extract<ScheduleRecommendCarersProps, { variant: 'run-select' }> = {
    variant: 'run-select',
    ...props,
  }
  return <ScheduleRecommendCarers {...recommendProps} />
}
