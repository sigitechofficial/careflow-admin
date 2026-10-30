import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchInitialAssessmentAttachmentFile,
  createInitialAssessmentSubmission,
  fetchDefaultInitialAssessmentTemplate,
  fetchInitialAssessmentTemplate,
  fetchInitialAssessmentAnswers,
  fetchInitialAssessmentCarePlanTriggers,
  fetchInitialAssessmentSummary,
  fetchInitialAssessmentClinical,
  fetchInitialAssessmentAgencySettings,
  fetchInitialAssessmentRiskSummary,
  listInitialAssessmentSubmissions,
  reopenInitialAssessment,
  reviewInitialAssessment,
  saveInitialAssessmentAnswers,
  submitInitialAssessment,
  type SubmitInitialAssessmentOptions,
  updateInitialAssessmentSubmission,
  validateInitialAssessment,
  fetchInitialAssessmentActions,
  createInitialAssessmentAction,
  updateInitialAssessmentAction,
  regenerateInitialAssessmentActions,
  fetchInitialAssessmentAttachments,
  uploadInitialAssessmentAttachment,
  deleteInitialAssessmentAttachment,
  startInitialAssessmentTranscription,
  fetchInitialAssessmentTranscription,
  suggestInitialAssessmentAnswersFromTranscript,
  fetchInitialAssessmentRiskRecords,
  createInitialAssessmentRiskRecord,
  updateInitialAssessmentRiskRecord,
  regenerateInitialAssessmentRiskRecords,
  fetchLoneWorkerSystemFacts,
} from '@/features/service-users/initial-assessment/api'
import { initialAssessmentKeys } from '@/features/service-users/initial-assessment/keys'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentSubmission,
  InitialAssessmentValidationResult,
} from '@/features/service-users/initial-assessment/types'

const STALE = 30_000

export function useDefaultInitialAssessmentTemplate(enabled = true) {
  return useQuery({
    queryKey: initialAssessmentKeys.templateDefault(),
    queryFn: ({ signal }) => fetchDefaultInitialAssessmentTemplate({ signal }),
    staleTime: STALE,
    enabled,
  })
}

export function useInitialAssessmentTemplate(templateId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: initialAssessmentKeys.template(templateId ?? ''),
    queryFn: ({ signal }) => fetchInitialAssessmentTemplate(templateId!, { signal }),
    staleTime: STALE,
    enabled: enabled && Boolean(templateId),
  })
}

export function useInitialAssessmentSubmissions(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: initialAssessmentKeys.submissions(serviceUserId),
    queryFn: ({ signal }) => listInitialAssessmentSubmissions(serviceUserId, { signal }),
    enabled: enabled && Boolean(serviceUserId),
    staleTime: STALE,
  })
}

export function useInitialAssessmentAnswers(
  serviceUserId: string,
  submissionId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: initialAssessmentKeys.answers(serviceUserId, submissionId ?? ''),
    queryFn: ({ signal }) =>
      fetchInitialAssessmentAnswers(serviceUserId, submissionId!, { signal }),
    enabled: enabled && Boolean(serviceUserId && submissionId),
    staleTime: STALE,
  })
}

export function useInitialAssessmentRiskSummary(
  serviceUserId: string,
  submissionId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: initialAssessmentKeys.riskSummary(serviceUserId, submissionId ?? ''),
    queryFn: ({ signal }) =>
      fetchInitialAssessmentRiskSummary(serviceUserId, submissionId!, { signal }),
    enabled: enabled && Boolean(serviceUserId && submissionId),
    staleTime: STALE,
  })
}

export function useInitialAssessmentCarePlanTriggers(
  serviceUserId: string,
  submissionId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: initialAssessmentKeys.carePlanTriggers(serviceUserId, submissionId ?? ''),
    queryFn: ({ signal }) =>
      fetchInitialAssessmentCarePlanTriggers(serviceUserId, submissionId!, { signal }),
    enabled: enabled && Boolean(serviceUserId && submissionId),
    staleTime: STALE,
  })
}

export function useInitialAssessmentSummary(
  serviceUserId: string,
  submissionId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: initialAssessmentKeys.summary(serviceUserId, submissionId ?? ''),
    queryFn: ({ signal }) => fetchInitialAssessmentSummary(serviceUserId, submissionId!, { signal }),
    enabled: enabled && Boolean(serviceUserId && submissionId),
    staleTime: STALE,
  })
}

export function useInitialAssessmentClinical(
  serviceUserId: string,
  submissionId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: initialAssessmentKeys.clinical(serviceUserId, submissionId ?? ''),
    queryFn: ({ signal }) => fetchInitialAssessmentClinical(serviceUserId, submissionId!, { signal }),
    enabled: enabled && Boolean(serviceUserId && submissionId),
    staleTime: STALE,
  })
}

