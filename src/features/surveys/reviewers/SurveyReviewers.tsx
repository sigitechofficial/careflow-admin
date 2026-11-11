import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Loader2, ShieldCheck, UserCheck, UserPlus } from 'lucide-react'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { fetchSurveyRecordCandidates } from '@/features/surveys/api/surveys.api'
import { RecordSurveyResponseDialog } from '@/features/surveys/components/RecordSurveyResponseDialog'
import type { SurveyQuestion, SurveyRecordCandidate, SurveyTargetKind } from '@/features/surveys/types'

/**
 * Independent reviewer accounts (SUR-CQC-001/002). The reviewer has their own CareFlow account whose
 * only role is "Independent reviewer" (no other access, no branch, never a staff account). Survey
 * managers make it here ("Add a reviewer": the person is emailed a link to choose their own
 * password) and give it the right to record answers on one survey, for a sample of people, in a
 * time window; the reviewer signs in and sees only "Surveys to record". API:
 * careflow-api/src/surveys/survey-reviewers.service.ts. Everything is audited.
 */

type Grant = {
  id: string
  reviewer: { id: string; name: string; email: string; accountActive: boolean }
  sample: Array<{ id: string; name: string }>
  validFrom: string
  validTo: string
  status: 'ACTIVE' | 'NOT_STARTED' | 'ENDED' | 'REVOKED'
}
type ReviewerAccount = { id: string; name: string; email: string; active: boolean }
export type ReviewersData = {
  anonymousOnly: boolean
  /** A repeating survey: access is given on the period being run, not here. */
  repeatingParent?: boolean
  grants: Grant[]
  accounts: ReviewerAccount[]
}

const reviewersKey = (surveyId: string) => ['surveys', 'reviewers', surveyId] as const
const STATUS_LABEL: Record<Grant['status'], string> = {
  ACTIVE: 'Can record now',
  NOT_STARTED: 'Not started yet',
  ENDED: 'Ended',
  REVOKED: 'Access ended early',
}
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const dateInput = (d: Date) => d.toISOString().slice(0, 10)

