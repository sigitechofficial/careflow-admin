import * as React from 'react'
import { useAuthStore } from '@/features/auth/store'
import { UrgentOfficeAlertDialog } from '@/features/ecm/components/UrgentOfficeAlertDialog'
import { useEcmExceptions } from '@/features/ecm/hooks/useEcm'
import { useUrgentOfficeAlertStore } from '@/features/ecm/store/urgent-office-alert.store'
import {
  isLiveCarerSos,
  isLiveLeftVisitArea,
  isLiveOutsideAreaCheckIn,
  type UrgentOfficeDialogKind,
} from '@/features/ecm/utils/ecm-urgent-alert.util'

export function UrgentOfficeAlertHost() {
  const isAuthed = useAuthStore(s => s.isAuthenticated())
  const visits = useUrgentOfficeAlertStore(s => s.visits)
  const activeJobId = useUrgentOfficeAlertStore(s => s.activeJobId)
  const pickerOpen = useUrgentOfficeAlertStore(s => s.pickerOpen)
  const selectVisit = useUrgentOfficeAlertStore(s => s.selectVisit)
  const later = useUrgentOfficeAlertStore(s => s.later)
  const removeKind = useUrgentOfficeAlertStore(s => s.removeKind)
  const removeException = useUrgentOfficeAlertStore(s => s.removeException)
  const enqueue = useUrgentOfficeAlertStore(s => s.enqueue)
  const setPickerOpen = useUrgentOfficeAlertStore(s => s.setPickerOpen)
  const reset = useUrgentOfficeAlertStore(s => s.reset)
  const exceptionsQuery = useEcmExceptions({ enabled: isAuthed && visits.length > 0, limit: 200 })

  React.useEffect(() => {
    if (!isAuthed) reset()
  }, [isAuthed, reset])

  React.useEffect(() => {
    const rows = exceptionsQuery.data
    if (!rows?.length || visits.length === 0) return
    const queuedJobIds = new Set(visits.map(visit => visit.scheduledJobId))
    for (const row of rows) {
      if (!queuedJobIds.has(row.scheduledJobId) || !isLiveCarerSos(row)) continue
      const visit = visits.find(item => item.scheduledJobId === row.scheduledJobId)
      if (visit?.alerts.some(item => item.exceptionId === row.id)) continue
      enqueue({
        exceptionId: row.id,
        scheduledJobId: row.scheduledJobId,
        kind: 'CARER_SOS',
        title: row.title || 'Carer SOS',
        message: row.sos?.message?.trim() || row.detail || row.title,
        createdAt: row.sos?.createdAt ?? row.createdAt,
      })
    }
  }, [enqueue, exceptionsQuery.data, visits])

  React.useEffect(() => {
    const rows = exceptionsQuery.data
    if (!rows?.length) return
    for (const visit of visits) {
      for (const alert of visit.alerts) {
        const row = rows.find(item => item.id === alert.exceptionId)
        if (!row) continue
        if (alert.kind === 'CARER_SOS' && !isLiveCarerSos(row)) {
          removeException(alert.exceptionId)
        }
        if (alert.kind === 'LEFT_VISIT_AREA' && !isLiveLeftVisitArea(row)) {
          removeException(alert.exceptionId)
        }
        if (alert.kind === 'OUTSIDE_AREA_CHECK_IN_REQUEST' && !isLiveOutsideAreaCheckIn(row)) {
          removeException(alert.exceptionId)
        }
      }
    }
  }, [exceptionsQuery.data, removeException, visits])

  const rows = (exceptionsQuery.data ?? []).filter(row => row.scheduledJobId === activeJobId)

  return (
    <UrgentOfficeAlertDialog
      state={{ visits, activeJobId, pickerOpen }}
      rows={rows}
      onSelectVisit={selectVisit}
      onLater={later}
      onRemoveKind={kind => {
        if (activeJobId) removeKind(activeJobId, kind as UrgentOfficeDialogKind)
      }}
      onPickerOpenChange={setPickerOpen}
    />
  )
}
