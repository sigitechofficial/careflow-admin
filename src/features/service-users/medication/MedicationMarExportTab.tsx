import * as React from 'react'
import { Download, Loader2, Printer } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  currentMedicationChartMonth,
  enumerateChartMonths,
  formatChartMonthLabel,
  shiftMedicationChartMonth,
  useDownloadMarExport,
  useDownloadMarExportCsv,
  useDownloadMarExportExcel,
  useDownloadMarExportPdf,
  useMarExportHtmlPreview,
} from '@/features/service-users/hooks/useMedicationMarChart'
import {
  marExportFilenameSuffix,
  type MarChartExportParams,
  type PackExportDetailMode,
} from '@/features/service-users/api/medication-mar.api'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useServiceUserMedications } from '@/features/service-users/hooks/useServiceUserMedications'
import {
  MarExportPreviewFrame,
  type MarExportPreviewFrameHandle,
} from '@/features/service-users/medication/MarExportPreviewFrame'
import {
  buildExportMedicationFilterGroups,
  expandMedicationFilterIds,
  isPackFullySelected,
  isPackPartiallySelected,
  type MarExportPackFilterGroup,
} from '@/features/service-users/medication/medication-filter-dedupe'

type RangeMode = 'month' | 'custom' | 'multi'

function firstDayOfMonth(month: string): string {
  return `${month}-01`
}

