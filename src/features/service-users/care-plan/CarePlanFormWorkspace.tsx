import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  ChevronRight,
  Eye,
  Info,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import type { CareFormDetail } from '@/features/care-pathway/types/care-pathway.types'
import type { ServiceUserDetail } from '@/features/service-users/types'
import { CarePathwayFormRenderer } from '@/features/service-users/care-plan/CarePathwayFormRenderer'
import { CarePlanAssessmentSection } from '@/features/service-users/care-plan/CarePlanAssessmentSection'
import { CarePlanConsentCapacitySection } from '@/features/service-users/care-plan/CarePlanConsentCapacitySection'
import { CarePlanFormAccordion } from '@/features/service-users/care-plan/CarePlanFormAccordion'
import {
  CARE_PLAN_META,
  DEFAULT_CARE_ACTIONS,
  DEFAULT_CARE_HISTORY,
  defaultCarePlanSummary,
  defaultReviewSummary,
  DEPENDENCY_LEVEL_OPTIONS,
  metaBool,
  metaString,
  parseRiskItems,
  serializeRiskItems,
  setMetaValue,
  type CarePlanReviewStatus,
  type CarePlanRiskItem,
} from '@/features/service-users/care-plan/care-plan-form-meta'
import type { CarePlanDraftValues } from '@/features/service-users/care-plan/care-plan-draft-storage'
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
}: {
  serviceUserName: string
  consentDefaultName: string
  values: CarePlanDraftValues
  onChange: (v: CarePlanDraftValues) => void
  disabled?: boolean
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
    metaString(values, CARE_PLAN_META.nextReviewDate) ||
    new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

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
          placeholder="Summarise the care plan for this area…"
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
}: {
  form: CareFormDetail
  values: CarePlanDraftValues
  onChange: (v: CarePlanDraftValues) => void
  disabled?: boolean
}) {
  return (
    <CarePathwayFormRenderer
      form={form}
      values={values}
      onChange={onChange}
      disabled={disabled}
      embedded
    />
  )
}

function RiskProfileSection({
  values,
  onChange,
  disabled,
}: {
  values: CarePlanDraftValues
  onChange: (v: CarePlanDraftValues) => void
  disabled?: boolean
}) {
  const items = parseRiskItems(values)

  const updateItems = (next: CarePlanRiskItem[]) => {
    onChange(setMetaValue(values, CARE_PLAN_META.riskItems, serializeRiskItems(next)))
  }

  const addItem = () => {
    updateItems([
      ...items,
      { id: crypto.randomUUID(), name: 'New risk' },
    ])
  }

  const removeItem = (id: string) => {
    updateItems(items.filter((i) => i.id !== id))
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled}
        onClick={addItem}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
        aria-label="Add risk"
      >
        <Plus className="h-4 w-4" />
      </button>
      {items.map((item) => (
        <details
          key={item.id}
          className="group overflow-hidden rounded-sm border border-border/80"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
              {item.name}
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
      ))}
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

function CareActionsSection() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Actions for Medication care plan</p>
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-3 py-2 font-medium">Action Name</th>
              <th className="px-3 py-2 font-medium">Designation</th>
              <th className="px-3 py-2 font-medium">Frequency</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {DEFAULT_CARE_ACTIONS.map((row) => (
              <tr key={row.id} className="border-b border-border bg-muted/20">
                <td className="px-3 py-3">{row.actionName}</td>
                <td className="px-3 py-3 text-muted-foreground">{row.designation || '—'}</td>
                <td className="px-3 py-3">{row.frequency}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button type="button" className="text-muted-foreground hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" className="text-destructive hover:opacity-80">
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-white"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="text-sm font-medium text-destructive hover:underline">
        Add an action
      </button>
    </div>
  )
}

function CareHistorySection() {
  const [page, setPage] = React.useState(1)
  const rows = DEFAULT_CARE_HISTORY
  const total = 14
  const pageSize = rows.length

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Action History</p>
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-muted-foreground">
              <th className="px-2 py-2 font-medium">Date</th>
              <th className="px-2 py-2 font-medium">Time</th>
              <th className="px-2 py-2 font-medium">Event</th>
              <th className="px-2 py-2 font-medium">Action</th>
              <th className="px-2 py-2 font-medium">Employee</th>
              <th className="px-2 py-2 font-medium">Checklist</th>
              <th className="px-2 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border">
                <td className="px-2 py-2">{row.date}</td>
                <td className="px-2 py-2">{row.time}</td>
                <td className="px-2 py-2">{row.event}</td>
                <td className="px-2 py-2">{row.action}</td>
                <td className="px-2 py-2">{row.employee}</td>
                <td className="px-2 py-2 text-muted-foreground">{row.checklist}</td>
                <td className="px-2 py-2">
                  <button type="button" className="text-muted-foreground hover:text-foreground">
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          Showing 1 to {pageSize} of {total} entries
        </span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1}>
            Previous
          </Button>
          <Button type="button" size="sm" className="min-w-8 bg-destructive hover:bg-destructive/90">
            {page}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

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
}) {
  const serviceUserName = serviceUserGivenName(detail)
  const consentDefaultName = serviceUserDisplayName(detail)
  const recordedByName = useAuthStore((s) => s.user?.displayName ?? 'Staff member')
  const published = metaBool(values, CARE_PLAN_META.published)
  const formName = form.name.replace(/\s+care plan$/i, '').trim() || form.name

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

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="space-y-3">
          <CarePlanFormAccordion title="Review Summary" defaultOpen>
            <ReviewSummarySection
              serviceUserName={serviceUserName}
              consentDefaultName={consentDefaultName}
              values={values}
              onChange={onChange}
              disabled={disabled}
            />
          </CarePlanFormAccordion>

          <CarePlanFormAccordion title="Assessment">
            <CarePlanAssessmentSection
              carePlanFormName={formName}
              values={values}
              onChange={onChange}
              disabled={disabled}
              recordedByName={recordedByName}
              serviceUserId={serviceUserId}
              formId={form.id}
            />
          </CarePlanFormAccordion>

          <CarePlanFormAccordion title="Care Plan" defaultOpen>
            <CarePlanMainSection
              form={form}
              values={values}
              onChange={onChange}
              disabled={disabled}
            />
          </CarePlanFormAccordion>

          <CarePlanFormAccordion title="Care Plan Risk Profile">
            <RiskProfileSection values={values} onChange={onChange} disabled={disabled} />
          </CarePlanFormAccordion>
        </div>

        <div className="space-y-3">
          <CarePlanFormAccordion title="Body Map">
            <BodyMapSection serviceUserId={serviceUserId} />
          </CarePlanFormAccordion>

          <CarePlanFormAccordion title="Care Actions">
            <CareActionsSection />
          </CarePlanFormAccordion>

          <CarePlanFormAccordion title="Care History">
            <CareHistorySection />
          </CarePlanFormAccordion>

          <CarePlanFormAccordion title="Consent and Mental Capacity" defaultOpen>
            <CarePlanConsentCapacitySection
              serviceUserName={serviceUserName}
              values={values}
              onChange={onChange}
              disabled={disabled}
              recordedByName={recordedByName}
            />
          </CarePlanFormAccordion>
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
