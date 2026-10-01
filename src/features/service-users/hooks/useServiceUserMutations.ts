import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  approveServiceUserEnterpriseFunding,
  addServiceUserLiveInBlockedCarer,
  addServiceUserLiveInPreferredCarer,
  clearServiceUserFlashMessage,
  createServiceUser,
  createServiceUserAbsence,
  createServiceUserAllergy,
  createServiceUserContact,
  createServiceUserDolsRecord,
  createServiceUserLegalAuthority,
  updateServiceUserLegalAuthority,
  deleteServiceUserLegalAuthority,
  createServiceUserEnterpriseFunding,
  createServiceUserInventoryItem,
  createServiceUserLiveInProfile,
  deleteServiceUser,
  deleteServiceUserAbsence,
  deleteServiceUserAllergy,
  deleteServiceUserContact,
  deleteServiceUserDolsRecord,
  deleteServiceUserEnterpriseFunding,
  deleteServiceUserInventoryItem,
  deleteServiceUserLiveInContract,
  deleteServiceUserLiveInProfile,
  downloadServiceUserLiveInContract,
  endServiceUserEnterpriseFunding,
  patchServiceUserAddress,
  patchServiceUserDomCare,
  patchServiceUserFundingRefs,
  patchServiceUserInitialAssessment,
  patchServiceUserLegalDocuments,
  patchServiceUserLiveInProfile,
  patchServiceUserLiveInProfileStatus,
  removeServiceUserLiveInBlockedCarer,
  removeServiceUserLiveInPreferredCarer,
  searchServiceUserDomCareEmployees,
  setPrimaryServiceUserEnterpriseFunding,
  updateServiceUser,
  updateServiceUserAbsence,
  updateServiceUserAllergy,
  updateServiceUserContact,
  updateServiceUserDolsRecord,
  updateServiceUserEnterpriseFunding,
  updateServiceUserInventoryItem,
  uploadServiceUserDnacprCertificate,
  uploadServiceUserDomCareContract,
  uploadServiceUserDolsCertificate,
  uploadServiceUserInitialAssessmentPicture,
  uploadServiceUserInventoryItemPhoto,
  uploadServiceUserLiveInContract,
  uploadServiceUserLpaFinanceCertificate,
  uploadServiceUserLpaHealthCertificate,
  upsertServiceUserFlashMessage,
  type CreateEnterpriseServiceUserFundingBody,
  type CreateServiceUserAbsencePayload,
  type CreateServiceUserAllergyPayload,
  type CreateServiceUserContactPayload,
  type CreateServiceUserInventoryItemPayload,
  type CreateServiceUserPayload,
  type PatchServiceUserAddressPayload,
  type PatchServiceUserLegalDocumentsPayload,
  type UpdateServiceUserAbsencePayload,
  type UpdateServiceUserAllergyPayload,
  type UpdateServiceUserInventoryItemPayload,
  type UpdateServiceUserPayload,
} from '@/features/service-users/api'
import { serviceUserKeys } from '@/features/service-users/keys'
import { billingKeys } from '@/features/billing/keys'
import { ensureServiceUserAddressCoordinates } from '@/features/service-users/utils/ensure-service-user-address-coordinates.util'

function invalidateDetail(qc: ReturnType<typeof useQueryClient>, serviceUserId: string) {
  void qc.invalidateQueries({ queryKey: serviceUserKeys.detail(serviceUserId) })
  void qc.invalidateQueries({ queryKey: serviceUserKeys.lists() })
}

/** Funding readiness exceptions live on visit reconciliations — refresh after funding setup changes. */
function invalidateBillingAfterFundingChange(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: billingKeys.all })
}

export function useCreateServiceUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      payload: CreateServiceUserPayload
      address?: PatchServiceUserAddressPayload
    }) => {
      const { id } = await createServiceUser(args.payload)
      if (args.address) {
        const address = await ensureServiceUserAddressCoordinates(args.address)
        await patchServiceUserAddress(id, address)
      }
      return { id }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.lists() })
    },
  })
}

