import * as React from 'react'
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { Button } from '@/shared/ui/button'
import { formatDateTime } from '@/shared/lib/utils'
import { AssessmentSourceBadge } from '@/features/service-users/assessments/components/AssessmentSourceBadge'
import {
  AssessmentStructuredSnapshotView,
  hasStructuredSnapshotView,
} from '@/features/service-users/assessments/components/AssessmentStructuredSnapshotView'
import { AssessmentConsentSnapshotView } from '@/features/service-users/assessments/components/AssessmentConsentSnapshotView'
import { extractAssessmentConsentFromSnapshot } from '@/features/service-users/assessments/utils/assessment-consent'
import type { AssessmentCompletion, AssessmentCompletionUser } from '@/features/service-users/assessments/types'
import { LinkAssessmentToCarePlanDialog } from '@/features/service-users/assessments/components/LinkAssessmentToCarePlanDialog'
import { useAuthStore } from '@/features/auth/store'

const formatAssessmentUser = (user?: AssessmentCompletionUser | string | null) => {
  if (!user) return '—'
  if (typeof user === 'string') return user
  const name = user.name ?? [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return name || user.email || '—'
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  completion: AssessmentCompletion | null | undefined
  isLoading?: boolean
  error?: unknown
  serviceUserId: string
}

export function AssessmentCompletionDrawer({
  open,
  onOpenChange,
  completion,
  isLoading,
  error,
  serviceUserId,
}: Props) {
  const can = useAuthStore((s) => s.can)
  const canLink =
    can('service_users.assessments.link') || can('service_users.update')
  const [linkOpen, setLinkOpen] = React.useState(false)

  const structuredView = completion
    ? hasStructuredSnapshotView(completion.assessmentKey, completion.data ?? undefined)
    : false
  const consentRecord = completion?.data
    ? extractAssessmentConsentFromSnapshot(completion.data)
    : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="xl" className="flex h-full w-full max-w-3xl flex-col p-0">
        <SheetHeader className="shrink-0 pr-12">
          <SheetTitle>{completion?.assessmentTitle ?? 'Assessment completion'}</SheetTitle>
          <SheetDescription>
            {completion?.assessmentKey ? `Assessment key: ${completion.assessmentKey}` : 'Assessment snapshot'}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading completion…</p>}
          {error != null && !isLoading && (
            <p className="text-sm text-destructive" role="alert">
              Unable to load completion details.
            </p>
          )}
          {!isLoading && !error && !completion && (
            <p className="text-sm text-muted-foreground">No completion selected.</p>
          )}
          {!isLoading && !error && completion && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <AssessmentSourceBadge source={completion.source} />
                {completion.completedAt ? (
                  <span className="text-xs text-muted-foreground">
                    Completed {formatDateTime(completion.completedAt)}
                  </span>
                ) : null}
                {completion.completedBy ? (
                  <span className="text-xs text-muted-foreground">
                    by {formatAssessmentUser(completion.completedBy)}
                  </span>
                ) : null}
              </div>

              {completion.summary ? (
                <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm">
                  {completion.summary}
                </div>
              ) : null}

              {completion.carePlanLinks && completion.carePlanLinks.length > 0 && (
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Linked care plans
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {completion.carePlanLinks.map((link) => (
                      <li
                        key={link.id}
                        className="rounded-md border border-border/60 bg-muted/20 px-3 py-2"
                      >
                        <span className="font-medium text-foreground">
                          {link.carePlanFormName ?? link.carePlanFormId}
                        </span>
                        {link.autoLinked ? (
                          <span className="ml-2 text-xs text-muted-foreground">(auto-linked)</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {canLink && completion.id && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  type="button"
                  onClick={() => setLinkOpen(true)}
                >
                  Link to care plan
                </Button>
              )}

              {consentRecord ? (
                <AssessmentConsentSnapshotView snapshot={completion.data ?? undefined} />
              ) : null}

              {structuredView ? (
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Assessment details
                  </h4>
                  <AssessmentStructuredSnapshotView
                    assessmentKey={completion.assessmentKey}
                    serviceUserId={serviceUserId}
                    snapshot={completion.data ?? undefined}
                  />
                </section>
              ) : (
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Snapshot data
                  </h4>
                  <pre className="max-h-[40vh] overflow-auto rounded-md bg-slate-950/90 p-3 text-xs text-slate-100">
                    {JSON.stringify(completion.data ?? {}, null, 2)}
                  </pre>
                </section>
              )}
            </>
          )}
        </SheetBody>
      </SheetContent>

      {completion?.id && (
        <LinkAssessmentToCarePlanDialog
          open={linkOpen}
          onOpenChange={setLinkOpen}
          serviceUserId={serviceUserId}
          completionId={completion.id}
          completionTitle={completion.assessmentTitle ?? completion.summary}
        />
      )}
    </Sheet>
  )
}
