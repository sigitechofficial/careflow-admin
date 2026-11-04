import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createCarePlanTextTemplate,
  deleteCarePlanTextTemplate,
  previewCarePlanText,
  updateCarePlanTextTemplate,
} from '@/features/care-pathway/api/care-plan-text.api'
import {
  createCareForm,
  deleteCareForm,
  publishCareForm,
  saveCareFormSchema,
  updateCareForm,
  uploadCareFormIcon,
} from '@/features/care-pathway/api/form-builder.api'
import {
  updateCarePlanRequiredAssessments,
  updateFormSelections,
} from '@/features/care-pathway/api/form-selection.api'
import { initialAssessmentKeys } from '@/features/service-users/initial-assessment/keys'
import { createPathwayAction, deletePathwayAction } from '@/features/care-pathway/api/pathway-actions.api'
import {
  createPathwayChecklist,
  deletePathwayChecklist,
  updatePathwayChecklist,
} from '@/features/care-pathway/api/pathway-checklists.api'
import { deleteUploadedPicture, uploadCarePicture } from '@/features/care-pathway/api/picture-gallery.api'
import { carePathwayKeys } from '@/features/care-pathway/keys'

function invalidateCarePathway(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: carePathwayKeys.all() })
}

export function useCreateCareForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createCareForm,
    onSuccess: () => invalidateCarePathway(qc),
  })
}

export function useUpdateCareForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: Parameters<typeof updateCareForm>[1]
    }) => updateCareForm(id, body),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: carePathwayKeys.formDetail(id) })
      invalidateCarePathway(qc)
    },
  })
}

export function useSaveCareFormSchema() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      sections,
    }: {
      id: string
      sections: Parameters<typeof saveCareFormSchema>[1]
    }) => saveCareFormSchema(id, sections),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: carePathwayKeys.formDetail(id) })
      invalidateCarePathway(qc)
    },
  })
}

export function usePublishCareForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => publishCareForm(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: carePathwayKeys.formDetail(id) })
      invalidateCarePathway(qc)
    },
  })
}

export function useDeleteCareForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCareForm(id),
    onSuccess: () => invalidateCarePathway(qc),
  })
}

export function useUploadCareFormIcon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadCareFormIcon(id, file),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: carePathwayKeys.formDetail(id) })
      invalidateCarePathway(qc)
    },
  })
}

export function useUpdateFormSelections() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateFormSelections,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: carePathwayKeys.formSelections() })
    },
  })
}

export function useUpdateCarePlanRequiredAssessments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateCarePlanRequiredAssessments,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: carePathwayKeys.carePlanRequiredAssessments() })
      // Initial Assessment summaries list the required assessments.
      void qc.invalidateQueries({ queryKey: initialAssessmentKeys.all() })
    },
  })
}

export function useCreateCarePlanTextTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createCarePlanTextTemplate,
    onSuccess: () => invalidateCarePathway(qc),
  })
}

export function useUpdateCarePlanTextTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: Parameters<typeof updateCarePlanTextTemplate>[1]
    }) => updateCarePlanTextTemplate(id, body),
    onSuccess: () => invalidateCarePathway(qc),
  })
}

export function useDeleteCarePlanTextTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCarePlanTextTemplate(id),
    onSuccess: () => invalidateCarePathway(qc),
  })
}

export function usePreviewCarePlanText() {
  return useMutation({
    mutationFn: ({ id, serviceUserName }: { id: string; serviceUserName: string }) =>
      previewCarePlanText(id, serviceUserName),
  })
}

export function useCreatePathwayChecklist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPathwayChecklist,
    onSuccess: () => invalidateCarePathway(qc),
  })
}

export function useUpdatePathwayChecklist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: Parameters<typeof updatePathwayChecklist>[1]
    }) => updatePathwayChecklist(id, body),
    onSuccess: () => invalidateCarePathway(qc),
  })
}

export function useDeletePathwayChecklist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePathwayChecklist(id),
    onSuccess: () => invalidateCarePathway(qc),
  })
}

export function useCreatePathwayAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPathwayAction,
    onSuccess: () => invalidateCarePathway(qc),
  })
}

export function useDeletePathwayAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePathwayAction(id),
    onSuccess: () => invalidateCarePathway(qc),
  })
}

export function useUploadCarePicture() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      file,
      name,
      categoryId,
    }: {
      file: File
      name: string
      categoryId?: string
    }) => uploadCarePicture(file, name, categoryId),
    onSuccess: () => invalidateCarePathway(qc),
  })
}

export function useDeleteUploadedPicture() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteUploadedPicture(id),
    onSuccess: () => invalidateCarePathway(qc),
  })
}
