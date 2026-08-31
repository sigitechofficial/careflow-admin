import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { useCandidatePipeline } from '@/features/hr/recruitment/hooks/useRecruitment'
import { updateCandidateStage } from '@/features/hr/recruitment/api/recruitment.api'
import { recruitmentKeys } from '@/features/hr/recruitment/keys'
import { RecruitmentStageBadge } from '@/features/hr/recruitment/components/RecruitmentStatusBadges'
import {
  PIPELINE_STAGES,
  candidateStageLabel,
  nextPipelineStage,
  prevPipelineStage,
} from '@/features/hr/recruitment/utils/recruitment-display.util'
import type { CandidateRow, CandidateStage } from '@/features/hr/recruitment/api/recruitment.api'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { cn } from '@/shared/lib/utils'

function CandidatePipelineCard({
  candidate,
  onMove,
  canUpdate,
  moving,
}: {
  candidate: CandidateRow
  onMove: (stage: CandidateStage) => void
  canUpdate: boolean
  moving: boolean
}) {
  const prev = prevPipelineStage(candidate.stage)
  const next = nextPipelineStage(candidate.stage)

  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to="/hr/candidates/$candidateId"
              params={{ candidateId: candidate.id }}
              className="block truncate font-medium text-primary hover:underline"
            >
              {candidate.name}
            </Link>
            <p className="truncate text-xs text-muted-foreground">{candidate.candidateReference}</p>
          </div>
          <RecruitmentStageBadge stage={candidate.stage} />
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {candidate.vacancyTitle ?? 'Vacancy'}
        </p>
        {canUpdate && (prev || next) ? (
          <div className="flex flex-wrap items-center gap-1">
            {prev ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                disabled={moving}
                onClick={() => onMove(prev)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {candidateStageLabel(prev)}
              </Button>
            ) : null}
            {next ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                disabled={moving}
                onClick={() => onMove(next)}
              >
                {candidateStageLabel(next)}
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-auto h-7 text-xs"
                  disabled={moving}
                >
                  Move to…
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {PIPELINE_STAGES.map(stage => (
                  <DropdownMenuItem
                    key={stage}
                    disabled={stage === candidate.stage}
                    onClick={() => onMove(stage)}
                  >
                    {candidateStageLabel(stage)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function CandidatePipelineBoard({ vacancyId }: { vacancyId?: string }) {
  const canUpdate = useAuthStore.getState().can('hr.candidates.update')
  const qc = useQueryClient()
  const query = useCandidatePipeline(vacancyId)
  const columns = query.data ?? []
  const [movingId, setMovingId] = React.useState<string | null>(null)

  async function moveStage(candidateId: string, stage: CandidateStage) {
    setMovingId(candidateId)
    try {
      await updateCandidateStage(candidateId, stage)
      await qc.invalidateQueries({ queryKey: recruitmentKeys.all })
    } finally {
      setMovingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading pipeline…</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-4 2xl:grid-cols-8">
          {PIPELINE_STAGES.map(stage => {
            const column = columns.find(c => c.stage === stage)
            const candidates = column?.candidates ?? []
            return (
              <div
                key={stage}
                className={cn(
                  'min-w-[220px] rounded-xl border border-border bg-muted/20 p-3',
                  'xl:min-w-0',
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium">{candidateStageLabel(stage)}</h3>
                  <span className="text-xs text-muted-foreground">{candidates.length}</span>
                </div>
                <div className="space-y-2">
                  {candidates.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No candidates</p>
                  ) : (
                    candidates.map(candidate => (
                      <CandidatePipelineCard
                        key={candidate.id}
                        candidate={candidate}
                        canUpdate={canUpdate}
                        moving={movingId === candidate.id}
                        onMove={stage => void moveStage(candidate.id, stage)}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
