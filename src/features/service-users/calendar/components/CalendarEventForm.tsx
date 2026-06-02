import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label, Textarea } from '@/shared/ui/form-field'
import { Checkbox } from '@/shared/ui/toggle-controls'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import type { CalendarEventTypeRow, ServiceUserCalendarEvent } from '../types/service-user-calendar.types'
import type { ServiceUserPickerOption } from '../hooks/useServiceUsersForCalendar'

export type CalendarEventFormValues = {
  title: string
  eventTypeId: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  allDay: boolean
  location: string
  description: string
  status: string
  reminderBeforeMinutes: string
  notifyKeyWorker: boolean
  notifyNamedNurse: boolean
  notifyManager: boolean
}

export function eventToFormValues(ev?: ServiceUserCalendarEvent | null): CalendarEventFormValues {
  const start = ev?.startDateTime ? new Date(ev.startDateTime) : new Date()
  const end = ev?.endDateTime ? new Date(ev.endDateTime) : null
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    title: ev?.title ?? '',
    eventTypeId: ev?.eventTypeId ?? '',
    startDate: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    endDate: end
      ? `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`
      : '',
    endTime: end ? `${pad(end.getHours())}:${pad(end.getMinutes())}` : '',
    allDay: ev?.allDay ?? false,
    location: ev?.location ?? '',
    description: ev?.description ?? '',
    status: ev?.status ?? 'SCHEDULED',
    reminderBeforeMinutes: ev?.reminderBeforeMinutes != null ? String(ev.reminderBeforeMinutes) : '',
    notifyKeyWorker: ev?.notifyKeyWorker ?? false,
    notifyNamedNurse: ev?.notifyNamedNurse ?? false,
    notifyManager: ev?.notifyManager ?? false,
  }
}

export function formValuesToPayload(values: CalendarEventFormValues) {
  const startDateTime = values.allDay
    ? new Date(`${values.startDate}T00:00:00`).toISOString()
    : new Date(`${values.startDate}T${values.startTime || '09:00'}`).toISOString()
  let endDateTime: string | undefined
  if (values.endDate) {
    endDateTime = values.allDay
      ? new Date(`${values.endDate}T23:59:59`).toISOString()
      : new Date(`${values.endDate}T${values.endTime || '10:00'}`).toISOString()
  }
  return {
    title: values.title.trim(),
    eventTypeId: values.eventTypeId || undefined,
    startDateTime,
    endDateTime,
    allDay: values.allDay,
    location: values.location.trim() || undefined,
    description: values.description.trim() || undefined,
    status: values.status as 'SCHEDULED',
    reminderBeforeMinutes: values.reminderBeforeMinutes
      ? Number(values.reminderBeforeMinutes)
      : undefined,
    notifyKeyWorker: values.notifyKeyWorker,
    notifyNamedNurse: values.notifyNamedNurse,
    notifyManager: values.notifyManager,
  }
}

