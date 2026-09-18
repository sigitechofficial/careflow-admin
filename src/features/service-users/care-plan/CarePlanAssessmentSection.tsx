import * as React from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { HelpCircle, Loader2 } from 'lucide-react'
import { getCareForm } from '@/features/care-pathway/api/form-builder.api'
import { listSelectableForms } from '@/features/care-pathway/api/form-selection.api'
import { carePathwayKeys } from '@/features/care-pathway/keys'
import type { CareFormDetail } from '@/features/care-pathway/types/care-pathway.types'
import { CarePlanRichTextField } from '@/features/service-users/care-plan/CarePlanRichTextField'
import { CarePathwayFormRenderer } from '@/features/service-users/care-plan/CarePathwayFormRenderer'
import { CarePlanFormAccordion } from '@/features/service-users/care-plan/CarePlanFormAccordion'
import { createClientUuid } from '@/shared/lib/create-client-uuid'
import {
  appendAssessmentHistory,
  applyAssessmentSnapshot,
  assessmentFieldKey,
  assessmentHistoryFor,
  collectAssessmentSnapshot,
  defaultAssessmentIdForCarePlan,
  getAssessmentField,
  parseSelectedAssessmentIds,
  setAssessmentField,
  setSelectedAssessmentIds,
  type AssessmentHistoryEntry,
  type AssessmentHistoryRow,
} from '@/features/service-users/care-plan/care-plan-assessment-meta'
import type { CarePlanDraftValues } from '@/features/service-users/care-plan/care-plan-draft-storage'
import { saveCarePlanDraft } from '@/features/service-users/care-plan/care-plan-draft-storage'
import {
  CHECKLIST_YNNA_OPTIONS,
  MEDICATION_ASSESSMENT_SECTION_INFO,
  MEDICATION_HOME_CARE_ASSESSMENT_FIELDS,
  type MedicationAssessmentField,
} from '@/features/service-users/care-plan/medication-home-care-assessment-fields'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/form-field'
import { MultiSelect } from '@/shared/ui/multi-select'
import { NoYesToggle } from '@/shared/ui/no-yes-toggle'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { cn, formatDate, formatTime } from '@/shared/lib/utils'
import { toastError, toastSuccess } from '@/shared/lib/toast'

function careFormHasRenderableFields(form: CareFormDetail | undefined): boolean {
  return Boolean(form?.sections?.some((section) => section.fields.length > 0))
}

function isMedicationHomeCareAssessment(name: string): boolean {
  return name.toLowerCase().includes('medication') && name.toLowerCase().includes('home care')
}

