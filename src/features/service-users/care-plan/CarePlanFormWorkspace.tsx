import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  ChevronRight,
  Info,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react'
import type { CareFormDetail } from '@/features/care-pathway/types/care-pathway.types'
import type { ServiceUserDetail } from '@/features/service-users/types'
import { CarePathwayFormRenderer } from '@/features/service-users/care-plan/CarePathwayFormRenderer'
import { CarePlanAssessmentSection } from '@/features/service-users/care-plan/CarePlanAssessmentSection'
import { CarePlanConsentCapacitySection } from '@/features/service-users/care-plan/CarePlanConsentCapacitySection'
import {
  applyManualRiskItems,
  formatRiskLevelLabel,
  mapIaRiskRecordsForCarePlanProfile,
  manualRiskItemsFromDraft,
} from '@/features/service-users/care-plan/care-plan-risk-profile.util'
import {
  formatActionPriorityLabel,
  formatActionStatusLabel,
  mapIaActionsForCarePlanProfile,
} from '@/features/service-users/care-plan/care-plan-actions.util'
import { mapCarePlanVersionsToHistory } from '@/features/service-users/care-plan/care-plan-history.util'
import { fetchCarePlanVersions } from '@/features/service-users/care-plans/api'
import { serviceUserKeys } from '@/features/service-users/keys'
import { useQuery } from '@tanstack/react-query'
import { useCarePlanIaSource } from '@/features/service-users/hooks/useCarePlanIaSource'
import {
  useInitialAssessmentActions,
  useInitialAssessmentRiskRecords,
} from '@/features/service-users/initial-assessment/hooks/useInitialAssessmentEnterprise'
import {
  CARE_PLAN_META,
  defaultCarePlanSummary,
  defaultReviewSummary,
  REVIEW_SUMMARY_PLACEHOLDER,
  CARE_PLAN_SUMMARY_PLACEHOLDER,
  DEPENDENCY_LEVEL_OPTIONS,
  metaBool,
  metaString,
  setMetaValue,
  type CarePlanReviewStatus,
  type CarePlanRiskItem,
} from '@/features/service-users/care-plan/care-plan-form-meta'
import { resolveEditorNextReviewDate } from '@/features/service-users/care-plans/care-plan-review-frequency'
import type { CarePlanDraftValues } from '@/features/service-users/care-plan/care-plan-draft-storage'
import type { CarePlanFieldSuggestion } from '@/features/service-users/care-plans/types'
import { BodyMapCanvas } from '@/features/service-users/body-map/components/BodyMapCanvas'
import {
  BODY_MAP_RECORD_TYPES,
  recordTypeLabel,
  type BodyMapRecordTypeCode,
} from '@/features/service-users/body-map/catalog/record-types'
import { useServiceUserBodyMap } from '@/features/service-users/body-map/hooks/useBodyMap'
import type { BodyMapRecordRow } from '@/features/service-users/body-map/types'
import { serviceUserGivenName, serviceUserDisplayName } from '@/features/service-users/lib/service-user-display'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { DatePicker } from '@/shared/ui/date-picker'
import { Label } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import { SignaturePad } from '@/shared/ui/signature-pad'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Switch } from '@/shared/ui/toggle-controls'
import { cn } from '@/shared/lib/utils'

function FieldLabel({
  htmlFor,
  required,
  children,
  info,
}: {
  htmlFor?: string
  required?: boolean
  children: React.ReactNode
  info?: boolean
}) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-normal text-muted-foreground">
        {children}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {info ? <Info className="h-3.5 w-3.5 text-primary" aria-hidden /> : null}
    </div>
  )
}

