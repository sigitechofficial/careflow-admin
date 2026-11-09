import * as React from 'react'
import { ClipboardCheck, FileText, Info, MessageSquareText, ShieldAlert, Share2 } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { formatDisplayDate } from '@/shared/lib/display-format.util'
import { cn } from '@/shared/lib/utils'
import {
  EXCEPTION_REASONS,
  INFORMATION_FORMATS,
  RECIPIENT_KINDS,
  SHARING_BASIS,
  SHARING_CATEGORIES,
  SHARING_CHANNELS,
  useRecordSharingException,
  useRemoveSharing,
  useSaveCommunicationNeeds,
  useSaveSharing,
  useServiceUserPrivacy,
  useStopSharing,
  CONSENT_CHANGE_ANSWERS,
  CONSENT_METHODS,
  CONSENT_TOPICS,
  useRecordConsent,
  type ConsentAnswer,
  type ConsentSource,
  type RecordConsentInput,
  type ExceptionReason,
  type RecipientKind,
  type SaveNeedsInput,
  type SaveSharingInput,
  type ServiceUserPrivacy,
  type SharingBasis,
  type SharingLine,
  type SharingStatus,
} from './service-user-privacy.api'

const SELECT_CLASS = 'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
const LABEL_CLASS = 'mb-1 block text-xs font-medium text-muted-foreground'
const day = (iso: string | null) => (iso ? formatDisplayDate(iso) : '')

const STATUS: Record<SharingStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'Sharing', className: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100' },
  REVIEW_DUE: { label: 'Review due', className: 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100' },
  NOT_STARTED: { label: 'Starts later', className: 'bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100' },
  ENDED: { label: 'Ended', className: 'bg-muted text-muted-foreground' },
  STOPPED: { label: 'Stopped', className: 'bg-muted text-muted-foreground' },
}

function words<T extends Record<string, string>>(map: T, keys: string[]): string {
  return keys.map(k => map[k as keyof T] ?? k).join(', ')
}

