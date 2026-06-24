import * as React from 'react'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import type {
  BulkGenerateVisitPlanScheduleResponse,
  BulkVisitPlanScheduleCandidatesResponse,
} from '@/features/scheduling/api/bulk-visit-plan-schedule.api'
import {
  useBulkGenerateVisitPlanSchedule,
  useBulkVisitPlanScheduleCandidates,
} from '@/features/scheduling/hooks/useBulkVisitPlanSchedule'
import { useScheduleAreas } from '@/features/scheduling/hooks/useScheduling'
import { useServiceUserLocations } from '@/features/settings/hooks/useLocationManagement'
import {
  buildGenerateRotaHorizonOptions,
  DEFAULT_GENERATE_ROTA_DAYS,
  defaultGenerateRotaToDatePlaceholder,
  resolveGenerateRotaToDate,
  todayIsoDate,
} from '@/features/service-users/visit-plan/visit-plan-generate-rota.util'
import { useGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'
import { formatDisplayDate } from '@/shared/lib/display-format.util'
import type { RotaHorizonMode } from '@/features/settings/types'
import {
  allReadyBulkGenerateRotaCandidatesSelected,
  buildReadyPlanIdSet,
  filterBulkGenerateRotaCandidates,
  readyBulkGenerateRotaCandidates,
  toggleAllReadyBulkGenerateRotaPlans,
  toggleBulkGenerateRotaPlanSelection,
} from '@/features/scheduling/utils/bulk-generate-rota-candidates.util'
import {
  buildBulkGenerateRotaConfirmMessage,
  buildBulkGenerateRotaSuccessToastMessage,
} from '@/features/scheduling/utils/bulk-generate-rota-messages.util'

export function useBulkGenerateRotaPage() {
  const hasApi = !!getApiBaseUrl()

  const [locationId, setLocationId] = React.useState('')
  const [listReadyOnly, setListReadyOnly] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [selectedPlanIds, setSelectedPlanIds] = React.useState<Set<string>>(new Set())
  const [generateFrom, setGenerateFrom] = React.useState(todayIsoDate())
  const [generateTo, setGenerateTo] = React.useState('')
  const [backfillDays, setBackfillDays] = React.useState(0)
  const [scheduleAreaId, setScheduleAreaId] = React.useState('')
  const [generateReadyOnly, setGenerateReadyOnly] = React.useState(true)
  const [lastResult, setLastResult] = React.useState<BulkGenerateVisitPlanScheduleResponse | null>(
    null,
  )
  const [resultDialogOpen, setResultDialogOpen] = React.useState(false)

  const locationsQuery = useServiceUserLocations(hasApi)
  const generalSettingsQuery = useGeneralSettings(hasApi)
  const rotaHorizonOptions = React.useMemo(
    () => buildGenerateRotaHorizonOptions(generalSettingsQuery.data),
    [generalSettingsQuery.data],
  )
  const generateToPlaceholder = React.useMemo(() => {
    const mode = generalSettingsQuery.data?.domRotaHorizonMode ?? 'FIXED_DAYS'
    if (mode === 'CALENDAR_MONTH') return 'End of month'
    return defaultGenerateRotaToDatePlaceholder(generalSettingsQuery.data?.domRotaHorizonDays)
  }, [generalSettingsQuery.data?.domRotaHorizonDays, generalSettingsQuery.data?.domRotaHorizonMode])
  const defaultRotaHorizonDays =
    generalSettingsQuery.data?.domRotaHorizonDays ?? DEFAULT_GENERATE_ROTA_DAYS
  const defaultRotaHorizonMode: RotaHorizonMode =
    generalSettingsQuery.data?.domRotaHorizonMode ?? 'FIXED_DAYS'
  const defaultRotaToDate = React.useMemo(
    () => resolveGenerateRotaToDate(generateFrom, generateTo, rotaHorizonOptions),
    [generateFrom, generateTo, rotaHorizonOptions],
  )
  const defaultRotaToDateLabel = React.useMemo(
    () =>
      formatDisplayDate(
        defaultRotaToDate,
        generalSettingsQuery.data?.dateDisplayFormat ?? 'DD_MM_YYYY',
      ),
    [defaultRotaToDate, generalSettingsQuery.data?.dateDisplayFormat],
  )
  const scheduleAreasQuery = useScheduleAreas()
  const candidatesQuery = useBulkVisitPlanScheduleCandidates({
    locationId: locationId || undefined,
    readyOnly: listReadyOnly,
    enabled: hasApi,
  })
  const generateMutation = useBulkGenerateVisitPlanSchedule()

  const candidates = candidatesQuery.data?.candidates ?? []
  const summary = candidatesQuery.data?.summary
  const visibleCandidates = React.useMemo(
    () => filterBulkGenerateRotaCandidates(candidates, search),
    [candidates, search],
  )
  const readyVisible = React.useMemo(
    () => readyBulkGenerateRotaCandidates(visibleCandidates),
    [visibleCandidates],
  )
  const allReadySelected = allReadyBulkGenerateRotaCandidatesSelected(readyVisible, selectedPlanIds)

  React.useEffect(() => {
    setSelectedPlanIds(buildReadyPlanIdSet(candidates))
  }, [candidatesQuery.dataUpdatedAt, locationId, listReadyOnly])

  const togglePlan = React.useCallback((planId: string, ready: boolean) => {
    setSelectedPlanIds((prev) => toggleBulkGenerateRotaPlanSelection(prev, planId, ready))
  }, [])

  const toggleAllReady = React.useCallback(() => {
    setSelectedPlanIds((prev) =>
      toggleAllReadyBulkGenerateRotaPlans(prev, readyVisible, !allReadySelected),
    )
  }, [allReadySelected, readyVisible])

  const handleGenerate = React.useCallback(() => {
    if (!generateFrom) {
      toastApiError(new Error('From date required'), 'Select a from date')
      return
    }

    const planIds = [...selectedPlanIds]
    if (!planIds.length) {
      toastApiError(new Error('No plans selected'), 'Select at least one ready visit plan')
      return
    }

    const toDate = resolveGenerateRotaToDate(generateFrom, generateTo, rotaHorizonOptions)
    const ok = window.confirm(
      buildBulkGenerateRotaConfirmMessage(planIds.length, generateFrom, toDate),
    )
    if (!ok) return

    generateMutation.mutate(
      {
        fromDate: generateFrom,
        toDate,
        planIds,
        locationId: locationId || undefined,
        readyOnly: generateReadyOnly,
        backfillDays: backfillDays > 0 ? backfillDays : undefined,
        scheduleAreaId: scheduleAreaId || undefined,
      },
      {
        onSuccess: (data) => {
          setLastResult(data)
          setResultDialogOpen(true)
          toastSuccess('Bulk rota complete', buildBulkGenerateRotaSuccessToastMessage(data))
          void candidatesQuery.refetch()
        },
        onError: (e) => toastApiError(e, 'Bulk generate failed'),
      },
    )
  }, [
    backfillDays,
    candidatesQuery,
    generateFrom,
    generateMutation,
    generateReadyOnly,
    generateTo,
    locationId,
    scheduleAreaId,
    selectedPlanIds,
    rotaHorizonOptions,
  ])

  const resetPage = React.useCallback(() => {
    void candidatesQuery.refetch()
  }, [candidatesQuery])

  return {
    hasApi,
    locationId,
    setLocationId,
    listReadyOnly,
    setListReadyOnly,
    search,
    setSearch,
    selectedPlanIds,
    generateFrom,
    setGenerateFrom,
    generateTo,
    setGenerateTo,
    generateToPlaceholder,
    defaultRotaHorizonDays,
    defaultRotaHorizonMode,
    defaultRotaToDateLabel,
    showDefaultRotaRange: !generateTo.trim(),
    backfillDays,
    setBackfillDays,
    scheduleAreaId,
    setScheduleAreaId,
    generateReadyOnly,
    setGenerateReadyOnly,
    lastResult,
    resultDialogOpen,
    setResultDialogOpen,
    locationsQuery,
    scheduleAreasQuery,
    candidatesQuery,
    generateMutation,
    summary,
    visibleCandidates,
    readyVisible,
    allReadySelected,
    togglePlan,
    toggleAllReady,
    handleGenerate,
    resetPage,
  }
}

export type BulkGenerateRotaPageViewModel = ReturnType<typeof useBulkGenerateRotaPage>
export type BulkGenerateRotaSummary = BulkVisitPlanScheduleCandidatesResponse['summary']
