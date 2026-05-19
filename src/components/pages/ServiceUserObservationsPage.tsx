import * as React from 'react'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { ArrowLeft, Calendar, Loader2, UserCircle, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getApiBaseUrl } from '@/lib/api-base'
import { ApiError } from '@/lib/api-client'
import { toastApiError, toastError, toastSuccess } from '@/lib/toast'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/form-field'
import { fetchServiceUser, type ServiceUserDetail } from '@/lib/service-users-api'
import {
  createServiceUserObservation,
  fetchObservationShareTargets,
  fetchObservationTypes,
  fetchWellbeingScale,
  listServiceUserObservations,
  type ObservationShareTargetRow,
  type ObservationTypeRow,
  type ServiceUserObservationRow,
  type WellbeingScaleDimension,
} from '@/lib/observations-api'
import { ServiceUserModuleTabs } from '@/components/service-user/ServiceUserModuleTabs'
import { WellbeingRadarChart } from '@/components/observations/WellbeingRadarChart'
import { ObservationTypeFields } from '@/components/observations/ObservationTypeFields'
import {
  buildWellbeingRadarData,
  computeAverageWellbeingLevels,
  defaultWellbeingLevels,
  levelsFromObservation,
} from '@/lib/wellbeing-chart'
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
} from '@/lib/observation-payload'

function displayName(d: ServiceUserDetail | null): string {
  if (!d) return 'Service user'
  const legal = [d.firstName, d.lastName].filter(Boolean).join(' ').trim()
  if (d.preferredName?.trim()) {
    return legal ? `${legal} (${d.preferredName.trim()})` : d.preferredName.trim()
  }
  return legal || 'Service user'
}

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

  const permissions = useAuthStore(s => s.user?.permissions)
  const canSave = React.useMemo(() => {
    const p = (permissions ?? []) as string[]
    return p.includes('service_users.update') || p.includes('service_users.observations.create')
  }, [permissions])

  const [detail, setDetail] = React.useState<ServiceUserDetail | null>(null)
  const [types, setTypes] = React.useState<ObservationTypeRow[]>([])
  const [shareTargets, setShareTargets] = React.useState<ObservationShareTargetRow[]>([])
  const [wellbeingScale, setWellbeingScale] = React.useState<WellbeingScaleDimension[]>([])
  const [history, setHistory] = React.useState<ServiceUserObservationRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [historyLoading, setHistoryLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  const activeTypeCode = (search.type?.toUpperCase() || types[0]?.code || 'WEIGHT').toUpperCase()
  const activeType = types.find(t => t.code === activeTypeCode) ?? types[0]
  const formVariant = activeType ? getObservationFormVariant(activeType.code) : 'numeric'

  const [numericValue, setNumericValue] = React.useState('')
  const [compositeDraft, setCompositeDraft] = React.useState<CompositeDraft>({})
  const [notes, setNotes] = React.useState('')
  const [recordedAtLocal, setRecordedAtLocal] = React.useState(() => toDatetimeLocalValue(new Date()))
  const [selectedShares, setSelectedShares] = React.useState<Set<string>>(new Set())
  const [wellbeingLevels, setWellbeingLevels] = React.useState<Record<string, number>>({})

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

  const reloadHistory = React.useCallback(async (): Promise<ServiceUserObservationRow[]> => {
    if (!serviceUserId || !apiConfigured || !activeType) return []
    setHistoryLoading(true)
    try {
      const rows = await listServiceUserObservations(serviceUserId, { typeCode: activeType.code })
      setHistory(rows)
      return rows
    } catch {
      setHistory([])
      return []
    } finally {
      setHistoryLoading(false)
    }
  }, [activeType, apiConfigured, serviceUserId])

  const applyLatestWellbeingToForm = React.useCallback(
    (rows: ServiceUserObservationRow[], scale: WellbeingScaleDimension[]) => {
      const latest = rows.find(r => r.wellbeingScores.length > 0)
      if (!latest || !scale.length) return
      setWellbeingLevels(levelsFromObservation(latest, scale))
    },
    [],
  )

  React.useEffect(() => {
    if (!apiConfigured || !serviceUserId) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [d, t, st, wb] = await Promise.all([
          fetchServiceUser(serviceUserId),
          fetchObservationTypes(),
          fetchObservationShareTargets(),
          fetchWellbeingScale(),
        ])
        if (cancelled) return
        setDetail(d)
        setTypes(t)
        setShareTargets(st)
        setWellbeingScale(wb)
        setWellbeingLevels(defaultWellbeingLevels(wb))
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Failed to load observations')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apiConfigured, serviceUserId])

  React.useEffect(() => {
    void reloadHistory()
  }, [reloadHistory])

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
      setCompositeDraft(compositeDraftFromAbcRow(history[0]))
    }
    if (formVariant === 'seizure_chart' && history.length > 0) {
      setCompositeDraft(compositeDraftFromSeizureRow(history[0]))
    }
    if (formVariant === 'urinalysis' && history.length > 0) {
      setCompositeDraft(compositeDraftFromUrinalysisRow(history[0]))
    }
    if (formVariant === 'infection' && history.length > 0) {
      const latest = history[0]
      setCompositeDraft(compositeDraftFromInfectionRow(latest))
      setNotes(latest.notes?.trim() ?? '')
      setRecordedAtLocal(toDatetimeLocalValue(new Date(latest.recordedAt)))
    }
    if (formVariant === 'news2' && history.length > 0) {
      const latest = history[0]
      setCompositeDraft(compositeDraftFromNews2Row(latest))
      setNotes(latest.notes?.trim() ?? '')
      setRecordedAtLocal(toDatetimeLocalValue(new Date(latest.recordedAt)))
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

      let body: Parameters<typeof createServiceUserObservation>[1]

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
      }

      setSaving(true)
      const saved = await createServiceUserObservation(serviceUserId, body)
      toastSuccess('Saved', 'Observation recorded.')
      const rows = await reloadHistory()

      if (formVariant === 'wellbeing') {
        const latest =
          rows.find(r => r.id === saved.id) ?? rows.find(r => r.wellbeingScores.length > 0) ?? saved
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
    } finally {
      setSaving(false)
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

  const name = displayName(detail)
  const showHistory = showsHistoryTable(formVariant)

  return (
    <div className="flex min-h-full flex-col bg-[#f4f6f8] pb-12 dark:bg-background">
      <header className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{name} – Observations</h1>
          <Link
            to="/service-users/$serviceUserId/care-plan"
            params={{ serviceUserId }}
            className="inline-flex items-center gap-1 text-sm font-medium text-destructive hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Care Plan
          </Link>
        </div>
      </header>

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
                        wellbeingHistory.length > 0
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

