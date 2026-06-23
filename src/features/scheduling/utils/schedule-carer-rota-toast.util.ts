import { toastWarning } from '@/shared/lib/toast'
import { CARER_ROTA_CONFLICT_MESSAGE } from '@/features/scheduling/utils/schedule-job-carer-rota-conflict.util'

export function showCarerNotAssignedRotaConflictToast(message = CARER_ROTA_CONFLICT_MESSAGE): void {
  toastWarning('Carer not assigned', message)
}
