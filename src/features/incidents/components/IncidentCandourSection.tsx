import * as React from 'react'
import { AlertTriangle, CheckCircle2, Paperclip, Pencil, Scale } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/form-field'
import { Badge } from '@/shared/ui/badge'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import { formatOrganisationIsoDateLong } from '@/shared/lib/organisation-display-format.store'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'
import { useAuthStore } from '@/features/auth/store'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useSaveCandourStep } from '@/features/incidents/hooks/useIncidents'
import { useUploadIncidentAttachment } from '@/features/incidents/hooks/useIncidentCare'
import {
  CANDOUR_ATTEMPT_METHOD_OPTIONS,
  CANDOUR_HARM_OPTIONS,
  CANDOUR_LETTER_METHOD_OPTIONS,
  CANDOUR_UNABLE_REASON_OPTIONS,
  type CandourPersonEntry,
  type CandourStatus,
  type IncidentCandourPanel,
} from '@/features/incidents/types'

const inputClass =
  'mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'text-xs uppercase tracking-wide text-muted-foreground'

const STATUS: Record<CandourStatus, { label: string; variant: 'muted' | 'warning' | 'info' | 'success' | 'destructive' }> = {
  NOT_DECIDED: { label: 'Not decided', variant: 'warning' },
  NOT_KNOWN: { label: 'Not known yet', variant: 'warning' },
  NOT_REQUIRED: { label: 'Not required', variant: 'muted' },
  IN_PROGRESS: { label: 'In progress', variant: 'info' },
  COMPLETE: { label: 'Complete', variant: 'success' },
}

const DECISION_LABEL: Record<string, string> = {
  YES: 'Yes',
  NO: 'No',
  NOT_KNOWN: 'Not known yet',
  NOT_APPLICABLE: 'Not applicable',
}

const optionLabel = (opts: { value: string; label: string }[], v: string | null) =>
  opts.find((o) => o.value === v)?.label ?? v ?? ''
const day = (v: string | null) => (v ? formatOrganisationIsoDateLong(v) : '—')

function Req() {
  return <span className="ml-0.5 text-destructive dark:text-red-400">*</span>
}

/** Staff picker (who told them, who sent the letter, who tried to contact). */
function StaffPicker({
  id,
  value,
  onChange,
  initialName,
}: {
  id: string
  value: string
  onChange: (id: string) => void
  initialName?: string | null
}) {
  const [search, setSearch] = React.useState('')
  const q = useEmployees({ limit: 50, search: search || undefined })
  const options: ComboboxOption[] = React.useMemo(() => {
    const rows = (q.data?.rows ?? []).map((r) => ({
      value: r.id,
      label: r.fullName || [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
      description: r.jobTitle?.name ?? undefined,
    }))
    if (value && initialName && !rows.some((r) => r.value === value)) {
      rows.unshift({ value, label: initialName, description: undefined })
    }
    return rows
  }, [q.data, value, initialName])
  return (
    <Combobox
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      onSearchChange={setSearch}
      loading={q.isLoading}
      placeholder="Select staff member"
      searchPlaceholder="Search staff…"
      emptyText="No staff match your search."
    />
  )
}

/** Upload a copy of a letter (stored on the incident as Notification evidence). */
function LetterUpload({
  incidentId,
  value,
  onChange,
}: {
  incidentId: string
  value: { id: string; name: string } | null
  onChange: (v: { id: string; name: string }) => void
}) {
  const upload = useUploadIncidentAttachment(incidentId)
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
      {value && (
        <span className="inline-flex items-center gap-1 text-foreground">
          <Paperclip className="h-3.5 w-3.5" /> {value.name}
        </span>
      )}
      <label className="cursor-pointer rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted">
        {upload.isPending ? 'Uploading…' : value ? 'Replace copy' : 'Upload copy (PDF or photo)'}
        <input
          type="file"
          className="sr-only"
          accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
          disabled={upload.isPending}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            upload.mutate(
              { file, category: 'NOTIFICATION_EVIDENCE' },
              { onSuccess: (att) => onChange({ id: att.id, name: att.originalName ?? file.name }) },
            )
          }}
        />
      </label>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 text-foreground">{value}</span>
    </div>
  )
}

