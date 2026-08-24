import * as React from 'react'
import { Briefcase } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { PageHeader } from '@/shared/ui/page-elements'
import { VacancyListTable } from '@/features/hr/recruitment/components/VacancyListTable'
import { VacancyFormDialog } from '@/features/hr/recruitment/components/VacancyFormDialog'

export default function VacanciesPage() {
  const canCreate = useAuthStore.getState().can('hr.vacancies.create')
  const [createOpen, setCreateOpen] = React.useState(false)

  return (
    <div className="flex flex-col gap-4" data-testid="hr-vacancies-page">
      <PageHeader
        title="Vacancies"
        description="Manage open roles, hiring managers, and recruitment demand."
        icon={
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
            <Briefcase className="h-4 w-4" aria-hidden />
          </span>
        }
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'HR', href: '/hr/employees' },
          { label: 'Recruitment', href: '/hr/recruitment' },
          { label: 'Vacancies' },
        ]}
        actions={
          canCreate
            ? [{ label: 'New vacancy', onClick: () => setCreateOpen(true) }]
            : undefined
        }
      />

      <div className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
        <VacancyListTable onCreateClick={canCreate ? () => setCreateOpen(true) : undefined} />
      </div>

      {canCreate ? (
        <VacancyFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      ) : null}
    </div>
  )
}