export function useInitialAssessmentAgencySettings(enabled = true) {
  return useQuery({
    queryKey: initialAssessmentKeys.agencySettings(),
    queryFn: ({ signal }) => fetchInitialAssessmentAgencySettings({ signal }),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function useValidateInitialAssessment(
  serviceUserId: string,
  submissionId: string | null,
  enabled = false,
) {
  return useQuery({
    queryKey: initialAssessmentKeys.validate(serviceUserId, submissionId ?? ''),
    queryFn: ({ signal }) => validateInitialAssessment(serviceUserId, submissionId!, { signal }),
    enabled: enabled && Boolean(serviceUserId && submissionId),
    staleTime: 0,
  })
}

export function useCreateInitialAssessmentSubmission(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => createInitialAssessmentSubmission(serviceUserId),
    onSuccess: (created) => {
      qc.setQueryData<InitialAssessmentSubmission[]>(
        initialAssessmentKeys.submissions(serviceUserId),
        (prev) => {
          if (!created) return prev
          if (!prev) return [created]
          if (prev.some((row) => row.id === created.id)) return prev
          return [created, ...prev]
        },
      )
      void qc.invalidateQueries({ queryKey: initialAssessmentKeys.submissions(serviceUserId) })
    },
  })
}

export function useSaveInitialAssessmentAnswers(serviceUserId: string, submissionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      payload:
        | InitialAssessmentAnswerInput[]
        | { answers: InitialAssessmentAnswerInput[]; correctionReason?: string },
    ) => {
      const answers = Array.isArray(payload) ? payload : payload.answers
      const correctionReason = Array.isArray(payload) ? undefined : payload.correctionReason
      return saveInitialAssessmentAnswers(serviceUserId, submissionId, answers, correctionReason)
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: initialAssessmentKeys.answers(serviceUserId, submissionId),
      })
      void qc.invalidateQueries({
        queryKey: initialAssessmentKeys.riskSummary(serviceUserId, submissionId),
      })
      void qc.invalidateQueries({
        queryKey: initialAssessmentKeys.carePlanTriggers(serviceUserId, submissionId),
      })
      void qc.invalidateQueries({
        queryKey: initialAssessmentKeys.validate(serviceUserId, submissionId),
      })
    },
  })
}

export function useSubmitInitialAssessment(serviceUserId: string, submissionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (options?: SubmitInitialAssessmentOptions) =>
      submitInitialAssessment(serviceUserId, submissionId, options),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: initialAssessmentKeys.submissions(serviceUserId) })
      void qc.invalidateQueries({
        queryKey: initialAssessmentKeys.actions(serviceUserId, submissionId),
      })
      void qc.invalidateQueries({
        queryKey: initialAssessmentKeys.riskRecords(serviceUserId, submissionId),
      })
      void qc.invalidateQueries({
        queryKey: initialAssessmentKeys.summary(serviceUserId, submissionId),
      })
      void qc.invalidateQueries({
        queryKey: initialAssessmentKeys.acceptedCarePlans(serviceUserId),
      })
    },
  })
}

export function useInitialAssessmentActions(
  serviceUserId: string,
  submissionId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: initialAssessmentKeys.actions(serviceUserId, submissionId ?? ''),
    queryFn: ({ signal }) => fetchInitialAssessmentActions(serviceUserId, submissionId!, { signal }),
    enabled: enabled && Boolean(serviceUserId && submissionId),
    staleTime: STALE,
  })
}

export function useCreateInitialAssessmentAction(serviceUserId: string, submissionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof createInitialAssessmentAction>[2]) =>
      createInitialAssessmentAction(serviceUserId, submissionId, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: initialAssessmentKeys.actions(serviceUserId, submissionId),
      })
    },
  })
}

export function useUpdateInitialAssessmentAction(serviceUserId: string, submissionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      actionId,
      body,
    }: {
      actionId: string
      body: Parameters<typeof updateInitialAssessmentAction>[3]
    }) => updateInitialAssessmentAction(serviceUserId, submissionId, actionId, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: initialAssessmentKeys.actions(serviceUserId, submissionId),
      })
    },
  })
}

export function useRegenerateInitialAssessmentActions(serviceUserId: string, submissionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => regenerateInitialAssessmentActions(serviceUserId, submissionId),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: initialAssessmentKeys.actions(serviceUserId, submissionId),
      })
    },
  })
}

export function useInitialAssessmentAttachments(
  serviceUserId: string,
  submissionId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: initialAssessmentKeys.attachments(serviceUserId, submissionId ?? ''),
    queryFn: ({ signal }) =>
      fetchInitialAssessmentAttachments(serviceUserId, submissionId!, { signal }),
    enabled: enabled && Boolean(serviceUserId && submissionId),
    staleTime: STALE,
  })
}

export function useUploadInitialAssessmentAttachment(serviceUserId: string, submissionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      file,
      ...body
    }: {
      file: File
      category: import('@/features/service-users/initial-assessment/types').InitialAssessmentAttachmentCategory
      label?: string
      sectionNumber?: number
    }) => uploadInitialAssessmentAttachment(serviceUserId, submissionId, file, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: initialAssessmentKeys.attachments(serviceUserId, submissionId),
      })
    },
  })
}