function ChangeReason({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  return (
    <div>
      <label className={labelClass} htmlFor={id}>
        Why is this changing?
        <Req />
      </label>
      <Textarea id={id} className="mt-1" rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function FormActions({ saving, onCancel, onSave, label = 'Save' }: { saving: boolean; onCancel?: () => void; onSave: () => void; label?: string }) {
  return (
    <div className="flex gap-2">
      {onCancel && (
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      )}
      <Button size="sm" loading={saving} onClick={onSave}>
        {label}
      </Button>
    </div>
  )
}

// --------------------------------------------------------------------------- decision

function DecisionForm({
  incidentId,
  entry,
  onDone,
}: {
  incidentId: string
  entry: CandourPersonEntry
  onDone: () => void
}) {
  const save = useSaveCandourStep(incidentId)
  const r = entry.record
  const [decision, setDecision] = React.useState<string>(r?.decision ?? '')
  const [harms, setHarms] = React.useState<string[]>(r?.harmTypes ?? [])
  const [hpName, setHpName] = React.useState(r?.healthProfessionalName ?? '')
  const [hpRole, setHpRole] = React.useState(r?.healthProfessionalRole ?? '')
  const [reason, setReason] = React.useState(r?.decisionReason ?? '')
  const [changeReason, setChangeReason] = React.useState('')
  const [tried, setTried] = React.useState(false)
  const needsHp = decision === 'YES' || decision === 'NO'
  const errors = [
    !decision && 'Choose an answer',
    decision === 'YES' && harms.length === 0 && 'Tick the harm that applies',
    needsHp && (!hpName.trim() || !hpRole.trim()) && 'Add the health professional consulted (name and role)',
    (decision === 'NO' || decision === 'NOT_APPLICABLE') && !reason.trim() && 'Give the reason',
    r && changeReason.trim().length < 3 && 'Say why this is changing',
  ].filter((e): e is string => Boolean(e))

  function submit() {
    setTried(true)
    if (errors.length) return
    save.mutate(
      {
        serviceUserId: entry.serviceUserId,
        step: 'decision',
        body: {
          decision,
          harmTypes: decision === 'YES' ? harms : [],
          healthProfessionalName: needsHp ? hpName.trim() : null,
          healthProfessionalRole: needsHp ? hpRole.trim() : null,
          // The reason box is hidden for Yes — don't send a stale one.
          decisionReason: decision === 'YES' ? null : reason.trim() || null,
          ...(r ? { changeReason: changeReason.trim() } : {}),
        },
      },
      { onSuccess: onDone },
    )
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-background p-3">
      <fieldset>
        <legend className={labelClass}>
          Is this a Duty of Candour incident for {entry.serviceUserName}?
          <Req />
        </legend>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {Object.entries(DECISION_LABEL).map(([v, l]) => (
            <label key={v} className="inline-flex items-center gap-1.5">
              <input type="radio" name={`dec-${entry.serviceUserId}`} checked={decision === v} onChange={() => setDecision(v)} />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      {decision === 'YES' && (
        <fieldset>
          <legend className={labelClass}>
            Harm caused, or treatment needed to prevent it (Regulation 20(9))
            <Req />
          </legend>
          <div className="mt-1 space-y-1">
            {CANDOUR_HARM_OPTIONS.map((h) => (
              <label key={h.value} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={harms.includes(h.value)}
                  onChange={(e) =>
                    setHarms((prev) => (e.target.checked ? [...prev, h.value] : prev.filter((x) => x !== h.value)))
                  }
                />
                {h.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {needsHp && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor={`hp-${entry.serviceUserId}`}>
              Health professional consulted
              <Req />
            </label>
            <input id={`hp-${entry.serviceUserId}`} className={inputClass} value={hpName} onChange={(e) => setHpName(e.target.value)} placeholder="e.g. Dr Shah" />
          </div>
          <div>
            <label className={labelClass} htmlFor={`hpr-${entry.serviceUserId}`}>
              Their role
              <Req />
            </label>
            <input id={`hpr-${entry.serviceUserId}`} className={inputClass} value={hpRole} onChange={(e) => setHpRole(e.target.value)} placeholder="e.g. GP, district nurse, paramedic" />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            The law asks for a health care professional&apos;s reasonable opinion on whether the harm meets the threshold.
          </p>
        </div>
      )}
      {(decision === 'NO' || decision === 'NOT_APPLICABLE' || decision === 'NOT_KNOWN') && (
        <div>
          <label className={labelClass} htmlFor={`reason-${entry.serviceUserId}`}>
            {decision === 'NOT_KNOWN' ? 'What are you waiting for? (optional)' : 'Reason'}
            {decision !== 'NOT_KNOWN' && <Req />}
          </label>
          <Textarea id={`reason-${entry.serviceUserId}`} className="mt-1" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      )}
      {r && <ChangeReason id={`dcr-${entry.serviceUserId}`} value={changeReason} onChange={setChangeReason} />}
      {tried && errors.length > 0 && <p className="text-xs text-destructive dark:text-red-400">{errors[0]}</p>}
      <FormActions saving={save.isPending} onCancel={r ? onDone : undefined} onSave={submit} />
    </div>
  )
}

// --------------------------------------------------------------------------- steps

function ToldForm({ incidentId, entry, onDone }: { incidentId: string; entry: CandourPersonEntry; onDone: () => void }) {
  const save = useSaveCandourStep(incidentId)
  const r = entry.record!
  const editing = Boolean(r.toldOn)
  const today = operationalTodayIso()
  const [toldOn, setToldOn] = React.useState(r.toldOn ?? today)
  const [by, setBy] = React.useState(r.toldBy?.id ?? '')
  const [kind, setKind] = React.useState<string>(r.toldPersonKind ?? (entry.deceased ? 'REPRESENTATIVE' : ''))
  const [name, setName] = React.useState(r.toldPersonName ?? '')
  const [rel, setRel] = React.useState(r.toldRelationship ?? '')
  const [facts, setFacts] = React.useState(r.factsExplained)
  const [enquiries, setEnquiries] = React.useState(r.enquiriesExplained)
  const [apology, setApology] = React.useState(r.apologyGiven)
  const [support, setSupport] = React.useState(r.supportOffered ?? '')
  const [changeReason, setChangeReason] = React.useState('')
  const [tried, setTried] = React.useState(false)
  const errors = [
    !toldOn && 'Choose the date',
    toldOn > today && 'The date can’t be in the future',
    !by && 'Choose who told them',
    !kind && 'Choose who was told',
    kind === 'REPRESENTATIVE' && !name.trim() && 'Add the name of the person told',
    !(facts && enquiries && apology) && 'All three must be covered (Regulation 20(3))',
    support.trim().length < 3 && 'Say what support was offered',
    editing && changeReason.trim().length < 3 && 'Say why this is changing',
  ].filter((e): e is string => Boolean(e))

  function submit() {
    setTried(true)
    if (errors.length) return
    save.mutate(
      {
        serviceUserId: entry.serviceUserId,
        step: 'told',
        body: {
          toldOn,
          toldByEmployeeId: by,
          toldPersonKind: kind,
          toldPersonName: kind === 'REPRESENTATIVE' ? name.trim() : null,
          toldRelationship: kind === 'REPRESENTATIVE' ? rel.trim() || null : null,
          factsExplained: facts,
          enquiriesExplained: enquiries,
          apologyGiven: apology,
          supportOffered: support.trim(),
          ...(editing ? { changeReason: changeReason.trim() } : {}),
        },
      },
      { onSuccess: onDone },
    )
  }

  const id = entry.serviceUserId
  return (
    <div className="space-y-3 rounded-md border border-border bg-background p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor={`told-on-${id}`}>
            Told on
            <Req />
          </label>
          <input id={`told-on-${id}`} type="date" className={inputClass} max={today} value={toldOn} onChange={(e) => setToldOn(e.target.value)} />
        </div>
        <div>
          <p className={labelClass}>
            Told by
            <Req />
          </p>
          <div className="mt-1">
            <StaffPicker id={`told-by-${id}`} value={by} onChange={setBy} initialName={r.toldBy?.name} />
          </div>
        </div>
      </div>
      <fieldset>
        <legend className={labelClass}>
          Who was told
          <Req />
        </legend>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <label className="inline-flex items-center gap-1.5">
            <input
              type="radio"
              name={`kind-${id}`}
              checked={kind === 'SERVICE_USER'}
              disabled={entry.deceased}
              onChange={() => setKind('SERVICE_USER')}
            />
            {entry.serviceUserName}
            {entry.deceased ? ' (has died)' : ''}
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input type="radio" name={`kind-${id}`} checked={kind === 'REPRESENTATIVE'} onChange={() => setKind('REPRESENTATIVE')} />
            Family member or representative
          </label>
        </div>
      </fieldset>
      {kind === 'REPRESENTATIVE' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor={`rep-${id}`}>
              Their name
              <Req />
            </label>
            <input id={`rep-${id}`} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor={`rel-${id}`}>
              Relationship
            </label>
            <input id={`rel-${id}`} className={inputClass} value={rel} onChange={(e) => setRel(e.target.value)} placeholder="e.g. daughter, attorney" />
          </div>
        </div>
      )}
      <fieldset className="space-y-1 text-sm">
        <legend className={labelClass}>
          Covered in the conversation
          <Req />
        </legend>
        <label className="flex items-center gap-2"><input type="checkbox" checked={facts} onChange={(e) => setFacts(e.target.checked)} /> Explained what happened (the facts known so far)</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={enquiries} onChange={(e) => setEnquiries(e.target.checked)} /> Explained what further enquiries will be made</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={apology} onChange={(e) => setApology(e.target.checked)} /> Gave an apology</label>
      </fieldset>
      <div>
        <label className={labelClass} htmlFor={`support-${id}`}>
          Support offered
          <Req />
        </label>
        <Textarea id={`support-${id}`} className="mt-1" rows={2} value={support} onChange={(e) => setSupport(e.target.value)} placeholder="e.g. named contact, follow-up meeting, advocacy" />
      </div>
      {editing && <ChangeReason id={`tcr-${id}`} value={changeReason} onChange={setChangeReason} />}
      {tried && errors.length > 0 && <p className="text-xs text-destructive dark:text-red-400">{errors[0]}</p>}
      <FormActions saving={save.isPending} onCancel={onDone} onSave={submit} />
    </div>
  )
}

function LetterForm({
  incidentId,
  entry,
  kind,
  hasInvestigation,
  onDone,
}: {
  incidentId: string
  entry: CandourPersonEntry
  kind: 'written' | 'results'
  hasInvestigation: boolean
  onDone: () => void
}) {
  const save = useSaveCandourStep(incidentId)
  const r = entry.record!
  const editing = kind === 'written' ? Boolean(r.writtenSentOn) : Boolean(r.resultsSharedOn || r.noFurtherEnquiriesReason)
  const today = operationalTodayIso()
  const [noFurther, setNoFurther] = React.useState(kind === 'results' && Boolean(r.noFurtherEnquiriesReason))
  const [date, setDate] = React.useState((kind === 'written' ? r.writtenSentOn : r.resultsSharedOn) ?? today)
  const [by, setBy] = React.useState(r.writtenBy?.id ?? '')
  const [method, setMethod] = React.useState((kind === 'written' ? r.writtenMethod : r.resultsMethod) ?? '')
  const [copy, setCopy] = React.useState(kind === 'written' ? r.writtenAttachment : r.resultsAttachment)
  const [reason, setReason] = React.useState(r.noFurtherEnquiriesReason ?? '')
  const [changeReason, setChangeReason] = React.useState('')
  const [tried, setTried] = React.useState(false)
  const minDate = kind === 'written' ? r.toldOn ?? undefined : r.writtenSentOn ?? undefined
  const errors = (
    noFurther
      ? [reason.trim().length < 3 && 'Say why there are no further enquiries']
      : [
          !date && 'Choose the date',
          date > today && 'The date can’t be in the future',
          minDate && date < minDate && `The date can’t be before ${day(minDate)}`,
          kind === 'written' && !by && 'Choose who sent it',
          !method && 'Choose how it was sent',
          !copy && 'Upload a copy (Regulation 20(6))',
        ]
  )
    .concat([editing && changeReason.trim().length < 3 && 'Say why this is changing'])
    .filter((e): e is string => Boolean(e))

  function submit() {
    setTried(true)
    if (errors.length) return
    const change = editing ? { changeReason: changeReason.trim() } : {}
    const body =
      kind === 'written'
        ? { writtenSentOn: date, writtenByEmployeeId: by, writtenMethod: method, writtenAttachmentId: copy!.id, ...change }
        : noFurther
          ? { noFurtherEnquiriesReason: reason.trim(), ...change }
          : { resultsSharedOn: date, resultsMethod: method, resultsAttachmentId: copy!.id, ...change }
    save.mutate({ serviceUserId: entry.serviceUserId, step: kind, body }, { onSuccess: onDone })
  }

  const id = `${kind}-${entry.serviceUserId}`
  return (
    <div className="space-y-3 rounded-md border border-border bg-background p-3">
      {kind === 'results' && !hasInvestigation && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={noFurther} onChange={(e) => setNoFurther(e.target.checked)} />
          There were no further enquiries (no investigation)
        </label>
      )}
      {noFurther ? (
        <div>
          <label className={labelClass} htmlFor={`nf-${id}`}>
            Why
            <Req />
          </label>
          <Textarea id={`nf-${id}`} className="mt-1" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor={`d-${id}`}>
                {kind === 'written' ? 'Sent on' : 'Shared on'}
                <Req />
              </label>
              <input id={`d-${id}`} type="date" className={inputClass} min={minDate} max={today} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor={`m-${id}`}>
                How
                <Req />
              </label>
              <select id={`m-${id}`} className={inputClass} value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="">Choose…</option>
                {CANDOUR_LETTER_METHOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {kind === 'written' && (
              <div className="sm:col-span-2">
                <p className={labelClass}>
                  Sent by
                  <Req />
                </p>
                <div className="mt-1">
                  <StaffPicker id={`by-${id}`} value={by} onChange={setBy} initialName={r.writtenBy?.name} />
                </div>
              </div>
            )}
          </div>
          <div>
            <p className={labelClass}>
              Copy of the {kind === 'written' ? 'letter or email' : 'results letter or email'}
              <Req />
            </p>
            <LetterUpload incidentId={incidentId} value={copy} onChange={setCopy} />
          </div>
        </>
      )}
      {editing && <ChangeReason id={`cr-${id}`} value={changeReason} onChange={setChangeReason} />}
      {tried && errors.length > 0 && <p className="text-xs text-destructive dark:text-red-400">{errors[0]}</p>}
      <FormActions saving={save.isPending} onCancel={onDone} onSave={submit} />
    </div>
  )
}

function UnablePanel({ incidentId, entry, canEdit }: { incidentId: string; entry: CandourPersonEntry; canEdit: boolean }) {
  const save = useSaveCandourStep(incidentId)
  const r = entry.record!
  const today = operationalTodayIso()
  const [reason, setReason] = React.useState(r.unableReason ?? '')
  const [note, setNote] = React.useState(r.unableNote ?? '')
  const [changeReason, setChangeReason] = React.useState('')
  const [editing, setEditing] = React.useState(!r.unableToNotify)
  const [attemptOn, setAttemptOn] = React.useState(today)
  const [attemptMethod, setAttemptMethod] = React.useState('')
  const [attemptBy, setAttemptBy] = React.useState('')
  const [attemptOutcome, setAttemptOutcome] = React.useState('')
  const id = entry.serviceUserId

  return (
    <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-50/50 p-3 dark:bg-amber-950/10">
      <p className="text-sm text-foreground">
        If the person can&apos;t be contacted or declines to speak, record why and every attempt to reach them
        (Regulation 20(5)).
      </p>
      {editing && canEdit ? (
        <div className="space-y-2">
          <div>
            <label className={labelClass} htmlFor={`ur-${id}`}>
              Why they could not be told
              <Req />
            </label>
            <select id={`ur-${id}`} className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Choose…</option>
              {CANDOUR_UNABLE_REASON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notes (optional)" />
          {r.unableToNotify && <ChangeReason id={`ucr-${id}`} value={changeReason} onChange={setChangeReason} />}
          <FormActions
            saving={save.isPending}
            onCancel={r.unableToNotify ? () => setEditing(false) : undefined}
            onSave={() =>
              reason &&
              save.mutate(
                {
                  serviceUserId: id,
                  step: 'unable',
                  body: {
                    unableToNotify: true,
                    unableReason: reason,
                    unableNote: note.trim() || null,
                    ...(r.unableToNotify ? { changeReason: changeReason.trim() } : {}),
                  },
                },
                { onSuccess: () => setEditing(false) },
              )
            }
          />
        </div>
      ) : (
        <Row label="Reason" value={`${optionLabel(CANDOUR_UNABLE_REASON_OPTIONS, r.unableReason)}${r.unableNote ? ` — ${r.unableNote}` : ''}`} />
      )}
      <div>
        <p className={labelClass}>Contact attempts ({r.attempts.length})</p>
        {r.attempts.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">None recorded yet — at least one is needed.</p>
        ) : (
          <ul className="mt-1 space-y-1 text-sm">
            {r.attempts.map((a) => (
              <li key={a.id}>
                {day(a.attemptedOn)} · {optionLabel(CANDOUR_ATTEMPT_METHOD_OPTIONS, a.method)}
                {a.by ? ` · ${a.by.name}` : ''} — {a.outcome}
              </li>
            ))}
          </ul>
        )}
      </div>
      {canEdit && r.unableToNotify && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[9rem_9rem_minmax(0,1fr)]">
          <input type="date" aria-label="Attempt date" className={inputClass} max={today} value={attemptOn} onChange={(e) => setAttemptOn(e.target.value)} />
          <select aria-label="How" className={inputClass} value={attemptMethod} onChange={(e) => setAttemptMethod(e.target.value)}>
            <option value="">How…</option>
            {CANDOUR_ATTEMPT_METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input aria-label="What happened" className={inputClass} value={attemptOutcome} onChange={(e) => setAttemptOutcome(e.target.value)} placeholder="What happened, e.g. no answer" />
          <div className="sm:col-span-2">
            <StaffPicker id={`ab-${id}`} value={attemptBy} onChange={setAttemptBy} />
          </div>
          <Button
            size="sm"
            className="mt-1"
            loading={save.isPending}
            disabled={!attemptMethod || attemptOutcome.trim().length < 2}
            onClick={() =>
              save.mutate(
                {
                  serviceUserId: id,
                  step: 'attempts',
                  body: { attemptedOn: attemptOn, method: attemptMethod, byEmployeeId: attemptBy || null, outcome: attemptOutcome.trim() },
                },
                {
                  onSuccess: () => {
                    setAttemptMethod('')
                    setAttemptOutcome('')
                  },
                },
              )
            }
          >
            Add attempt
          </Button>
        </div>
      )}
    </div>
  )
}

/** Undo "couldn't tell them" (the person can be reached after all) — needs a reason. */
function BackToTelling({ incidentId, serviceUserId, onDone }: { incidentId: string; serviceUserId: string; onDone: () => void }) {
  const save = useSaveCandourStep(incidentId)
  const [open, setOpen] = React.useState(false)
  const [reason, setReason] = React.useState('')
  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        They can be told after all
      </Button>
    )
  }
  return (
    <div className="space-y-2">
      <ChangeReason id={`back-${serviceUserId}`} value={reason} onChange={setReason} />
      <FormActions
        saving={save.isPending}
        onCancel={() => setOpen(false)}
        onSave={() =>
          reason.trim().length >= 3 &&
          save.mutate(
            { serviceUserId, step: 'unable', body: { unableToNotify: false, changeReason: reason.trim() } },
            { onSuccess: onDone },
          )
        }
      />
    </div>
  )
}

// --------------------------------------------------------------------------- per person

const dutyApplies = (entry: CandourPersonEntry) =>
  entry.record?.decision === 'YES' || entry.record?.decision === 'NOT_KNOWN'

const hasRecordedSteps = (entry: CandourPersonEntry) =>
  Boolean(entry.record && (entry.record.toldOn || entry.record.writtenSentOn || entry.record.unableToNotify))

/** The Duty of Candour tab is shown once anyone's answer is Yes / Not known (or steps exist). */
export function candourStepsTabVisible(panel: IncidentCandourPanel | null | undefined): boolean {
  return (panel?.records ?? []).some((e) => dutyApplies(e) || hasRecordedSteps(e))
}

function PersonHeader({ entry, action }: { entry: CandourPersonEntry; action?: React.ReactNode }) {
  const status = STATUS[entry.status]
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
        {entry.serviceUserName}
        <Badge size="sm" variant={status.variant}>
          {status.label}
        </Badge>
        {entry.overdue && (
          <Badge size="sm" variant="destructive">
            Overdue
          </Badge>
        )}
        {!entry.onIncident && (
          <Badge size="sm" variant="muted">
            No longer on this incident
          </Badge>
        )}
      </div>
      {action}
    </div>
  )
}

function DecisionRows({ entry }: { entry: CandourPersonEntry }) {
  const r = entry.record
  if (!r) return <p className="text-sm text-muted-foreground">Not decided yet.</p>
  return (
    <div className="space-y-1">
      <Row label="Decision" value={DECISION_LABEL[r.decision]} />
      {r.harmTypes.length > 0 && (
        <Row label="Harm" value={r.harmTypes.map((h) => optionLabel(CANDOUR_HARM_OPTIONS, h)).join('; ')} />
      )}
      {r.healthProfessionalName && (
        <Row label="Health professional" value={`${r.healthProfessionalName} (${r.healthProfessionalRole})`} />
      )}
      {r.decisionReason && <Row label="Reason" value={r.decisionReason} />}
    </div>
  )
}

/** Review tab: only the question — is this a Duty of Candour incident for this person? */
function DecisionCard({
  incidentId,
  entry,
  canDecide,
  onOpenSteps,
}: {
  incidentId: string
  entry: CandourPersonEntry
  canDecide: boolean
  onOpenSteps?: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const r = entry.record
  return (
    <li className="space-y-3 rounded-md border border-border p-3">
      <PersonHeader
        entry={entry}
        action={
          r && canDecide && !editing ? (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-4 w-4" /> Change decision
            </Button>
          ) : undefined
        }
      />
      {(!r || editing) && canDecide ? (
        <DecisionForm incidentId={incidentId} entry={entry} onDone={() => setEditing(false)} />
      ) : (
        <DecisionRows entry={entry} />
      )}
      {r && dutyApplies(entry) && !editing && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2 text-xs text-muted-foreground">
          Telling them, the letters and the results are recorded in the Duty of Candour tab.
          {onOpenSteps && (
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onOpenSteps}>
              Open Duty of Candour tab
            </Button>
          )}
        </div>
      )}
    </li>
  )
}

/** Duty of Candour tab: the steps (or "couldn't tell them") for one person. */
function StepsCard({
  incidentId,
  entry,
  hasInvestigation,
  canRecord,
  onOpenReview,
}: {
  incidentId: string
  entry: CandourPersonEntry
  hasInvestigation: boolean
  canRecord: boolean
  onOpenReview?: () => void
}) {
  const [editing, setEditing] = React.useState<'told' | 'written' | 'results' | null>(null)
  const [unableOpen, setUnableOpen] = React.useState(false)
  const r = entry.record!
  const applies = dutyApplies(entry)
  const showUnable = r.unableToNotify || unableOpen

  const stepHead = (n: number, title: string, done: boolean) => (
    <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
      {done ? <CheckCircle2 className="h-4 w-4 text-success" /> : <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border text-[10px]">{n}</span>}
      {title}
    </p>
  )

  return (
    <li className="space-y-3 rounded-md border border-border p-3">
      <PersonHeader
        entry={entry}
        action={
          onOpenReview ? (
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onOpenReview}>
              Decision: {DECISION_LABEL[r.decision]} · change in Review tab
            </Button>
          ) : undefined
        }
      />

      {!applies && (
        <div className="space-y-1 text-muted-foreground">
          <p className="text-xs">
            The decision is now &ldquo;{DECISION_LABEL[r.decision]}&rdquo;. Recorded before it changed (kept as history):
          </p>
          {r.toldOn && <Row label="Told in person" value={`${day(r.toldOn)} · ${r.toldBy?.name ?? ''}`} />}
          {r.writtenSentOn && <Row label="Letter sent" value={`${day(r.writtenSentOn)} · ${r.writtenAttachment?.name ?? ''}`} />}
          {r.unableToNotify && <Row label="Could not tell them" value={optionLabel(CANDOUR_UNABLE_REASON_OPTIONS, r.unableReason)} />}
        </div>
      )}

      {applies && (
        <div className="space-y-3">
          {entry.missing.length > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400">Still needed: {entry.missing.join('; ')}.</p>
          )}

          {!showUnable && (
            <>
              <div className="space-y-1">
                {stepHead(1, 'Told in person', Boolean(r.toldOn))}
                {editing === 'told' ? (
                  <ToldForm incidentId={incidentId} entry={entry} onDone={() => setEditing(null)} />
                ) : r.toldOn ? (
                  <div className="space-y-1 pl-6">
                    <Row label="When / by" value={`${day(r.toldOn)} · ${r.toldBy?.name ?? ''}`} />
                    <Row label="Told" value={r.toldPersonKind === 'REPRESENTATIVE' ? `${r.toldPersonName}${r.toldRelationship ? ` (${r.toldRelationship})` : ''}` : entry.serviceUserName} />
                    <Row label="Covered" value="What happened · further enquiries · apology" />
                    <Row label="Support offered" value={r.supportOffered} />
                    {canRecord && <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing('told')}>Change</Button>}
                  </div>
                ) : canRecord ? (
                  <div className="flex flex-wrap gap-2 pl-6">
                    <Button size="sm" variant="outline" onClick={() => setEditing('told')}>Record conversation</Button>
                    <Button size="sm" variant="ghost" onClick={() => setUnableOpen(true)}>Couldn&apos;t tell them</Button>
                  </div>
                ) : null}
              </div>

              <div className="space-y-1">
                {stepHead(2, 'Written follow-up', Boolean(r.writtenSentOn))}
                {editing === 'written' ? (
                  <LetterForm incidentId={incidentId} entry={entry} kind="written" hasInvestigation={hasInvestigation} onDone={() => setEditing(null)} />
                ) : r.writtenSentOn ? (
                  <div className="space-y-1 pl-6">
                    <Row label="Sent" value={`${day(r.writtenSentOn)} · ${optionLabel(CANDOUR_LETTER_METHOD_OPTIONS, r.writtenMethod)} · ${r.writtenBy?.name ?? ''}`} />
                    <Row label="Copy" value={r.writtenAttachment?.name ?? '—'} />
                    {canRecord && <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing('written')}>Change</Button>}
                  </div>
                ) : canRecord && r.toldOn ? (
                  <div className="pl-6"><Button size="sm" variant="outline" onClick={() => setEditing('written')}>Record letter</Button></div>
                ) : (
                  <p className="pl-6 text-xs text-muted-foreground">After telling them in person.</p>
                )}
              </div>

              <div className="space-y-1">
                {stepHead(3, 'Results of the enquiries shared', Boolean(r.resultsSharedOn || r.noFurtherEnquiriesReason))}
                {editing === 'results' ? (
                  <LetterForm incidentId={incidentId} entry={entry} kind="results" hasInvestigation={hasInvestigation} onDone={() => setEditing(null)} />
                ) : r.resultsSharedOn || r.noFurtherEnquiriesReason ? (
                  <div className="space-y-1 pl-6">
                    {r.noFurtherEnquiriesReason ? (
                      <Row label="No further enquiries" value={r.noFurtherEnquiriesReason} />
                    ) : (
                      <>
                        <Row label="Shared" value={`${day(r.resultsSharedOn)} · ${optionLabel(CANDOUR_LETTER_METHOD_OPTIONS, r.resultsMethod)}`} />
                        <Row label="Copy" value={r.resultsAttachment?.name ?? '—'} />
                      </>
                    )}
                    {canRecord && <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing('results')}>Change</Button>}
                  </div>
                ) : canRecord && r.writtenSentOn ? (
                  <div className="pl-6"><Button size="sm" variant="outline" onClick={() => setEditing('results')}>Record results</Button></div>
                ) : (
                  <p className="pl-6 text-xs text-muted-foreground">After the written follow-up, when the enquiries are finished.</p>
                )}
              </div>
            </>
          )}

          {showUnable && (
            <>
              <UnablePanel incidentId={incidentId} entry={entry} canEdit={canRecord} />
              {canRecord && !r.unableToNotify && (
                <Button size="sm" variant="ghost" onClick={() => setUnableOpen(false)}>Back to telling them</Button>
              )}
              {canRecord && r.unableToNotify && (
                <BackToTelling incidentId={incidentId} serviceUserId={entry.serviceUserId} onDone={() => setUnableOpen(false)} />
              )}
            </>
          )}
        </div>
      )}
    </li>
  )
}

function CandourHeading({ incidentId, children }: { incidentId: string; children: React.ReactNode }) {
  return (
    <>
      <h3 id={`candour-${incidentId}`} className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Scale className="h-4 w-4" /> Duty of Candour
      </h3>
      <p className="mb-3 mt-0.5 text-xs text-muted-foreground">{children}</p>
    </>
  )
}

/**
 * Review tab: is this a Duty of Candour incident (Regulation 20) for each affected service user?
 * The decision only — the steps are recorded in the Duty of Candour tab.
 */
export function IncidentCandourDecisionSection({
  incidentId,
  panel,
  isClosed,
  onOpenSteps,
}: {
  incidentId: string
  panel: IncidentCandourPanel | null | undefined
  isClosed: boolean
  onOpenSteps?: () => void
}) {
  const can = useAuthStore((s) => s.can)
  if (!panel) return null
  const canDecide = !isClosed && can('incidents.review')
  return (
    <section className="rounded-lg border border-border p-3 sm:p-4" aria-labelledby={`candour-${incidentId}`}>
      <CandourHeading incidentId={incidentId}>
        Is this a Duty of Candour incident? It applies when an unexpected incident causes serious harm (Regulation 20) —
        decide with a health professional.
      </CandourHeading>
      {!panel.applies && panel.records.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not applicable — no service user was affected.</p>
      ) : (
        <>
          {panel.hintReasons.length > 0 && panel.records.some((r) => r.status === 'NOT_DECIDED') && (
            <p className="mb-3 flex items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Likely Duty of Candour: {panel.hintReasons.join(', ')}. Decide with a health professional.
            </p>
          )}
          <ul className="space-y-3">
            {panel.records.map((entry) => (
              <DecisionCard
                key={entry.serviceUserId}
                incidentId={incidentId}
                entry={entry}
                canDecide={canDecide}
                onOpenSteps={onOpenSteps}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

/**
 * Duty of Candour tab: for each person it applies to — told in person, written follow-up, results
 * shared, or the attempts made when the person can't be reached. Filled in as things happen.
 */
export function IncidentCandourStepsSection({
  incidentId,
  panel,
  isClosed,
  onOpenReview,
}: {
  incidentId: string
  panel: IncidentCandourPanel | null | undefined
  isClosed: boolean
  onOpenReview?: () => void
}) {
  const can = useAuthStore((s) => s.can)
  if (!panel) return null
  const canRecord = !isClosed && (can('incidents.review') || can('incidents.close'))
  const people = panel.records.filter((e) => e.record && (dutyApplies(e) || hasRecordedSteps(e)))
  return (
    <section className="rounded-lg border border-border p-3 sm:p-4" aria-labelledby={`candour-${incidentId}`}>
      <CandourHeading incidentId={incidentId}>
        Tell the person or their family in person as soon as reasonably practicable, apologise, follow up in writing and
        share the results (Regulation 20). Record each step when it happens.
        {panel.overdueDays != null ? ` Flagged overdue after ${panel.overdueDays} days without telling them.` : ''}
      </CandourHeading>
      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">Duty of Candour doesn&apos;t apply to anyone on this incident.</p>
      ) : (
        <ul className="space-y-3">
          {people.map((entry) => (
            <StepsCard
              key={entry.serviceUserId}
              incidentId={incidentId}
              entry={entry}
              hasInvestigation={panel.hasInvestigation}
              canRecord={canRecord}
              onOpenReview={onOpenReview}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

/** Short summary for the Outcome & close tab. */
export function IncidentCandourSummary({
  panel,
  onOpen,
}: {
  panel: IncidentCandourPanel | null | undefined
  onOpen?: () => void
}) {
  if (!panel || (!panel.applies && panel.records.length === 0)) return null
  const people = panel.records.filter((r) => r.onIncident)
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Scale className="h-3.5 w-3.5" /> Duty of Candour
        </p>
        {onOpen && (
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onOpen}>
            Open
          </Button>
        )}
      </div>
      <ul className="mt-1 space-y-1 text-sm">
        {people.map((p) => (
          <li key={p.serviceUserId} className="flex flex-wrap items-center gap-1.5">
            {p.serviceUserName}
            <Badge size="sm" variant={STATUS[p.status].variant}>
              {STATUS[p.status].label}
            </Badge>
            {p.overdue && <Badge size="sm" variant="destructive">Overdue</Badge>}
            {p.missing.length > 0 && <span className="text-xs text-muted-foreground">— still needed: {p.missing.join('; ')}</span>}
          </li>
        ))}
      </ul>
      {people.some((p) => p.status === 'NOT_DECIDED' || p.status === 'NOT_KNOWN') && (
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Decide Duty of Candour for everyone before closing (Review tab).</p>
      )}
    </div>
  )
}
