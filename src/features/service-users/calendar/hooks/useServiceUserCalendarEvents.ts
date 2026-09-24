import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createServiceUserCalendarEvent,
  deleteServiceUserCalendarEvent,
  updateServiceUserCalendarEvent,
  updateServiceUserCalendarEventStatus,
} from '@/features/service-users/api/service-user-calendar.api'
import type {
  CreateCalendarEventPayload,
  UpdateCalendarEventPayload,
} from '../types/service-user-calendar.types'

export function useCalendarEventMutations(serviceUserId: string) {
  const qc = useQueryClient()

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['service-users', serviceUserId, 'calendar'] }),
      qc.invalidateQueries({ queryKey: ['service-users-calendar'] }),
    ])
  }

  const create = useMutation({
    mutationFn: (payload: CreateCalendarEventPayload) =>
      createServiceUserCalendarEvent(serviceUserId, payload),
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: ({ eventId, payload }: { eventId: string; payload: UpdateCalendarEventPayload }) =>
      updateServiceUserCalendarEvent(serviceUserId, eventId, payload),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (eventId: string) => deleteServiceUserCalendarEvent(serviceUserId, eventId),
    onSuccess: invalidate,
  })

  const updateStatus = useMutation({
    mutationFn: ({ eventId, status, reason }: { eventId: string; status: string; reason?: string }) =>
      updateServiceUserCalendarEventStatus(serviceUserId, eventId, { status, reason }),
    onSuccess: invalidate,
  })

  return { create, update, remove, updateStatus }
}
