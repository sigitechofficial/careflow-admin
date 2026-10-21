import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listAllEmployees } from '@/features/employees/api'
import { employeeKeys } from '@/features/employees/keys'
import {
  listCarerMessages,
  previewCarerMessage,
  sendCarerMessage,
} from '@/features/settings/api/carer-messages.api'
import type { CarerMessageAudienceInput, SendCarerMessageInput } from '@/features/settings/types'

const carerMessageKeys = {
  all: ['carer-messages'] as const,
  history: () => [...carerMessageKeys.all, 'history'] as const,
  preview: (input: CarerMessageAudienceInput) => [...carerMessageKeys.all, 'preview', input] as const,
}

export function useCarerMessageHistory(enabled = true) {
  return useQuery({ queryKey: carerMessageKeys.history(), queryFn: listCarerMessages, enabled })
}

export function useCarerMessagePreview(input: CarerMessageAudienceInput, enabled = true) {
  return useQuery({
    queryKey: carerMessageKeys.preview(input),
    queryFn: () => previewCarerMessage(input),
    enabled,
  })
}

export function useSendCarerMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SendCarerMessageInput) => sendCarerMessage(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: carerMessageKeys.history() })
    },
  })
}

/** Every employee, for the "Specific carers" picker. */
export function useAllEmployeesForCarerMessages(enabled = true) {
  return useQuery({
    queryKey: employeeKeys.allList({}),
    queryFn: () => listAllEmployees({}),
    staleTime: 60_000,
    enabled,
  })
}
