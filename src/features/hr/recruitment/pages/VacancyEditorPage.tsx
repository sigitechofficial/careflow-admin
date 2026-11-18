import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Briefcase } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { VacancyForm } from '@/features/hr/recruitment/components/VacancyForm'
import { useVacancy } from '@/features/hr/recruitment/hooks/useRecruitment'
import { VacancyStatusBadge } from '@/features/hr/recruitment/components/RecruitmentStatusBadges'

/** New vacancy (/hr/vacancies/new) or edit one (/hr/vacancies/$vacancyId/edit): the step-by-step form on its own page. */
export default function VacancyEditorPage() {
  const navigate = useNavigate()
  const { vacancyId } = useParams({ strict: false }) as { vacancyId?: string }
  const query = useVacancy(vacancyId ?? null)
  const vacancy = query.data ?? null
  const editing = !!vacancyId
  const backToList = () => void navigate({ to: '/hr/vacancies' })

  return (
    <div className="flex flex-col gap-5" data-testid="hr-vacancy-editor-page">
      <PageHeader
        title={editing ? (vacancy ? `Edit ${vacancy.vacancyReference}` : 'Edit vacancy') : 'New vacancy'}
        description={
          editing
            ? vacancy?.title ?? 'Loading…'
            : 'Five short steps. Save a draft at any point, then publish it to your careers page.'
        }
        icon={
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
            <Briefcase className="h-4 w-4" aria-hidden />
          </span>
        }
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'HR', href: '/hr/employees' },
          { label: 'Vacancies', href: '/hr/vacancies' },
          { label: editing ? vacancy?.vacancyReference ?? 'Edit' : 'New vacancy' },
        ]}
        actions={[{ label: 'Back to vacancies', icon: <ArrowLeft className="h-4 w-4" />, variant: 'outline', onClick: backToList }]}
      >
        {vacancy ? <VacancyStatusBadge status={vacancy.status} /> : null}
      </PageHeader>

      {editing && query.isLoading ? (
        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]" aria-hidden>
          <div className="h-64 animate-pulse rounded-xl bg-muted/50" />
          <div className="h-96 animate-pulse rounded-xl bg-muted/50" />
        </div>
      ) : editing && !vacancy ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          This vacancy could not be found.
        </div>
      ) : (
        <VacancyForm vacancy={vacancy} onDone={backToList} onCancel={backToList} />
      )}
    </div>
  )
}
