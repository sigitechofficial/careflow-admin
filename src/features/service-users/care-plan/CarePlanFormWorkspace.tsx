import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Unlink,
} from 'lucide-react'
import type { CareFormDetail } from '@/features/care-pathway/types/care-pathway.types'
import type { ServiceUserDetail } from '@/features/service-users/types'
import { CarePlanRichTextField } from '@/features/service-users/care-plan/CarePlanRichTextField'
import { CarePathwayFormRenderer } from '@/features/service-users/care-plan/CarePathwayFormRenderer'
import { CarePlanAssessmentSection } from '@/features/service-users/care-plan/CarePlanAssessmentSection'
import { CarePlanConsentCapacitySection } from '@/features/service-users/care-plan/CarePlanConsentCapacitySection'
import {
  applyManualRiskItems,
  displayNameForIaRisk,
  formatRiskLevelLabel,
  selectIaRiskReason,
  type CarePlanIaRiskDisplay,
  mapIaRiskRecordsForCarePlanProfile,
  manualRiskItemsFromDraft,
} from '@/features/service-users/care-plan/care-plan-risk-profile.util'
import { createClientUuid } from '@/shared/lib/create-client-uuid'
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
  useCarePlanRisks,
  useCarePlanRisksAction,
} from '@/features/service-users/care-plans/hooks/useServiceUserCarePlanInstances'
import type { RiskReviewActionInput } from '@/features/service-users/care-plans/components/CarePlanRiskReviewPanel'
import type { CarePlanRiskSummary } from '@/features/service-users/care-plans/types'
import type { InitialAssessmentRiskRecord } from '@/features/service-users/initial-assessment/types'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
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
  serializeRiskItems,
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
import { SectionIntro } from '@/shared/ui/section-intro'
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

import { formatOrganisationDay } from '@/shared/lib/organisation-display-format.store'
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
              active && opt === 'Active' && 'bg-destructive text-destructive-foreground',
              active && opt !== 'Active' && 'bg-muted text-foreground',
              !active && 'bg-white dark:bg-card text-foreground hover:bg-muted/50',
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
          Review and evaluation summary
        </FieldLabel>
        <CarePlanRichTextField
          className="[&_.summernote-custom-wrap]:rounded-sm [&_.summernote-custom-wrap]:border-sky-200"
          value={summary}
          disabled={disabled}
          placeholder={REVIEW_SUMMARY_PLACEHOLDER}
          minHeight={120}
          onChange={(html) =>
            onChange(setMetaValue(values, CARE_PLAN_META.reviewSummary, html))
          }
        />
      </div>

      <div>
        <FieldLabel>Care plan summary</FieldLabel>
        <CarePlanRichTextField
          value={carePlanSummary}
          disabled={disabled}
          placeholder={CARE_PLAN_SUMMARY_PLACEHOLDER}
          minHeight={120}
          onChange={(html) =>
            onChange(setMetaValue(values, CARE_PLAN_META.carePlanSummary, html))
          }
        />
      </div>

      <div>
        <FieldLabel>Consent for care plan</FieldLabel>
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
        <FieldLabel required>Next review date:</FieldLabel>
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

/** Card data for a linked assessment risk that is not in the latest assessment's records. */
function linkedRiskDisplay(risk: CarePlanRiskSummary): CarePlanIaRiskDisplay {
  const record = {
    riskType: risk.riskType as InitialAssessmentRiskRecord['riskType'],
    description: risk.description,
    sourceQuestionText: null,
  }
  return {
    id: risk.id,
    name: displayNameForIaRisk(record),
    riskLevel: risk.riskLevel,
    reason: selectIaRiskReason(record),
    status: risk.status,
    source: 'initial_assessment',
    sourceLabel: 'Source: Initial Assessment',
  }
}

