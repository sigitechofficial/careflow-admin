import * as React from 'react'
import { Users } from 'lucide-react'
import { useSearch } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth/store'
import { PageHeader } from '@/shared/ui/page-elements'
import { CandidatePipelineBoard } from '@/features/hr/recruitment/components/CandidatePipelineBoard'
import { CandidateFormDialog } from '@/features/hr/recruitment/components/CandidateFormDialog'
import { useVacancies } from '@/features/hr/recruitment/hooks/useRecruitment'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

export default function CandidatesPipelinePage() {
  const search = useSearch({ strict: false }) as { vacancyId?: string }
  const canCreate = useAuthStore.getState().can('hr.candidates.create')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [vacancyFilter, setVacancyFilter] = React.useState(search.vacancyId ?? '')

  const vacanciesQuery = useVacancies({ page: 1, limit: 100 })
  const vacancies = vacanciesQuery.data?.data ?? []

  React.useEffect(() => {
    if (search.vacancyId) setVacancyFilter(search.vacancyId)
  }, [search.vacancyId])

  return (
    <div className="flex flex-col gap-4" data-testid="hr-candidates-pipeline-page">
      <PageHeader
        title="Candidate pipeline"
        description="Track applicants from application through offer acceptance."
        icon={
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
            <Users className="h-4 w-4" aria-hidden />
          </span>
        }
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'HR', href: '/hr/employees' },
          { label: 'Recruitment', href: '/hr/recruitment' },
          { label: 'Candidates' },
        ]}
        actions={
          canCreate
            ? [{ label: 'Add candidate', onClick: () => setCreateOpen(true) }]
            : undefined
        }
      />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6 space-y-4">
        <div className="max-w-xs space-y-2">
          <label className="text-sm font-medium">Filter by vacancy</label>
          <Select
            value={vacancyFilter || 'ALL'}
            onValueChange={v => setVacancyFilter(v === 'ALL' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All vacancies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All vacancies</SelectItem>
              {vacancies.map(v => (
                <SelectItem key={v.id} value={v.id}>
                  {v.vacancyReference} — {v.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <CandidatePipelineBoard vacancyId={vacancyFilter || undefined} />
      </div>

      {canCreate ? (
        <CandidateFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          defaultVacancyId={vacancyFilter || undefined}
        />
      ) : null}
    </div>
  )
}
