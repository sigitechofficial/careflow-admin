export type ScheduleJobsLayout = 'board' | 'runs'

export function parseScheduleJobsLayout(value: string | undefined): ScheduleJobsLayout {
  return value === 'runs' ? 'runs' : 'board'
}

export const SCHEDULE_JOBS_LAYOUT_META: Record<
  ScheduleJobsLayout,
  { label: string; description: string }
> = {
  board: {
    label: 'Rota board',
    description:
      'Daily rota board — drag jobs to reschedule, drag on the timeline to group visits into a run.',
  },
  runs: {
    label: 'Runs',
    description: 'Group and order visits into carer runs for the day — table view with route stats.',
  },
}
