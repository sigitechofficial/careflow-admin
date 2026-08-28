import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { User } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { PageHeader } from '@/shared/ui/page-elements'
import {
  useCandidate,
  useConvertCandidate,
  useUpdateCandidateStage,
} from '@/features/hr/recruitment/hooks/useRecruitment'
import { RecruitmentStageBadge } from '@/features/hr/recruitment/components/RecruitmentStatusBadges'
import { CandidateDocumentsPanel } from '@/features/hr/recruitment/components/CandidateDocumentsPanel'
import {
  PIPELINE_STAGES,
  candidateStageLabel,
  candidateSourceLabel,
} from '@/features/hr/recruitment/utils/recruitment-display.util'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

export default function CandidateDetailPage() {
  const { candidateId } = useParams({ strict: false }) as { candidateId: string }
  const navigate = useNavigate()
  const canUpdate = useAuthStore.getState().can('hr.candidates.update')
  const canConvert = useAuthStore.getState().can('hr.candidates.convert')
  const query = useCandidate(candidateId)
  const stageMutation = useUpdateCandidateStage(candidateId)
  const convertMutation = useConvertCandidate(candidateId)

  const candidate = query.data

  async function handleConvert() {
    const result = await convertMutation.mutateAsync()
    await navigate({
      to: '/hr/employees/$employeeId',
      params: { employeeId: result.employeeId },
    })
  }

  if (query.isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading candidate…</p>
  }

  if (!candidate) {
    return <p className="p-6 text-sm text-muted-foreground">Candidate not found.</p>
  }

  const converted = !!candidate.convertedEmployeeId

  return (
    <div className="flex flex-col gap-4" data-testid="hr-candidate-detail-page">
      <PageHeader
        title={candidate.name}
        description={`${candidate.candidateReference} · ${candidate.vacancyTitle ?? 'Vacancy'}`}
        icon={
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
            <User className="h-4 w-4" aria-hidden />
          </span>
        }
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'HR', href: '/hr/employees' },
          { label: 'Candidates', href: '/hr/candidates' },
          { label: candidate.name },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-medium">Profile</h2>
              <RecruitmentStageBadge stage={candidate.stage} />
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd>{candidate.email ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{candidate.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Source</dt>
                <dd>{candidateSourceLabel(candidate.source)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Consent</dt>
                <dd>{candidate.dataProcessingConsent ? 'Yes' : 'No'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Address</dt>
                <dd>{candidate.address ?? '—'}</dd>
              </div>
              {candidate.coverLetter ? (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Cover letter</dt>
                  <dd className="mt-1 whitespace-pre-wrap">{candidate.coverLetter}</dd>
                </div>
              ) : null}
            </dl>

            {canUpdate && !converted ? (
              <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
                <div className="space-y-2 min-w-[200px]">
                  <p className="text-sm font-medium">Move stage</p>
                  <Select
                    value={candidate.stage}
                    onValueChange={v =>
                      void stageMutation.mutateAsync({ stage: v as typeof candidate.stage })
                    }
                    disabled={stageMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map(stage => (
                        <SelectItem key={stage} value={stage}>
                          {candidateStageLabel(stage)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {canConvert && candidate.stage === 'ACCEPTED' ? (
                  <Button
                    onClick={() => void handleConvert()}
                    disabled={convertMutation.isPending || !candidate.dataProcessingConsent}
                  >
                    {convertMutation.isPending ? 'Converting…' : 'Convert to employee'}
                  </Button>
                ) : null}
              </div>
            ) : null}

            {converted ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm">
                Converted to employee.{' '}
                <Link
                  to="/hr/employees/$employeeId"
                  params={{ employeeId: candidate.convertedEmployeeId! }}
                  className="text-primary hover:underline"
                >
                  View HR profile
                </Link>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
            <h2 className="text-sm font-medium mb-4">Documents</h2>
            <CandidateDocumentsPanel candidateId={candidateId} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
          <h2 className="text-sm font-medium mb-4">Stage history</h2>
          {candidate.timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history yet.</p>
          ) : (
            <ul className="space-y-3">
              {candidate.timeline.map(entry => (
                <li key={entry.id} className="text-sm border-l-2 border-border pl-3">
                  <p className="font-medium">
                    {entry.fromStage
                      ? `${candidateStageLabel(entry.fromStage)} → ${candidateStageLabel(entry.toStage)}`
                      : candidateStageLabel(entry.toStage)}
                  </p>
                  {entry.notes ? (
                    <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(entry.createdAt).toLocaleString()}
                    {entry.changedBy ? ` · ${entry.changedBy.name}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