function RiskProfileSection({
  serviceUserId,
  formId,
  values,
  onChange,
  disabled,
  risksSaved,
  savedRiskItems,
  onSave,
  saving,
}: {
  serviceUserId: string
  formId: string
  values: CarePlanDraftValues
  onChange: (v: CarePlanDraftValues) => void
  disabled?: boolean
  /** True when the other risks match what was last saved. */
  risksSaved: boolean
  /** Other risks as last saved; these also show in the list at the top. */
  savedRiskItems: CarePlanRiskItem[]
  onSave: () => void
  saving?: boolean
}) {
  const iaSource = useCarePlanIaSource(serviceUserId)
  const submissionId = iaSource.submission?.id ?? null
  const recordsQuery = useInitialAssessmentRiskRecords(
    serviceUserId,
    submissionId,
    iaSource.canRead && Boolean(submissionId),
  )

  const linksQuery = useCarePlanRisks(serviceUserId, formId)
  const linkAction = useCarePlanRisksAction(serviceUserId, formId)
  const canApprove = useAuthStore((s) => s.can('service_users.care_plan.approve'))
  const canLink = canApprove && !disabled && Boolean(linksQuery.data)
  const [riskToLink, setRiskToLink] = React.useState('')

  // Only the assessment risks linked to this care plan (Link risk), not every risk of the person.
  const iaRisks = React.useMemo(() => {
    const latest = mapIaRiskRecordsForCarePlanProfile(recordsQuery.data ?? [], {
      submittedAt: iaSource.submission?.submittedAt,
    })
    return (linksQuery.data?.links ?? [])
      .filter((link) => link.risk.status !== 'CLOSED')
      .map((link) => ({
        ...(latest.find((r) => r.id === link.risk.id) ?? linkedRiskDisplay(link.risk)),
        linkId: link.id,
        needsReview: link.status === 'REVIEW_REQUIRED',
      }))
  }, [recordsQuery.data, iaSource.submission?.submittedAt, linksQuery.data])

  const runLinkAction = (input: RiskReviewActionInput, done: string) => {
    void linkAction
      .mutateAsync(input)
      .then(() => toastSuccess(done))
      .catch((e) => toastApiError(e, 'Could not update linked risks'))
  }
  const manualItems = manualRiskItemsFromDraft(values)
  // Saved risks are shown as cards in the list above; only new or opened ones are forms below.
  const [editingIds, setEditingIds] = React.useState<Set<string>>(() => new Set())
  React.useEffect(() => {
    setEditingIds(new Set())
  }, [savedRiskItems])
  const savedById = new Map(savedRiskItems.map((i) => [i.id, i]))
  const isSettled = (i: CarePlanRiskItem) =>
    savedById.has(i.id) && !editingIds.has(i.id) && Boolean(i.name.trim())
  const savedManual = manualItems.filter(isSettled)
  const formItems = manualItems.filter((i) => !isSettled(i))

  const startEdit = (id: string) => {
    setEditingIds((prev) => new Set(prev).add(id))
    requestAnimationFrame(() =>
      document
        .querySelector(`[data-risk-form-id="${id}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    )
  }

  const cancelEdit = (id: string) => {
    const saved = savedById.get(id)
    if (saved) updateItems(manualItems.map((i) => (i.id === id ? saved : i)))
    setEditingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const updateItems = (next: CarePlanRiskItem[]) => {
    onChange(applyManualRiskItems(values, next))
  }

  const addItem = () => {
    updateItems([...manualItems, { id: createClientUuid(), name: '', howToReduce: '' }])
  }

  const removeItem = (id: string) => {
    updateItems(manualItems.filter((i) => i.id !== id))
  }

  const editItem = (id: string, patch: Partial<CarePlanRiskItem>) => {
    updateItems(manualItems.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  const iaLoading =
    iaSource.submissionsQuery.isLoading ||
    (Boolean(submissionId) && recordsQuery.isLoading) ||
    linksQuery.isLoading

  return (
    <div className="space-y-8" data-testid="care-plan-risk-profile">
      <SectionIntro
        testId="care-plan-risk-profile-intro"
        purpose="What could harm this person, so staff know what to watch for."
        steps={[
          'Only the assessment risks that belong to this care plan show here. Pick them with "Link an assessment risk" below the list.',
          'Each care plan has its own list, so a falls risk can sit on the Falls care plan and not on the others.',
          'You link a risk once. When a new assessment records the same risk again, it stays linked by itself; if it changed, it shows "Needs review".',
          'Add any other risk with "Add a risk": write what the risk is and how staff keep the person safe, then click "Save risks".',
        ]}
      />
      <section className="space-y-3" aria-labelledby="care-plan-ia-risks-heading">
        <div>
          <h3 id="care-plan-ia-risks-heading" className="text-sm font-semibold text-foreground">
            Identified risks
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Assessment risks linked to this care plan, plus the saved risks added on this care plan.
          </p>
        </div>

        {iaLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading assessment risks…
          </div>
        ) : iaRisks.length === 0 && savedManual.length === 0 ? (
          <p
            className="rounded-sm border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground"
            data-testid="care-plan-ia-risks-empty"
          >
            No risks linked to this care plan yet.
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
                        From initial assessment
                      </Badge>
                      {risk.needsReview ? (
                        <Badge variant="warning" size="sm" className="font-medium">
                          Needs review
                        </Badge>
                      ) : null}
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
                    {canLink ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="mt-2 px-0 text-muted-foreground hover:bg-transparent hover:text-destructive"
                        disabled={linkAction.isPending}
                        onClick={() =>
                          runLinkAction({ action: 'unlink', linkId: risk.linkId }, 'Risk removed from this care plan')
                        }
                        data-testid={`care-plan-ia-risk-unlink-${risk.id}`}
                      >
                        <Unlink className="mr-1.5 h-4 w-4" aria-hidden />
                        Remove from this care plan
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
            {savedManual.map((risk) => (
              <li
                key={risk.id}
                className="rounded-lg border border-border/80 bg-card shadow-sm"
                data-testid={`care-plan-saved-manual-risk-${risk.id}`}
              >
                <div className="flex">
                  <div className="w-1 shrink-0 rounded-l-lg bg-sky-500" aria-hidden />
                  <div className="min-w-0 flex-1 px-4 py-3.5">
                    <h4 className="text-[15px] font-semibold tracking-tight text-foreground">
                      {risk.name}
                    </h4>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" size="sm" className="font-normal text-muted-foreground">
                        Added on this care plan
                      </Badge>
                    </div>
                    {risk.howToReduce?.trim() ? (
                      <div className="mt-3 space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          How staff keep the person safe
                        </p>
                        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                          {risk.howToReduce}
                        </p>
                      </div>
                    ) : null}
                    {disabled ? null : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(risk.id)}
                          data-testid={`care-plan-saved-manual-risk-edit-${risk.id}`}
                        >
                          <Pencil className="mr-1.5 h-4 w-4" aria-hidden />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeItem(risk.id)}
                          data-testid={`care-plan-saved-manual-risk-remove-${risk.id}`}
                        >
                          <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {canLink && linksQuery.data && linksQuery.data.availableRisks.length > 0 ? (
          <div className="flex flex-wrap items-end gap-2" data-testid="care-plan-ia-risk-link">
            <label className="min-w-[16rem] flex-1 space-y-1">
              <span className="text-sm font-medium text-foreground">Link an assessment risk</span>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={riskToLink}
                onChange={(e) => setRiskToLink(e.target.value)}
              >
                <option value="">Choose a risk from the assessment…</option>
                {linksQuery.data.availableRisks.map((r) => (
                  <option key={r.id} value={r.id}>
                    {linkedRiskDisplay(r).name} — {formatRiskLevelLabel(r.riskLevel)} — {r.description.slice(0, 60)}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!riskToLink || linkAction.isPending}
              onClick={() => {
                runLinkAction({ action: 'link', riskRecordId: riskToLink }, 'Risk linked to this care plan')
                setRiskToLink('')
              }}
            >
              <Link2 className="mr-1.5 h-4 w-4" aria-hidden />
              Link risk
            </Button>
          </div>
        ) : null}
      </section>

      <section className="space-y-3" aria-labelledby="care-plan-manual-risks-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="care-plan-manual-risks-heading" className="text-sm font-semibold text-foreground">
              Other risks for this care plan
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add a risk the assessment did not find. Write what the risk is and how staff keep the
              person safe, then click Save risks.
            </p>
          </div>
          {disabled ? null : (
            <Button
              type="button"
              size="sm"
              onClick={addItem}
              data-testid="care-plan-manual-risk-add"
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              Add a risk
            </Button>
          )}
        </div>

        {manualItems.length === 0 ? (
          <p
            className="rounded-sm border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground"
            data-testid="care-plan-manual-risks-empty"
          >
            No other risks added.
          </p>
        ) : formItems.length === 0 ? null : (
          <ul className="space-y-3" data-testid="care-plan-manual-risks-list">
            {formItems.map((item, index) => (
              <li
                key={item.id}
                className="space-y-3 rounded-md border border-border/80 bg-card p-4 shadow-sm"
                data-testid={`care-plan-manual-risk-${index + 1}`}
                data-risk-form-id={item.id}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {savedById.has(item.id) ? 'Edit risk' : 'New risk'}
                  </p>
                  {disabled ? null : savedById.has(item.id) && editingIds.has(item.id) ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      onClick={() => cancelEdit(item.id)}
                    >
                      Cancel edit
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 text-destructive hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
                      Remove
                    </Button>
                  )}
                </div>

                <label className="block space-y-1">
                  <span className="text-sm font-medium text-foreground">What is the risk?</span>
                  {disabled ? (
                    <p className="text-sm text-foreground/90">{item.name || '—'}</p>
                  ) : (
                    <Input
                      value={item.name}
                      placeholder="e.g. Might fall when getting up at night"
                      onChange={(e) => editItem(item.id, { name: e.target.value })}
                    />
                  )}
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium text-foreground">
                    How do staff keep the person safe?
                  </span>
                  {disabled ? (
                    <p className="whitespace-pre-line text-sm text-foreground/90">
                      {item.howToReduce?.trim() || '—'}
                    </p>
                  ) : (
                    <textarea
                      value={item.howToReduce ?? ''}
                      rows={3}
                      placeholder="e.g. Leave a night light on and keep the walking frame next to the bed."
                      className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onChange={(e) => editItem(item.id, { howToReduce: e.target.value })}
                    />
                  )}
                </label>
              </li>
            ))}
          </ul>
        )}

        {disabled ? null : !risksSaved ? (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
            data-testid="care-plan-manual-risks-save-note"
            role="note"
          >
            <span className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>Your risk changes are not saved yet.</span>
            </span>
            <Button
              type="button"
              size="sm"
              onClick={onSave}
              disabled={saving}
              data-testid="care-plan-manual-risks-save"
            >
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : null}
              Save risks
            </Button>
          </div>
        ) : savedManual.length > 0 ? (
          <p
            className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400"
            data-testid="care-plan-manual-risks-saved"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            Risks saved. They show in the Identified risks list above.
          </p>
        ) : null}
      </section>
    </div>
  )
}

function formatBodyMapDate(iso: string | null | undefined): string {
  return iso ? String(formatOrganisationDay(iso)) : '—'
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
          <span className="text-sm text-muted-foreground">Issue type</span>
          <Select
            value={issueType}
            onValueChange={(v) => setIssueType(v as 'all' | BodyMapRecordTypeCode)}
          >
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All issues</SelectItem>
              {BODY_MAP_RECORD_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show cleared</span>
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
              <th className="px-3 py-2 font-medium">Issue type</th>
              <th className="px-3 py-2 font-medium">Issue at</th>
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
      <SectionIntro
        testId="care-plan-care-actions-intro"
        purpose="A to-do list of jobs for this person that are not done yet, so nothing important is forgotten."
        steps={[
          'Example: the assessment says there is a DNACPR form, so a job is made to check the form.',
          'Jobs are made by themselves when the Initial Assessment is submitted. Staff can also add them there.',
          'Do Urgent and High jobs first. Each job shows when it is due.',
          'This page only shows the list. To mark a job done or add a new one, go to the Initial Assessment, "Actions & care plans" tab, Action register.',
          'These are one-off jobs, not visit tasks. Visit tasks (like giving meals or medicines) are done on every visit.',
        ]}
      />
      <section className="space-y-3" aria-labelledby="care-plan-ia-actions-heading">
        <div>
          <h3 id="care-plan-ia-actions-heading" className="text-sm font-semibold text-foreground">
            Actions from initial assessment
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Jobs not done yet, from the latest Initial Assessment. You can only view them here.
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
            No actions identified from the initial assessment
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
                        From initial assessment
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
            Additional care plan actions
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
      <SectionIntro
        testId="care-plan-care-history-intro"
        purpose="A record of every version of this care plan."
        steps={[
          'Each time the care plan is published, a new version is added here with the date and who published it.',
          'The newest version is marked "Current". Older versions are kept so you can see what changed.',
        ]}
      />
      <section className="space-y-3" aria-labelledby="care-plan-version-history-heading">
        <div>
          <h3 id="care-plan-version-history-heading" className="text-sm font-semibold text-foreground">
            Care plan history
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

      {/* Phase 2: Visit activity history — keep section shell for future integration. */}
      <section className="space-y-2" aria-labelledby="care-plan-visit-history-heading">
        <div>
          <h3 id="care-plan-visit-history-heading" className="text-sm font-semibold text-foreground">
            Visit activity history
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
  { id: 'review-summary', label: 'Review summary' },
  { id: 'assessment', label: 'Assessment' },
  { id: 'care-plan', label: 'Care plan' },
  { id: 'risk-profile', label: 'Care plan risk profile' },
  { id: 'body-map', label: 'Body map' },
  { id: 'care-actions', label: 'Care actions' },
  { id: 'care-history', label: 'Care history' },
  { id: 'consent-capacity', label: 'Consent and mental capacity' },
]

export function CarePlanFormFooter({
  onCancel,
  onPublish,
  onSaveDraft,
  saving,
  disabled,
  publishLabel = 'Publish care plan',
}: {
  onCancel: () => void
  onPublish: () => void
  onSaveDraft: () => void
  saving?: boolean
  disabled?: boolean
  /** e.g. "Submit for approval" / "Publish approved plan" when approval is required. */
  publishLabel?: string
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
        {publishLabel}
      </Button>
      <Button type="button" onClick={onSaveDraft} disabled={saving || disabled}>
        Save care plan as draft
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
  publishLabel,
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
  publishLabel?: string
  /** Resolves true when the draft was saved. */
  onSaveDraft: () => Promise<boolean>
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

  // Other risks as last saved, so the risk section can say whether they are saved.
  const currentRisks = serializeRiskItems(manualRiskItemsFromDraft(values))
  const [savedRisks, setSavedRisks] = React.useState(currentRisks)
  const savedRiskItems = React.useMemo(() => JSON.parse(savedRisks) as CarePlanRiskItem[], [savedRisks])
  const saveDraft = async () => {
    const snapshot = currentRisks
    if (await onSaveDraft()) setSavedRisks(snapshot)
  }

  return (
    <div data-testid="care-plan-form-workspace">
      {!published && (
        <div className="mb-4 flex items-start gap-3 rounded-sm border border-border bg-white dark:bg-card px-4 py-3 shadow-sm">
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
              formId={form.id}
              values={values}
              onChange={onChange}
              disabled={disabled}
              risksSaved={currentRisks === savedRisks}
              savedRiskItems={savedRiskItems}
              onSave={() => void saveDraft()}
              saving={saving}
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
          onSaveDraft={() => void saveDraft()}
          saving={saving}
          publishLabel={publishLabel}
        />
      )}
    </div>
  )
}
