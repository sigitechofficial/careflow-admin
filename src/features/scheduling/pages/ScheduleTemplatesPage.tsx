import { Link } from '@tanstack/react-router'
import { LayoutGrid } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'

/** Template-driven schedule generation is not yet available in the API. */
export default function ScheduleTemplatesPage() {
  return (
    <div className="mx-auto max-w-2xl p-5 md:p-6 space-y-6">
      <PageHeader
        title="Schedule Templates"
        description="Reusable visit patterns for automated schedule builds."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Scheduling', href: '/scheduling/schedule-jobs' },
          { label: 'Templates' },
        ]}
      />
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center space-y-4">
        <LayoutGrid className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Schedule templates are not integrated yet. Use <strong>Build Schedule</strong> to create a day batch and
          area statuses, or add jobs when building with a <code className="text-xs">jobs[]</code> payload via the API.
        </p>
        <Button asChild>
          <Link to="/scheduling/build">Go to Build Schedule</Link>
        </Button>
      </div>
    </div>
  )
}
