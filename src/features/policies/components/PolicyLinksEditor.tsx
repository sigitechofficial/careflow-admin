import * as React from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useSelectableForms } from '@/features/care-pathway/hooks/useCarePathwayTabs'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useIncidents } from '@/features/incidents/hooks/useIncidents'
import { useLearningCourses } from '@/features/learning/hooks/useLearning'
import { useDebouncedValue } from '@/features/policies/hooks/useDebouncedValue'
import {
  emptyPolicyLink,
  isDuplicatePolicyLink,
  scopesForModule,
} from '@/features/policies/policy-link-rules'
import { moduleLabel, summariseLink } from '@/features/policies/policy-format'
import { POLICY_LINK_MODULE_OPTIONS } from '@/features/policies/types/policy.types'
import type { PolicyLinkInput, PolicyLinkModuleType, PolicyLinkScope } from '@/features/policies/types/policy.types'
import { useCarePlanInstances } from '@/features/service-users/care-plans/hooks/useServiceUserCarePlanInstances'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import { useServiceUserMedications } from '@/features/service-users/hooks/useServiceUserMedications'
import { useInitialAssessmentSubmissions } from '@/features/service-users/initial-assessment/hooks/useInitialAssessmentEnterprise'
import { useServiceUserVisitPlans } from '@/features/service-users/visit-plan/hooks'
import { Button } from '@/shared/ui/button'
import { Combobox } from '@/shared/ui/combobox'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Label } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/toggle-controls'

type Props = {
  value: PolicyLinkInput[]
  onChange: (value: PolicyLinkInput[]) => void
  disabled?: boolean
}

type DialogState = { mode: 'add' } | { mode: 'edit'; index: number }

