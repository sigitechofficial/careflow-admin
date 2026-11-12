import { ArrowRight, CalendarPlus, ScrollText } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { SCRIPT_WORKFLOWS } from '@/features/scripts/scripts.registry'

/** Scripts: the automation workflows, each with its details page. */
export default function ScriptsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Scripts"
        description="Manage and run automation workflows. They use the same checks as the screens, and everything they change is recorded under your name."
        icon={<ScrollText className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Scripts' }]}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {SCRIPT_WORKFLOWS.map((w) => (
          <Card key={w.id} data-testid={`script-${w.id}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarPlus className="h-4 w-4 text-primary" aria-hidden />
                {w.title}
              </CardTitle>
              <CardDescription>{w.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                <Link to={w.href}>View Details</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
