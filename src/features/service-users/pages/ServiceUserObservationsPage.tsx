import * as React from 'react'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { Calendar, Loader2, UserCircle, Users } from 'lucide-react'
import {
  SERVICE_USER_MODULE_PAGE_CLASS,
  ServiceUserModuleHeader,
} from '@/features/service-users/components/ServiceUserModuleHeader'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/shared/lib/utils'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { toastApiError, toastError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'
import type {
  CreateServiceUserObservationPayload,
  ObservationTypeRow,
  ServiceUserObservationRow,
  WellbeingScaleDimension,
} from '@/features/service-users/types'
import { ServiceUserModuleTabs } from '@/features/service-users/components/ServiceUserModuleTabs'
import { WellbeingRadarChart } from '@/components/observations/WellbeingRadarChart'
import { ObservationTypeFields } from '@/components/observations/ObservationTypeFields'
import { ObservationParameterContext } from '@/components/observations/ObservationParameterContext'
import {
  useMedicalClinicalPermissions,
  useMonitoringConfig,
  useUsualParameters,
} from '@/features/alerts/hooks/useMedicalClinical'
import {
  checkNumericAgainstUsualBands,
  findUsualParameterForType,
  findWeightChangeThresholdKg,
  formatFluidTargetHint,
  formatUsualParameterHint,
  formatWeightThresholdHint,
  isFluidTargetRequired,
} from '@/features/service-users/observations/usual-parameter-hint'
import {
  buildWellbeingRadarData,
  computeAverageWellbeingLevels,
  defaultWellbeingLevels,
  levelsFromObservation,
} from '@/features/service-users/observations/wellbeing-chart'
import {
  buildCreatePayload,
  compositeDraftFromAbcRow,
  compositeDraftFromSeizureRow,
  compositeDraftFromInfectionRow,
  compositeDraftFromNews2Row,
  compositeDraftFromUrinalysisRow,
  computeDailyFluidBalance,
  emptyCompositeDraft,
  getObservationFormVariant,
  historyCellValue,
  historyColumnsForType,
  showsHistoryTable,
  type CompositeDraft,
} from '@/features/service-users/observations/observation-payload'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import {
  useCreateServiceUserObservation,
  useObservationTypes,
  useObservationShareTargets,
  useWellbeingScale,
  useServiceUserObservations,
} from '@/features/service-users/hooks/useServiceUserObservations'
import { serviceUserKeys } from '@/features/service-users/keys'

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function datetimeLocalToIso(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date')
  return d.toISOString()
}

