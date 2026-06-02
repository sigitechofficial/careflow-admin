import * as React from 'react'
import { HelpCircle, Loader2, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import {
  useCreateInitialAssessmentRiskRecord,
  useInitialAssessmentRiskRecords,
  useRegenerateInitialAssessmentRiskRecords,
  useUpdateInitialAssessmentRiskRecord,
} from '@/features/service-users/initial-assessment/hooks/useInitialAssessmentEnterprise'
import {
  calculateRiskLevel,
  matrixCellKey,
  RISK_MATRIX_LEVELS,
} from '@/features/service-users/initial-assessment/utils/risk-matrix.util'
import {
  IA_HINT_CLASS,
  IA_PANEL_TITLE_CLASS,
  IA_QUESTION_LABEL_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import type {
  InitialAssessmentRiskLevel,
  InitialAssessmentRiskStatus,
  InitialAssessmentRiskType,
} from '@/features/service-users/initial-assessment/types'

const RISK_TYPE_LABELS: Record<InitialAssessmentRiskType, string> = {
  FALLS: 'Falls',
  MEDICATION: 'Medication',
  SKIN_INTEGRITY: 'Skin integrity',
  CHOKING: 'Choking',
  NUTRITION: 'Nutrition',
  HYDRATION: 'Hydration',
  FIRE: 'Fire',
  HOME_ENVIRONMENT: 'Home environment',
  MOVING_HANDLING: 'Moving & handling',
  SAFEGUARDING: 'Safeguarding',
  FINANCE: 'Finance',
  LONE_WORKER: 'Lone worker',
  INFECTION_CONTROL: 'Infection control',
  OTHER: 'Other',
}

const LEVEL_CLASS: Record<InitialAssessmentRiskLevel, string> = {
  LOW: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  MEDIUM: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  HIGH: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
}

const MATRIX_CELL_CLASS: Record<InitialAssessmentRiskLevel, string> = {
  LOW: 'bg-emerald-50 dark:bg-emerald-950/30',
  MEDIUM: 'bg-amber-50 dark:bg-amber-950/30',
  HIGH: 'bg-red-50 dark:bg-red-950/30',
}

const RISK_MATRIX_HEATMAP_HELP =
  'Summary of open risks from the table below. Rows are likelihood (L); columns are severity (S). ' +
  'Cell colour and letter (L/M/H) show the calculated overall risk level for that pairing. ' +
  'The number is how many open risks are rated at that likelihood and severity. ' +
  'Change ratings on each row to move risks across the matrix. Closed risks are excluded from counts.'

type Props = {
  serviceUserId: string
  submissionId: string | null
  canUpdate: boolean
  editable: boolean
  compact?: boolean
}

export function InitialAssessmentRiskRecordsPanel({
  serviceUserId,
  submissionId,
  canUpdate,
  editable,
  compact = false,
}: Props) {
  const [showAdd, setShowAdd] = React.useState(false)
  const [newRisk, setNewRisk] = React.useState({
    riskType: 'OTHER' as InitialAssessmentRiskType,
    description: '',
    likelihood: 'MEDIUM' as InitialAssessmentRiskLevel,
    severity: 'MEDIUM' as InitialAssessmentRiskLevel,
  })

  const recordsQuery = useInitialAssessmentRiskRecords(serviceUserId, submissionId)
  const createMutation = useCreateInitialAssessmentRiskRecord(serviceUserId, submissionId ?? '')
  const updateMutation = useUpdateInitialAssessmentRiskRecord(serviceUserId, submissionId ?? '')
  const regenerateMutation = useRegenerateInitialAssessmentRiskRecords(serviceUserId, submissionId ?? '')

  const records = recordsQuery.data ?? []
  const openHigh = records.filter((r) => r.status === 'OPEN' && r.riskLevel === 'HIGH').length
  const needsControls = records.filter((r) => r.status !== 'CLOSED' && !r.controlMeasures?.trim()).length

  const matrixCounts = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of records) {
      if (r.status === 'CLOSED') continue
      const key = matrixCellKey(r.likelihood, r.severity)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [records])

  const submitNew = () => {
    if (!submissionId || !canUpdate || !newRisk.description.trim()) return
    void createMutation
      .mutateAsync({
        riskType: newRisk.riskType,
        description: newRisk.description.trim(),
        likelihood: newRisk.likelihood,
        severity: newRisk.severity,
        reviewDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      })
      .then(() => {
        setShowAdd(false)
        setNewRisk({
          riskType: 'OTHER',
          description: '',
          likelihood: 'MEDIUM',
          severity: 'MEDIUM',
        })
      })
  }

  const updateMatrix = (
    recordId: string,
    likelihood: InitialAssessmentRiskLevel,
    severity: InitialAssessmentRiskLevel,
    current: { likelihood: InitialAssessmentRiskLevel; severity: InitialAssessmentRiskLevel },
  ) => {
    if (likelihood === current.likelihood && severity === current.severity) return
    void updateMutation.mutateAsync({
      riskRecordId: recordId,
      body: { likelihood, severity },
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm" data-testid="ia-risk-matrix">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <h3 className={IA_PANEL_TITLE_CLASS}>Risk matrix (§13.7)</h3>
          <p className="text-sm text-muted-foreground">
            {records.length} record{records.length === 1 ? '' : 's'}
            {openHigh ? ` · ${openHigh} high/open` : ''}
            {needsControls ? ` · ${needsControls} need controls` : ''}
          </p>
        </div>
        {canUpdate && submissionId ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={regenerateMutation.isPending}
              onClick={() => void regenerateMutation.mutateAsync()}
            >
              Sync from flags
            </Button>
            <Button type="button" size="sm" disabled={createMutation.isPending} onClick={() => setShowAdd((v) => !v)}>
              <Plus className="mr-1 h-4 w-4" />
              Add risk
            </Button>
          </div>
        ) : null}
      </div>

      {!compact ? (
        <div className="border-b px-4 py-4">
          <div className="mb-2 flex items-center gap-1.5">
            <p className="text-sm font-semibold uppercase text-muted-foreground">Likelihood × severity</p>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex shrink-0 rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="About the risk heatmap"
                  >
                    <HelpCircle className="h-4 w-4" aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-sm text-left leading-snug">
                  {RISK_MATRIX_HEATMAP_HELP}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="overflow-x-auto">
            <table className="border-collapse text-center text-sm">
              <thead>
                <tr>
                  <th className="p-1" />
                  {RISK_MATRIX_LEVELS.map((s) => (
                    <th key={s} className="px-2 py-1 font-medium text-muted-foreground">
                      S:{s.slice(0, 1)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...RISK_MATRIX_LEVELS].reverse().map((likelihood) => (
                  <tr key={likelihood}>
                    <td className="px-2 py-1 font-medium text-muted-foreground">L:{likelihood.slice(0, 1)}</td>
                    {RISK_MATRIX_LEVELS.map((severity) => {
                      const level = calculateRiskLevel(likelihood, severity)
                      const count = matrixCounts.get(matrixCellKey(likelihood, severity)) ?? 0
                      return (
                        <td key={severity} className="p-1">
                          <div
                            className={cn(
                              'flex h-10 w-10 flex-col items-center justify-center rounded-md border border-border/60',
                              MATRIX_CELL_CLASS[level],
                              count > 0 && 'ring-2 ring-teal-500/50',
                            )}
                            title={`${likelihood} × ${severity} = ${level}`}
                          >
                            <span className="text-[10px] font-bold">{level.slice(0, 1)}</span>
                            {count > 0 ? <span className="text-[10px]">{count}</span> : null}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {showAdd && canUpdate ? (
        <div className="space-y-3 border-b bg-muted/20 px-4 py-4">
          <p className={IA_QUESTION_LABEL_CLASS}>New risk entry</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              value={newRisk.riskType}
              onValueChange={(v) => setNewRisk((p) => ({ ...p, riskType: v as InitialAssessmentRiskType }))}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RISK_TYPE_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Risk description…"
              value={newRisk.description}
              onChange={(e) => setNewRisk((p) => ({ ...p, description: e.target.value }))}
            />
            <Select
              value={newRisk.likelihood}
              onValueChange={(v) => setNewRisk((p) => ({ ...p, likelihood: v as InitialAssessmentRiskLevel }))}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Likelihood" />
              </SelectTrigger>
              <SelectContent>
                {RISK_MATRIX_LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    Likelihood: {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={newRisk.severity}
              onValueChange={(v) => setNewRisk((p) => ({ ...p, severity: v as InitialAssessmentRiskLevel }))}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                {RISK_MATRIX_LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    Severity: {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            Calculated level:{' '}
            <span className="font-semibold">{calculateRiskLevel(newRisk.likelihood, newRisk.severity)}</span>
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={createMutation.isPending} onClick={submitNew}>
              Save risk
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {recordsQuery.isLoading ? (
        <div className="flex items-center gap-2 px-4 py-8 text-base text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading risk records…
        </div>
      ) : records.length === 0 ? (
        <p className="px-4 py-8 text-center text-base text-muted-foreground">
          No structured risks yet. Submit or sync from flagged answers to populate the matrix.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-base">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-sm font-semibold uppercase text-muted-foreground">
                <th className="px-3 py-2">Risk</th>
                <th className="px-3 py-2">Level</th>
                <th className="px-3 py-2">Likelihood</th>
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">Controls</th>
                <th className="px-3 py-2">Review</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium">{RISK_TYPE_LABELS[record.riskType]}</div>
                    <div className="text-sm text-muted-foreground line-clamp-2">{record.description}</div>
                    {record.autoGenerated ? (
                      <span className="text-[10px] uppercase text-muted-foreground">Auto</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-semibold uppercase',
                        LEVEL_CLASS[record.riskLevel],
                      )}
                    >
                      {record.riskLevel}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {canUpdate && editable ? (
                      <Select
                        value={record.likelihood}
                        onValueChange={(v) =>
                          updateMatrix(record.id, v as InitialAssessmentRiskLevel, record.severity, record)
                        }
                      >
                        <SelectTrigger className="h-8 w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RISK_MATRIX_LEVELS.map((l) => (
                            <SelectItem key={l} value={l}>
                              {l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      record.likelihood
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {canUpdate && editable ? (
                      <Select
                        value={record.severity}
                        onValueChange={(v) =>
                          updateMatrix(record.id, record.likelihood, v as InitialAssessmentRiskLevel, record)
                        }
                      >
                        <SelectTrigger className="h-8 w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RISK_MATRIX_LEVELS.map((l) => (
                            <SelectItem key={l} value={l}>
                              {l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      record.severity
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {canUpdate && editable ? (
                      <Input
                        className="h-8 min-w-[140px] text-xs"
                        placeholder="Control measures…"
                        defaultValue={record.controlMeasures ?? ''}
                        onBlur={(e) => {
                          const v = e.target.value.trim()
                          if (v === (record.controlMeasures ?? '')) return
                          void updateMutation.mutateAsync({
                            riskRecordId: record.id,
                            body: { controlMeasures: v || undefined },
                          })
                        }}
                      />
                    ) : (
                      <span className="text-xs">{record.controlMeasures?.trim() || '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-muted-foreground">
                    {record.reviewDate ? record.reviewDate.slice(0, 10) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {canUpdate && editable ? (
                      <Select
                        value={record.status}
                        onValueChange={(v) =>
                          void updateMutation.mutateAsync({
                            riskRecordId: record.id,
                            body: { status: v as InitialAssessmentRiskStatus },
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OPEN">Open</SelectItem>
                          <SelectItem value="CONTROLLED">Controlled</SelectItem>
                          <SelectItem value="CLOSED">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      record.status
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** Alias for plan canvas FE3.3 */
export const InitialAssessmentRiskMatrixEditor = InitialAssessmentRiskRecordsPanel
