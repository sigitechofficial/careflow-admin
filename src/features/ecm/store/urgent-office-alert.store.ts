import { create } from 'zustand'
import type { UrgentOfficeDialogKind } from '@/features/ecm/utils/ecm-urgent-alert.util'
import {
  emptyUrgentOfficeDialogState,
  enqueueUrgentOfficeDialog,
  laterUrgentOfficeDialog,
  removeUrgentOfficeDialogException,
  removeUrgentOfficeDialogKind,
  selectUrgentOfficeDialogVisit,
  type UrgentOfficeDialogAlert,
  type UrgentOfficeDialogState,
} from '@/features/ecm/utils/ecm-urgent-dialog.util'

type UrgentOfficeAlertStore = UrgentOfficeDialogState & {
  enqueue: (alert: UrgentOfficeDialogAlert) => void
  selectVisit: (jobId: string) => void
  later: () => void
  removeException: (exceptionId: string) => void
  removeKind: (jobId: string, kind: UrgentOfficeDialogKind) => void
  setPickerOpen: (open: boolean) => void
  reset: () => void
}

export const useUrgentOfficeAlertStore = create<UrgentOfficeAlertStore>(set => ({
  ...emptyUrgentOfficeDialogState(),
  enqueue: alert => set(state => enqueueUrgentOfficeDialog(state, alert)),
  selectVisit: jobId => set(state => selectUrgentOfficeDialogVisit(state, jobId)),
  later: () => set(state => laterUrgentOfficeDialog(state)),
  removeException: exceptionId => set(state => removeUrgentOfficeDialogException(state, exceptionId)),
  removeKind: (jobId, kind) => set(state => removeUrgentOfficeDialogKind(state, jobId, kind)),
  setPickerOpen: open => set({ pickerOpen: open }),
  reset: () => set(emptyUrgentOfficeDialogState()),
}))
