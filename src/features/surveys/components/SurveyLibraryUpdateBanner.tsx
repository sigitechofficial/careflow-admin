import * as React from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import {
  describeQuestionType,
  useApplySurveyLibraryUpdate,
  useLibrarySurvey,
  useSurveyLibraryLink,
  type SurveyLibraryUpdatePlan,
} from '@/features/surveys/api/survey-library.api'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

/** What applying the update does to the template's alert rules and its own section introductions. */
function UpdatePlanSummary({ plan }: { plan: SurveyLibraryUpdatePlan }) {
  const items: Array<{ key: string; label: string; titles: string[] }> = [
    { key: 'refreshed', label: 'Ready-made alert rules updated to this version', titles: plan.refreshed },
    { key: 'added', label: 'New ready-made alert rules added', titles: plan.added },
    { key: 'removed', label: 'Ready-made alert rules this version no longer has (removed)', titles: plan.removed },
    {
      key: 'renamed',
      label: 'Your alert rules changed to the new answer wording',
      titles: plan.renamedAnswers.map(r => `${r.title}: ${r.changes.join('; ')}`),
    },
    { key: 'kept', label: 'Your own or changed alert rules kept as they are', titles: plan.kept },
    { key: 'intros', label: 'Your section introductions kept', titles: plan.sectionIntrosKept },
    {
      key: 'intros-dropped',
      label: 'Your section introductions removed (their section is no longer in the survey)',
      titles: plan.sectionIntrosDropped,
    },
  ].filter(i => i.titles.length > 0)
  if (!items.length && !plan.turnedOff.length) return null
  return (
    <section aria-labelledby="library-update-plan" className="space-y-2 rounded-md border p-3" data-testid="library-update-plan">
      <h4 id="library-update-plan" className="text-sm font-medium">
        What happens to your alert rules
      </h4>
      {plan.turnedOff.length ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">
            Turned off, because they can no longer work as set (check them after applying):
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {plan.turnedOff.map(r => (
              <li key={r.title}>
                {r.title}: {r.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {items.map(i => (
        <div key={i.key} className="space-y-0.5">
          <p className="text-sm">{i.label}:</p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            {i.titles.map(t => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

/**
 * Shown on a template adopted from Surveys → Ready-made surveys when the library has a newer
 * revision. Applying it replaces the template's details and questions; surveys already started from
 * the template keep their own questions and answers. Read-only users see the notice without the action.
 */
export function SurveyLibraryUpdateBanner({ surveyId, canApply }: { surveyId: string; canApply: boolean }) {
  const link = useSurveyLibraryLink(surveyId)
  const apply = useApplySurveyLibraryUpdate()
  const [open, setOpen] = React.useState(false)
  const updated = useLibrarySurvey(open && link.data ? link.data.libraryId : null)

  const l = link.data
  if (!l?.updateAvailable) return null

  const onApply = () =>
    apply.mutate(surveyId, {
      onSuccess: result => {
        setOpen(false)
        const off = result?.turnedOff?.length ?? 0
        toastSuccess(
          `The template now has ready-made revision ${l.currentRevision}`,
          off
            ? `${off} alert rule${off === 1 ? ' was' : 's were'} turned off because they can no longer work as set: check the alert rules. Surveys you already started from it are unchanged.`
            : 'Surveys you already started from it are unchanged.',
        )
      },
      onError: e => toastApiError(e, 'Could not apply the update'),
    })

  let n = 0
  return (
    <div
      className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      data-testid="survey-library-update-banner"
    >
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium">An updated ready-made version of this survey is available</p>
        <p>
          You adopted revision {l.adoptedRevision}; revision {l.currentRevision} is now available
          {l.revisionNote ? `: ${l.revisionNote}` : '.'}
        </p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <RefreshCw className="mr-1 h-4 w-4" />
        Review the update
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {l.title}: revision {l.currentRevision}
            </DialogTitle>
            <DialogDescription>
              {l.revisionNote ?? 'The ready-made survey has been updated.'} Applying it replaces this template&apos;s
              title, description and questions with this version, with your organisation&apos;s name filled in. Changes
              you made to the questions will need making again; your alert rules are carried over as shown below.
              Surveys already started from the template keep their own questions and answers.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="max-h-[60vh] space-y-3 overflow-y-auto">
            {l.plan ? <UpdatePlanSummary plan={l.plan} /> : null}
            {updated.isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : updated.data ? (
              updated.data.sections.map((sec, si) => (
                <div key={`${sec.title ?? 'section'}-${si}`} className="space-y-1">
                  {sec.title ? <h4 className="text-sm font-medium">{sec.title}</h4> : null}
                  <ol className="space-y-1">
                    {sec.questions.map(q => {
                      n += 1
                      return (
                        <li key={q.id} className="text-sm">
                          {n}. {q.questionText}{' '}
                          <span className="text-xs text-muted-foreground">({describeQuestionType(q)})</span>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              ))
            ) : (
              <p className="text-sm text-destructive">The updated survey could not be loaded.</p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Not now
            </Button>
            {canApply ? (
              <Button type="button" onClick={onApply} disabled={apply.isPending}>
                {apply.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Apply to this template
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