export function useStartInitialAssessmentTranscription(serviceUserId: string, submissionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, fileName }: { file: Blob; fileName: string }) =>
      startInitialAssessmentTranscription(serviceUserId, submissionId, file, fileName),
    // The recording is saved to the assessment's attachments as soon as it is uploaded.
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: initialAssessmentKeys.attachments(serviceUserId, submissionId) }),
  })
}

/** AI reads the transcript and suggests answers; nothing is saved until they are applied to the form. */
export function useSuggestInitialAssessmentAnswers(serviceUserId: string, submissionId: string) {
  return useMutation({
    mutationFn: (body: Parameters<typeof suggestInitialAssessmentAnswersFromTranscript>[2]) =>
      suggestInitialAssessmentAnswersFromTranscript(serviceUserId, submissionId, body),
  })
}

/** Polls every 2s until Whisper has finished (or failed). */
export function useInitialAssessmentTranscription(
  serviceUserId: string,
  submissionId: string,
  jobId: string | null,
) {
  return useQuery({
    queryKey: initialAssessmentKeys.transcription(serviceUserId, submissionId, jobId ?? ''),
    queryFn: ({ signal }) =>
      fetchInitialAssessmentTranscription(serviceUserId, submissionId, jobId!, { signal }),
    enabled: Boolean(serviceUserId && submissionId && jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'DONE' || status === 'FAILED' || query.state.error ? false : 2000
    },
  })
}

/** Reads an attachment's file (recordings and transcripts are only served through this endpoint). */
export function useInitialAssessmentAttachmentFile(serviceUserId: string) {
  return useMutation({
    mutationFn: ({ submissionId, attachmentId }: { submissionId: string; attachmentId: string }) =>
      fetchInitialAssessmentAttachmentFile(serviceUserId, submissionId, attachmentId),
  })
}

export function useDeleteInitialAssessmentAttachment(serviceUserId: string, submissionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (attachmentId: string) =>
      deleteInitialAssessmentAttachment(serviceUserId, submissionId, attachmentId),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: initialAssessmentKeys.attachments(serviceUserId, submissionId),
      })
    },
  })
}

export function useInitialAssessmentRiskRecords(
  serviceUserId: string,
  submissionId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: initialAssessmentKeys.riskRecords(serviceUserId, submissionId ?? ''),
    queryFn: ({ signal }) =>
      fetchInitialAssessmentRiskRecords(serviceUserId, submissionId!, { signal }),
    enabled: enabled && Boolean(serviceUserId && submissionId),
    staleTime: STALE,
  })
}

export function useCreateInitialAssessmentRiskRecord(serviceUserId: string, submissionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof createInitialAssessmentRiskRecord>[2]) =>
      createInitialAssessmentRiskRecord(serviceUserId, submissionId, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: initialAssessmentKeys.riskRecords(serviceUserId, submissionId),
      })
      void qc.invalidateQueries({
        queryKey: initialAssessmentKeys.validate(serviceUserId, submissionId),
      })
    },
  })
}

export function useUpdateInitialAssessmentRiskRecord(serviceUserId: string, submissionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      riskRecordId,
      body,
    }: {
      riskRecordId: string
      body: Parameters<typeof updateInitialAssessmentRiskRecord>[3]
    }) => updateInitialAssessmentRiskRecord(serviceUserId, submissionId, riskRecordId, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: initialAssessmentKeys.riskRecords(serviceUserId, submissionId),
      })
      void qc.invalidateQueries({
        queryKey: initialAssessmentKeys.validate(serviceUserId, submissionId),
      })
    },
  })
}

export function useRegenerateInitialAssessmentRiskRecords(serviceUserId: string, submissionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => regenerateInitialAssessmentRiskRecords(serviceUserId, submissionId),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: initialAssessmentKeys.riskRecords(serviceUserId, submissionId),
      })
    },
  })
}

export function useUpdateInitialAssessmentSubmission(serviceUserId: string, submissionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { overallNotes?: string; metadata?: Record<string, unknown> }) =>
      updateInitialAssessmentSubmission(serviceUserId, submissionId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: initialAssessmentKeys.submissions(serviceUserId) })
    },
  })
}

export function useReviewInitialAssessment(serviceUserId: string, submissionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      status: 'REVIEWED' | 'ARCHIVED'
      reviewNotes?: string
      approvedForCareStart?: boolean
      careStartConditions?: string
    }) => reviewInitialAssessment(serviceUserId, submissionId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: initialAssessmentKeys.submissions(serviceUserId) })
    },
  })
}

export function useReopenInitialAssessment(serviceUserId: string, submissionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reason: string) => reopenInitialAssessment(serviceUserId, submissionId, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: initialAssessmentKeys.submissions(serviceUserId) })
    },
  })
}

export function useLoneWorkerSystemFacts(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: initialAssessmentKeys.loneWorkerFacts(serviceUserId),
    queryFn: ({ signal }) => fetchLoneWorkerSystemFacts(serviceUserId, { signal }),
    staleTime: STALE,
    enabled: enabled && Boolean(serviceUserId),
  })
}
