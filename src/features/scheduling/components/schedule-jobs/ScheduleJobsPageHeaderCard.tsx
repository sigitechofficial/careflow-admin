import { Filter } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { ScheduleJobsDateControls } from '@/features/scheduling/components/schedule-jobs/ScheduleJobsDateControls'
import {
  SCHEDULE_JOBS_LAYOUT_META,
  type ScheduleJobsLayout,
} from '@/features/scheduling/utils/schedule-jobs-layout.util'

type Props = {
  layout: ScheduleJobsLayout
  date: string
  onPrevDay: () => void
  onNextDay: () => void
  onToday: () => void
  onDateChange: (isoDate: string) => void
}

export function ScheduleJobsPageHeaderCard({
  layout,
  date,
  onPrevDay,
  onNextDay,
  onToday,
  onDateChange,
}: Props) {
  const layoutMeta = SCHEDULE_JOBS_LAYOUT_META[layout]

  return (
    <div className="mb-3 shrink-0 rounded-xl border border-border bg-card shadow-sm">
      <div className="space-y-3 p-5">
        <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <span className="text-muted-foreground/70">/</span>
          <Link to="/scheduling/view" className="hover:text-foreground transition-colors">
            Scheduling
          </Link>
          <span className="text-muted-foreground/70">/</span>
          <span className="font-medium text-foreground">Schedule Jobs</span>
        </nav>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-1.5">
            <h1 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
              <Filter className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              Schedule Jobs
            </h1>
            <p className="text-xs leading-relaxed text-muted-foreground">{layoutMeta.description}</p>
          </div>

          <ScheduleJobsDateControls
            date={date}
            onPrevDay={onPrevDay}
            onNextDay={onNextDay}
            onToday={onToday}
            onDateChange={onDateChange}
            className="shrink-0 lg:justify-end"
          />
        </div>
      </div>
    </div>
  )
}