/** Survey page: who may record answers as an independent reviewer. */
export function SurveyReviewersPanel({ surveyId, canEdit }: { surveyId: string; canEdit: boolean }) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: reviewersKey(surveyId),
    queryFn: async () => (await apiJson<ApiEnvelope<ReviewersData>>(`/surveys/${surveyId}/reviewers`, { method: 'GET' })).data,
  })
  const revoke = useMutation({
    mutationFn: async (grantId: string) => apiJson(`/surveys/${surveyId}/reviewers/${grantId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toastSuccess('Reviewer access ended')
      void qc.invalidateQueries({ queryKey: reviewersKey(surveyId) })
    },
    onError: e => toastApiError(e, 'Could not end the access'),
  })
  const [dialog, setDialog] = React.useState<'grant' | 'account' | null>(null)
  const data = query.data
  const live = data?.grants.filter(g => g.status === 'ACTIVE' || g.status === 'NOT_STARTED') ?? []

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5" aria-labelledby="survey-reviewers-title" data-testid="survey-reviewers">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground sm:flex" aria-hidden>
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 id="survey-reviewers-title" className="text-sm font-semibold text-foreground">
              Independent reviewers
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              An outside reviewer can record answers on this survey only: for the people you choose, between the dates you set.
              They have their own account with no other access (never a staff account), and never see results, counts, other
              answers or care records.
            </p>
          </div>
        </div>
        {canEdit && data && !data.repeatingParent ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setDialog('account')}>
              <UserPlus className="h-3.5 w-3.5" aria-hidden />
              Add a reviewer
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setDialog('grant')}>
              <UserCheck className="h-3.5 w-3.5" aria-hidden />
              Give a reviewer access
            </Button>
          </div>
        ) : null}
      </div>
      {data?.repeatingParent ? (
        <p className="mt-3 text-sm" data-testid="survey-reviewers-repeating">
          This is a repeating survey. Give a reviewer access on the period being run now: open it from Periods.
        </p>
      ) : null}
      {query.isLoading ? (
        <Loader2 className="mt-3 h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />
      ) : data && data.grants.length ? (
        <ul className="mt-3 space-y-2 text-sm">
          {data.grants.map(g => (
            <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
              <span className="min-w-0">
                <span className="font-medium">{g.reviewer.name}</span> · {day(g.validFrom)} to {day(g.validTo)} ·{' '}
                {g.sample.length ? `${g.sample.length} people` : 'anonymous answers only'} · {STATUS_LABEL[g.status]}
                {g.reviewer.accountActive ? '' : ' · account switched off'}
              </span>
              {canEdit && live.includes(g) ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => revoke.mutate(g.id)} disabled={revoke.isPending}>
                  End access
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No reviewer has access.</p>
      )}
      <p className="mt-3 text-xs text-muted-foreground" data-testid="survey-reviewers-ending">
        &quot;End access&quot; stops the reviewer recording on this survey at once (access also ends on its last day). When the
        review is over, switch their account off as well (Settings, Users), so it can no longer be used to sign in.
      </p>
      {dialog === 'grant' && data ? (
        <GrantReviewerDialog surveyId={surveyId} data={data} onClose={() => setDialog(null)} onAddAccount={() => setDialog('account')} />
      ) : null}
      {dialog === 'account' ? <AddReviewerDialog surveyId={surveyId} onClose={() => setDialog(null)} onAdded={() => setDialog('grant')} /> : null}
    </section>
  )
}

/** "Add a reviewer": the account (name, email); they choose their own password from the emailed link. */
export function AddReviewerDialog({ surveyId, onClose, onAdded }: { surveyId: string; onClose: () => void; onAdded: (userId?: string) => void }) {
  const qc = useQueryClient()
  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [email, setEmail] = React.useState('')
  // Already connected to us (former staff, a person we support or their family, an outside contact):
  // shown first, and the manager declares why they are still independent enough.
  const [links, setLinks] = React.useState<Array<{ kind: string; label: string; match: 'EMAIL' | 'NAME' }> | null>(null)
  const [checkedFor, setCheckedFor] = React.useState('')
  const [weighed, setWeighed] = React.useState(false)
  const [declaration, setDeclaration] = React.useState('')
  const who = `${firstName.trim()}|${lastName.trim()}|${email.trim().toLowerCase()}`
  const add = useMutation({
    mutationFn: async () => {
      if (checkedFor !== who) {
        const res = await apiJson<ApiEnvelope<{ links: Array<{ kind: string; label: string; match: 'EMAIL' | 'NAME' }> }>>(
          `/surveys/${surveyId}/reviewers/accounts/check`,
          { method: 'POST', body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() }) },
        )
        const found = res.data?.links ?? []
        setLinks(found)
        setCheckedFor(who)
        setWeighed(false)
        if (found.length) return null
      }
      return apiJson<ApiEnvelope<{ id: string; inviteSent: boolean }>>(`/surveys/${surveyId}/reviewers/accounts`, {
        method: 'POST',
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          ...(links?.length ? { declaration: declaration.trim() } : {}),
        }),
      })
    },
    onSuccess: async res => {
      if (!res) return // connected to us: the links are shown, waiting for the declaration
      toastSuccess(
        'Reviewer account made',
        res.data?.inviteSent
          ? 'They have been emailed a link to choose their own password.'
          : 'The email could not be sent: they can use "Forgot password" on the sign-in page.',
      )
      await qc.invalidateQueries({ queryKey: reviewersKey(surveyId) })
      onAdded(res.data?.id)
    },
    onError: e => toastApiError(e, 'Could not make the account'),
  })
  const needsDeclaration = checkedFor === who && Boolean(links?.length)
  const ready =
    Boolean(firstName.trim() && lastName.trim() && /^\S+@\S+\.\S+$/.test(email.trim())) &&
    (!needsDeclaration || (weighed && declaration.trim().length >= 10))
  return (
    <Dialog open onOpenChange={o => (!o ? onClose() : undefined)}>
      <DialogContent className="max-w-lg" data-testid="add-reviewer-dialog">
        <DialogHeader>
          <DialogTitle>Add a reviewer</DialogTitle>
          <DialogDescription>
            Makes a CareFlow account for the reviewer with the Independent reviewer role only: no other access and no branch.
            Use their own email, not a staff email. They are emailed a link to choose their own password; nobody else sets or
            sees it. Then give them access to this survey.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="reviewer-first-name" className="block text-sm font-medium">
                First name
              </label>
              <Input id="reviewer-first-name" value={firstName} onChange={e => setFirstName(e.target.value)} autoComplete="off" />
            </div>
            <div className="space-y-1">
              <label htmlFor="reviewer-last-name" className="block text-sm font-medium">
                Last name
              </label>
              <Input id="reviewer-last-name" value={lastName} onChange={e => setLastName(e.target.value)} autoComplete="off" />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="reviewer-email" className="block text-sm font-medium">
              Email
            </label>
            <Input id="reviewer-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="off" />
          </div>
          {needsDeclaration ? (
            <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm" data-testid="reviewer-links">
              <p className="font-medium">This person is already connected to us:</p>
              <ul className="list-disc space-y-0.5 pl-5">
                {links!.map(l => (
                  <li key={l.label}>
                    {l.label} <span className="text-xs text-muted-foreground">(same {l.match === 'EMAIL' ? 'email' : 'name'})</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                A same-name match may be someone else. If it is them, they can still review if you judge them independent enough:
                say why. The people they are connected to are kept out of their sample. This is saved in the audit log.
              </p>
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" checked={weighed} onChange={e => setWeighed(e.target.checked)} />
                <span>I have checked this and they are independent enough for this review.</span>
              </label>
              <textarea
                className="min-h-[70px] w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                placeholder="Why (e.g. left us 3 years ago and never worked with the people in the sample; or: a different person with the same name)"
                value={declaration}
                onChange={e => setDeclaration(e.target.value)}
                aria-label="Why they are independent enough"
              />
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => add.mutate()} disabled={!ready || add.isPending}>
            {add.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> : null}
            {checkedFor === who ? 'Make the account' : 'Check and make the account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function GrantReviewerDialog({
  surveyId,
  data,
  onClose,
  onAddAccount,
  initialUserId,
}: {
  surveyId: string
  data: ReviewersData
  onClose: () => void
  onAddAccount: () => void
  /** Preselect this reviewer (from the all-reviewers page). */
  initialUserId?: string
}) {
  const qc = useQueryClient()
  const accounts = data.accounts.filter(a => a.active)
  const [userId, setUserId] = React.useState(
    initialUserId && accounts.some(a => a.id === initialUserId) ? initialUserId : (accounts[0]?.id ?? ''),
  )
  const [from, setFrom] = React.useState(dateInput(new Date()))
  const [to, setTo] = React.useState(dateInput(new Date(Date.now() + 30 * 86400000)))
  const [search, setSearch] = React.useState('')
  const [sample, setSample] = React.useState<Array<{ id: string; name: string }>>([])
  const people = useQuery({
    queryKey: ['surveys', 'reviewers', surveyId, 'people', search],
    queryFn: () => fetchSurveyRecordCandidates(surveyId, search),
    enabled: !data.anonymousOnly,
  })
  const grant = useMutation({
    mutationFn: async () =>
      apiJson(`/surveys/${surveyId}/reviewers`, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          personIds: sample.map(p => p.id),
          validFrom: new Date(`${from}T00:00:00`).toISOString(),
          validTo: new Date(`${to}T23:59:59`).toISOString(),
        }),
      }),
    onSuccess: () => {
      toastSuccess('Reviewer access given')
      void qc.invalidateQueries({ queryKey: reviewersKey(surveyId) })
      onClose()
    },
    onError: e => toastApiError(e, 'Could not give access'),
  })
  const toggle = (p: SurveyRecordCandidate) =>
    setSample(s => (s.some(x => x.id === p.id) ? s.filter(x => x.id !== p.id) : [...s, { id: p.id, name: p.name }]))
  const ready = Boolean(userId && from && to && (data.anonymousOnly || sample.length))

  return (
    <Dialog open onOpenChange={o => (!o ? onClose() : undefined)}>
      <DialogContent className="max-w-xl" data-testid="grant-reviewer-dialog">
        <DialogHeader>
          <DialogTitle>Give a reviewer access</DialogTitle>
          <DialogDescription>
            The reviewer signs in with their own reviewer account and can then record answers on this survey only.{' '}
            {data.anonymousOnly
              ? 'Answers to this survey are linked to no one, so they record anonymous answers only.'
              : 'Choose the people in their sample: they cannot record for anyone else.'}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="max-h-[60vh] space-y-4 overflow-y-auto">
          {accounts.length ? (
            <div className="space-y-1">
              <label htmlFor="reviewer-account" className="block text-sm font-medium">
                Reviewer
              </label>
              <select
                id="reviewer-account"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.email})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm" role="alert">
              There is no reviewer account yet.{' '}
              <button type="button" className="underline underline-offset-2" onClick={onAddAccount}>
                Add a reviewer
              </button>{' '}
              first.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="reviewer-from" className="block text-sm font-medium">
                From
              </label>
              <Input id="reviewer-from" type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label htmlFor="reviewer-to" className="block text-sm font-medium">
                To (at most 90 days)
              </label>
              <Input id="reviewer-to" type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
          </div>
          {!data.anonymousOnly ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Sample ({sample.length} chosen)</legend>
              <Input aria-label="Search people" placeholder="Search by name" value={search} onChange={e => setSearch(e.target.value)} />
              <ul className="max-h-56 space-y-1 overflow-y-auto">
                {[...sample.filter(s => !(people.data ?? []).some(p => p.id === s.id)), ...(people.data ?? [])].map(p => (
                  <li key={p.id}>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={sample.some(s => s.id === p.id)}
                        onChange={() => toggle(p as SurveyRecordCandidate)}
                      />
                      {p.name}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => grant.mutate()} disabled={!ready || grant.isPending}>
            {grant.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> : null}
            Give access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type MyReview = { surveyId: string; title: string; targetKind: SurveyTargetKind; anonymousOnly: boolean; sampleSize: number; validTo: string; closed: boolean }
type ReviewForm = {
  surveyId: string
  targetKind: SurveyTargetKind
  isAnonymous: boolean
  anonymousOnly: boolean
  questions: SurveyQuestion[]
  sectionIntros?: Record<string, string>
}

/** The reviewer's own page: the surveys they may record answers on now. */
export function SurveyReviewsPage() {
  const mine = useQuery({
    queryKey: ['survey-reviews'],
    queryFn: async () => (await apiJson<ApiEnvelope<MyReview[]>>('/survey-reviews', { method: 'GET' })).data,
  })
  const [open, setOpen] = React.useState<string | null>(null)
  const form = useQuery({
    queryKey: ['survey-reviews', open],
    queryFn: async () => (await apiJson<ApiEnvelope<ReviewForm>>(`/survey-reviews/${open}`, { method: 'GET' })).data,
    enabled: Boolean(open),
  })

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold">Surveys to record</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Record each person&apos;s answers in their own words. You can record only for the people in your sample, and only
          until your access ends.
        </p>
      </div>
      {mine.isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
      ) : mine.data?.length ? (
        <ul className="space-y-2">
          {mine.data.map(r => (
            <li key={r.surveyId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-4">
              <div className="min-w-0">
                <p className="font-medium">{r.title}</p>
                <p className="text-sm text-muted-foreground">
                  {r.anonymousOnly ? 'Anonymous answers only' : `${r.sampleSize} people in your sample`} · until {day(r.validTo)}
                  {r.closed ? ' · closed' : ''}
                </p>
              </div>
              <Button type="button" size="sm" className="gap-1.5" onClick={() => setOpen(r.surveyId)} disabled={r.closed}>
                <ClipboardList className="h-3.5 w-3.5" aria-hidden />
                Record answers
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">You have no surveys to record now.</p>
      )}
      {open && form.data ? (
        <RecordSurveyResponseDialog
          surveyId={form.data.surveyId}
          targetKind={form.data.targetKind}
          questions={form.data.questions}
          isAnonymous={form.data.anonymousOnly}
          sectionIntros={form.data.sectionIntros}
          open
          asReviewer
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  )
}
