import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BriefcaseBusiness } from 'lucide-react'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'

export type ApplicantInvites = {
  on: boolean
  from: string | null
  canTurnOn: boolean
  blockedBy: string | null
  otherSurvey: { id: string; title: string } | null
  invited: number
  waiting: number
  minBatch: number
  linkDays: number
  canSend: boolean
}

const key = (surveyId: string) => ['surveys', 'applicant-invites', surveyId] as const

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * Job applicants (Phase 3): an anonymous public survey can email each applicant a one-time link once they
 * have been told the outcome. Counts only, never who.
 */
export function SurveyApplicantInvitesPanel({ surveyId }: { surveyId: string }) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: key(surveyId),
    queryFn: async () => (await apiJson<ApiEnvelope<ApplicantInvites>>(`/surveys/${surveyId}/applicant-invites`, { method: 'GET' })).data,
  })
  const set = useMutation({
    mutationFn: async (on: boolean) =>
      (await apiJson<ApiEnvelope<ApplicantInvites>>(`/surveys/${surveyId}/applicant-invites`, { method: 'PUT', body: JSON.stringify({ on }) })).data,
    onSuccess: next => qc.setQueryData(key(surveyId), next),
  })
  if (!data) return null

  const toggle = async (on: boolean) => {
    try {
      await set.mutateAsync(on)
      toastSuccess(on ? 'Job applicants will be invited' : 'Job applicants are no longer invited')
    } catch (e) {
      toastApiError(e, 'Could not change applicant invitations')
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="applicant-invites-heading" data-testid="survey-applicant-invites">
      <h3 id="applicant-invites-heading" className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" aria-hidden /> Invite job applicants
      </h3>
      <div className="mt-1 space-y-1 text-xs text-muted-foreground">
        <p>
          Each applicant is emailed their own link once they have been told the outcome of their application (not
          successful, withdrew, or accepted the job). Each link works once, for {data.linkDays} days.
        </p>
        <p>
          It stays anonymous: CareFlow keeps only that an applicant was invited, never which link was theirs or whether
          they answered. Invitations go every Monday, only when at least {data.minBatch} applicants are waiting, so the
          day they arrive cannot point to anyone. Applicants who asked for no survey messages are never invited.
        </p>
      </div>

      {data.on ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5 text-sm">
          <div>
            <p className="font-medium text-foreground">
              On since {data.from ? day(data.from) : 'today'}
            </p>
            <p className="text-xs text-muted-foreground" data-testid="applicant-invites-counts">
              {data.invited} invited so far ·{' '}
              {data.waiting >= data.minBatch
                ? `${data.waiting} waiting for Monday`
                : data.waiting
                  ? `${data.waiting} waiting (they go once ${data.minBatch} are waiting)`
                  : 'nobody waiting'}
            </p>
            {!data.canSend ? (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                Invitations cannot be sent yet: CareFlow’s web address is not set up. Ask your administrator.
              </p>
            ) : null}
          </div>
          <Button type="button" size="sm" variant="outline" disabled={set.isPending} onClick={() => void toggle(false)}>
            Stop inviting
          </Button>
        </div>
      ) : data.canTurnOn ? (
        <div className="mt-3 space-y-2">
          {data.otherSurvey ? (
            <p className="text-xs text-muted-foreground">
              Applicants are invited to “{data.otherSurvey.title}” now. Turning this on stops that, so nobody gets two surveys.
            </p>
          ) : null}
          <Button type="button" size="sm" disabled={set.isPending} onClick={() => void toggle(true)}>
            Invite job applicants
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">{data.blockedBy}</p>
      )}
    </section>
  )
}
