import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadServiceUserPhoto } from '@/features/service-users/api'
import { serviceUserKeys } from '@/features/service-users/keys'

export function useUploadServiceUserPhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ serviceUserId, file }: { serviceUserId: string; file: File }) =>
      uploadServiceUserPhoto(serviceUserId, file),
    onSuccess: (_data, { serviceUserId }) => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.detail(serviceUserId) })
      void qc.invalidateQueries({ queryKey: serviceUserKeys.lists() })
    },
  })
}