export function useUpdateServiceUser(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      body: UpdateServiceUserPayload
      address?: PatchServiceUserAddressPayload
    }) => {
      const result = await updateServiceUser(serviceUserId, args.body)
      if (args.address) {
        await patchServiceUserAddress(serviceUserId, args.address)
      }
      return result
    },
    onSuccess: () => {
      invalidateDetail(qc, serviceUserId)
    },
  })
}

export function useDeleteServiceUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (serviceUserId: string) => deleteServiceUser(serviceUserId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.all() })
    },
  })
}

export function useCreateServiceUserAllergy(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateServiceUserAllergyPayload) =>
      createServiceUserAllergy(serviceUserId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.allergies(serviceUserId) })
    },
  })
}

export function useUpdateServiceUserAllergy(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ allergyId, body }: { allergyId: string; body: UpdateServiceUserAllergyPayload }) =>
      updateServiceUserAllergy(serviceUserId, allergyId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.allergies(serviceUserId) })
    },
  })
}

export function useDeleteServiceUserAllergy(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (allergyId: string) => deleteServiceUserAllergy(serviceUserId, allergyId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.allergies(serviceUserId) })
    },
  })
}

export function usePatchServiceUserLegalDocuments(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PatchServiceUserLegalDocumentsPayload) =>
      patchServiceUserLegalDocuments(serviceUserId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.documents(serviceUserId) })
      void qc.invalidateQueries({ queryKey: serviceUserKeys.documentStore(serviceUserId) })
    },
  })
}

export function useSaveServiceUserLegalAuthority(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      authorityId,
      body,
    }: {
      authorityId?: string
      body: Parameters<typeof createServiceUserLegalAuthority>[1]
    }) =>
      authorityId
        ? updateServiceUserLegalAuthority(serviceUserId, authorityId, body)
        : createServiceUserLegalAuthority(serviceUserId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.documents(serviceUserId) })
    },
  })
}

export function useDeleteServiceUserLegalAuthority(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (authorityId: string) => deleteServiceUserLegalAuthority(serviceUserId, authorityId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.documents(serviceUserId) })
    },
  })
}

export function useCreateServiceUserDolsRecord(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof createServiceUserDolsRecord>[1]) =>
      createServiceUserDolsRecord(serviceUserId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.documents(serviceUserId) })
    },
  })
}

export function useUpdateServiceUserDolsRecord(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      dolsId,
      body,
    }: {
      dolsId: string
      body: Parameters<typeof updateServiceUserDolsRecord>[2]
    }) => updateServiceUserDolsRecord(serviceUserId, dolsId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.documents(serviceUserId) })
    },
  })
}

export function useDeleteServiceUserDolsRecord(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dolsId: string) => deleteServiceUserDolsRecord(serviceUserId, dolsId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.documents(serviceUserId) })
    },
  })
}

export function useUploadServiceUserDnacprCertificate(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadServiceUserDnacprCertificate(serviceUserId, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.documents(serviceUserId) })
    },
  })
}

export function useUploadServiceUserLpaHealthCertificate(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadServiceUserLpaHealthCertificate(serviceUserId, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.documents(serviceUserId) })
    },
  })
}

export function useUploadServiceUserLpaFinanceCertificate(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadServiceUserLpaFinanceCertificate(serviceUserId, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.documents(serviceUserId) })
    },
  })
}

export function useUploadServiceUserDolsCertificate(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dolsId, file }: { dolsId: string; file: File }) =>
      uploadServiceUserDolsCertificate(serviceUserId, dolsId, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.documents(serviceUserId) })
    },
  })
}

export function useCreateServiceUserInventoryItem(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateServiceUserInventoryItemPayload) =>
      createServiceUserInventoryItem(serviceUserId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.inventory(serviceUserId) })
    },
  })
}

export function useUpdateServiceUserInventoryItem(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      itemId,
      body,
    }: {
      itemId: string
      body: UpdateServiceUserInventoryItemPayload
    }) => updateServiceUserInventoryItem(serviceUserId, itemId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.inventory(serviceUserId) })
    },
  })
}

export function useDeleteServiceUserInventoryItem(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => deleteServiceUserInventoryItem(serviceUserId, itemId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.inventory(serviceUserId) })
    },
  })
}