function StatusToggle({
  value,
  onChange,
  disabled,
}: {
  value: CarePlanReviewStatus
  onChange: (v: CarePlanReviewStatus) => void
  disabled?: boolean
}) {
  const options: CarePlanReviewStatus[] = ['Active', 'Monitor', 'Inactive']
  return (
    <div className="inline-flex overflow-hidden rounded-sm border border-border">
      {options.map((opt) => {
        const active = value === opt
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt)}
            className={cn(
              'min-w-[5.5rem] px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50',
              active && opt === 'Active' && 'bg-destructive text-white',
              active && opt !== 'Active' && 'bg-muted text-foreground',
              !active && 'bg-white text-foreground hover:bg-muted/50',
            )}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

function ReviewSummarySection({
  serviceUserName,
  consentDefaultName,
  values,
  onChange,
  disabled,
  defaultNextReviewDate,
  publishedNextReviewDueAt,
}: {
  serviceUserName: string
  consentDefaultName: string
  values: CarePlanDraftValues
  onChange: (v: CarePlanDraftValues) => void
  disabled?: boolean
  defaultNextReviewDate?: string | null
  publishedNextReviewDueAt?: string | null
}) {
  const [summaryExpanded, setSummaryExpanded] = React.useState(false)
  const [signatureKey, setSignatureKey] = React.useState(0)

  const status = (metaString(values, CARE_PLAN_META.reviewStatus, 'Active') ||
    'Active') as CarePlanReviewStatus
  const summary =
    metaString(values, CARE_PLAN_META.reviewSummary) || defaultReviewSummary(serviceUserName)
  const carePlanSummary =
    metaString(values, CARE_PLAN_META.carePlanSummary) ||
    defaultCarePlanSummary(serviceUserName)
  const consentName =
    metaString(values, CARE_PLAN_META.consentName) || consentDefaultName
  const consentNote =
    metaString(values, CARE_PLAN_META.consentNote) || 'Verbal consent given'
  const dependencyLevel =
    metaString(values, CARE_PLAN_META.dependencyLevel) || DEPENDENCY_LEVEL_OPTIONS[1]
  const nextReviewDate =
    resolveEditorNextReviewDate({
      metaDate: metaString(values, CARE_PLAN_META.nextReviewDate),
      publishedNextReviewDueAt: publishedNextReviewDueAt,
      defaultNextReviewDate,
    })

  const showViewMore = summary.trim().length > 280

  const clearSignature = () => {
    onChange(setMetaValue(values, CARE_PLAN_META.signature, ''))
    setSignatureKey((k) => k + 1)
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        What is the required status of this care plan for {serviceUserName} ?
      </p>
      <StatusToggle
        value={status}
        disabled={disabled}
        onChange={(next) => onChange(setMetaValue(values, CARE_PLAN_META.reviewStatus, next))}
      />

      <div>
        <FieldLabel required info>
          Review and Evaluation Summary
        </FieldLabel>
        <textarea
          className={cn(
            'w-full resize-y rounded-sm border border-sky-200 bg-background px-3 py-2 text-sm leading-relaxed text-muted-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
            summaryExpanded ? 'min-h-[280px]' : 'max-h-[180px] min-h-[120px] overflow-y-auto',
          )}
          value={summary}
          disabled={disabled}
          placeholder={REVIEW_SUMMARY_PLACEHOLDER}
          onChange={(e) =>
            onChange(setMetaValue(values, CARE_PLAN_META.reviewSummary, e.target.value))
          }
        />
        {showViewMore ? (
          <button
            type="button"
            className="mt-1 text-sm font-medium text-destructive hover:underline"
            onClick={() => setSummaryExpanded((v) => !v)}
          >
            {summaryExpanded ? 'View less' : 'View more'}
          </button>
        ) : null}
      </div>

      <div>
        <FieldLabel>Care Plan Summary</FieldLabel>
        <textarea
          className="min-h-[120px] w-full resize-y rounded-sm border border-input bg-background px-3 py-2 text-sm leading-relaxed ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          value={carePlanSummary}
          disabled={disabled}
          placeholder={CARE_PLAN_SUMMARY_PLACEHOLDER}
          onChange={(e) =>
            onChange(setMetaValue(values, CARE_PLAN_META.carePlanSummary, e.target.value))
          }
        />
      </div>

      <div>
        <FieldLabel>Consent for Care Plan</FieldLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            value={consentName}
            disabled={disabled}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange(setMetaValue(values, CARE_PLAN_META.consentName, e.target.value))
            }
          />
          <Input
            value={consentNote}
            disabled={disabled}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange(setMetaValue(values, CARE_PLAN_META.consentNote, e.target.value))
            }
          />
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <FieldLabel>Signature</FieldLabel>
          <button
            type="button"
            className="text-sm text-destructive hover:underline disabled:opacity-50"
            disabled={disabled}
            onClick={clearSignature}
          >
            Clear
          </button>
        </div>
        <SignaturePad
          key={signatureKey}
          disabled={disabled}
          className="w-full max-w-xl [&>div:last-child]:hidden"
          onChange={(dataUrl) =>
            onChange(setMetaValue(values, CARE_PLAN_META.signature, dataUrl ?? ''))
          }
        />
      </div>

      <div>
        <FieldLabel required>Dependency level for this area:</FieldLabel>
        <Select
          value={dependencyLevel}
          disabled={disabled}
          onValueChange={(v) =>
            onChange(setMetaValue(values, CARE_PLAN_META.dependencyLevel, v))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEPENDENCY_LEVEL_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <FieldLabel required>Next Review date:</FieldLabel>
        <DatePicker
          value={nextReviewDate ? new Date(nextReviewDate) : undefined}
          disabled={disabled}
          onChange={(d) =>
            onChange(
              setMetaValue(
                values,
                CARE_PLAN_META.nextReviewDate,
                d ? d.toISOString().slice(0, 10) : '',
              ),
            )
          }
        />
      </div>
    </div>
  )
}

function CarePlanMainSection({
  form,
  values,
  onChange,
  disabled,
  suggestions,
  ignoredSuggestionIds,
  composedFrom,
  onUseSuggestion,
  onIgnoreSuggestion,
  onKeepCurrentSuggestion,
  onEditSuggestion,
}: {
  form: CareFormDetail
  values: CarePlanDraftValues
  onChange: (v: CarePlanDraftValues) => void
  disabled?: boolean
  suggestions?: CarePlanFieldSuggestion[]
  ignoredSuggestionIds?: string[]
  composedFrom?: Record<string, unknown>
  onUseSuggestion?: (suggestion: CarePlanFieldSuggestion) => void
  onIgnoreSuggestion?: (suggestion: CarePlanFieldSuggestion) => void
  onKeepCurrentSuggestion?: (suggestion: CarePlanFieldSuggestion) => void
  onEditSuggestion?: (suggestion: CarePlanFieldSuggestion) => void
}) {
  return (
    <CarePathwayFormRenderer
      form={form}
      values={values}
      onChange={onChange}
      disabled={disabled}
      embedded
      suggestions={suggestions}
      ignoredSuggestionIds={ignoredSuggestionIds}
      composedFrom={composedFrom}
      onUseSuggestion={onUseSuggestion}
      onIgnoreSuggestion={onIgnoreSuggestion}
      onKeepCurrentSuggestion={onKeepCurrentSuggestion}
      onEditSuggestion={onEditSuggestion}
    />
  )
}

function RiskProfileSection({
  serviceUserId,
  values,
  onChange,
  disabled,
}: {
  serviceUserId: string
  values: CarePlanDraftValues
  onChange: (v: CarePlanDraftValues) => void
  disabled?: boolean
}) {
  const iaSource = useCarePlanIaSource(serviceUserId)
  const submissionId = iaSource.submission?.id ?? null
  const recordsQuery = useInitialAssessmentRiskRecords(
    serviceUserId,
    submissionId,
    iaSource.canRead && Boolean(submissionId),
  )

  const iaRisks = React.useMemo(
    () =>
      mapIaRiskRecordsForCarePlanProfile(recordsQuery.data ?? [], {
        submittedAt: iaSource.submission?.submittedAt,
      }),
    [recordsQuery.data, iaSource.submission?.submittedAt],
  )
  const manualItems = manualRiskItemsFromDraft(values)

  const updateItems = (next: CarePlanRiskItem[]) => {
    onChange(applyManualRiskItems(values, next))
  }

  const addItem = () => {
    updateItems([...manualItems, { id: crypto.randomUUID(), name: 'New risk' }])
  }

  const removeItem = (id: string) => {
    updateItems(manualItems.filter((i) => i.id !== id))
  }

  const renameItem = (id: string, name: string) => {
    updateItems(manualItems.map((i) => (i.id === id ? { ...i, name } : i)))
  }

  const iaLoading =
    iaSource.submissionsQuery.isLoading || (Boolean(submissionId) && recordsQuery.isLoading)

  return (
    <div className="space-y-8" data-testid="care-plan-risk-profile">
      <section className="space-y-3" aria-labelledby="care-plan-ia-risks-heading">
        <div>
          <h3 id="care-plan-ia-risks-heading" className="text-sm font-semibold text-foreground">
            Identified Risks from Initial Assessment
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Read-only risks from the latest eligible Initial Assessment. Not stored on this care plan
            draft.
          </p>
        </div>

        {iaLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading assessment risks…
          </div>
        ) : !submissionId ? (
          <p className="rounded-sm border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
            No risks identified from Initial Assessment
          </p>
        ) : iaRisks.length === 0 ? (
          <p
            className="rounded-sm border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground"
            data-testid="care-plan-ia-risks-empty"
          >
            No risks identified from Initial Assessment
          </p>
        ) : (
          <ul className="space-y-3" data-testid="care-plan-ia-risks-list">
            {iaRisks.map((risk) => (
              <li
                key={risk.id}
                className="rounded-lg border border-border/80 bg-card shadow-sm"
                data-testid={`care-plan-ia-risk-${risk.id}`}
              >
                <div className="flex">
                  <div
                    className={cn(
                      'w-1 shrink-0 rounded-l-lg',
                      risk.riskLevel === 'HIGH'
                        ? 'bg-destructive'
                        : risk.riskLevel === 'MEDIUM'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500',
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1 px-4 py-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                      <h4 className="text-[15px] font-semibold tracking-tight text-foreground">
                        {risk.name}
                      </h4>
                      <span className="mt-0.5 shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Read-only
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={
                          risk.riskLevel === 'HIGH'
                            ? 'destructive'
                            : risk.riskLevel === 'MEDIUM'
                              ? 'warning'
                              : 'secondary'
                        }
                        size="sm"
                        className="font-medium"
                      >
                        {formatRiskLevelLabel(risk.riskLevel)}
                      </Badge>
                      <Badge variant="outline" size="sm" className="font-normal text-muted-foreground">
                        From Initial Assessment
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Reason
                      </p>
                      <p className="text-sm leading-relaxed text-foreground/90">{risk.reason}</p>
                    </div>

                    <p
                      className="mt-3 text-xs text-muted-foreground"
                      data-testid={`care-plan-ia-risk-source-${risk.id}`}
                    >
                      {risk.sourceLabel}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="care-plan-manual-risks-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="care-plan-manual-risks-heading" className="text-sm font-semibold text-foreground">
              Additional Care Plan Risks
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Optional risks recorded on this care plan. Saved with draft / publish.
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={addItem}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
            aria-label="Add risk"
            data-testid="care-plan-manual-risk-add"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {manualItems.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="care-plan-manual-risks-empty">
            No additional care plan risks. Use + to add one.
          </p>
        ) : (
          <ul className="space-y-2" data-testid="care-plan-manual-risks-list">
            {manualItems.map((item) => (
              <li key={item.id}>
                <details className="group overflow-hidden rounded-sm border border-border/80">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" />
                      {disabled ? (
                        <span className="truncate">{item.name}</span>
                      ) : (
                        <input
                          type="text"
                          value={item.name}
                          aria-label={`Risk name for ${item.name}`}
                          className="min-w-0 flex-1 rounded-sm border-0 bg-transparent text-sm font-semibold text-primary-foreground outline-none placeholder:text-primary-foreground/60 focus:ring-1 focus:ring-white/40"
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => renameItem(item.id, e.target.value)}
                        />
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={disabled}
                      className="rounded p-1 text-rose-200 hover:bg-white/10 hover:text-white disabled:opacity-50"
                      aria-label={`Remove ${item.name}`}
                      onClick={(e) => {
                        e.preventDefault()
                        removeItem(item.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </summary>
                  <div className="border-t border-border bg-white p-4 text-sm text-muted-foreground dark:bg-card">
                    Risk mitigation details for {item.name.toLowerCase()} will appear here.
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function formatBodyMapDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function bodyMapLocation(record: BodyMapRecordRow): string {
  const marker = record.markers[0]
  if (!marker) return '—'
  return marker.specificLocation?.trim() || marker.bodyPart || '—'
}

function bodyMapIssueSummary(record: BodyMapRecordRow): string {
  return record.title?.trim() || record.description?.trim() || record.subType || '—'
}

function BodyMapSection({ serviceUserId }: { serviceUserId: string }) {
  const [showCleared, setShowCleared] = React.useState(false)
  const [issueType, setIssueType] = React.useState<'all' | BodyMapRecordTypeCode>('all')
  const [selectedRecordId, setSelectedRecordId] = React.useState<string | null>(null)

  const { data, isLoading, error } = useServiceUserBodyMap(serviceUserId, showCleared)
  const records = data?.records ?? []

  const filteredRecords = React.useMemo(() => {
    if (issueType === 'all') return records
    return records.filter((r) => r.recordType === issueType)
  }, [records, issueType])

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-sm border border-border bg-muted/20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error instanceof Error ? error.message : 'Could not load body map'}
        </p>
      ) : (
        <BodyMapCanvas
          embedded
          className="min-h-[320px]"
          records={filteredRecords}
          pendingMarker={null}
          selectedRecordId={selectedRecordId}
          markMode={false}
          showCleared={showCleared}
          showMeds
          onShowClearedChange={setShowCleared}
          onPlaceMarker={() => {}}
          onSelectRecord={setSelectedRecordId}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Issue Type</span>
          <Select
            value={issueType}
            onValueChange={(v) => setIssueType(v as 'all' | BodyMapRecordTypeCode)}
          >
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Issues</SelectItem>
              {BODY_MAP_RECORD_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show Cleared</span>
          <Switch checked={showCleared} onCheckedChange={setShowCleared} />
          <span className="text-xs font-medium text-muted-foreground">
            {showCleared ? 'YES' : 'NO'}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-muted-foreground">
              <th className="px-3 py-2 font-medium">Location</th>
              <th className="px-3 py-2 font-medium">Issue Type</th>
              <th className="px-3 py-2 font-medium">Issue At</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Issue</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  No data available
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => {
                const marker = record.markers[0]
                const status = marker?.status ?? record.status
                return (
                  <tr
                    key={record.id}
                    className={cn(
                      'cursor-pointer border-b border-border/60 hover:bg-muted/30',
                      selectedRecordId === record.id && 'bg-primary/5',
                    )}
                    onClick={() => setSelectedRecordId(record.id)}
                  >
                    <td className="px-3 py-2">{bodyMapLocation(record)}</td>
                    <td className="px-3 py-2">
                      {recordTypeLabel(record.recordType as BodyMapRecordTypeCode)}
                    </td>
                    <td className="px-3 py-2">
                      {formatBodyMapDate(record.firstNoticedAt ?? record.createdAt)}
                    </td>
                    <td className="px-3 py-2 capitalize">{status.toLowerCase().replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2 text-muted-foreground">{bodyMapIssueSummary(record)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <Link
        to="/service-users/$serviceUserId/body-map"
        params={{ serviceUserId }}
        className="inline-flex text-sm font-medium text-primary hover:underline"
      >
        Open full body map →
      </Link>
    </div>
  )
}

function CareActionsSection({ serviceUserId }: { serviceUserId: string }) {
  const iaSource = useCarePlanIaSource(serviceUserId)
  const submissionId = iaSource.submission?.id ?? null
  const actionsQuery = useInitialAssessmentActions(
    serviceUserId,
    submissionId,
    iaSource.canRead && Boolean(submissionId),
  )

  const iaActions = React.useMemo(
    () =>
      mapIaActionsForCarePlanProfile(actionsQuery.data ?? [], {
        submittedAt: iaSource.submission?.submittedAt,
      }),
    [actionsQuery.data, iaSource.submission?.submittedAt],
  )

  const iaLoading =
    iaSource.submissionsQuery.isLoading || (Boolean(submissionId) && actionsQuery.isLoading)

  return (
    <div className="space-y-8" data-testid="care-plan-care-actions">
      <section className="space-y-3" aria-labelledby="care-plan-ia-actions-heading">
        <div>
          <h3 id="care-plan-ia-actions-heading" className="text-sm font-semibold text-foreground">
            Actions from Initial Assessment
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Read-only open actions from the latest eligible Initial Assessment. Not stored on this care
            plan draft.
          </p>
        </div>

        {iaLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading assessment actions…
          </div>
        ) : !submissionId || iaActions.length === 0 ? (
          <p
            className="rounded-sm border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground"
            data-testid="care-plan-ia-actions-empty"
          >
            No actions identified from Initial Assessment
          </p>
        ) : (
          <ul className="space-y-2" data-testid="care-plan-ia-actions-list">
            {iaActions.map((action) => (
              <li
                key={action.id}
                className="rounded-lg border border-border/80 bg-card shadow-sm"
                data-testid={`care-plan-ia-action-${action.id}`}
              >
                <div className="flex">
                  <div
                    className={cn(
                      'w-1 shrink-0 rounded-l-lg',
                      action.priority === 'URGENT' || action.priority === 'HIGH'
                        ? 'bg-destructive'
                        : action.priority === 'MEDIUM'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500',
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1 px-3.5 py-2.5">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <h4 className="text-[15px] font-semibold tracking-tight text-foreground">
                        {action.title}
                      </h4>
                      <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Read-only
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={
                          action.priority === 'URGENT' || action.priority === 'HIGH'
                            ? 'destructive'
                            : action.priority === 'MEDIUM'
                              ? 'warning'
                              : 'secondary'
                        }
                        size="sm"
                        className="font-medium"
                      >
                        {formatActionPriorityLabel(action.priority)}
                      </Badge>
                      <Badge variant="outline" size="sm" className="font-normal">
                        {formatActionStatusLabel(action.status)}
                      </Badge>
                      <Badge
                        variant="outline"
                        size="sm"
                        className="font-normal text-muted-foreground"
                      >
                        From Initial Assessment
                      </Badge>
                    </div>

                    {action.dueDateLabel ? (
                      <div className="mt-2 flex items-baseline gap-1.5 text-xs">
                        <span className="font-medium text-muted-foreground">Due</span>
                        <span className="text-foreground/90">{action.dueDateLabel}</span>
                      </div>
                    ) : null}

                    {action.reason ? (
                      <div className="mt-2 space-y-0.5 border-t border-border/50 pt-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Details
                        </p>
                        <p className="text-sm leading-snug text-foreground/90">{action.reason}</p>
                      </div>
                    ) : null}

                    <p
                      className="mt-2 text-xs text-muted-foreground"
                      data-testid={`care-plan-ia-action-source-${action.id}`}
                    >
                      {action.sourceLabel}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2" aria-labelledby="care-plan-manual-actions-heading">
        <div>
          <h3 id="care-plan-manual-actions-heading" className="text-sm font-semibold text-foreground">
            Additional Care Plan Actions
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Plan-specific actions (separate from Initial Assessment). Not configured yet.
          </p>
        </div>
        <p className="text-sm text-muted-foreground" data-testid="care-plan-manual-actions-empty">
          No additional care plan actions.
        </p>
      </section>
    </div>
  )
}

function CareHistorySection({
  serviceUserId,
  formId,
}: {
  serviceUserId: string
  formId: string
}) {
  const versionsQuery = useQuery({
    queryKey: [...serviceUserKeys.carePlan(serviceUserId), 'versions', formId] as const,
    queryFn: ({ signal }) => fetchCarePlanVersions(serviceUserId, formId, { signal }),
    enabled: Boolean(serviceUserId) && Boolean(formId),
    staleTime: 30_000,
  })

  const historyRows = React.useMemo(
    () => mapCarePlanVersionsToHistory(versionsQuery.data ?? []),
    [versionsQuery.data],
  )

  return (
    <div className="space-y-8" data-testid="care-plan-care-history">
      <section className="space-y-3" aria-labelledby="care-plan-version-history-heading">
        <div>
          <h3 id="care-plan-version-history-heading" className="text-sm font-semibold text-foreground">
            Care Plan History
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Published versions of this care plan. Read-only.
          </p>
        </div>

        {versionsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading care plan history…
          </div>
        ) : historyRows.length === 0 ? (
          <p
            className="rounded-sm border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground"
            data-testid="care-plan-history-empty"
          >
            No care plan history available yet.
          </p>
        ) : (
          <ul className="space-y-2" data-testid="care-plan-history-list">
            {historyRows.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-border/80 bg-card shadow-sm"
                data-testid={`care-plan-history-version-${row.id}`}
              >
                <div className="flex">
                  <div
                    className={cn(
                      'w-1 shrink-0 rounded-l-lg',
                      row.status === 'Current' ? 'bg-emerald-500' : 'bg-slate-300',
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1 px-3.5 py-2.5">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <h4 className="text-[15px] font-semibold tracking-tight text-foreground">
                        {row.versionLabel}
                      </h4>
                      <Badge
                        variant={row.status === 'Current' ? 'success' : 'secondary'}
                        size="sm"
                        className="font-medium"
                      >
                        {row.status}
                      </Badge>
                    </div>

                    <dl className="mt-2 grid gap-1.5 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="font-medium text-muted-foreground">Published</dt>
                        <dd className="text-foreground/90">{row.publishedAtLabel}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-muted-foreground">Published by</dt>
                        <dd className="text-foreground/90">{row.publishedByLabel}</dd>
                      </div>
                    </dl>

                    {row.summary ? (
                      <p className="mt-2 border-t border-border/50 pt-2 text-sm text-foreground/90">
                        {row.summary}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Phase 2: Visit Activity History — keep section shell for future integration. */}
      <section className="space-y-2" aria-labelledby="care-plan-visit-history-heading">
        <div>
          <h3 id="care-plan-visit-history-heading" className="text-sm font-semibold text-foreground">
            Visit Activity History
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Completed visit actions linked to this care plan (coming soon).
          </p>
        </div>
        <p className="text-sm text-muted-foreground" data-testid="care-plan-visit-history-placeholder">
          No visit activity history yet.
        </p>
      </section>
    </div>
  )
}

export type CarePlanFormSectionId =
  | 'review-summary'
  | 'assessment'
  | 'care-plan'
  | 'risk-profile'
  | 'body-map'
  | 'care-actions'
  | 'care-history'
  | 'consent-capacity'

const CARE_PLAN_FORM_SECTIONS: { id: CarePlanFormSectionId; label: string }[] = [
  { id: 'review-summary', label: 'Review Summary' },
  { id: 'assessment', label: 'Assessment' },
  { id: 'care-plan', label: 'Care Plan' },
  { id: 'risk-profile', label: 'Care Plan Risk Profile' },
  { id: 'body-map', label: 'Body Map' },
  { id: 'care-actions', label: 'Care Actions' },
  { id: 'care-history', label: 'Care History' },
  { id: 'consent-capacity', label: 'Consent and Mental Capacity' },
]

export function CarePlanFormFooter({
  onCancel,
  onPublish,
  onSaveDraft,
  saving,
  disabled,
}: {
  onCancel: () => void
  onPublish: () => void
  onSaveDraft: () => void
  saving?: boolean
  disabled?: boolean
}) {
  return (
    <div
      className="mt-6 flex flex-wrap items-center gap-3 border-t border-border bg-[#eef2f6] px-4 py-4 dark:bg-muted/30"
      data-testid="care-plan-form-save-footer"
    >
      <Button type="button" variant="outline" onClick={onCancel} disabled={saving || disabled}>
        Cancel
      </Button>
      <Button type="button" onClick={onPublish} disabled={saving || disabled}>
        Publish Care Plan
      </Button>
      <Button type="button" onClick={onSaveDraft} disabled={saving || disabled}>
        Save Care Plan As Draft
      </Button>
    </div>
  )
}

export function CarePlanFormWorkspace({
  serviceUserId,
  detail,
  form,
  values,
  onChange,
  disabled,
  onCancel,
  onPublish,
  onSaveDraft,
  saving,
  suggestions,
  ignoredSuggestionIds,
  composedFrom,
  onUseSuggestion,
  onIgnoreSuggestion,
  onKeepCurrentSuggestion,
  onEditSuggestion,
  defaultNextReviewDate,
  publishedNextReviewDueAt,
}: {
  serviceUserId: string
  detail: ServiceUserDetail | null
  form: CareFormDetail
  values: CarePlanDraftValues
  onChange: (v: CarePlanDraftValues) => void
  disabled?: boolean
  onCancel: () => void
  onPublish: () => void
  onSaveDraft: () => void
  saving?: boolean
  suggestions?: CarePlanFieldSuggestion[]
  ignoredSuggestionIds?: string[]
  composedFrom?: Record<string, unknown>
  onUseSuggestion?: (suggestion: CarePlanFieldSuggestion) => void
  onIgnoreSuggestion?: (suggestion: CarePlanFieldSuggestion) => void
  onKeepCurrentSuggestion?: (suggestion: CarePlanFieldSuggestion) => void
  onEditSuggestion?: (suggestion: CarePlanFieldSuggestion) => void
  defaultNextReviewDate?: string | null
  publishedNextReviewDueAt?: string | null
}) {
  const serviceUserName = serviceUserGivenName(detail)
  const consentDefaultName = serviceUserDisplayName(detail)
  const recordedByName = useAuthStore((s) => s.user?.displayName ?? 'Staff member')
  const published = metaBool(values, CARE_PLAN_META.published)
  const formName = form.name.replace(/\s+care plan$/i, '').trim() || form.name
  const [activeSection, setActiveSection] = React.useState<CarePlanFormSectionId>('review-summary')
  const activeLabel =
    CARE_PLAN_FORM_SECTIONS.find(s => s.id === activeSection)?.label ?? 'Care plan'

  return (
    <div data-testid="care-plan-form-workspace">
      {!published && (
        <div className="mb-4 flex items-start gap-3 rounded-sm border border-border bg-white px-4 py-3 shadow-sm">
          <div className="flex h-full min-h-[2.5rem] w-1 shrink-0 rounded-full bg-primary" />
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <p className="text-sm text-foreground">Please publish care plan to implement.</p>
          </div>
        </div>
      )}

      <div className="flex min-h-[min(70vh,640px)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm md:flex-row">
        <nav
          className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-border bg-muted/30 p-2 md:w-64 md:flex-col md:overflow-x-visible md:overflow-y-auto md:border-b-0 md:border-r md:p-2"
          aria-label="Care plan form sections"
          data-testid="care-plan-form-section-tabs"
        >
          {CARE_PLAN_FORM_SECTIONS.map(section => {
            const isActive = section.id === activeSection
            return (
              <button
                key={section.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                data-testid={`care-plan-form-tab-${section.id}`}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'shrink-0 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors md:w-full',
                  isActive
                    ? 'bg-card text-foreground shadow-sm ring-1 ring-border md:border-l-2 md:border-l-primary md:pl-[10px] md:ring-0'
                    : 'text-muted-foreground hover:bg-card/70 hover:text-foreground',
                )}
              >
                {section.label}
              </button>
            )
          })}
        </nav>

        <div
          className="min-w-0 flex-1 overflow-y-auto p-5"
          role="tabpanel"
          aria-label={activeLabel}
          data-testid={`care-plan-form-panel-${activeSection}`}
        >
          {activeSection === 'review-summary' && (
            <ReviewSummarySection
              serviceUserName={serviceUserName}
              consentDefaultName={consentDefaultName}
              values={values}
              onChange={onChange}
              disabled={disabled}
              defaultNextReviewDate={defaultNextReviewDate}
              publishedNextReviewDueAt={publishedNextReviewDueAt}
            />
          )}
          {activeSection === 'assessment' && (
            <CarePlanAssessmentSection
              carePlanFormName={formName}
              values={values}
              onChange={onChange}
              disabled={disabled}
              recordedByName={recordedByName}
              serviceUserId={serviceUserId}
              formId={form.id}
            />
          )}
          {activeSection === 'care-plan' && (
            <CarePlanMainSection
              form={form}
              values={values}
              onChange={onChange}
              disabled={disabled}
              suggestions={suggestions}
              ignoredSuggestionIds={ignoredSuggestionIds}
              composedFrom={composedFrom}
              onUseSuggestion={onUseSuggestion}
              onIgnoreSuggestion={onIgnoreSuggestion}
              onKeepCurrentSuggestion={onKeepCurrentSuggestion}
              onEditSuggestion={onEditSuggestion}
            />
          )}
          {activeSection === 'risk-profile' && (
            <RiskProfileSection
              serviceUserId={serviceUserId}
              values={values}
              onChange={onChange}
              disabled={disabled}
            />
          )}
          {activeSection === 'body-map' && <BodyMapSection serviceUserId={serviceUserId} />}
          {activeSection === 'care-actions' && <CareActionsSection serviceUserId={serviceUserId} />}
          {activeSection === 'care-history' && (
            <CareHistorySection serviceUserId={serviceUserId} formId={form.id} />
          )}
          {activeSection === 'consent-capacity' && (
            <CarePlanConsentCapacitySection
              serviceUserId={serviceUserId}
              serviceUserName={serviceUserName}
              values={values}
              onChange={onChange}
              disabled={disabled}
              recordedByName={recordedByName}
            />
          )}
        </div>
      </div>

      {!disabled && (
        <CarePlanFormFooter
          onCancel={onCancel}
          onPublish={onPublish}
          onSaveDraft={onSaveDraft}
          saving={saving}
        />
      )}
    </div>
  )
}