function lastDayOfMonth(month: string): string {
  const [yStr, mStr] = month.split('-')
  const y = Number(yStr)
  const m = Number(mStr)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${month}-${String(last).padStart(2, '0')}`
}

export function MedicationMarExportTab({
  serviceUserId,
}: {
  serviceUserId: string
}) {
  const [rangeMode, setRangeMode] = React.useState<RangeMode>('month')
  const [month, setMonth] = React.useState(currentMedicationChartMonth)
  const [dateFrom, setDateFrom] = React.useState(firstDayOfMonth(month))
  const [dateTo, setDateTo] = React.useState(lastDayOfMonth(month))
  const [monthFrom, setMonthFrom] = React.useState(shiftMedicationChartMonth(month, -2))
  const [monthTo, setMonthTo] = React.useState(month)
  const [selectedMedIds, setSelectedMedIds] = React.useState<string[]>([])
  const [includeLegend, setIncludeLegend] = React.useState(true)
  const [includeHeader, setIncludeHeader] = React.useState(true)
  const [packExportDetail, setPackExportDetail] = React.useState<PackExportDetailMode>('full')
  const previewFrameRef = React.useRef<MarExportPreviewFrameHandle>(null)

  const medicationsQuery = useServiceUserMedications(serviceUserId)

  const filterGroups = React.useMemo(
    () => buildExportMedicationFilterGroups(medicationsQuery.data?.rows ?? []),
    [medicationsQuery.data?.rows],
  )

  const allFilterOptions = React.useMemo(
    () => [
      ...filterGroups.packGroups.flatMap(p => p.members),
      ...filterGroups.standalone,
    ],
    [filterGroups],
  )

  const chartQueryParams = React.useMemo((): MarChartExportParams => {
    const medFilter =
      selectedMedIds.length > 0
        ? { medicationIds: expandMedicationFilterIds(selectedMedIds, allFilterOptions) }
        : {}
    const packLayout = { packExportDetail }
    if (rangeMode === 'custom') {
      return {
        ...medFilter,
        ...packLayout,
        dateFrom,
        dateTo,
        month: dateFrom.slice(0, 7),
      }
    }
    if (rangeMode === 'multi') {
      return { ...medFilter, ...packLayout, months: enumerateChartMonths(monthFrom, monthTo) }
    }
    return { ...medFilter, ...packLayout, month }
  }, [
    rangeMode,
    month,
    dateFrom,
    dateTo,
    monthFrom,
    monthTo,
    selectedMedIds,
    allFilterOptions,
    packExportDetail,
  ])

  const previewParams = React.useMemo((): MarChartExportParams => {
    if (rangeMode === 'multi') {
      return { ...chartQueryParams, month: monthTo, months: undefined }
    }
    return chartQueryParams
  }, [chartQueryParams, rangeMode, monthTo])

  const previewQuery = useMarExportHtmlPreview(serviceUserId, previewParams)
  const downloadMutation = useDownloadMarExport(serviceUserId)
  const downloadPdfMutation = useDownloadMarExportPdf(serviceUserId)
  const downloadCsvMutation = useDownloadMarExportCsv(serviceUserId)
  const downloadExcelMutation = useDownloadMarExportExcel(serviceUserId)
  const exportBusy =
    downloadMutation.isPending ||
    downloadPdfMutation.isPending ||
    downloadCsvMutation.isPending ||
    downloadExcelMutation.isPending
  const previewReady = Boolean(previewQuery.data)

  const previewTitle =
    rangeMode === 'multi'
      ? `${formatChartMonthLabel(monthFrom)} – ${formatChartMonthLabel(monthTo)}`
      : rangeMode === 'custom'
        ? `${dateFrom} – ${dateTo}`
        : formatChartMonthLabel(month)

  const syncMonthDates = (m: string) => {
    setDateFrom(firstDayOfMonth(m))
    setDateTo(lastDayOfMonth(m))
  }

  const togglePack = (pack: MarExportPackFilterGroup) => {
    const memberIds = pack.members.map(m => m.canonicalId)
    setSelectedMedIds(prev => {
      const allSelected = memberIds.every(id => prev.includes(id))
      if (allSelected) return prev.filter(id => !memberIds.includes(id))
      return [...new Set([...prev, ...memberIds])]
    })
  }

  const selectedPackCount = filterGroups.packGroups.filter(p =>
    isPackFullySelected(p, selectedMedIds),
  ).length
  const selectedStandaloneCount = filterGroups.standalone.filter(m =>
    selectedMedIds.includes(m.canonicalId),
  ).length
  const toggleMedication = (canonicalId: string) => {
    setSelectedMedIds(prev =>
      prev.includes(canonicalId) ? prev.filter(x => x !== canonicalId) : [...prev, canonicalId],
    )
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportParams = chartQueryParams
  const fileSuffix = marExportFilenameSuffix(exportParams)

  const handlePrint = () => {
    previewFrameRef.current?.print()
  }

  const handleDownloadHtml = async () => {
    try {
      const html = await downloadMutation.mutateAsync(exportParams)
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      downloadBlob(blob, `mar-${serviceUserId}-${fileSuffix}.html`)
      toastSuccess('MAR HTML downloaded')
    } catch (err) {
      toastApiError(err, 'Could not download MAR')
    }
  }

  const handleDownloadPdf = async () => {
    try {
      const blob = await downloadPdfMutation.mutateAsync(exportParams)
      downloadBlob(blob, `mar-${serviceUserId}-${fileSuffix}.pdf`)
      toastSuccess('MAR PDF downloaded')
    } catch (err) {
      toastApiError(err, 'Could not download MAR PDF')
    }
  }

  const handleDownloadExcel = async () => {
    try {
      const blob = await downloadExcelMutation.mutateAsync(exportParams)
      downloadBlob(blob, `mar-${serviceUserId}-${fileSuffix}.xlsx`)
      const multi = rangeMode === 'multi'
      toastSuccess(
        multi
          ? `MAR Excel downloaded (${enumerateChartMonths(monthFrom, monthTo).length} sheets)`
          : 'MAR Excel (.xlsx) downloaded',
      )
    } catch (err) {
      toastApiError(err, 'Could not download MAR Excel')
    }
  }

  const handleDownloadCsv = async () => {
    try {
      const blob = await downloadCsvMutation.mutateAsync(exportParams)
      downloadBlob(blob, `mar-${serviceUserId}-${fileSuffix}.csv`)
      toastSuccess('MAR data CSV downloaded (plain data for BI tools)')
    } catch (err) {
      toastApiError(err, 'Could not download MAR CSV')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">MAR chart export</h2>
        <p className="text-sm text-muted-foreground">
          Choose a date range and optional medications. The preview matches the downloaded HTML and
          PDF. Excel supports up to 6 months (one sheet per month). Custom ranges up to 93 days.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(300px,360px)_1fr]">
        <div className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold">Export settings</h3>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-muted-foreground">Date range</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="mar-range"
                checked={rangeMode === 'month'}
                onChange={() => setRangeMode('month')}
              />
              Single month
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="mar-range"
                checked={rangeMode === 'custom'}
                onChange={() => setRangeMode('custom')}
              />
              Custom dates
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="mar-range"
                checked={rangeMode === 'multi'}
                onChange={() => setRangeMode('multi')}
              />
              Multiple months (Excel)
            </label>
          </fieldset>

          {rangeMode === 'month' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const m = shiftMedicationChartMonth(month, -1)
                    setMonth(m)
                    syncMonthDates(m)
                  }}
                >
                  Prev
                </Button>
                <span className="flex-1 text-center text-sm font-medium">
                  {formatChartMonthLabel(month)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const m = shiftMedicationChartMonth(month, 1)
                    setMonth(m)
                    syncMonthDates(m)
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {rangeMode === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">From</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border border-input px-2 py-1 text-sm"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">To</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border border-input px-2 py-1 text-sm"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
            </div>
          )}

          {rangeMode === 'multi' && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-10">From</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMonthFrom(m => shiftMedicationChartMonth(m, -1))}
                >
                  −
                </Button>
                <span className="flex-1 text-center font-medium">
                  {formatChartMonthLabel(monthFrom)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMonthFrom(m => shiftMedicationChartMonth(m, 1))}
                >
                  +
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-10">To</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMonthTo(m => shiftMedicationChartMonth(m, -1))}
                >
                  −
                </Button>
                <span className="flex-1 text-center font-medium">
                  {formatChartMonthLabel(monthTo)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMonthTo(m => shiftMedicationChartMonth(m, 1))}
                >
                  +
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {enumerateChartMonths(monthFrom, monthTo).length} month(s) — preview shows{' '}
                {formatChartMonthLabel(monthTo)} only
              </p>
            </div>
          )}

          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Medications</span>
              {selectedMedIds.length > 0 && (
                <button
                  type="button"
                  className="text-xs text-teal-700 hover:underline"
                  onClick={() => setSelectedMedIds([])}
                >
                  All medications
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedMedIds.length === 0
                ? 'All active medications included'
                : [
                    selectedPackCount > 0
                      ? `${selectedPackCount} pack${selectedPackCount === 1 ? '' : 's'}`
                      : null,
                    selectedStandaloneCount > 0
                      ? `${selectedStandaloneCount} standalone`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || `${selectedMedIds.length} selected`}
            </p>
            <div className="max-h-52 space-y-3 overflow-y-auto rounded border border-border p-2">
              {medicationsQuery.isLoading && (
                <p className="text-xs text-muted-foreground">Loading…</p>
              )}
              {filterGroups.packGroups.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                    Blister packs
                  </p>
                  {filterGroups.packGroups.map(pack => {
                    const packChecked = isPackFullySelected(pack, selectedMedIds)
                    const packIndeterminate = isPackPartiallySelected(pack, selectedMedIds)
                    return (
                      <div key={pack.packId} className="space-y-1 rounded border border-violet-100 bg-violet-50/40 p-2">
                        <label className="flex items-start gap-2 text-xs font-semibold text-violet-900">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={packChecked}
                            ref={el => {
                              if (el) el.indeterminate = packIndeterminate
                            }}
                            onChange={() => togglePack(pack)}
                          />
                          <span>
                            {pack.packName}
                            <span className="ml-1 font-normal text-violet-700">
                              · {pack.members.length} medicine{pack.members.length === 1 ? '' : 's'}
                            </span>
                          </span>
                        </label>
                        <div className="ml-5 space-y-0.5 border-l border-violet-200 pl-2">
                          {pack.members.map(med => (
                            <label key={med.canonicalId} className="flex items-start gap-2 text-[11px] text-violet-950">
                              <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={selectedMedIds.includes(med.canonicalId)}
                                onChange={() => toggleMedication(med.canonicalId)}
                              />
                              <span>{med.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {filterGroups.standalone.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Standalone medications
                  </p>
                  {filterGroups.standalone.map(med => (
                    <label key={med.canonicalId} className="flex items-start gap-2 text-xs">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={selectedMedIds.includes(med.canonicalId)}
                        onChange={() => toggleMedication(med.canonicalId)}
                      />
                      <span>{med.name}</span>
                    </label>
                  ))}
                </div>
              )}
              {!medicationsQuery.isLoading &&
                filterGroups.packGroups.length === 0 &&
                filterGroups.standalone.length === 0 && (
                  <p className="text-xs text-muted-foreground">No active medications</p>
                )}
            </div>
          </div>

          {filterGroups.packGroups.length > 0 && (
            <fieldset className="space-y-2 border-t border-border pt-3">
              <legend className="text-xs font-medium text-violet-800">Blister pack layout</legend>
              <p className="text-xs text-muted-foreground">
                Applies to blister pack sections in HTML, PDF, Excel, and CSV exports.
              </p>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="pack-export-detail"
                  className="mt-1"
                  checked={packExportDetail === 'summary'}
                  onChange={() => setPackExportDetail('summary')}
                />
                <span>
                  <span className="font-medium">Compartment summary only</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    One collapsed row per round (Morning, Midday, …) — same layout as the MAR
                    calendar — with G / PR / Due codes and no individual medicine lines
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="pack-export-detail"
                  className="mt-1"
                  checked={packExportDetail === 'full'}
                  onChange={() => setPackExportDetail('full')}
                />
                <span>
                  <span className="font-medium">Summary + individual medicines</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Collapsed compartment row (as in the MAR calendar) plus each pack member with
                    its own daily codes
                  </span>
                </span>
              </label>
            </fieldset>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeHeader}
              onChange={e => setIncludeHeader(e.target.checked)}
            />
            Service user header (preview / print)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeLegend}
              onChange={e => setIncludeLegend(e.target.checked)}
            />
            Status legend (preview / print)
          </label>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="button"
              className="gap-2 bg-teal-700 text-white hover:bg-teal-800"
              onClick={() => void handleDownloadExcel()}
              disabled={!previewReady || previewQuery.isLoading || exportBusy}
            >
              <Download className="h-4 w-4" />
              {downloadExcelMutation.isPending ? 'Generating…' : 'Download MAR (Excel)'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => void handleDownloadHtml()}
              disabled={
                !previewReady || previewQuery.isLoading || exportBusy || rangeMode === 'multi'
              }
            >
              <Download className="h-4 w-4" />
              {downloadMutation.isPending ? 'Generating…' : 'Download MAR (HTML)'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => void handleDownloadPdf()}
              disabled={
                !previewReady || previewQuery.isLoading || exportBusy || rangeMode === 'multi'
              }
            >
              <Download className="h-4 w-4" />
              {downloadPdfMutation.isPending ? 'Generating…' : 'Download MAR (PDF)'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2 text-muted-foreground"
              onClick={() => void handleDownloadCsv()}
              disabled={
                !previewReady || previewQuery.isLoading || exportBusy || rangeMode === 'multi'
              }
            >
              <Download className="h-4 w-4" />
              {downloadCsvMutation.isPending ? 'Generating…' : 'Download data (CSV)'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={handlePrint}
              disabled={!previewReady || previewQuery.isLoading}
            >
              <Printer className="h-4 w-4" />
              Print preview
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm lg:min-w-0">
          <div className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
            Preview (HTML / PDF) — {previewTitle}
          </div>
          {previewQuery.isLoading && (
            <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Building export preview…
            </div>
          )}
          {previewQuery.error && (
            <p className="p-4 text-sm text-destructive" role="alert">
              {previewQuery.error instanceof Error
                ? previewQuery.error.message
                : 'Failed to load preview'}
            </p>
          )}
          {previewQuery.data && (
            <div className="max-h-[min(80vh,1200px)] overflow-auto bg-slate-100 p-3">
              <MarExportPreviewFrame
                ref={previewFrameRef}
                html={previewQuery.data}
                includeHeader={includeHeader}
                includeLegend={includeLegend}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