function formatDmy(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

export default function ServiceUserObservationsPage() {
  const params = useParams({ strict: false }) as { serviceUserId?: string }
  const serviceUserId = params.serviceUserId ?? ''
  const search = useSearch({ strict: false }) as { type?: string }
  const navigate = useNavigate()
  const apiConfigured = Boolean(getApiBaseUrl())
  const queryClient = useQueryClient()

  const permissions = useAuthStore(s => s.user?.permissions)
  const canSave = React.useMemo(() => {
    const p = (permissions ?? []) as string[]
    return p.includes('service_users.update') || p.includes('service_users.observations.create')
  }, [permissions])

  const clinicalPerms = useMedicalClinicalPermissions()
  const usualQuery = useUsualParameters(serviceUserId, clinicalPerms.usual.read)
  const monitoringQuery = useMonitoringConfig(serviceUserId, clinicalPerms.monitoring.read)

  // ─── Data via Query ───────────────────────────────────────────────────────
  const profileQuery = useServiceUser(serviceUserId)
  const typesQuery = useObservationTypes()
  const shareTargetsQuery = useObservationShareTargets()
  const wellbeingScaleQuery = useWellbeingScale()

  const detail = profileQuery.data ?? null
  const types: ObservationTypeRow[] = typesQuery.data ?? []
  const shareTargets = shareTargetsQuery.data ?? []
  // Memoised so the array reference stays stable when data is undefined,
  // preventing the form-sync useEffect from re-firing on every render.
  const wellbeingScale: WellbeingScaleDimension[] = React.useMemo(
    () => wellbeingScaleQuery.data ?? [],
    [wellbeingScaleQuery.data],
  )

  const loading =
    profileQuery.isLoading ||
    typesQuery.isLoading ||
    shareTargetsQuery.isLoading ||
    wellbeingScaleQuery.isLoading

  const error =
    profileQuery.error instanceof Error
      ? profileQuery.error.message
      : typesQuery.error instanceof Error
        ? typesQuery.error.message
        : null

  // ─── Derived from URL param + loaded types ────────────────────────────────
  const activeTypeCode = (search.type?.toUpperCase() || types[0]?.code || 'WEIGHT').toUpperCase()
  const activeType = types.find(t => t.code === activeTypeCode) ?? types[0]
  const formVariant = activeType ? getObservationFormVariant(activeType.code) : 'numeric'

  const historyQuery = useServiceUserObservations(serviceUserId, activeType?.code)
  const createMutation = useCreateServiceUserObservation()
  // Memoised for the same reason as wellbeingScale above — stable ref when data is undefined.
  const history: ServiceUserObservationRow[] = React.useMemo(
    () => historyQuery.data ?? [],
    [historyQuery.data],
  )
  const historyLoading = historyQuery.isFetching

  // ─── Form state ───────────────────────────────────────────────────────────
  const [numericValue, setNumericValue] = React.useState('')
  const [compositeDraft, setCompositeDraft] = React.useState<CompositeDraft>({})
  const [notes, setNotes] = React.useState('')
  const [recordedAtLocal, setRecordedAtLocal] = React.useState(() => toDatetimeLocalValue(new Date()))
  const [selectedShares, setSelectedShares] = React.useState<Set<string>>(new Set())
  const [wellbeingLevels, setWellbeingLevels] = React.useState<Record<string, number>>({})
  const saving = createMutation.isPending

  // ─── Derived from history ─────────────────────────────────────────────────
  const wellbeingHistory = React.useMemo(
    () => history.filter(r => r.wellbeingScores.length > 0),
    [history],
  )
  const averageWellbeingLevels = React.useMemo(
    () => computeAverageWellbeingLevels(wellbeingHistory, wellbeingScale),
    [wellbeingHistory, wellbeingScale],
  )
  const wellbeingChartData = React.useMemo(
    () => buildWellbeingRadarData(wellbeingScale, averageWellbeingLevels, wellbeingLevels),
    [wellbeingScale, averageWellbeingLevels, wellbeingLevels],
  )
  const fluidDailyBalance = React.useMemo(
    () => (formVariant === 'fluid_monitor' ? computeDailyFluidBalance(history) : 0),
    [formVariant, history],
  )
  const historyColumns = React.useMemo(
    () => (activeType ? historyColumnsForType(activeType.code) : []),
    [activeType],
  )

  const activeUsual = React.useMemo(
    () => findUsualParameterForType(usualQuery.data, activeTypeCode),
    [usualQuery.data, activeTypeCode],
  )

  const parameterContextLines = React.useMemo(() => {
    const lines: string[] = []
    const usualHint = formatUsualParameterHint(activeUsual)
    if (usualHint) lines.push(usualHint)

    if (activeTypeCode === 'WEIGHT') {
      const weightHint = formatWeightThresholdHint(findWeightChangeThresholdKg(monitoringQuery.data))
      if (weightHint) lines.push(weightHint)
    }
    if (formVariant === 'fluid_monitor') {
      const fluidHint = formatFluidTargetHint(isFluidTargetRequired(monitoringQuery.data))
      if (fluidHint) lines.push(fluidHint)
    }
    return lines
  }, [activeUsual, activeTypeCode, formVariant, monitoringQuery.data])

  const applyLatestWellbeingToForm = React.useCallback(
    (rows: ServiceUserObservationRow[], scale: WellbeingScaleDimension[]) => {
      const latest = rows.find(r => r.wellbeingScores.length > 0)
      if (!latest || !scale.length) return
      setWellbeingLevels(levelsFromObservation(latest, scale))
    },
    [],
  )

  // Sync form defaults when active type or history changes
  React.useEffect(() => {
    setNumericValue('')
    setNotes('')
    setRecordedAtLocal(toDatetimeLocalValue(new Date()))
    setSelectedShares(new Set())
    setCompositeDraft(emptyCompositeDraft(formVariant))
    if (activeTypeCode === 'WELLBEING' && wellbeingHistory.length > 0) {
      applyLatestWellbeingToForm(wellbeingHistory, wellbeingScale)
    } else if (wellbeingScale.length) {
      setWellbeingLevels(defaultWellbeingLevels(wellbeingScale))
    }
    if (formVariant === 'abc_patterns' && history.length > 0) {
      const row = history[0]
      if (row) setCompositeDraft(compositeDraftFromAbcRow(row))
    }
    if (formVariant === 'seizure_chart' && history.length > 0) {
      const row = history[0]
      if (row) setCompositeDraft(compositeDraftFromSeizureRow(row))
    }
    if (formVariant === 'urinalysis' && history.length > 0) {
      const row = history[0]
      if (row) setCompositeDraft(compositeDraftFromUrinalysisRow(row))
    }
    if (formVariant === 'infection' && history.length > 0) {
      const latest = history[0]
      if (latest) {
        setCompositeDraft(compositeDraftFromInfectionRow(latest))
        setNotes(latest.notes?.trim() ?? '')
        setRecordedAtLocal(toDatetimeLocalValue(new Date(latest.recordedAt)))
      }
    }
    if (formVariant === 'news2' && history.length > 0) {
      const latest = history[0]
      if (latest) {
        setCompositeDraft(compositeDraftFromNews2Row(latest))
        setNotes(latest.notes?.trim() ?? '')
        setRecordedAtLocal(toDatetimeLocalValue(new Date(latest.recordedAt)))
      }
    }
  }, [activeTypeCode, formVariant, wellbeingScale, wellbeingHistory, history, applyLatestWellbeingToForm])

  function setActiveType(code: string) {
    void navigate({
      to: '/service-users/$serviceUserId/observations',
      params: { serviceUserId },
      search: { type: code },
      replace: true,
    })
  }

  function toggleShare(code: string) {
    setSelectedShares(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  function onCompositeChange(key: string, value: string) {
    setCompositeDraft(prev => ({ ...prev, [key]: value }))
  }

  function resetForm() {
    setNumericValue('')
    setNotes('')
    setRecordedAtLocal(toDatetimeLocalValue(new Date()))
    setSelectedShares(new Set())
    setCompositeDraft(emptyCompositeDraft(formVariant))
    if (formVariant === 'wellbeing') {
      if (wellbeingHistory.length > 0) {
        applyLatestWellbeingToForm(wellbeingHistory, wellbeingScale)
      } else if (wellbeingScale.length) {
        setWellbeingLevels(defaultWellbeingLevels(wellbeingScale))
      }
    }
  }

  async function handleSave() {
    if (!activeType || !canSave) return

    try {
      const recordedAt = datetimeLocalToIso(recordedAtLocal)
      const shareTargetCodes = [...selectedShares]

      let body: CreateServiceUserObservationPayload

      if (formVariant === 'wellbeing') {
        body = {
          observationTypeCode: activeType.code,
          recordedAt,
          notes: notes.trim() || undefined,
          wellbeingScores: wellbeingScale.map(d => ({
            dimensionCode: d.code,
            level: wellbeingLevels[d.code] ?? 1,
          })),
          shareTargetCodes: shareTargetCodes.length ? shareTargetCodes : undefined,
        }
      } else {
        const built = buildCreatePayload(activeType.code, formVariant, compositeDraft, numericValue)
        if (built.error) {
          toastError('Cannot save', built.error)
          return
        }
        body = {
          observationTypeCode: activeType.code,
          recordedAt,
          notes: notes.trim() || undefined,
          numericValue: built.numericValue,
          payload: built.payload,
          shareTargetCodes: shareTargetCodes.length ? shareTargetCodes : undefined,
        }

        const band = checkNumericAgainstUsualBands(activeUsual, built.numericValue)
        if (band === 'below' || band === 'above') {
          toastWarning(
            'Outside usual range',
            band === 'below'
              ? `This reading is below the configured lower band (${activeUsual?.lowerBand}). It will still be saved.`
              : `This reading is above the configured upper band (${activeUsual?.upperBand}). It will still be saved.`,
          )
        }
      }

      const saved = await createMutation.mutateAsync({ serviceUserId, body })
      toastSuccess('Saved', 'Observation recorded.')

      await queryClient.invalidateQueries({
        queryKey: serviceUserKeys.observations(serviceUserId),
      })
      const freshHistory = historyQuery.data ?? []

      if (formVariant === 'wellbeing') {
        const latest =
          freshHistory.find(r => r.id === saved.id) ??
          freshHistory.find(r => r.wellbeingScores.length > 0) ??
          saved
        setWellbeingLevels(levelsFromObservation(latest, wellbeingScale))
        setNotes('')
        setRecordedAtLocal(toDatetimeLocalValue(new Date()))
        setSelectedShares(new Set())
      } else if (formVariant === 'abc_patterns') {
        setCompositeDraft(emptyCompositeDraft('abc_patterns'))
        setRecordedAtLocal(toDatetimeLocalValue(new Date()))
        setSelectedShares(new Set())
      } else if (formVariant === 'seizure_chart') {
        setCompositeDraft(emptyCompositeDraft('seizure_chart'))
        setRecordedAtLocal(toDatetimeLocalValue(new Date()))
        setSelectedShares(new Set())
      } else if (formVariant === 'urinalysis') {
        setCompositeDraft(emptyCompositeDraft('urinalysis'))
        setRecordedAtLocal(toDatetimeLocalValue(new Date()))
        setSelectedShares(new Set())
      } else if (formVariant === 'infection') {
        setCompositeDraft(emptyCompositeDraft('infection'))
        setNotes('')
        setRecordedAtLocal(toDatetimeLocalValue(new Date()))
        setSelectedShares(new Set())
      } else if (formVariant === 'news2') {
        setCompositeDraft(emptyCompositeDraft('news2'))
        setNotes('')
        setRecordedAtLocal(toDatetimeLocalValue(new Date()))
        setSelectedShares(new Set())
      } else {
        resetForm()
      }
    } catch (e) {
      toastApiError(e, 'Save failed')
    }
  }

  if (!serviceUserId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Missing service user id.{' '}
        <Link to="/service-users/all" className="text-primary underline">
          Back to list
        </Link>
      </div>
    )
  }

  const showHistory = showsHistoryTable(formVariant)

  return (
    <div className={SERVICE_USER_MODULE_PAGE_CLASS}>
      <ServiceUserModuleHeader serviceUserId={serviceUserId} detail={detail} />

      <ServiceUserModuleTabs serviceUserId={serviceUserId} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {!apiConfigured && <p className="text-sm text-muted-foreground">API base URL is not configured.</p>}
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && !loading && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && activeType && (
          <div className="flex min-h-[min(70vh,640px)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm md:flex-row">
            <nav
              className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-border bg-muted/30 p-2 md:w-56 md:flex-col md:overflow-x-visible md:overflow-y-auto md:border-b-0 md:border-r md:p-2"
              aria-label="Observation types"
            >
              {types.map(t => {
                const isActive = t.code === activeTypeCode
                return (
                  <button
                    key={t.code}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveType(t.code)}
                    className={cn(
                      'shrink-0 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors md:w-full',
                      isActive
                        ? 'bg-card text-foreground shadow-sm ring-1 ring-border md:border-l-2 md:border-l-primary md:pl-[10px] md:ring-0'
                        : 'text-muted-foreground hover:bg-card/70 hover:text-foreground',
                    )}
                  >
                    {t.name}
                  </button>
                )
              })}
            </nav>

            <div className="min-w-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
            <ObservationParameterContext
              serviceUserId={serviceUserId}
              lines={parameterContextLines}
            />
            {formVariant === 'wellbeing' ? (
              <div className="space-y-4">
                <div className="grid gap-8 lg:grid-cols-2">
                  <div className="space-y-6">
                    {wellbeingScale.map(dim => {
                      const level = wellbeingLevels[dim.code] ?? 1
                      const levelMeta = dim.levels.find(l => l.level === level)
                      return (
                        <div key={dim.code} className="space-y-2">
                          <p className="text-sm font-semibold">{dim.name}</p>
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map(n => (
                              <button
                                key={n}
                                type="button"
                                title={dim.levels.find(l => l.level === n)?.label}
                                disabled={!canSave}
                                onClick={() => setWellbeingLevels(prev => ({ ...prev, [dim.code]: n }))}
                                className={cn(
                                  'h-5 w-5 rounded-full border-2 transition-colors',
                                  level === n
                                    ? 'border-destructive bg-destructive/10'
                                    : 'border-muted-foreground/40 bg-background hover:border-destructive/60',
                                )}
                                aria-label={`${dim.name} level ${n}`}
                              />
                            ))}
                          </div>
                          {levelMeta && (
                            <p className="text-xs text-muted-foreground">{levelMeta.label}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="rounded-lg border border-border bg-background p-2">
                    <WellbeingRadarChart
                      data={wellbeingChartData}
                      hasHistory={wellbeingHistory.length > 0}
                      currentLabel={
                        wellbeingHistory.length > 0 && wellbeingHistory[0]
                          ? formatDmy(wellbeingHistory[0].recordedAt)
                          : 'Current'
                      }
                    />
                  </div>
                </div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} disabled={!canSave} />
                <label className="text-sm font-medium">Date / Time</label>
                <div className="flex max-w-md">
                  <Input
                    type="datetime-local"
                    value={recordedAtLocal}
                    onChange={e => setRecordedAtLocal(e.target.value)}
                    className="rounded-r-none"
                    disabled={!canSave}
                  />
                  <span className="inline-flex items-center rounded-r-md bg-destructive px-3 text-white">
                    <Calendar className="h-4 w-4" />
                  </span>
                </div>
              </div>
            ) : (
              <ObservationTypeFields
                activeType={activeType}
                variant={formVariant}
                canSave={canSave}
                numericValue={numericValue}
                onNumericValueChange={setNumericValue}
                compositeDraft={compositeDraft}
                onCompositeChange={onCompositeChange}
                notes={notes}
                onNotesChange={setNotes}
                recordedAtLocal={recordedAtLocal}
                onRecordedAtChange={setRecordedAtLocal}
              />
            )}

            {formVariant === 'fluid_monitor' && (
              <div className="flex items-center gap-4">
                <p className="text-sm font-medium text-muted-foreground">Daily fluid balance (today)</p>
                <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-sky-100 text-2xl font-bold text-sky-900 dark:bg-sky-950 dark:text-sky-100">
                  {fluidDailyBalance}
                </div>
              </div>
            )}

            {
              <>
                <div>
                  <p className="mb-2 text-sm font-medium">Share with:</p>
                  <div className="flex flex-wrap gap-6">
                    {shareTargets.map(st => {
                      const on = selectedShares.has(st.code)
                      const Icon = st.code === 'HANDOVER' ? Users : UserCircle
                      return (
                        <button
                          key={st.code}
                          type="button"
                          disabled={!canSave}
                          onClick={() => toggleShare(st.code)}
                          className={cn(
                            'flex flex-col items-center gap-1 text-xs',
                            on ? 'text-foreground' : 'text-muted-foreground opacity-60',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-12 w-12 items-center justify-center rounded-full border-2',
                              on ? 'border-teal-600 bg-teal-50' : 'border-muted bg-muted/40',
                            )}
                          >
                            <Icon className="h-6 w-6" />
                          </span>
                          {st.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-border pt-4">
                  <Button type="button" variant="outline" onClick={() => resetForm()}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => void handleSave()} disabled={!canSave || saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save
                  </Button>
                </div>
              </>
            }

            {showHistory && (
              <div className="mt-8 overflow-hidden rounded-md border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted/50">
                    <tr>
                      {historyColumns.map(col => (
                        <th key={col.key} className="px-3 py-2 font-medium">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historyLoading && (
                      <tr>
                        <td colSpan={historyColumns.length} className="px-3 py-6 text-center text-muted-foreground">
                          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                        </td>
                      </tr>
                    )}
                    {!historyLoading && history.length === 0 && (
                      <tr>
                        <td colSpan={historyColumns.length} className="px-3 py-6 text-center text-muted-foreground">
                          No record exists
                        </td>
                      </tr>
                    )}
                    {!historyLoading &&
                      history.map(row => (
                        <tr key={row.id} className="border-t border-border/60">
                          {historyColumns.map(col => (
                            <td key={col.key} className="px-3 py-2">
                              {historyCellValue(row, col.key)}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
