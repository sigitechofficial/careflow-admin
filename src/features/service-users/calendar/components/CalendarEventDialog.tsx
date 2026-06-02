import * as React from 'react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useAuthStore } from '@/features/auth/store'
import type { ServiceUserCalendarEvent } from '../types/service-user-calendar.types'
import { useCalendarEventTypes } from '../hooks/useCalendarEventTypes'
import { useCalendarEventMutations } from '../hooks/useServiceUserCalendarEvents'
import { useServiceUsersForCalendar } from '../hooks/useServiceUsersForCalendar'
import {
  CalendarEventForm,
  CalendarEventFormActions,
  eventToFormValues,
  formValuesToPayload,
  type CalendarEventFormValues,
} from './CalendarEventForm'

export function CalendarEventDialog({
  open,
  onOpenChange,
  fixedServiceUserId,
  event,
  defaultDate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set (profile tab), service user is fixed. Global calendar leaves this unset. */
  fixedServiceUserId?: string
  event?: ServiceUserCalendarEvent | null
  defaultDate?: string
}) {
  const can = useAuthStore(s => s.can)
  const canCreate = can('service_users.calendar.create')
  const canUpdate = can('service_users.calendar.update')
  const canDelete = can('service_users.calendar.delete')
  const readOnly = event ? !canUpdate : !canCreate
  const showServiceUserPicker = !fixedServiceUserId && !event

  const { data: eventTypes = [] } = useCalendarEventTypes()
  const { data: serviceUserOptions = [], isLoading: loadingServiceUsers } = useServiceUsersForCalendar(
    open && showServiceUserPicker,
  )

  const [pickedServiceUserId, setPickedServiceUserId] = React.useState('')
  const activeServiceUserId = fixedServiceUserId ?? event?.serviceUserId ?? pickedServiceUserId

  const { create, update, remove } = useCalendarEventMutations(activeServiceUserId || '__pending__')

  const [values, setValues] = React.useState<CalendarEventFormValues>(() => {
    const base = eventToFormValues(event)
    if (!event && defaultDate) base.startDate = defaultDate
    return base
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (!open) return
    const base = eventToFormValues(event)
    if (!event && defaultDate) base.startDate = defaultDate
    if (!event && !base.eventTypeId) {
      const customerType = eventTypes.find(t => t.code === 'CUSTOMER_EVENT')
      if (customerType) base.eventTypeId = customerType.id
    }
    setValues(base)
    setErrors({})
    if (fixedServiceUserId) setPickedServiceUserId(fixedServiceUserId)
    else if (!event) setPickedServiceUserId('')
  }, [open, event, defaultDate, eventTypes, fixedServiceUserId])

  const validate = () => {
    const e: Record<string, string> = {}
    if (showServiceUserPicker && !pickedServiceUserId) {
      e.serviceUserId = 'Service user is required'
    }
    if (!activeServiceUserId) e.serviceUserId = 'Service user is required'
    if (!values.title.trim()) e.title = 'Title is required'
    if (!values.startDate) e.startDate = 'Start date is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate() || !activeServiceUserId) return
    const payload = formValuesToPayload(values)
    if (event) {
      await update.mutateAsync({ eventId: event.id, payload })
    } else {
      await create.mutateAsync(payload)
    }
    onOpenChange(false)
  }

  const handleDelete = async () => {
    if (!event || !canDelete || !activeServiceUserId) return
    if (!window.confirm('Delete this calendar event?')) return
    await remove.mutateAsync(event.id)
    onOpenChange(false)
  }

  const loading = create.isPending || update.isPending || remove.isPending
  const createTitle = showServiceUserPicker ? 'Add Service User Event' : 'Add Customer Event'
  const editTitle = showServiceUserPicker ? 'Edit Service User Event' : 'Edit customer event'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] max-w-lg flex-col overflow-hidden p-0"
        data-testid="calendar-event-dialog"
      >
        <DialogHeader>
          <DialogTitle>{event ? editTitle : createTitle}</DialogTitle>
          <DialogDescription>
            {defaultDate && !event ? (
              <span>
                Date <strong>{defaultDate}</strong> is prefilled. Choose service user, event type, time, and
                notes.
              </span>
            ) : (
              'Appointments, birthdays, reviews, and reminders — not scheduling visits.'
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="overflow-y-auto">
          <CalendarEventForm
            values={values}
            onChange={setValues}
            eventTypes={eventTypes}
            errors={errors}
            readOnly={readOnly}
            showServiceUserPicker={showServiceUserPicker}
            serviceUserId={pickedServiceUserId}
            serviceUserOptions={serviceUserOptions}
            loadingServiceUsers={loadingServiceUsers}
            onServiceUserChange={setPickedServiceUserId}
          />
        </DialogBody>
        <DialogFooter className="flex-wrap justify-between gap-3 sm:justify-between">
          {event && canDelete ? (
            <button
              type="button"
              className="text-sm text-destructive hover:underline"
              onClick={() => void handleDelete()}
              disabled={loading}
            >
              Delete event
            </button>
          ) : (
            <span className="hidden sm:block" />
          )}
          {!readOnly ? (
            <CalendarEventFormActions
              onCancel={() => onOpenChange(false)}
              onSubmit={() => void handleSave()}
              submitLabel={event ? 'Save changes' : 'Save event'}
              loading={loading}
              canSubmit={!!activeServiceUserId || !showServiceUserPicker}
              compact
            />
          ) : (
            <CalendarEventFormActions
              onCancel={() => onOpenChange(false)}
              onSubmit={() => onOpenChange(false)}
              submitLabel="Close"
              compact
            />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