export function useUploadServiceUserInventoryItemPhoto(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, file }: { itemId: string; file: File }) =>
      uploadServiceUserInventoryItemPhoto(serviceUserId, itemId, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.inventory(serviceUserId) })
    },
  })
}

export function useCreateServiceUserAbsence(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateServiceUserAbsencePayload) =>
      createServiceUserAbsence(serviceUserId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.absences(serviceUserId) })
      void qc.invalidateQueries({ queryKey: ['scheduling'] })
    },
  })
}

export function useUpdateServiceUserAbsence(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      absenceId,
      body,
    }: {
      absenceId: string
      body: UpdateServiceUserAbsencePayload
    }) => updateServiceUserAbsence(serviceUserId, absenceId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.absences(serviceUserId) })
    },
  })
}

export function useDeleteServiceUserAbsence(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (absenceId: string) => deleteServiceUserAbsence(serviceUserId, absenceId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.absences(serviceUserId) })
    },
  })
}

export function useCreateServiceUserContact(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateServiceUserContactPayload) =>
      createServiceUserContact(serviceUserId, body),
    onSuccess: () => {
      invalidateDetail(qc, serviceUserId)
    },
  })
}

export function useUpdateServiceUserContact(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      contactId,
      body,
    }: {
      contactId: string
      body: Parameters<typeof updateServiceUserContact>[2]
    }) => updateServiceUserContact(serviceUserId, contactId, body),
    onSuccess: () => {
      invalidateDetail(qc, serviceUserId)
    },
  })
}

export function useDeleteServiceUserContact(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (contactId: string) => deleteServiceUserContact(serviceUserId, contactId),
    onSuccess: () => {
      invalidateDetail(qc, serviceUserId)
    },
  })
}

export function usePatchServiceUserDomCare(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof patchServiceUserDomCare>[1]) =>
      patchServiceUserDomCare(serviceUserId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.domCare(serviceUserId) })
    },
  })
}

export function useUploadServiceUserDomCareContract(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadServiceUserDomCareContract(serviceUserId, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.domCare(serviceUserId) })
    },
  })
}

export function usePatchServiceUserInitialAssessment(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof patchServiceUserInitialAssessment>[1]) =>
      patchServiceUserInitialAssessment(serviceUserId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.initialAssessment(serviceUserId) })
    },
  })
}

export function useUploadServiceUserInitialAssessmentPicture(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadServiceUserInitialAssessmentPicture(serviceUserId, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.initialAssessment(serviceUserId) })
    },
  })
}

export function useCreateServiceUserLiveInProfile(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof createServiceUserLiveInProfile>[1]) =>
      createServiceUserLiveInProfile(serviceUserId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.liveIn(serviceUserId) })
    },
  })
}

export function usePatchServiceUserLiveInProfile(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof patchServiceUserLiveInProfile>[1]) =>
      patchServiceUserLiveInProfile(serviceUserId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.liveIn(serviceUserId) })
    },
  })
}

export function usePatchServiceUserLiveInProfileStatus(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof patchServiceUserLiveInProfileStatus>[1]) =>
      patchServiceUserLiveInProfileStatus(serviceUserId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.liveIn(serviceUserId) })
    },
  })
}

export function useDeleteServiceUserLiveInProfile(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => deleteServiceUserLiveInProfile(serviceUserId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.liveIn(serviceUserId) })
    },
  })
}

export function useUploadServiceUserLiveInContract(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadServiceUserLiveInContract(serviceUserId, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.liveIn(serviceUserId) })
    },
  })
}

export function useDeleteServiceUserLiveInContract(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (documentId: string) => deleteServiceUserLiveInContract(serviceUserId, documentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.liveIn(serviceUserId) })
    },
  })
}

export function useCreateServiceUserEnterpriseFunding(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateEnterpriseServiceUserFundingBody) =>
      createServiceUserEnterpriseFunding(serviceUserId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.funding(serviceUserId) })
      invalidateDetail(qc, serviceUserId)
      invalidateBillingAfterFundingChange(qc)
    },
  })
}