function Section({ icon, title, intro, action, children, testId }: {
  icon: React.ReactNode
  title: string
  intro: string
  action?: React.ReactNode
  children: React.ReactNode
  testId: string
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5" data-testid={testId}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {icon}
            {title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{intro}</p>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

/**
 * Profile → Privacy. How the person needs information (Accessible Information Standard), who we may share their
 * information with (what, how, on what basis, from when until when, and stopping it), and information shared
 * without consent. The first time, it can be filled from what the initial assessment recorded.
 */
export function ServiceUserPrivacyTab({ serviceUserId, openContacts }: { serviceUserId: string; openContacts?: () => void }) {
  const { data, isLoading, isError } = useServiceUserPrivacy(serviceUserId)
  const canEdit = useAuthStore(s => s.can('service_users.update'))
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (isError || !data) return <p className="text-sm text-muted-foreground">Privacy could not be loaded.</p>
  return (
    <div className="space-y-6" data-testid="service-user-privacy">
      <ConsentsSection serviceUserId={serviceUserId} data={data} canEdit={canEdit} />
      <CommunicationNeedsSection serviceUserId={serviceUserId} data={data} canEdit={canEdit} />
      <SharingSection serviceUserId={serviceUserId} data={data} canEdit={canEdit} openContacts={openContacts} />
      <ExceptionsSection serviceUserId={serviceUserId} data={data} canEdit={canEdit} />
    </div>
  )
}

// ─── Consent record ───────────────────────────────────────────────────────────────────────────────

const ANSWER: Record<ConsentAnswer, { label: string; className: string }> = {
  GIVEN: { label: 'Given', className: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100' },
  HAS_CAPACITY: { label: 'Decides themselves', className: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100' },
  PARTLY: { label: 'Partly', className: 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100' },
  BEST_INTERESTS: { label: 'Best interests', className: 'bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100' },
  REFUSED: { label: 'Refused', className: 'bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-100' },
  WITHDRAWN: { label: 'Withdrawn', className: 'bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-100' },
  NOT_ANSWERED: { label: 'Not answered', className: 'bg-muted text-muted-foreground' },
  RECORDED: { label: 'Recorded', className: 'bg-muted text-foreground' },
}

const SOURCE: Record<ConsentSource, string> = {
  INITIAL_ASSESSMENT: 'Initial assessment',
  CAPACITY: 'Capacity decision',
  VISITS: 'Visits',
  PHOTOS: 'Body map and observations',
  SURVEYS: 'Survey contact preferences',
  SHARING: 'Sharing (below)',
  CHANGE: 'Changed on the profile',
}

function AnswerBadge({ answer }: { answer: ConsentAnswer }) {
  return <span className={cn('whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium', ANSWER[answer].className)}>{ANSWER[answer].label}</span>
}

function ConsentsSection({ serviceUserId, data, canEdit }: { serviceUserId: string; data: ServiceUserPrivacy; canEdit: boolean }) {
  const [recording, setRecording] = React.useState<{ topic?: string; title?: string } | null>(null)
  const [openHistory, setOpenHistory] = React.useState<string | null>(null)
  return (
    <Section
      testId="privacy-consents"
      icon={<ClipboardCheck className="h-4 w-4 text-muted-foreground" aria-hidden />}
      title="Consent record"
      intro="Every consent recorded for this person, in one place. When a consent is given, changed or withdrawn, record it here: the earlier answer is kept in its history."
      action={canEdit ? <Button type="button" size="sm" variant="outline" onClick={() => setRecording({})}>Record a consent</Button> : null}
    >
      {data.consents.length ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm" data-testid="privacy-consents-table">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Consent to</th>
                <th className="px-3 py-2 font-medium">Now</th>
                <th className="px-3 py-2 font-medium">Details</th>
                <th className="px-3 py-2 font-medium">Recorded in</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.consents.map(c => {
                const history = c.history ?? []
                const showing = openHistory === c.key
                return (
                  <React.Fragment key={c.key}>
                    <tr className="align-top" data-testid="privacy-consent-row">
                      <td className="px-3 py-2 font-medium text-foreground">{c.title}</td>
                      <td className="px-3 py-2"><AnswerBadge answer={c.answer} /></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{c.detail || '—'}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {SOURCE[c.source]}
                        {c.recordedBy ? <span className="block">by {c.recordedBy}</span> : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{c.on ? day(c.on) : '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        {history.length ? (
                          <Button type="button" size="sm" variant="ghost" aria-expanded={showing} onClick={() => setOpenHistory(showing ? null : c.key)}>
                            History ({history.length})
                          </Button>
                        ) : null}
                        {canEdit && c.topic ? (
                          <Button type="button" size="sm" variant="outline" onClick={() => setRecording({ topic: c.topic!, title: c.title })}>
                            Record a change
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                    {showing ? (
                      <tr data-testid="privacy-consent-history">
                        <td colSpan={6} className="bg-muted/30 px-3 py-2">
                          <p className="mb-1 text-xs font-medium text-muted-foreground">Before, newest first</p>
                          <ul className="space-y-1.5">
                            {history.map((h, i) => (
                              <li key={i} className="flex flex-wrap items-start gap-2 text-xs">
                                <span className="w-20 shrink-0 text-muted-foreground">{h.on ? day(h.on) : '—'}</span>
                                <AnswerBadge answer={h.answer} />
                                <span className="min-w-0 flex-1 text-muted-foreground">
                                  {h.detail || 'No details'} · {SOURCE[h.source]}{h.recordedBy ? ` by ${h.recordedBy}` : ''}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No consents recorded yet. They are recorded in the initial assessment, at visits and when photos are taken, or with Record a consent.</p>
      )}
      {data.assessment ? (
        <p className="mt-2 text-xs text-muted-foreground">
          The initial assessment of {formatDisplayDate(data.assessment.submittedOn.slice(0, 10))} stays as it was. Changes recorded here show as the consent now, with the assessment’s answer in History.
        </p>
      ) : null}
      {recording ? <ConsentDialog serviceUserId={serviceUserId} today={data.today} initial={recording} onClose={() => setRecording(null)} /> : null}
    </Section>
  )
}

function ConsentDialog({ serviceUserId, today, initial, onClose }: {
  serviceUserId: string
  today: string
  initial: { topic?: string; title?: string }
  onClose: () => void
}) {
  const record = useRecordConsent(serviceUserId)
  const fixed = Boolean(initial.topic)
  const [f, setF] = React.useState<RecordConsentInput>({
    topic: initial.topic ?? 'CARE',
    title: initial.topic === 'OTHER' ? initial.title ?? '' : '',
    answer: 'GIVEN',
    method: '',
    givenBy: '',
    details: '',
    decidedOn: today,
  })
  const patch = (p: Partial<RecordConsentInput>) => setF(prev => ({ ...prev, ...p }))
  const ready = Boolean(f.decidedOn) && (f.topic !== 'OTHER' || Boolean(f.title?.trim()))
  const submit = async () => {
    try {
      await record.mutateAsync({ ...f, method: f.method || undefined })
      toastSuccess('Consent recorded')
      onClose()
    } catch (e) {
      toastApiError(e, 'Could not record')
    }
  }
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{fixed ? `Record a change: ${initial.title ?? ''}` : 'Record a consent'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="grid gap-3 sm:grid-cols-2">
          {!fixed ? (
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS} htmlFor="consent-topic">Consent to</label>
              <select id="consent-topic" className={SELECT_CLASS} value={f.topic} onChange={e => patch({ topic: e.target.value })}>
                {Object.entries(CONSENT_TOPICS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
          ) : null}
          {f.topic === 'OTHER' && !fixed ? (
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS} htmlFor="consent-title">What the consent is about</label>
              <Input id="consent-title" value={f.title ?? ''} onChange={e => patch({ title: e.target.value })} placeholder="For example: being filmed for training" />
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS} htmlFor="consent-answer">Answer</label>
            <select id="consent-answer" className={SELECT_CLASS} value={f.answer} onChange={e => patch({ answer: e.target.value as RecordConsentInput['answer'] })}>
              {Object.entries(CONSENT_CHANGE_ANSWERS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="consent-method">How</label>
            <select id="consent-method" className={SELECT_CLASS} value={f.method ?? ''} onChange={e => patch({ method: e.target.value })}>
              <option value="">Not said</option>
              {Object.entries(CONSENT_METHODS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="consent-date">Date</label>
            <Input id="consent-date" type="date" max={today} value={f.decidedOn} onChange={e => patch({ decidedOn: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS} htmlFor="consent-by">{f.answer === 'BEST_INTERESTS' ? 'Decided by (name and role)' : 'Given by (leave empty if the person themselves)'}</label>
            <Input id="consent-by" value={f.givenBy ?? ''} onChange={e => patch({ givenBy: e.target.value })} placeholder={f.answer === 'BEST_INTERESTS' ? 'For example Sam Lee, Registered Manager' : 'For example Ann Smith, health and welfare attorney'} />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS} htmlFor="consent-details">Details</label>
            <Textarea id="consent-details" rows={3} value={f.details ?? ''} onChange={e => patch({ details: e.target.value })} placeholder="What changed and why, any limits or conditions" />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={() => void submit()} disabled={!ready || record.isPending}>Record</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Communication needs ────────────────────────────────────────────────────────────────────────────

function CommunicationNeedsSection({ serviceUserId, data, canEdit }: { serviceUserId: string; data: ServiceUserPrivacy; canEdit: boolean }) {
  const [editing, setEditing] = React.useState<SaveNeedsInput | null>(null)
  const n = data.needs
  const a = data.assessment
  const fromAssessment: SaveNeedsInput | null = a
    ? {
        interpreterNeeded: a.needs.interpreterNeeded,
        interpreterLanguage: a.needs.interpreterLanguage,
        formats: [],
        hearing: a.needs.hearing,
        sight: a.needs.sight,
        contactViaContactId: null,
        notes: '',
        fromAssessmentId: a.submissionId,
      }
    : null
  const assessmentSays = a
    ? [
        a.needs.interpreterNeeded ? `interpreter${a.needs.interpreterLanguage ? ` (${a.needs.interpreterLanguage})` : ''}` : '',
        a.needs.easyReadOrLargePrint ? 'easy read or large print' : '',
        a.needs.hearing ? `hearing: ${a.needs.hearing.toLowerCase()}` : '',
        a.needs.sight ? `sight: ${a.needs.sight.toLowerCase()}` : '',
      ].filter(Boolean)
    : []
  const viaName = n?.contactViaContactId ? data.contacts.find(c => c.id === n.contactViaContactId)?.name : null

  return (
    <Section
      testId="privacy-communication-needs"
      icon={<MessageSquareText className="h-4 w-4 text-muted-foreground" aria-hidden />}
      title="Information and communication needs"
      intro="How this person needs information given to them, and how to communicate with them. Everyone who contacts them sees this: surveys, calls, letters and visits."
      action={
        canEdit ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setEditing(
                n
                  ? {
                      interpreterNeeded: n.interpreterNeeded,
                      interpreterLanguage: n.interpreterLanguage,
                      formats: n.formats,
                      hearing: n.hearing,
                      sight: n.sight,
                      contactViaContactId: n.contactViaContactId,
                      notes: n.notes,
                    }
                  : { interpreterNeeded: false, formats: [] },
              )
            }
          >
            {n ? 'Change' : 'Record needs'}
          </Button>
        ) : null
      }
    >
      {n ? (
        <dl className="grid gap-3 text-sm sm:grid-cols-2" data-testid="privacy-needs-summary">
          <div>
            <dt className={LABEL_CLASS}>Formats</dt>
            <dd>{n.formats.length ? words(INFORMATION_FORMATS, n.formats) : 'Standard print'}</dd>
          </div>
          <div>
            <dt className={LABEL_CLASS}>Interpreter</dt>
            <dd>{n.interpreterNeeded ? `Yes${n.interpreterLanguage ? `: ${n.interpreterLanguage}` : ''}` : 'No'}</dd>
          </div>
          {n.hearing ? (
            <div>
              <dt className={LABEL_CLASS}>Hearing</dt>
              <dd>{n.hearing}</dd>
            </div>
          ) : null}
          {n.sight ? (
            <div>
              <dt className={LABEL_CLASS}>Sight</dt>
              <dd>{n.sight}</dd>
            </div>
          ) : null}
          {viaName ? (
            <div>
              <dt className={LABEL_CLASS}>Send written information to</dt>
              <dd>{viaName}</dd>
            </div>
          ) : null}
          {n.notes ? (
            <div className="sm:col-span-2">
              <dt className={LABEL_CLASS}>Notes</dt>
              <dd className="whitespace-pre-wrap">{n.notes}</dd>
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground sm:col-span-2">
            {n.source === 'INITIAL_ASSESSMENT' ? 'First taken from the initial assessment. ' : ''}Last changed {formatDisplayDate(n.updatedAt.slice(0, 10))}.
          </p>
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">No needs recorded yet.</p>
      )}

      {!n && a && canEdit ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm" data-testid="privacy-needs-from-assessment">
          <span>
            The initial assessment of {formatDisplayDate(a.submittedOn.slice(0, 10))} recorded{' '}
            {assessmentSays.length ? assessmentSays.join(', ') : 'no particular needs'}.
          </span>
          <Button type="button" size="sm" onClick={() => setEditing(fromAssessment)}>
            Use the assessment’s answers
          </Button>
        </div>
      ) : null}

      {editing ? (
        <NeedsDialog
          serviceUserId={serviceUserId}
          contacts={data.contacts}
          initial={editing}
          largePrintHint={!n && Boolean(a?.needs.easyReadOrLargePrint)}
          firstLanguage={data.firstLanguage ?? null}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Section>
  )
}

function NeedsDialog({ serviceUserId, contacts, initial, largePrintHint, firstLanguage, onClose }: {
  serviceUserId: string
  contacts: ServiceUserPrivacy['contacts']
  initial: SaveNeedsInput
  largePrintHint: boolean
  firstLanguage?: string | null
  onClose: () => void
}) {
  const save = useSaveCommunicationNeeds(serviceUserId)
  const [f, setF] = React.useState<SaveNeedsInput>(initial)
  const patch = (p: Partial<SaveNeedsInput>) => setF(prev => ({ ...prev, ...p }))
  const toggle = (k: string) => patch({ formats: f.formats.includes(k) ? f.formats.filter(x => x !== k) : [...f.formats, k] })
  const submit = async () => {
    try {
      await save.mutateAsync(f)
      toastSuccess('Communication needs saved')
      onClose()
    } catch (e) {
      toastApiError(e, 'Could not save')
    }
  }
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Information and communication needs</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <fieldset>
            <legend className={LABEL_CLASS}>Information in these formats</legend>
            {largePrintHint ? (
              <p className="mb-2 text-xs text-amber-700 dark:text-amber-300">The assessment said easy read or large print: tick which they need.</p>
            ) : null}
            <div className="grid gap-1.5 sm:grid-cols-2">
              {Object.entries(INFORMATION_FORMATS).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 rounded border-input" checked={f.formats.includes(k)} onChange={() => toggle(k)} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" className="h-4 w-4 rounded border-input" checked={f.interpreterNeeded} onChange={e =>
                  patch({
                    interpreterNeeded: e.target.checked,
                    // Starts from their first language (Personal Details); change it if they need another.
                    ...(e.target.checked && !f.interpreterLanguage?.trim() && firstLanguage && !/^english$/i.test(firstLanguage)
                      ? { interpreterLanguage: firstLanguage }
                      : {}),
                  })
                } />
              Needs an interpreter
            </label>
            {f.interpreterNeeded ? (
              <div className="sm:col-span-2">
                <label className={LABEL_CLASS} htmlFor="privacy-language">Language</label>
                <Input id="privacy-language" value={f.interpreterLanguage ?? ''} onChange={e => patch({ interpreterLanguage: e.target.value })} placeholder="For example Polish, Urdu, BSL" />
                {firstLanguage ? <p className="mt-1 text-xs text-muted-foreground">First language (Personal Details): {firstLanguage}</p> : null}
              </div>
            ) : null}
            <div>
              <label className={LABEL_CLASS} htmlFor="privacy-hearing">Hearing</label>
              <Input id="privacy-hearing" value={f.hearing ?? ''} onChange={e => patch({ hearing: e.target.value })} placeholder="For example: hearing aid in left ear" />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="privacy-sight">Sight</label>
              <Input id="privacy-sight" value={f.sight ?? ''} onChange={e => patch({ sight: e.target.value })} placeholder="For example: cannot read small print" />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS} htmlFor="privacy-via">Send written information to someone else instead</label>
              <select id="privacy-via" className={SELECT_CLASS} value={f.contactViaContactId ?? ''} onChange={e => patch({ contactViaContactId: e.target.value || null })}>
                <option value="">No, to the person</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.relationship ? ` (${c.relationship})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS} htmlFor="privacy-needs-notes">Anything else</label>
              <Textarea id="privacy-needs-notes" rows={3} value={f.notes ?? ''} onChange={e => patch({ notes: e.target.value })} placeholder="For example: speak slowly, face them, best in the morning" />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={() => void submit()} disabled={save.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Sharing ───────────────────────────────────────────────────────────────────────────────────────

function SharingSection({ serviceUserId, data, canEdit, openContacts }: { serviceUserId: string; data: ServiceUserPrivacy; canEdit: boolean; openContacts?: () => void }) {
  const [editing, setEditing] = React.useState<{ id?: string; input: SaveSharingInput } | null>(null)
  const [stopping, setStopping] = React.useState<SharingLine | null>(null)
  const [showPast, setShowPast] = React.useState(false)
  const current = data.sharing.filter(s => s.status !== 'STOPPED' && s.status !== 'ENDED')
  const past = data.sharing.filter(s => s.status === 'STOPPED' || s.status === 'ENDED')
  const a = data.assessment
  const blank: SaveSharingInput = {
    recipientKind: 'CONTACT',
    categories: [],
    channels: [],
    basis: 'CONSENT',
    startsOn: data.today,
  }
  const toInput = (s: SharingLine): SaveSharingInput => ({
    recipientKind: s.recipientKind,
    contactId: s.contactId ?? undefined,
    recipientName: s.recipientKind === 'CONTACT' ? undefined : s.recipientName,
    recipientRole: s.recipientRole,
    categories: s.categories,
    channels: s.channels,
    basis: s.basis,
    legalAuthorityId: s.legalAuthorityId ?? undefined,
    conditions: s.conditions,
    startsOn: s.startsOn,
    endsOn: s.endsOn,
    reviewOn: s.reviewOn,
  })

  return (
    <Section
      testId="privacy-sharing"
      icon={<Share2 className="h-4 w-4 text-muted-foreground" aria-hidden />}
      title="Who we may share information with"
      intro="What each person or organisation may be told, how, on what basis, and for how long. Stopping sharing takes effect at once and is kept as history."
      action={canEdit ? <Button type="button" size="sm" onClick={() => setEditing({ input: blank })}>Add</Button> : null}
    >
      {a ? (
        <div className="mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground" data-testid="privacy-sharing-assessment">
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <FileText className="h-3.5 w-3.5" aria-hidden /> What the initial assessment of {formatDisplayDate(a.submittedOn.slice(0, 10))} recorded
          </p>
          <p className="mt-1">
            {a.sharing.consent === 'YES'
              ? `Agreed to sharing with: ${a.sharing.with.length ? a.sharing.with.join(', ') : 'not said'}.`
              : a.sharing.consent === 'NO'
                ? 'Did not agree to information being shared.'
                : 'Sharing was not answered.'}
            {a.sharing.limits ? ` Limits: ${a.sharing.limits}.` : ''}
            {a.sharing.restrictions ? ` Restrictions: ${a.sharing.restrictions}.` : ''}
            {a.sharing.conditions ? ` Conditions: ${a.sharing.conditions}.` : ''}
          </p>
          <p className="mt-1">Add a line below for each of these, so CareFlow can use it.</p>
        </div>
      ) : null}

      {current.length ? (
        <ul className="divide-y divide-border rounded-lg border border-border" data-testid="privacy-sharing-current">
          {current.map(s => (
            <SharingRow
              key={s.id}
              line={s}
              canEdit={canEdit}
              onChange={() => setEditing({ id: s.id, input: toInput(s) })}
              onStop={() => setStopping(s)}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No sharing recorded. Information is shared only with the people and professionals who need it for their care.</p>
      )}

      {past.length ? (
        <div className="mt-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowPast(v => !v)}>
            {showPast ? 'Hide' : 'Show'} stopped and ended sharing ({past.length})
          </Button>
          {showPast ? (
            <ul className="mt-2 divide-y divide-border rounded-lg border border-border" data-testid="privacy-sharing-past">
              {past.map(s => (
                <SharingRow key={s.id} line={s} canEdit={false} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <SharingDialog serviceUserId={serviceUserId} data={data} id={editing.id} initial={editing.input} onClose={() => setEditing(null)} openContacts={openContacts} />
      ) : null}
      {stopping ? <StopDialog serviceUserId={serviceUserId} line={stopping} onClose={() => setStopping(null)} /> : null}
    </Section>
  )
}

function SharingRow({ line: s, canEdit, onChange, onStop }: { line: SharingLine; canEdit: boolean; onChange?: () => void; onStop?: () => void }) {
  const st = STATUS[s.status]
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 px-3 py-3 text-sm" data-testid="privacy-sharing-row">
      <div className="min-w-0 space-y-0.5">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{s.recipientName}</span>
          {s.recipientRole ? <span className="text-xs text-muted-foreground">{s.recipientRole}</span> : null}
          <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium', st.className)}>{st.label}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="text-foreground">{words(SHARING_CATEGORIES, s.categories)}</span>
          {s.channels.length ? ` · by ${words(SHARING_CHANNELS, s.channels).toLowerCase()}` : ''} · {SHARING_BASIS[s.basis]}
        </p>
        <p className="text-xs text-muted-foreground">
          From {day(s.startsOn)}
          {s.endsOn ? ` until ${day(s.endsOn)}` : ', no end date'}
          {s.reviewOn ? ` · review ${day(s.reviewOn)}` : ''}
        </p>
        {s.conditions ? <p className="text-xs text-muted-foreground">Conditions: {s.conditions}</p> : null}
        {s.stoppedAt ? (
          <p className="text-xs text-muted-foreground">
            Stopped {formatDisplayDate(s.stoppedAt.slice(0, 10))}{s.stopReason ? `: ${s.stopReason}` : ''}
          </p>
        ) : null}
      </div>
      {canEdit && onChange && onStop ? (
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onChange}>Change</Button>
          <Button type="button" size="sm" variant="outline" className="text-destructive" onClick={onStop}>Stop sharing</Button>
        </div>
      ) : null}
    </li>
  )
}

function SharingDialog({ serviceUserId, data, id, initial, onClose, openContacts }: {
  serviceUserId: string
  data: ServiceUserPrivacy
  id?: string
  initial: SaveSharingInput
  onClose: () => void
  openContacts?: () => void
}) {
  const save = useSaveSharing(serviceUserId)
  const remove = useRemoveSharing(serviceUserId)
  const [f, setF] = React.useState<SaveSharingInput>(initial)
  const patch = (p: Partial<SaveSharingInput>) => setF(prev => ({ ...prev, ...p }))
  const toggleIn = (key: 'categories' | 'channels', v: string) =>
    patch({ [key]: f[key].includes(v) ? f[key].filter(x => x !== v) : [...f[key], v] } as Partial<SaveSharingInput>)
  const needsAuthority = f.basis === 'LPA_HEALTH_WELFARE' || f.basis === 'DEPUTY'
  const submit = async () => {
    try {
      await save.mutateAsync({ id, input: { ...f, legalAuthorityId: needsAuthority ? f.legalAuthorityId : undefined } })
      toastSuccess(id ? 'Sharing updated' : 'Sharing recorded')
      onClose()
    } catch (e) {
      toastApiError(e, 'Could not save')
    }
  }
  const removeIt = async () => {
    if (!id) return
    try {
      await remove.mutateAsync(id)
      toastSuccess('Removed')
      onClose()
    } catch (e) {
      toastApiError(e, 'Could not remove')
    }
  }
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{id ? 'Change sharing' : 'Add who we may share with'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS} htmlFor="sharing-kind">Who</label>
              <select id="sharing-kind" className={SELECT_CLASS} value={f.recipientKind} onChange={e => patch({ recipientKind: e.target.value as RecipientKind })}>
                {Object.entries(RECIPIENT_KINDS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            {f.recipientKind === 'CONTACT' ? (
              <div>
                <label className={LABEL_CLASS} htmlFor="sharing-contact">Which family member or friend</label>
                {data.contacts.length ? (
                  <select id="sharing-contact" className={SELECT_CLASS} value={f.contactId ?? ''} onChange={e => patch({ contactId: e.target.value || undefined })}>
                    <option value="">Choose from their contacts…</option>
                    {data.contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.relationship ? ` (${c.relationship})` : ''}</option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground" data-testid="sharing-no-contacts">
                    <p>No family or friends are recorded for them yet. Add the person in Contacts and Family, then come back here.</p>
                    {openContacts ? (
                      <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => { onClose(); openContacts() }}>
                        Go to Contacts and Family
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className={LABEL_CLASS} htmlFor="sharing-name">Name</label>
                <Input id="sharing-name" value={f.recipientName ?? ''} onChange={e => patch({ recipientName: e.target.value })} placeholder={f.recipientKind === 'PROFESSIONAL' ? 'For example Dr Patel' : 'For example Croydon Council'} />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS} htmlFor="sharing-role">Role or organisation (optional)</label>
              <Input id="sharing-role" value={f.recipientRole ?? ''} onChange={e => patch({ recipientRole: e.target.value })} placeholder="For example GP, Croydon Health Centre" />
            </div>
          </div>
          <fieldset>
            <legend className={LABEL_CLASS}>What may be shared</legend>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {Object.entries(SHARING_CATEGORIES).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 rounded border-input" checked={f.categories.includes(k)} onChange={() => toggleIn('categories', k)} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className={LABEL_CLASS}>How</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {Object.entries(SHARING_CHANNELS).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 rounded border-input" checked={f.channels.includes(k)} onChange={() => toggleIn('channels', k)} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={needsAuthority ? '' : 'sm:col-span-2'}>
              <label className={LABEL_CLASS} htmlFor="sharing-basis">On what basis</label>
              <select id="sharing-basis" className={SELECT_CLASS} value={f.basis} onChange={e => patch({ basis: e.target.value as SharingBasis })}>
                {Object.entries(SHARING_BASIS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            {needsAuthority ? (
              <div>
                <label className={LABEL_CLASS} htmlFor="sharing-authority">Which legal authority</label>
                <select id="sharing-authority" className={SELECT_CLASS} value={f.legalAuthorityId ?? ''} onChange={e => patch({ legalAuthorityId: e.target.value || undefined })}>
                  <option value="">Not recorded yet</option>
                  {data.legalAuthorities.map(l => (
                    <option key={l.id} value={l.id}>{l.holderName}</option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <label className={LABEL_CLASS} htmlFor="sharing-from">From</label>
              <Input id="sharing-from" type="date" value={f.startsOn} onChange={e => patch({ startsOn: e.target.value })} />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="sharing-until">Until (optional)</label>
              <Input id="sharing-until" type="date" value={f.endsOn ?? ''} onChange={e => patch({ endsOn: e.target.value || null })} />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="sharing-review">Review on (optional)</label>
              <Input id="sharing-review" type="date" value={f.reviewOn ?? ''} onChange={e => patch({ reviewOn: e.target.value || null })} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS} htmlFor="sharing-conditions">Conditions or limits (optional)</label>
              <Textarea id="sharing-conditions" rows={2} value={f.conditions ?? ''} onChange={e => patch({ conditions: e.target.value })} placeholder="For example: not her finances; phone before 6pm only" />
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="sm:justify-between">
          {id ? (
            <Button type="button" variant="ghost" className="text-muted-foreground" onClick={() => void removeIt()} disabled={remove.isPending}>
              Remove (entered by mistake)
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={() => void submit()} disabled={save.isPending}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StopDialog({ serviceUserId, line, onClose }: { serviceUserId: string; line: SharingLine; onClose: () => void }) {
  const stop = useStopSharing(serviceUserId)
  const [reason, setReason] = React.useState('')
  const submit = async () => {
    try {
      await stop.mutateAsync({ id: line.id, reason: reason.trim() })
      toastSuccess('Sharing stopped')
      onClose()
    } catch (e) {
      toastApiError(e, 'Could not stop sharing')
    }
  }
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Stop sharing with {line.recipientName}?</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <p className="text-sm text-muted-foreground">
            It stops now. {line.recipientKind === 'CONTACT' ? 'If this was the only sharing with them, they also stop getting updates and survey invitations about this person. ' : ''}
            The line is kept as history.
          </p>
          <div>
            <label className={LABEL_CLASS} htmlFor="stop-reason">Why</label>
            <Textarea id="stop-reason" rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="For example: she asked us to stop on 8 Nov during her visit" />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="destructive" onClick={() => void submit()} disabled={!reason.trim() || stop.isPending}>Stop sharing</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Shared without consent ───────────────────────────────────────────────────────────────────────

function ExceptionsSection({ serviceUserId, data, canEdit }: { serviceUserId: string; data: ServiceUserPrivacy; canEdit: boolean }) {
  const [open, setOpen] = React.useState(false)
  return (
    <Section
      testId="privacy-exceptions"
      icon={<ShieldAlert className="h-4 w-4 text-muted-foreground" aria-hidden />}
      title="Shared without consent"
      intro="When information had to be shared without their agreement, for example to keep them or someone else safe. The law allows this, but the decision must be written down."
      action={canEdit ? <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>Record</Button> : null}
    >
      {data.exceptions.length ? (
        <ul className="divide-y divide-border rounded-lg border border-border" data-testid="privacy-exceptions-list">
          {data.exceptions.map(e => (
            <li key={e.id} className="space-y-0.5 px-3 py-3 text-sm">
              <p>
                <span className="font-medium text-foreground">{day(e.sharedOn)}</span> · shared with {e.sharedWith}
              </p>
              <p className="text-xs text-muted-foreground">{EXCEPTION_REASONS[e.reason]}</p>
              <p className="text-xs text-muted-foreground">What: {e.whatShared}</p>
              <p className="text-xs text-muted-foreground">Decided by {e.decidedBy}{e.notes ? ` · ${e.notes}` : ''}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Info className="h-3.5 w-3.5" aria-hidden /> None recorded.
        </p>
      )}
      {open ? <ExceptionDialog serviceUserId={serviceUserId} today={data.today} onClose={() => setOpen(false)} /> : null}
    </Section>
  )
}

function ExceptionDialog({ serviceUserId, today, onClose }: { serviceUserId: string; today: string; onClose: () => void }) {
  const record = useRecordSharingException(serviceUserId)
  const [f, setF] = React.useState({ sharedOn: today, sharedWith: '', whatShared: '', reason: 'SAFEGUARDING' as ExceptionReason, decidedBy: '', notes: '' })
  const patch = (p: Partial<typeof f>) => setF(prev => ({ ...prev, ...p }))
  const ready = f.sharedWith.trim() && f.whatShared.trim() && f.decidedBy.trim()
  const submit = async () => {
    try {
      await record.mutateAsync(f)
      toastSuccess('Recorded')
      onClose()
    } catch (e) {
      toastApiError(e, 'Could not record')
    }
  }
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record information shared without consent</DialogTitle>
          <DialogDescription>
            This only keeps a record. CareFlow does not send anything. Use it after you have shared information
            yourself (for example by phone to the council safeguarding team), so there is a note of what, with whom and why.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS} htmlFor="exc-date">Date shared</label>
            <Input id="exc-date" type="date" value={f.sharedOn} onChange={e => patch({ sharedOn: e.target.value })} />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="exc-with">Shared with</label>
            <Input id="exc-with" value={f.sharedWith} onChange={e => patch({ sharedWith: e.target.value })} placeholder="For example the council safeguarding team" />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS} htmlFor="exc-reason">Why</label>
            <select id="exc-reason" className={SELECT_CLASS} value={f.reason} onChange={e => patch({ reason: e.target.value as ExceptionReason })}>
              {Object.entries(EXCEPTION_REASONS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS} htmlFor="exc-what">What was shared</label>
            <Textarea id="exc-what" rows={2} value={f.whatShared} onChange={e => patch({ whatShared: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS} htmlFor="exc-by">Decided by (name and role)</label>
            <Input id="exc-by" value={f.decidedBy} onChange={e => patch({ decidedBy: e.target.value })} placeholder="For example Sam Lee, Registered Manager" />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS} htmlFor="exc-notes">Notes (optional)</label>
            <Textarea id="exc-notes" rows={2} value={f.notes} onChange={e => patch({ notes: e.target.value })} placeholder="For example: whether the person was told, and when" />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={() => void submit()} disabled={!ready || record.isPending}>Record</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