function FieldHelp({ text }: { text?: string }) {
  if (!text) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 rounded-full text-primary hover:opacity-80"
          aria-label="Field help"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm text-xs leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

function MedicationAssessmentFields({
  assessmentId,
  values,
  onChange,
  disabled,
}: {
  assessmentId: string
  values: CarePlanDraftValues
  onChange: (v: CarePlanDraftValues) => void
  disabled?: boolean
}) {
  const branchValue = (fieldId: string) => {
    const v = values[assessmentFieldKey(assessmentId, fieldId)]
    return v === true || v === 'true'
  }

  const renderField = (field: MedicationAssessmentField) => {
    if (field.kind === 'textarea') {
      return (
        <div key={field.id} className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label className="text-sm font-normal text-muted-foreground">{field.label}</Label>
            <FieldHelp text={field.help} />
          </div>
          <CarePlanRichTextField
            disabled={disabled}
            value={getAssessmentField(values, assessmentId, field.id)}
            onChange={(html) =>
              onChange(setAssessmentField(values, assessmentId, field.id, html))
            }
            minHeight={Math.max(76, (field.rows ?? 3) * 28)}
          />
        </div>
      )
    }

    if (field.kind === 'branch') {
      const active = branchValue(field.id)
      return (
        <div key={field.id} className="space-y-3 rounded-sm border border-border/60 bg-muted/10 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-1.5">
              <Label className="text-sm font-normal leading-snug text-muted-foreground">
                {field.label}
              </Label>
              <FieldHelp text={field.help} />
            </div>
            <NoYesToggle
              value={active}
              disabled={disabled}
              labelOff={field.offLabel}
              labelOn={field.onLabel}
              onChange={(v) => onChange(setAssessmentField(values, assessmentId, field.id, v))}
              className="shrink-0"
            />
          </div>
          {field.followUp?.map((follow) => (
            <div key={follow.id} className="space-y-1.5 border-t border-border/50 pt-3">
              <div className="flex items-center gap-1.5">
                <Label className="text-sm font-normal text-muted-foreground">{follow.label}</Label>
                <FieldHelp text={follow.help} />
              </div>
              <CarePlanRichTextField
                disabled={disabled}
                value={getAssessmentField(values, assessmentId, follow.id)}
                onChange={(html) =>
                  onChange(setAssessmentField(values, assessmentId, follow.id, html))
                }
                minHeight={96}
              />
            </div>
          ))}
        </div>
      )
    }

    return (
      <div key={field.id} className="space-y-1.5">
        <Label className="text-sm font-normal leading-snug text-muted-foreground">{field.label}</Label>
        <Select
          value={getAssessmentField(values, assessmentId, field.id) || undefined}
          disabled={disabled}
          onValueChange={(v) => onChange(setAssessmentField(values, assessmentId, field.id, v))}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Please select from following options" />
          </SelectTrigger>
          <SelectContent>
            {CHECKLIST_YNNA_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="rounded-sm border border-sky-100 bg-sky-50/40 px-3 py-3 text-sm leading-relaxed text-muted-foreground">
        {MEDICATION_ASSESSMENT_SECTION_INFO}
      </p>
      {MEDICATION_HOME_CARE_ASSESSMENT_FIELDS.map(renderField)}
    </div>
  )
}

function AssessmentHistoryTable({
  rows,
  onView,
  disabled,
}: {
  rows: AssessmentHistoryRow[]
  onView?: (entryId: string) => void
  disabled?: boolean
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-sm border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
        No saved assessment history yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-sm border border-border">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead className="border-b border-border bg-muted/30 text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Time</th>
            <th className="px-3 py-2 font-medium">Recorded by</th>
            <th className="px-3 py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/60">
              <td className="px-3 py-2">{row.date}</td>
              <td className="px-3 py-2">{row.time}</td>
              <td className="px-3 py-2">{row.recordedBy}</td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onView?.(row.id)}
                  className="text-primary hover:underline disabled:opacity-50"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AssessmentFormPanel({
  assessmentId,
  assessmentName,
  form,
  formLoading,
  values,
  onChange,
  disabled,
  recordedByName,
  serviceUserId,
  formId,
}: {
  assessmentId: string
  assessmentName: string
  form: CareFormDetail | undefined
  formLoading: boolean
  values: CarePlanDraftValues
  onChange: (v: CarePlanDraftValues) => void
  disabled?: boolean
  recordedByName: string
  serviceUserId: string
  formId: string
}) {
  const useApiForm = careFormHasRenderableFields(form)
  const useMedicationStatic = !useApiForm && isMedicationHomeCareAssessment(assessmentName)
  const history = React.useMemo(
    () => assessmentHistoryFor(values, assessmentId),
    [assessmentId, values],
  )

  const loadHistoryEntry = (entryId: string) => {
    const entry = history.find((row) => row.id === entryId)
    if (!entry) return
    onChange(applyAssessmentSnapshot(values, entry.snapshot))
    toastSuccess(`Loaded assessment from ${entry.date}.`)
  }

  const handleUpdateAssessment = () => {
    const latest = history[0]
    if (!latest) {
      toastError('No previous assessment to load.')
      return
    }
    onChange(applyAssessmentSnapshot(values, latest.snapshot))
    toastSuccess('Previous assessment loaded.')
  }

  const handleSaveAssessment = () => {
    const now = new Date()
    const entry: AssessmentHistoryEntry = {
      id: createClientUuid(),
      assessmentId,
      date: formatDate(now),
      time: formatTime(now),
      recordedBy: recordedByName,
      snapshot: collectAssessmentSnapshot(values, assessmentId),
    }
    const next = appendAssessmentHistory(values, entry)
    onChange(next)
    if (serviceUserId && formId) {
      saveCarePlanDraft(serviceUserId, formId, next)
    }
    toastSuccess('Assessment saved.')
  }

  return (
    <CarePlanFormAccordion title={assessmentName} defaultOpen>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" disabled={disabled} onClick={handleUpdateAssessment}>
            Update Assessment
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-primary" aria-label="Assessment help">
                <HelpCircle className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              Retrieve information from previous assessment
            </TooltipContent>
          </Tooltip>
        </div>

        {formLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : useApiForm && form ? (
          <CarePathwayFormRenderer
            form={form}
            values={values}
            onChange={onChange}
            disabled={disabled}
            embedded
          />
        ) : useMedicationStatic ? (
          <MedicationAssessmentFields
            assessmentId={assessmentId}
            values={values}
            onChange={onChange}
            disabled={disabled}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {form?.description?.trim() ||
              'This assessment form has not been configured with fields yet.'}
          </p>
        )}

        <div className="space-y-3 border-t border-border pt-4">
          <Button type="button" size="sm" disabled={disabled} onClick={handleSaveAssessment}>
            Save Assessment
          </Button>
          <AssessmentHistoryTable
            rows={history}
            disabled={disabled}
            onView={loadHistoryEntry}
          />
        </div>
      </div>
    </CarePlanFormAccordion>
  )
}

export function CarePlanAssessmentSection({
  carePlanFormName,
  values,
  onChange,
  disabled,
  recordedByName,
  serviceUserId,
  formId,
}: {
  carePlanFormName: string
  values: CarePlanDraftValues
  onChange: (v: CarePlanDraftValues) => void
  disabled?: boolean
  recordedByName: string
  serviceUserId: string
  formId: string
}) {
  const assessmentsQuery = useQuery({
    queryKey: carePathwayKeys.selectableForms('assessments'),
    queryFn: () => listSelectableForms('assessments', { limit: 100 }),
  })

  const options = React.useMemo(
    () =>
      (assessmentsQuery.data ?? []).map((a) => ({
        value: a.id,
        label: a.name.trim(),
      })),
    [assessmentsQuery.data],
  )

  const selectedIds = parseSelectedAssessmentIds(values)

  React.useEffect(() => {
    if (selectedIds.length > 0 || options.length === 0) return
    const defaultId = defaultAssessmentIdForCarePlan(
      carePlanFormName,
      options.map((o) => ({ id: o.value, name: o.label })),
    )
    if (defaultId) {
      onChange(setSelectedAssessmentIds(values, [defaultId]))
    }
  }, [carePlanFormName, options, onChange, selectedIds.length, values])

  const formQueries = useQueries({
    queries: selectedIds.map((id) => ({
      queryKey: carePathwayKeys.formDetail(id),
      queryFn: () => getCareForm(id),
      enabled: Boolean(id),
      staleTime: 60_000,
    })),
  })

  const formsById = React.useMemo(() => {
    const map = new Map<string, CareFormDetail>()
    selectedIds.forEach((id, index) => {
      const data = formQueries[index]?.data
      if (data) map.set(id, data)
    })
    return map
  }, [formQueries, selectedIds])

  const loadingById = React.useMemo(() => {
    const map = new Map<string, boolean>()
    selectedIds.forEach((id, index) => {
      map.set(id, formQueries[index]?.isLoading ?? false)
    })
    return map
  }, [formQueries, selectedIds])

  const labelById = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const opt of options) map.set(opt.value, opt.label)
    return map
  }, [options])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {assessmentsQuery.isLoading ? (
          <div className="flex min-h-[44px] items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading assessments…
          </div>
        ) : (
          <MultiSelect
            options={options}
            value={selectedIds}
            disabled={disabled}
            placeholder="Select assessment tools…"
            searchPlaceholder="Search assessments…"
            onChange={(next) => onChange(setSelectedAssessmentIds(values, next))}
            className={cn('rounded-sm')}
          />
        )}

        {selectedIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Select one or more assessment tools to complete for this care plan.
          </p>
        ) : (
          selectedIds.map((id) => (
            <AssessmentFormPanel
              key={id}
              assessmentId={id}
              assessmentName={labelById.get(id) ?? 'Assessment'}
              form={formsById.get(id)}
              formLoading={loadingById.get(id) ?? false}
              values={values}
              onChange={onChange}
              disabled={disabled}
              recordedByName={recordedByName}
              serviceUserId={serviceUserId}
              formId={formId}
            />
          ))
        )}
      </div>
    </TooltipProvider>
  )
}