export function useUpdateServiceUserEnterpriseFunding(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      fundingId,
      body,
    }: {
      fundingId: string
      body: Parameters<typeof updateServiceUserEnterpriseFunding>[2]
    }) => updateServiceUserEnterpriseFunding(serviceUserId, fundingId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.funding(serviceUserId) })
      invalidateDetail(qc, serviceUserId)
      invalidateBillingAfterFundingChange(qc)
    },
  })
}

export function useDeleteServiceUserEnterpriseFunding(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fundingId: string) => deleteServiceUserEnterpriseFunding(serviceUserId, fundingId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.funding(serviceUserId) })
      invalidateDetail(qc, serviceUserId)
      invalidateBillingAfterFundingChange(qc)
    },
  })
}

export function usePatchServiceUserFundingRefs(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof patchServiceUserFundingRefs>[1]) =>
      patchServiceUserFundingRefs(serviceUserId, body),
    onSuccess: () => {
      invalidateDetail(qc, serviceUserId)
    },
  })
}

export function useUpsertServiceUserFlashMessage(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof upsertServiceUserFlashMessage>[1]) =>
      upsertServiceUserFlashMessage(serviceUserId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.flashMessage(serviceUserId) })
      void qc.invalidateQueries({ queryKey: serviceUserKeys.lists() })
    },
  })
}

export function useClearServiceUserFlashMessage(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => clearServiceUserFlashMessage(serviceUserId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.flashMessage(serviceUserId) })
      void qc.invalidateQueries({ queryKey: serviceUserKeys.lists() })
    },
  })
}

export function useApproveServiceUserEnterpriseFunding(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      fundingId,
      body,
    }: {
      fundingId: string
      body?: Parameters<typeof approveServiceUserEnterpriseFunding>[2]
    }) => approveServiceUserEnterpriseFunding(serviceUserId, fundingId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.funding(serviceUserId) })
      invalidateDetail(qc, serviceUserId)
      invalidateBillingAfterFundingChange(qc)
    },
  })
}

export function useSetPrimaryServiceUserEnterpriseFunding(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fundingId: string) => setPrimaryServiceUserEnterpriseFunding(serviceUserId, fundingId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.funding(serviceUserId) })
      invalidateDetail(qc, serviceUserId)
      invalidateBillingAfterFundingChange(qc)
    },
  })
}

export function useEndServiceUserEnterpriseFunding(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      fundingId,
      body,
    }: {
      fundingId: string
      body: Parameters<typeof endServiceUserEnterpriseFunding>[2]
    }) => endServiceUserEnterpriseFunding(serviceUserId, fundingId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.funding(serviceUserId) })
      invalidateDetail(qc, serviceUserId)
      invalidateBillingAfterFundingChange(qc)
    },
  })
}

export function useSearchServiceUserDomCareEmployees(serviceUserId: string) {
  return useMutation({
    mutationFn: (params: { search?: string; limit?: number }) =>
      searchServiceUserDomCareEmployees(serviceUserId, params),
  })
}

export function useAddServiceUserLiveInPreferredCarer(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { employeeId: string; reason?: string }) =>
      addServiceUserLiveInPreferredCarer(serviceUserId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.liveIn(serviceUserId) })
    },
  })
}

export function useAddServiceUserLiveInBlockedCarer(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { employeeId: string; reason?: string }) =>
      addServiceUserLiveInBlockedCarer(serviceUserId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.liveIn(serviceUserId) })
    },
  })
}

export function useRemoveServiceUserLiveInPreferredCarer(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (employeeId: string) => removeServiceUserLiveInPreferredCarer(serviceUserId, employeeId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.liveIn(serviceUserId) })
    },
  })
}

export function useRemoveServiceUserLiveInBlockedCarer(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (employeeId: string) => removeServiceUserLiveInBlockedCarer(serviceUserId, employeeId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.liveIn(serviceUserId) })
    },
  })
}

export function useDownloadServiceUserLiveInContract(serviceUserId: string) {
  return useMutation({
    mutationFn: ({ documentId, originalName }: { documentId: string; originalName: string }) =>
      downloadServiceUserLiveInContract(serviceUserId, documentId, originalName),
  })
}
