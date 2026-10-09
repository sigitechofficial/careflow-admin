import * as React from 'react'
import { ApiError } from '@/shared/api/api-client'
import { toastSuccess } from '@/shared/lib/toast'
import {
  isoToOrgDatetimeLocal,
  nowOrgDatetimeLocal,
  orgDatetimeLocalToIso,
} from '@/shared/lib/operational-day.util'
import { useServiceUserLocations } from '@/features/settings/hooks/useLocationManagement'
import {
  IncidentStaffMultiSelect,
  type PickedStaff,
} from '@/features/incidents/components/IncidentStaffMultiSelect'
import { PickedChips } from '@/features/incidents/components/PickedChips'
import { useCreateFeedback, useUpdateFeedback } from '@/features/complaints/hooks/useComplaints'
import type {
  ComplaintSeverity,
  FeedbackChannel,
  FeedbackDetail,
  FeedbackFromKind,
  FeedbackPersonRef,
  FeedbackType,
} from '@/features/complaints/types'
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_SEVERITY_LABEL,
  COMPLIMENT_CATEGORIES,
  FEEDBACK_CHANNEL_LABEL,
  FEEDBACK_FROM_LABEL,
} from '@/features/complaints/feedback-labels'
import { EmployeePicker, ServiceUserPicker } from '@/features/complaints/components/FeedbackPickers'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'

export const feedbackSelectClass =
  'h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
export const feedbackTextareaClass =
  'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