export function CalendarEventForm({
  values,
  onChange,
  eventTypes,
  errors,
  readOnly,
  showServiceUserPicker,
  serviceUserId,
  serviceUserOptions,
  loadingServiceUsers,
  onServiceUserChange,
}: {
  values: CalendarEventFormValues
  onChange: (v: CalendarEventFormValues) => void
  eventTypes: CalendarEventTypeRow[]
  errors?: Record<string, string>
  readOnly?: boolean
  showServiceUserPicker?: boolean
  serviceUserId?: string
  serviceUserOptions?: ServiceUserPickerOption[]
  loadingServiceUsers?: boolean
  onServiceUserChange?: (id: string) => void
}) {
  const set = (patch: Partial<CalendarEventFormValues>) => onChange({ ...values, ...patch })

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {showServiceUserPicker ? (
        <div className="sm:col-span-2 space-y-2">
          <Label>Service user *</Label>
          <Select
            value={serviceUserId || '_none'}
            disabled={readOnly || loadingServiceUsers}
            onValueChange={v => onServiceUserChange?.(v === '_none' ? '' : v)}
          >
            <SelectTrigger data-testid="calendar-event-service-user">
              <SelectValue placeholder={loadingServiceUsers ? 'Loadingâ€¦' : 'Select service user'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">â€”</SelectItem>
              {serviceUserOptions?.map(su => (
                <SelectItem key={su.id} value={su.id}>
                  {su.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.serviceUserId ? (
            <p className="text-xs text-destructive">{errors.serviceUserId}</p>
          ) : null}
        </div>
      ) : null}

      <div className="sm:col-span-2 space-y-2">
        <Label htmlFor="cal-title">Title *</Label>
        <Input
          id="cal-title"
          value={values.title}
          disabled={readOnly}
          onChange={e => set({ title: e.target.value })}
        />
        {errors?.title ? <p className="text-xs text-destructive">{errors.title}</p> : null}
      </div>

      <div className="space-y-2">
        <Label>Event type</Label>
        <Select
          value={values.eventTypeId || '_none'}
          disabled={readOnly}
          onValueChange={v => set({ eventTypeId: v === '_none' ? '' : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">â€”</SelectItem>
            {eventTypes.map(t => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={values.status} disabled={readOnly} onValueChange={v => set({ status: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED', 'RESCHEDULED'].map(s => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 sm:col-span-2">
        <Checkbox
          id="cal-allday"
          checked={values.allDay}
          disabled={readOnly}
          onCheckedChange={(c: boolean | 'indeterminate') => set({ allDay: c === true })}
        />
        <Label htmlFor="cal-allday">All day</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cal-start-date">Start date *</Label>
        <Input
          id="cal-start-date"
          type="date"
          value={values.startDate}
          disabled={readOnly}
          onChange={e => set({ startDate: e.target.value })}
        />
        {errors?.startDate ? <p className="text-xs text-destructive">{errors.startDate}</p> : null}
      </div>
      {!values.allDay ? (
        <div className="space-y-2">
          <Label htmlFor="cal-start-time">Start time</Label>
          <Input
            id="cal-start-time"
            type="time"
            value={values.startTime}
            disabled={readOnly}
            onChange={e => set({ startTime: e.target.value })}
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="cal-end-date">End date</Label>
        <Input
          id="cal-end-date"
          type="date"
          value={values.endDate}
          disabled={readOnly}
          onChange={e => set({ endDate: e.target.value })}
        />
      </div>
      {!values.allDay ? (
        <div className="space-y-2">
          <Label htmlFor="cal-end-time">End time</Label>
          <Input
            id="cal-end-time"
            type="time"
            value={values.endTime}
            disabled={readOnly}
            onChange={e => set({ endTime: e.target.value })}
          />
        </div>
      ) : null}

      <div className="sm:col-span-2 space-y-2">
        <Label htmlFor="cal-location">Location</Label>
        <Input
          id="cal-location"
          value={values.location}
          disabled={readOnly}
          onChange={e => set({ location: e.target.value })}
        />
      </div>

      <div className="sm:col-span-2 space-y-2">
        <Label htmlFor="cal-desc">Notes</Label>
        <Textarea
          id="cal-desc"
          rows={3}
          value={values.description}
          disabled={readOnly}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set({ description: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cal-reminder">Reminder (minutes before)</Label>
        <Input
          id="cal-reminder"
          type="number"
          min={1}
          value={values.reminderBeforeMinutes}
          disabled={readOnly}
          onChange={e => set({ reminderBeforeMinutes: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label>Notify</Label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={values.notifyKeyWorker}
            disabled={readOnly}
            onCheckedChange={(c: boolean | 'indeterminate') => set({ notifyKeyWorker: c === true })}
          />
          Key worker
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={values.notifyNamedNurse}
            disabled={readOnly}
            onCheckedChange={(c: boolean | 'indeterminate') => set({ notifyNamedNurse: c === true })}
          />
          Named nurse
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={values.notifyManager}
            disabled={readOnly}
            onCheckedChange={(c: boolean | 'indeterminate') => set({ notifyManager: c === true })}
          />
          Manager
        </label>
      </div>
    </div>
  )
}

export function CalendarEventFormActions({
  onCancel,
  onSubmit,
  submitLabel,
  loading,
  canSubmit,
  compact,
}: {
  onCancel: () => void
  onSubmit: () => void
  submitLabel: string
  loading?: boolean
  canSubmit?: boolean
  compact?: boolean
}) {
  return (
    <div className={cn('flex justify-end gap-2', !compact && 'mt-6')}>
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="button" onClick={onSubmit} disabled={loading || canSubmit === false}>
        {loading ? 'Savingâ€¦' : submitLabel}
      </Button>
    </div>
  )
}
