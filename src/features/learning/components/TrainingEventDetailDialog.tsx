import * as React from 'react'
import { Ban, CalendarClock, Loader2, MapPin, UserPlus, Users, Video, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Combobox } from '@/shared/ui/combobox'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { InlineConfirm } from '@/shared/ui/inline-confirm'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { ApiError } from '@/shared/api/api-client'
import { formatOrganisationDate, formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
import { useAuthStore } from '@/features/auth/store'
import {
  useAddLearningTrainingEventAttendee,
  useCancelLearningTrainingEvent,
  useLearningEligibleAttendees,
  useLearningTrainingEvent,
  useRemoveLearningTrainingEventAttendee,
  useUpdateLearningTrainingEventAttendee,
} from '@/features/learning/hooks/useLearning'
import type {
  LearningAttendanceStatus,
  LearningTrainingEventAttendee,
} from '@/features/learning/types/learning.types'
import { LearningStatusBadge } from '@/features/learning/components/LearningStatusBadge'
import { trainingEventDisplayStatus } from '@/features/learning/lib/training-event-status'

type Props = {
  eventId: string | null
  onOpenChange: (open: boolean) => void
}

const ATTENDANCE_LABEL: Record<string, string> = {
  INVITED: 'Invited',
  BOOKED: 'Booked',
  WAITLISTED: 'Waiting list',
  ATTENDED: 'Attended',
  PARTIALLY_ATTENDED: 'Partly attended',
  ABSENT: 'Absent',
  CANCELLED: 'Cancelled',
}

const MARKS: Array<{ value: LearningAttendanceStatus; label: string }> = [
  { value: 'ATTENDED', label: 'Attended' },
  { value: 'PARTIALLY_ATTENDED', label: 'Partly' },
  { value: 'ABSENT', label: 'Absent' },
]

const err = (e: unknown, fallback: string) => toastApiError(e instanceof ApiError ? e : new Error(fallback))

/** One training session: details, booked carers, attendance (13 Nov 2026). */
export function TrainingEventDetailDialog({ eventId, onOpenChange }: Props) {
  const canManage = useAuthStore(s => s.can('learning.training_events.manage'))
  const eventQuery = useLearningTrainingEvent(eventId)
  const event = eventQuery.data
  const eligibleQuery = useLearningEligibleAttendees(canManage ? eventId : null)
  const addMut = useAddLearningTrainingEventAttendee()
  const updateMut = useUpdateLearningTrainingEventAttendee()
  const removeMut = useRemoveLearningTrainingEventAttendee()
  const cancelMut = useCancelLearningTrainingEvent()
  const [pick, setPick] = React.useState('')
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const closed = event?.status === 'CANCELLED' || event?.status === 'COMPLETED'
  const started = event ? new Date(event.startAt).getTime() <= Date.now() : false
  const attendees = event?.attendees ?? []
  const booked = attendees.filter(a => a.bookingStatus !== 'CANCELLED')
  const cantAttend = attendees.filter(a => a.bookingStatus === 'CANCELLED')

  const refresh = () => {
    void eventQuery.refetch()
    void eligibleQuery.refetch()
  }

  const onAdd = async () => {
    if (!eventId || !pick) return
    try {
      await addMut.mutateAsync({ id: eventId, employeeId: pick })
      toastSuccess('Carer booked. They get a notification in the app.')
      setPick('')
      refresh()
    } catch (e) {
      err(e, 'Could not book the carer')
    }
  }

  const onMark = async (a: LearningTrainingEventAttendee, status: LearningAttendanceStatus) => {
    setBusyId(a.id)
    try {
      await updateMut.mutateAsync({ attendeeId: a.id, body: { attendanceStatus: status } })
      toastSuccess(`${a.employeeName ?? 'Carer'}: ${(ATTENDANCE_LABEL[status] ?? status).toLowerCase()}`)
      refresh()
    } catch (e) {
      err(e, 'Could not save attendance')
    } finally {
      setBusyId(null)
    }
  }

  const onRemove = async (a: LearningTrainingEventAttendee) => {
    setBusyId(a.id)
    try {
      await removeMut.mutateAsync(a.id)
      toastSuccess('Removed from the session')
      refresh()
    } catch (e) {
      err(e, 'Could not remove the carer')
    } finally {
      setBusyId(null)
    }
  }

  const onCancelSession = async () => {
    if (!eventId) return
    try {
      await cancelMut.mutateAsync(eventId)
      toastSuccess('Session cancelled. Booked carers get a notification.')
      refresh()
    } catch (e) {
      err(e, 'Could not cancel the session')
    }
  }

  const eligibleOptions = (eligibleQuery.data ?? []).map(c => ({
    value: c.employeeId,
    label: c.employeeName,
    description: [
      c.dueAt ? `Due ${formatOrganisationDate(c.dueAt)}` : 'No due date',
      c.bookedOnOtherSession ? 'Already booked on another session' : null,
    ]
      .filter(Boolean)
      .join(' · '),
  }))
  const full = event?.capacity != null && booked.filter(a => a.bookingStatus === 'BOOKED').length >= event.capacity

  return (
    <Dialog open={!!eventId} onOpenChange={onOpenChange}>
      <DialogContent size="lg" data-testid="training-event-detail">
        <DialogHeader>
          <DialogTitle>{event?.title ?? 'Training session'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-5">
          {eventQuery.isLoading || !event ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm sm:grid-cols-2">
                <div className="flex items-start gap-2">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{formatOrganisationDateTime(event.startAt)}</div>
                    <div className="text-muted-foreground">to {formatOrganisationDateTime(event.endAt)}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  {event.virtualMeetingUrl && !event.location ? (
                    <Video className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate">{event.location || (event.virtualMeetingUrl ? 'Online meeting' : 'No location set')}</div>
                    {event.virtualMeetingUrl ? (
                      <a
                        href={event.virtualMeetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-primary hover:underline"
                      >
                        {event.virtualMeetingUrl}
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="text-muted-foreground">
                  Course: <span className="font-medium text-foreground">{event.course?.title ?? '—'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                  <LearningStatusBadge status={trainingEventDisplayStatus(event)} size="sm" />
                  {event.trainerName ? <span>Trainer: {event.trainerName}</span> : null}
                  <span>
                    <Users className="mr-1 inline h-3.5 w-3.5" />
                    {booked.length}
                    {event.capacity != null ? ` of ${event.capacity}` : ''} booked
                  </span>
                </div>
              </div>

              {canManage && !closed ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Book a carer</div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Combobox
                      className="flex-1"
                      options={eligibleOptions}
                      value={pick}
                      onChange={setPick}
                      loading={eligibleQuery.isLoading}
                      placeholder={full ? 'This session is full' : 'Choose a carer with this course assigned'}
                      searchPlaceholder="Search carers…"
                      emptyText="No carers with this course assigned are left to book"
                      disabled={full || addMut.isPending}
                    />
                    <Button onClick={() => void onAdd()} disabled={!pick || addMut.isPending || full}>
                      {addMut.isPending ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="mr-1 h-4 w-4" />
                      )}
                      Book
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Booked carers ({booked.length})</div>
                  {canManage && !closed && !started && booked.length ? (
                    <span className="text-xs text-muted-foreground">Attendance opens when the session starts</span>
                  ) : null}
                </div>
                {booked.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                    No carers booked yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {booked.map(a => (
                      <li key={a.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{a.employeeName}</div>
                          <div className="text-xs text-muted-foreground">
                            {ATTENDANCE_LABEL[a.attendanceStatus ?? 'BOOKED']}
                            {a.assignmentStatus ? ` · Course: ${a.assignmentStatus.replace(/_/g, ' ').toLowerCase()}` : ''}
                          </div>
                        </div>
                        {canManage && event.status !== 'CANCELLED' ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {started
                              ? MARKS.map(m => (
                                  <Button
                                    key={m.value}
                                    size="sm"
                                    variant={a.attendanceStatus === m.value ? 'default' : 'outline'}
                                    disabled={busyId === a.id}
                                    onClick={() => void onMark(a, m.value)}
                                    data-testid={`mark-${m.value}`}
                                  >
                                    {m.label}
                                  </Button>
                                ))
                              : null}
                            {a.attendanceStatus !== 'ATTENDED' ? (
                              <InlineConfirm
                                title={`Remove ${a.employeeName ?? 'this carer'} from the session?`}
                                confirmLabel="Remove"
                                onConfirm={() => void onRemove(a)}
                              >
                                <Button size="sm" variant="ghost" disabled={busyId === a.id} aria-label="Remove from session">
                                  <X className="h-4 w-4" />
                                </Button>
                              </InlineConfirm>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {cantAttend.length ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    Can&apos;t attend ({cantAttend.length})
                  </div>
                  <ul className="divide-y divide-border rounded-lg border border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
                    {cantAttend.map(a => (
                      <li key={a.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{a.employeeName}</div>
                          <div className="text-xs text-muted-foreground">
                            {a.cantAttendReason ? `“${a.cantAttendReason}”` : 'No reason given'}
                            {a.cantAttendAt ? ` · ${formatOrganisationDateTime(a.cantAttendAt)}` : ''}
                          </div>
                        </div>
                        {canManage ? (
                          <Button size="sm" variant="ghost" disabled={busyId === a.id} onClick={() => void onRemove(a)}>
                            Remove
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">Book them on another session for this course.</p>
                </div>
              ) : null}
            </>
          )}
        </DialogBody>
        <DialogFooter>
          {canManage && event && !closed ? (
            <InlineConfirm
              title="Cancel this session?"
              description="Booked carers get a notification."
              confirmLabel="Cancel session"
              onConfirm={() => void onCancelSession()}
            >
              <Button variant="outline" className="mr-auto text-destructive hover:text-destructive" disabled={cancelMut.isPending}>
                <Ban className="mr-1 h-4 w-4" />
                Cancel session
              </Button>
            </InlineConfirm>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