export function FeedbackField({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className ?? 'space-y-1.5'}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/** Record a complaint / compliment, or edit an existing one. */
export function FeedbackFormDialog({
  open,
  onOpenChange,
  type,
  editing,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: FeedbackType
  editing?: FeedbackDetail | null
  onCreated?: (id: string) => void
}) {
  const isComplaint = (editing?.type ?? type) === 'COMPLAINT'
  const createMutation = useCreateFeedback()
  const updateMutation = useUpdateFeedback(editing?.id ?? '')
  const saving = createMutation.isPending || updateMutation.isPending
  const locationsQuery = useServiceUserLocations(open)
  const branches = React.useMemo(
    () => (locationsQuery.data?.zones ?? []).flatMap(z => z.branches.map(b => ({ id: b.id, name: b.name }))),
    [locationsQuery.data],
  )

  const [receivedAt, setReceivedAt] = React.useState('')
  const [channel, setChannel] = React.useState<FeedbackChannel>('PHONE')
  const [fromKind, setFromKind] = React.useState<FeedbackFromKind>('FAMILY')
  const [fromName, setFromName] = React.useState('')
  const [fromContact, setFromContact] = React.useState('')
  const [fromServiceUser, setFromServiceUser] = React.useState<FeedbackPersonRef | null>(null)
  const [fromEmployee, setFromEmployee] = React.useState<FeedbackPersonRef | null>(null)
  const [aboutServiceUser, setAboutServiceUser] = React.useState<FeedbackPersonRef | null>(null)
  const [aboutStaff, setAboutStaff] = React.useState<PickedStaff[]>([])
  const [locationId, setLocationId] = React.useState('')
  const [subject, setSubject] = React.useState('')
  const [category, setCategory] = React.useState('')
  const [details, setDetails] = React.useState('')
  const [severity, setSeverity] = React.useState<ComplaintSeverity>('LOW')
  const [desiredOutcome, setDesiredOutcome] = React.useState('')
  const [handler, setHandler] = React.useState<FeedbackPersonRef | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setReceivedAt(editing ? isoToOrgDatetimeLocal(editing.receivedAt) : nowOrgDatetimeLocal())
    setChannel(editing?.channel ?? (isComplaint ? 'PHONE' : 'LETTER'))
    setFromKind(editing?.fromKind ?? 'FAMILY')
    setFromName(editing?.fromName ?? '')
    setFromContact(editing?.fromContact ?? '')
    setFromServiceUser(editing?.fromServiceUser ?? null)
    setFromEmployee(editing?.fromEmployee ?? null)
    setAboutServiceUser(editing?.aboutServiceUser ?? null)
    setAboutStaff(editing?.aboutEmployees ?? [])
    setLocationId(editing?.location?.id ?? '')
    setSubject(editing?.subject ?? '')
    setCategory(editing?.category ?? '')
    setDetails(editing?.details ?? '')
    setSeverity(editing?.severity ?? 'LOW')
    setDesiredOutcome(editing?.desiredOutcome ?? '')
    setHandler(editing?.handler ?? null)
    setError(null)
  }, [open, editing, isComplaint])

  const linkedServiceUser = aboutServiceUser ?? (fromKind === 'SERVICE_USER' ? fromServiceUser : null)
  const categories = isComplaint ? COMPLAINT_CATEGORIES : COMPLIMENT_CATEGORIES
  const categoryOptions = category && !categories.includes(category) ? [category, ...categories] : categories

  const onSave = async () => {
    if (!receivedAt) return setError('Received date and time are required.')
    if (fromKind === 'SERVICE_USER' && !fromServiceUser) return setError('Select the service user it came from.')
    if (fromKind === 'STAFF' && !fromEmployee) return setError('Select the staff member it came from.')
    if (!['SERVICE_USER', 'STAFF', 'ANONYMOUS'].includes(fromKind) && !fromName.trim()) {
      return setError('Enter the name of the person it came from.')
    }
    if (!subject.trim()) return setError('Subject is required.')
    if (!details.trim()) return setError('Details are required.')
    const body = {
      receivedAt: orgDatetimeLocalToIso(receivedAt),
      channel,
      fromKind,
      fromName: fromKind === 'ANONYMOUS' ? '' : fromName.trim(),
      fromContact: fromKind === 'ANONYMOUS' ? '' : fromContact.trim(),
      fromServiceUserId: fromKind === 'SERVICE_USER' ? (fromServiceUser?.id ?? null) : null,
      fromEmployeeId: fromKind === 'STAFF' ? (fromEmployee?.id ?? null) : null,
      aboutServiceUserId: aboutServiceUser?.id ?? null,
      aboutEmployeeIds: aboutStaff.map(s => s.id),
      locationId: linkedServiceUser ? null : locationId || null,
      subject: subject.trim(),
      details: details.trim(),
      category,
      ...(isComplaint
        ? { severity, desiredOutcome: desiredOutcome.trim(), handlerEmployeeId: handler?.id ?? null }
        : {}),
    }
    setError(null)
    try {
      if (editing) {
        await updateMutation.mutateAsync(body)
        toastSuccess('Saved', `${editing.referenceNumber} updated.`)
      } else {
        const created = await createMutation.mutateAsync({ ...body, type })
        toastSuccess(isComplaint ? 'Complaint recorded' : 'Compliment recorded', created.referenceNumber)
        onCreated?.(created.id)
      }
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed.')
    }
  }

  const title = editing
    ? `Edit ${editing.referenceNumber}`
    : isComplaint
      ? 'Record complaint'
      : 'Record compliment'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-5" data-testid="feedback-form">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Received</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <FeedbackField label="Date & time received *">
                <Input
                  type="datetime-local"
                  value={receivedAt}
                  onChange={e => setReceivedAt(e.target.value)}
                  data-testid="feedback-received-at"
                />
              </FeedbackField>
              <FeedbackField label="How it was received">
                <select
                  className={feedbackSelectClass}
                  value={channel}
                  onChange={e => setChannel(e.target.value as FeedbackChannel)}
                  data-testid="feedback-channel"
                >
                  {Object.entries(FEEDBACK_CHANNEL_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </FeedbackField>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">From</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <FeedbackField label="Received from *">
                <select
                  className={feedbackSelectClass}
                  value={fromKind}
                  onChange={e => setFromKind(e.target.value as FeedbackFromKind)}
                  data-testid="feedback-from-kind"
                >
                  {Object.entries(FEEDBACK_FROM_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </FeedbackField>
              {fromKind === 'SERVICE_USER' ? (
                <FeedbackField label="Service user *">
                  <ServiceUserPicker value={fromServiceUser} onChange={setFromServiceUser} testId="feedback-from-su" />
                </FeedbackField>
              ) : fromKind === 'STAFF' ? (
                <FeedbackField label="Staff member *">
                  <EmployeePicker value={fromEmployee} onChange={setFromEmployee} testId="feedback-from-employee" />
                </FeedbackField>
              ) : fromKind !== 'ANONYMOUS' ? (
                <FeedbackField label="Name *">
                  <Input
                    value={fromName}
                    onChange={e => setFromName(e.target.value)}
                    placeholder="e.g. Jane Smith (daughter)"
                    data-testid="feedback-from-name"
                  />
                </FeedbackField>
              ) : (
                <p className="self-end pb-2 text-xs text-muted-foreground">
                  No name or contact details are kept for anonymous {isComplaint ? 'complaints' : 'compliments'}.
                </p>
              )}
              {fromKind !== 'ANONYMOUS' ? (
                <FeedbackField label="Contact for reply" className="space-y-1.5 sm:col-span-2">
                  <Input
                    value={fromContact}
                    onChange={e => setFromContact(e.target.value)}
                    placeholder="Phone, email or address"
                  />
                </FeedbackField>
              ) : null}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">About</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <FeedbackField label="Service user">
                <ServiceUserPicker
                  value={aboutServiceUser}
                  onChange={setAboutServiceUser}
                  placeholder="Optional"
                  testId="feedback-about-su"
                />
              </FeedbackField>
              <FeedbackField label="Staff">
                <IncidentStaffMultiSelect selected={aboutStaff} onChange={setAboutStaff} placeholder="Optional" />
                <PickedChips
                  items={aboutStaff.map(s => ({ id: s.id, label: s.name }))}
                  onRemove={id => setAboutStaff(prev => prev.filter(s => s.id !== id))}
                />
              </FeedbackField>
              {!linkedServiceUser ? (
                <FeedbackField label="Branch" hint="Taken from the service user when one is selected.">
                  <select
                    className={feedbackSelectClass}
                    value={locationId}
                    onChange={e => setLocationId(e.target.value)}
                    data-testid="feedback-branch"
                  >
                    <option value="">— Not set —</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </FeedbackField>
              ) : null}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">{isComplaint ? 'Complaint' : 'Compliment'}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <FeedbackField label="Subject *" className="space-y-1.5 sm:col-span-2">
                <Input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder={isComplaint ? 'e.g. Carer arrived 2 hours late' : 'e.g. Thank you card for Sarah'}
                  data-testid="feedback-subject"
                />
              </FeedbackField>
              <FeedbackField label="Category">
                <select
                  className={feedbackSelectClass}
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  data-testid="feedback-category"
                >
                  <option value="">— Select —</option>
                  {categoryOptions.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </FeedbackField>
              {isComplaint ? (
                <FeedbackField label="Severity">
                  <select
                    className={feedbackSelectClass}
                    value={severity}
                    onChange={e => setSeverity(e.target.value as ComplaintSeverity)}
                    data-testid="feedback-severity"
                  >
                    {Object.entries(COMPLAINT_SEVERITY_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </FeedbackField>
              ) : null}
              <FeedbackField label="Details *" className="space-y-1.5 sm:col-span-2">
                <textarea
                  rows={4}
                  className={feedbackTextareaClass}
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  placeholder={isComplaint ? 'What happened, in their words' : 'What they said'}
                  data-testid="feedback-details"
                />
              </FeedbackField>
              {isComplaint ? (
                <>
                  <FeedbackField label="What they would like to happen" className="space-y-1.5 sm:col-span-2">
                    <textarea
                      rows={2}
                      className={feedbackTextareaClass}
                      value={desiredOutcome}
                      onChange={e => setDesiredOutcome(e.target.value)}
                      placeholder="e.g. Apology and a regular carer"
                    />
                  </FeedbackField>
                  <FeedbackField label="Handled by" hint="The manager investigating and responding.">
                    <EmployeePicker value={handler} onChange={setHandler} placeholder="Optional" testId="feedback-handler" />
                  </FeedbackField>
                </>
              ) : null}
            </div>
            {isComplaint && !editing ? (
              <p className="text-xs text-muted-foreground">
                Targets: acknowledge within 3 working days and send a full response within 20 working days of receipt.
              </p>
            ) : null}
          </section>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void onSave()} data-testid="feedback-save">
            {saving ? 'Saving…' : editing ? 'Save' : 'Record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