export function PolicyLinksEditor({ value, onChange, disabled }: Props) {
  const [dialog, setDialog] = React.useState<DialogState | null>(null)

  return (
    <fieldset className="space-y-4" disabled={disabled}>
      <legend className="text-sm font-medium">CareFlow links</legend>
      <p className="text-sm text-muted-foreground">
        Link this policy to one or more CareFlow areas. Linked areas surface this policy in context.
      </p>

      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          This policy is not linked to any CareFlow area.
        </p>
      ) : (
        <ul className="space-y-3">
          {value.map((link, index) => (
            <li
              key={`link-${index}-${link.moduleType}-${link.scope}`}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
              data-testid="policy-link-card"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{moduleLabel(link.moduleType)}</p>
                <p className="text-sm text-muted-foreground">{summariseLink(link)}</p>
              </div>
              {disabled ? null : (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Edit link"
                    onClick={() => setDialog({ mode: 'edit', index })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove link"
                    onClick={() => onChange(value.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {disabled ? null : (
        <Button type="button" variant="outline" size="sm" onClick={() => setDialog({ mode: 'add' })}>
          <Plus className="mr-1 h-4 w-4" />
          Add CareFlow link
        </Button>
      )}

      {dialog ? (
        <PolicyLinkDialog
          open
          existing={value}
          initial={dialog.mode === 'edit' ? value[dialog.index]! : emptyPolicyLink()}
          ignoreIndex={dialog.mode === 'edit' ? dialog.index : undefined}
          onOpenChange={open => {
            if (!open) setDialog(null)
          }}
          onSave={next => {
            if (dialog.mode === 'add') onChange([...value, next])
            else onChange(value.map((row, i) => (i === dialog.index ? next : row)))
            setDialog(null)
          }}
        />
      ) : null}
    </fieldset>
  )
}

function PolicyLinkDialog({
  open,
  initial,
  existing,
  ignoreIndex,
  onOpenChange,
  onSave,
}: {
  open: boolean
  initial: PolicyLinkInput
  existing: PolicyLinkInput[]
  ignoreIndex?: number
  onOpenChange: (open: boolean) => void
  onSave: (link: PolicyLinkInput) => void
}) {
  const [draft, setDraft] = React.useState<PolicyLinkInput>(initial)
  const [error, setError] = React.useState<string | null>(null)
  const scopes = scopesForModule(draft.moduleType)

  React.useEffect(() => {
    setDraft(initial)
    setError(null)
  }, [initial])

  const patch = (next: Partial<PolicyLinkInput>) => {
    setDraft(current => ({ ...current, ...next }))
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{ignoreIndex == null ? 'Add CareFlow link' : 'Edit CareFlow link'}</DialogTitle>
          <DialogDescription>
            Choose a CareFlow module and the area this policy should appear in.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="policy-link-module">Module</Label>
            <Combobox
              id="policy-link-module"
              value={draft.moduleType}
              onChange={v =>
                patch({
                  moduleType: v as PolicyLinkModuleType,
                  scope: 'MODULE',
                  recordId: undefined,
                  sectionKey: undefined,
                  label: undefined,
                })
              }
              options={POLICY_LINK_MODULE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
              placeholder="Module"
              allowDeselect={false}
            />
          </div>

          {scopes.length > 1 ? (
            <RadioGroup
              value={draft.scope}
              onValueChange={next =>
                patch({
                  scope: next as PolicyLinkScope,
                  recordId: undefined,
                  sectionKey: undefined,
                  label: next === 'MODULE' ? undefined : draft.label,
                })
              }
              className="grid gap-2"
              aria-label="Link target"
            >
              {scopes.map(option => (
                <label key={option.value} className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value={option.value} />
                  {option.label}
                </label>
              ))}
            </RadioGroup>
          ) : (
            <p className="text-sm text-muted-foreground">
              Linked to the whole {moduleLabel(draft.moduleType)} module.
            </p>
          )}

          <LinkTargetFields link={draft} onChange={patch} />

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (isDuplicatePolicyLink(existing, draft, ignoreIndex)) {
                setError('This CareFlow link has already been added.')
                return
              }
              onSave(draft)
            }}
          >
            Save link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LinkTargetFields({
  link,
  onChange,
}: {
  link: PolicyLinkInput
  onChange: (patch: Partial<PolicyLinkInput>) => void
}) {
  if (link.scope === 'MODULE') return null
  if (link.moduleType === 'CARE_PLAN' && link.scope === 'FORM_TEMPLATE') {
    return <CarePlanFormPicker link={link} onChange={onChange} />
  }
  if (link.moduleType === 'CARE_PLAN' && link.scope === 'RECORD') {
    return <CarePlanRecordPicker link={link} onChange={onChange} />
  }
  if (link.moduleType === 'INCIDENT' && link.scope === 'RECORD') {
    return <IncidentPicker link={link} onChange={onChange} />
  }
  if ((link.moduleType === 'EMPLOYEE' || link.moduleType === 'HR') && link.scope === 'RECORD') {
    return <EmployeePicker link={link} onChange={onChange} />
  }
  if (link.moduleType === 'TRAINING' && (link.scope === 'FORM_TEMPLATE' || link.scope === 'RECORD')) {
    return <CoursePicker link={link} onChange={onChange} />
  }
  if (link.moduleType === 'MEDICATION' && link.scope === 'RECORD') {
    return <MedicationRecordPicker link={link} onChange={onChange} />
  }
  if (link.moduleType === 'VISIT' && link.scope === 'RECORD') {
    return <VisitPlanPicker link={link} onChange={onChange} />
  }
  if (link.moduleType === 'INITIAL_ASSESSMENT' && link.scope === 'RECORD') {
    return <InitialAssessmentRecordPicker link={link} onChange={onChange} />
  }
  if (link.moduleType === 'INITIAL_ASSESSMENT' && link.scope === 'SECTION') {
    return (
      <div className="space-y-1.5">
        <Label htmlFor="policy-link-section">Section</Label>
        <Input
          id="policy-link-section"
          value={link.sectionKey ?? ''}
          onChange={e => onChange({ sectionKey: e.target.value || undefined, label: e.target.value ? `Section ${e.target.value}` : undefined })}
          placeholder="Section number, e.g. 12"
        />
      </div>
    )
  }
  return null
}

function CarePlanFormPicker({
  link,
  onChange,
}: {
  link: PolicyLinkInput
  onChange: (patch: Partial<PolicyLinkInput>) => void
}) {
  const [query, setQuery] = React.useState('')
  const debounced = useDebouncedValue(query, 300)
  const formsQuery = useSelectableForms('care-plans', {
    search: debounced || undefined,
    limit: 20,
    page: 1,
  })
  const options = (formsQuery.data ?? []).map(row => ({ value: row.id, label: row.name }))

  return (
    <div className="space-y-1.5">
      <Label>Care Plan form</Label>
      <Combobox
        value={link.recordId ?? ''}
        onChange={v => {
          const selected = options.find(o => o.value === v)
          onChange({ recordId: v || undefined, label: selected ? selected.label : undefined, scope: 'FORM_TEMPLATE' })
        }}
        options={options}
        loading={formsQuery.isFetching}
        onSearchChange={setQuery}
        placeholder="Search Care Plan forms"
        emptyText="No forms match your search."
      />
    </div>
  )
}

function ServiceUserPicker({
  serviceUserId,
  onChange,
}: {
  serviceUserId: string
  onChange: (id: string, label?: string) => void
}) {
  const [userQuery, setUserQuery] = React.useState('')
  const debouncedUser = useDebouncedValue(userQuery, 300)
  const usersQuery = useServiceUsers({ search: debouncedUser || undefined, limit: 20, page: 1 })
  const users = (usersQuery.data?.rows ?? []).map(row => ({
    value: row.id,
    label: [row.preferredName || row.firstName, row.lastName].filter(Boolean).join(' '),
  }))

  return (
    <div className="space-y-1.5">
      <Label>Service user</Label>
      <Combobox
        value={serviceUserId}
        onChange={v => onChange(v, users.find(o => o.value === v)?.label)}
        options={users}
        loading={usersQuery.isFetching}
        onSearchChange={setUserQuery}
        placeholder="Search service users"
        emptyText="No service users match your search."
      />
    </div>
  )
}

function CarePlanRecordPicker({
  link,
  onChange,
}: {
  link: PolicyLinkInput
  onChange: (patch: Partial<PolicyLinkInput>) => void
}) {
  const [serviceUserId, setServiceUserId] = React.useState('')
  const [userLabel, setUserLabel] = React.useState('')
  const plansQuery = useCarePlanInstances(serviceUserId, Boolean(serviceUserId))
  const plans = (plansQuery.data ?? []).map(row => ({
    value: row.id,
    label: row.formName?.trim() || 'Care Plan',
  }))

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <ServiceUserPicker
        serviceUserId={serviceUserId}
        onChange={(id, label) => {
          setServiceUserId(id)
          setUserLabel(label ?? '')
          onChange({ recordId: undefined, label: undefined, scope: 'RECORD' })
        }}
      />
      <div className="space-y-1.5">
        <Label>Care Plan</Label>
        <Combobox
          value={link.recordId ?? ''}
          onChange={v => {
            const plan = plans.find(o => o.value === v)
            onChange({
              recordId: v || undefined,
              scope: 'RECORD',
              label: userLabel && plan ? `${userLabel} — ${plan.label}` : plan?.label,
            })
          }}
          options={plans}
          loading={plansQuery.isFetching}
          placeholder={serviceUserId ? 'Select a Care Plan' : 'Select a service user first'}
          emptyText="No Care Plans found for this person."
          disabled={!serviceUserId}
        />
      </div>
    </div>
  )
}

function IncidentPicker({
  link,
  onChange,
}: {
  link: PolicyLinkInput
  onChange: (patch: Partial<PolicyLinkInput>) => void
}) {
  const [query, setQuery] = React.useState('')
  const debounced = useDebouncedValue(query, 300)
  const incidentsQuery = useIncidents({ search: debounced || undefined, limit: 20, page: 1 })
  const options = (incidentsQuery.data?.items ?? []).map(row => ({
    value: row.id,
    label: row.referenceNumber,
  }))

  return (
    <div className="space-y-1.5">
      <Label>Incident</Label>
      <Combobox
        value={link.recordId ?? ''}
        onChange={v => {
          const selected = options.find(o => o.value === v)
          onChange({ recordId: v || undefined, label: selected?.label, scope: 'RECORD' })
        }}
        options={options}
        loading={incidentsQuery.isFetching}
        onSearchChange={setQuery}
        placeholder="Search incidents"
        emptyText="No incidents match your search."
      />
    </div>
  )
}

function EmployeePicker({
  link,
  onChange,
}: {
  link: PolicyLinkInput
  onChange: (patch: Partial<PolicyLinkInput>) => void
}) {
  const [query, setQuery] = React.useState('')
  const debounced = useDebouncedValue(query, 300)
  const employeesQuery = useEmployees({ search: debounced || undefined, limit: 20, page: 1 })
  const options = (employeesQuery.data?.rows ?? []).map(row => ({
    value: row.id,
    label: row.fullName || [row.firstName, row.lastName].filter(Boolean).join(' ') || 'Employee',
  }))

  return (
    <div className="space-y-1.5">
      <Label>Employee</Label>
      <Combobox
        value={link.recordId ?? ''}
        onChange={v => {
          const selected = options.find(o => o.value === v)
          onChange({ recordId: v || undefined, label: selected?.label, scope: 'RECORD' })
        }}
        options={options}
        loading={employeesQuery.isFetching}
        onSearchChange={setQuery}
        placeholder="Search employees"
        emptyText="No employees match your search."
      />
    </div>
  )
}

function CoursePicker({
  link,
  onChange,
}: {
  link: PolicyLinkInput
  onChange: (patch: Partial<PolicyLinkInput>) => void
}) {
  const [query, setQuery] = React.useState('')
  const debounced = useDebouncedValue(query, 300)
  const coursesQuery = useLearningCourses({ search: debounced || undefined, limit: 20, page: 1 })
  const options = (coursesQuery.data?.rows ?? []).map(row => ({
    value: row.id,
    label: row.title,
  }))

  return (
    <div className="space-y-1.5">
      <Label>Course</Label>
      <Combobox
        value={link.recordId ?? ''}
        onChange={v => {
          const selected = options.find(o => o.value === v)
          onChange({
            recordId: v || undefined,
            label: selected?.label,
            scope: link.scope === 'RECORD' ? 'RECORD' : 'FORM_TEMPLATE',
          })
        }}
        options={options}
        loading={coursesQuery.isFetching}
        onSearchChange={setQuery}
        placeholder="Search courses"
        emptyText="No courses match your search."
      />
    </div>
  )
}

function MedicationRecordPicker({
  link,
  onChange,
}: {
  link: PolicyLinkInput
  onChange: (patch: Partial<PolicyLinkInput>) => void
}) {
  const [serviceUserId, setServiceUserId] = React.useState('')
  const [userLabel, setUserLabel] = React.useState('')
  const medsQuery = useServiceUserMedications(serviceUserId)
  const options = (medsQuery.data?.rows ?? []).map(row => ({
    value: row.id,
    label: row.medicationName,
  }))

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <ServiceUserPicker
        serviceUserId={serviceUserId}
        onChange={(id, label) => {
          setServiceUserId(id)
          setUserLabel(label ?? '')
          onChange({ recordId: undefined, label: undefined, scope: 'RECORD' })
        }}
      />
      <div className="space-y-1.5">
        <Label>Medication</Label>
        <Combobox
          value={link.recordId ?? ''}
          onChange={v => {
            const selected = options.find(o => o.value === v)
            onChange({
              recordId: v || undefined,
              scope: 'RECORD',
              label: userLabel && selected ? `${userLabel} — ${selected.label}` : selected?.label,
            })
          }}
          options={options}
          loading={medsQuery.isFetching}
          placeholder={serviceUserId ? 'Select a medication' : 'Select a service user first'}
          emptyText="No medications found for this person."
          disabled={!serviceUserId}
        />
      </div>
    </div>
  )
}

function VisitPlanPicker({
  link,
  onChange,
}: {
  link: PolicyLinkInput
  onChange: (patch: Partial<PolicyLinkInput>) => void
}) {
  const [serviceUserId, setServiceUserId] = React.useState('')
  const [userLabel, setUserLabel] = React.useState('')
  const plansQuery = useServiceUserVisitPlans(serviceUserId)
  const options = (plansQuery.data ?? []).map(row => ({
    value: row.id,
    label: `${row.status} visit plan`,
  }))

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <ServiceUserPicker
        serviceUserId={serviceUserId}
        onChange={(id, label) => {
          setServiceUserId(id)
          setUserLabel(label ?? '')
          onChange({ recordId: undefined, label: undefined, scope: 'RECORD' })
        }}
      />
      <div className="space-y-1.5">
        <Label>Visit plan</Label>
        <Combobox
          value={link.recordId ?? ''}
          onChange={v => {
            const selected = options.find(o => o.value === v)
            onChange({
              recordId: v || undefined,
              scope: 'RECORD',
              label: userLabel && selected ? `${userLabel} — ${selected.label}` : selected?.label,
            })
          }}
          options={options}
          loading={plansQuery.isFetching}
          placeholder={serviceUserId ? 'Select a visit plan' : 'Select a service user first'}
          emptyText="No visit plans found for this person."
          disabled={!serviceUserId}
        />
      </div>
    </div>
  )
}

function InitialAssessmentRecordPicker({
  link,
  onChange,
}: {
  link: PolicyLinkInput
  onChange: (patch: Partial<PolicyLinkInput>) => void
}) {
  const [serviceUserId, setServiceUserId] = React.useState('')
  const [userLabel, setUserLabel] = React.useState('')
  const submissionsQuery = useInitialAssessmentSubmissions(serviceUserId, Boolean(serviceUserId))
  const options = (submissionsQuery.data ?? []).map(row => ({
    value: row.id,
    label: `${row.status}${row.template?.name ? ` — ${row.template.name}` : ''}`,
  }))

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <ServiceUserPicker
        serviceUserId={serviceUserId}
        onChange={(id, label) => {
          setServiceUserId(id)
          setUserLabel(label ?? '')
          onChange({ recordId: undefined, label: undefined, scope: 'RECORD' })
        }}
      />
      <div className="space-y-1.5">
        <Label>Assessment</Label>
        <Combobox
          value={link.recordId ?? ''}
          onChange={v => {
            const selected = options.find(o => o.value === v)
            onChange({
              recordId: v || undefined,
              scope: 'RECORD',
              label: userLabel && selected ? `${userLabel} — ${selected.label}` : selected?.label,
            })
          }}
          options={options}
          loading={submissionsQuery.isFetching}
          placeholder={serviceUserId ? 'Select an assessment' : 'Select a service user first'}
          emptyText="No assessments found for this person."
          disabled={!serviceUserId}
        />
      </div>
    </div>
  )
}
