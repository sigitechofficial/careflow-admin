import { Badge } from '@/shared/ui/badge'
import type { CandidateStage, VacancyStatus } from '@/features/hr/recruitment/api/recruitment.api'
import {
  candidateStageLabel,
  vacancyStatusLabel,
} from '@/features/hr/recruitment/utils/recruitment-display.util'
import { cn } from '@/shared/lib/utils'

export function RecruitmentStageBadge({ stage }: { stage: CandidateStage }) {
  const tone =
    stage === 'ACCEPTED'
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
      : stage === 'REJECTED' || stage === 'WITHDRAWN'
        ? 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20'
        : stage === 'OFFER' || stage === 'VETTING'
          ? 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20'
          : 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20'

  return (
    <Badge variant="outline" className={cn('font-normal', tone)}>
      {candidateStageLabel(stage)}
    </Badge>
  )
}

export function VacancyStatusBadge({ status }: { status: VacancyStatus }) {
  const tone =
    status === 'OPEN'
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
      : status === 'PAUSED'
        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
        : 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20'

  return (
    <Badge variant="outline" className={cn('font-normal', tone)}>
      {vacancyStatusLabel(status)}
    </Badge>
  )
}
