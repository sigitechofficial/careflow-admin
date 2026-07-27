import * as React from 'react'
import { BookOpen, GraduationCap } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { LEARNING_PATHS } from '@/features/learning/learning-routes'

type Props = {
  title: string
  description: string
  testId: string
  children: React.ReactNode
}

export function LearningSectionLayout({ title, description, testId, children }: Props) {
  const [guidanceOpen, setGuidanceOpen] = React.useState(false)

  return (
    <div className="flex flex-col gap-4" data-testid={testId}>
      <PageHeader
        className="shrink-0"
        title={title}
        description={description}
        icon={
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <GraduationCap className="h-4 w-4" aria-hidden />
          </span>
        }
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Learning', href: LEARNING_PATHS.dashboard },
          { label: title },
        ]}
        actions={[
          {
            label: 'Guidance',
            icon: <BookOpen className="h-4 w-4" />,
            variant: 'outline',
            onClick: () => setGuidanceOpen(prev => !prev),
          },
        ]}
      />

      {guidanceOpen ? (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Learning covers course authoring, assignments, compliance tracking, training
          events, and certificates. Publish courses before assigning them to staff.
        </div>
      ) : null}

      <div className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
        {children}
      </div>
    </div>
  )
}
