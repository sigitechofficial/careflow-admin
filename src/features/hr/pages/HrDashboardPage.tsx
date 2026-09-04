import * as React from 'react'
import { Briefcase, Users } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { PolicyContextPanel } from '@/features/policies/components/PolicyContextPanel'
import { HrEmployeeListTable } from '@/features/hr/components/HrEmployeeListTable'

export default function HrDashboardPage() {
  return (
    <div className="flex flex-col gap-4" data-testid="hr-dashboard-page">
      <PageHeader
        title="HR Dashboard"
        description="Workforce HR overview — lifecycle status and deployment readiness for all employees."
        icon={
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
            <Users className="h-4 w-4" aria-hidden />
          </span>
        }
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'HR', href: '/hr/employees' },
          { label: 'Employees' },
        ]}
        actions={[
          {
            label: 'Workforce',
            icon: <Briefcase className="h-4 w-4" />,
            variant: 'outline',
          },
        ]}
      />

      <PolicyContextPanel moduleType="HR" />

      <div className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
        <HrEmployeeListTable />
      </div>
    </div>
  )
}
