import * as React from 'react'
import { useForm } from 'react-hook-form'
import { Loader2, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField } from '@/shared/ui/form-field'
import { Combobox } from '@/shared/ui/combobox'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useBulkCreateLearningAssignments,
  useLearningCourses,
} from '@/features/learning/hooks/useLearning'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import { listAllEmployees } from '@/features/employees/api/employees.api'
import { employeeListRowDisplayName } from '@/features/employees/lib/employee-display-name'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import type { BulkLearningAssignmentInput } from '@/features/learning/types/learning.types'

type WizardForm = {
  courseId: string
  targetMode: 'employees' | 'roles' | 'locations' | 'workAreas'
  dueAt?: string
  assignmentReason?: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function toIsoDueAt(value?: string): string | undefined {
  if (!value?.trim()) return undefined
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00.000Z`
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T23:59:59.000Z`
  return trimmed
}

export function AssignmentWizardDialog({ open, onOpenChange }: Props) {
  const { locationId: globalLocationId } = useGlobalLocationScope()
  const bulkMut = useBulkCreateLearningAssignments()
  const coursesQuery = useLearningCourses({ limit: 100, status: 'PUBLISHED' })
  const lookupsQuery = useEmployeeLookups(open)
  const employeesQuery = useQuery({
    queryKey: ['learning', 'assignment-wizard-employees', globalLocationId ?? 'all'],
    queryFn: () =>
      listAllEmployees(
        globalLocationId ? { locationIds: [globalLocationId] } : {},
      ),
    enabled: open,
    staleTime: 60_000,
  })

  const [step, setStep] = React.useState(0)
  const [employeeSearch, setEmployeeSearch] = React.useState('')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = React.useState<string[]>([])
  const [selectedRoleIds, setSelectedRoleIds] = React.useState<string[]>([])
  const [selectedLocationIds, setSelectedLocationIds] = React.useState<string[]>([])
  const [selectedWorkAreaIds, setSelectedWorkAreaIds] = React.useState<string[]>([])

  const { register, handleSubmit, watch, setValue, reset } = useForm<WizardForm>({
    defaultValues: {
      courseId: '',
      targetMode: 'employees',
      assignmentReason: '',
      dueAt: '',
    },
  })

  React.useEffect(() => {
    if (!open) return
    setStep(0)
    setEmployeeSearch('')
    setSelectedEmployeeIds([])
    setSelectedRoleIds([])
    setSelectedLocationIds(globalLocationId ? [globalLocationId] : [])
    setSelectedWorkAreaIds([])
    reset({ courseId: '', targetMode: 'employees', assignmentReason: '', dueAt: '' })
  }, [open, reset, globalLocationId])

  const targetMode = watch('targetMode')
  const courseId = watch('courseId')

  const locationOptions = React.useMemo(() => {
    const locs = lookupsQuery.data?.locations ?? []
    if (!globalLocationId) return locs
    return locs.filter((loc) => loc.id === globalLocationId)
  }, [lookupsQuery.data?.locations, globalLocationId])

  const selectedCount = React.useMemo(() => {
    if (targetMode === 'employees') return selectedEmployeeIds.length
    if (targetMode === 'roles') return selectedRoleIds.length
    if (targetMode === 'locations') return selectedLocationIds.length
    return selectedWorkAreaIds.length
  }, [targetMode, selectedEmployeeIds, selectedRoleIds, selectedLocationIds, selectedWorkAreaIds])

  const courseOptions = (coursesQuery.data?.rows ?? [])
    .filter(c => c.status === 'PUBLISHED' || !c.status)
    .map(c => ({
      value: c.id,
      label: `${c.title} (${c.code})`,
    }))

  const filteredEmployees = React.useMemo(() => {
    const rows = employeesQuery.data ?? []
    const q = employeeSearch.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(emp => employeeListRowDisplayName(emp).toLowerCase().includes(q))
  }, [employeesQuery.data, employeeSearch])

  const canGoNext =
    step === 0 ? !!courseId : step === 1 ? selectedCount > 0 : selectedCount > 0 && !!courseId

  const onSubmit = handleSubmit(async values => {
    if (!values.courseId) {
      toastApiError(new Error('Select a published course'))
      return
    }
    if (selectedCount === 0) {
      toastApiError(new Error('Select at least one assignment target'))
      return
    }

    const body: BulkLearningAssignmentInput = {
      courseId: values.courseId,
      dueAt: toIsoDueAt(values.dueAt),
      assignmentReason: values.assignmentReason?.trim() || undefined,
      employeeIds: targetMode === 'employees' ? selectedEmployeeIds : undefined,
      roleIds: targetMode === 'roles' ? selectedRoleIds : undefined,
      locationIds: targetMode === 'locations' ? selectedLocationIds : undefined,
      workAreaIds: targetMode === 'workAreas' ? selectedWorkAreaIds : undefined,
    }

    try {
      const result = await bulkMut.mutateAsync(body)
      const skipped = result.skipped?.length ?? 0
      toastSuccess(
        `Created ${result.createdCount} assignment${result.createdCount === 1 ? '' : 's'}` +
          (skipped ? ` (${skipped} skipped — already assigned)` : ''),
      )
      onOpenChange(false)
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Assignment failed'))
    }
  })

  const toggleId = (list: string[], id: string, setter: (v: string[]) => void) => {
    setter(list.includes(id) ? list.filter(x => x !== id) : [...list, id])
  }

  const selectAllVisibleEmployees = () => {
    const ids = filteredEmployees.map(e => e.id)
    setSelectedEmployeeIds(prev => Array.from(new Set([...prev, ...ids])))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Assign training</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Step {step + 1} of 3 — choose a course, select people or groups, then confirm.
            </p>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {step === 0 ? (
              <>
                <FormField label="Course" required>
                  {coursesQuery.isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading published courses…
                    </div>
                  ) : courseOptions.length === 0 ? (
                    <p className="text-sm text-destructive">
                      No published courses found. Publish a course before assigning.
                    </p>
                  ) : (
                    <Combobox
                      value={courseId}
                      onChange={v => setValue('courseId', v, { shouldDirty: true })}
                      options={courseOptions}
                      placeholder="Select published course"
                      allowDeselect={false}
                    />
                  )}
                </FormField>
                <FormField label="Due date (optional)">
                  <Input type="datetime-local" {...register('dueAt')} />
                </FormField>
                <FormField label="Reason">
                  <Input {...register('assignmentReason')} placeholder="e.g. Annual refresher" />
                </FormField>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <FormField label="Assign to">
                  <Combobox
                    value={targetMode}
                    onChange={v => setValue('targetMode', v as WizardForm['targetMode'])}
                    options={[
                      { value: 'employees', label: 'Individual employees' },
                      { value: 'roles', label: 'Job roles' },
                      { value: 'locations', label: 'Locations' },
                      { value: 'workAreas', label: 'Work areas' },
                    ]}
                    allowDeselect={false}
                  />
                </FormField>

                {targetMode === 'employees' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      className="max-w-xs"
                      placeholder="Search employees…"
                      value={employeeSearch}
                      onChange={e => setEmployeeSearch(e.target.value)}
                    />
                    <Button type="button" size="sm" variant="outline" onClick={selectAllVisibleEmployees}>
                      Select visible
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedEmployeeIds([])}
                    >
                      Clear
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {selectedEmployeeIds.length} selected
                    </span>
                  </div>
                ) : null}

                <div className="max-h-64 overflow-y-auto rounded-lg border border-border p-3 space-y-2">
                  {targetMode === 'employees' ? (
                    employeesQuery.isLoading ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredEmployees.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">No employees found.</p>
                    ) : (
                      filteredEmployees.map(emp => (
                        <label key={emp.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedEmployeeIds.includes(emp.id)}
                            onChange={() =>
                              toggleId(selectedEmployeeIds, emp.id, setSelectedEmployeeIds)
                            }
                          />
                          <span>{employeeListRowDisplayName(emp)}</span>
                        </label>
                      ))
                    )
                  ) : null}

                  {targetMode === 'roles' ? (
                    lookupsQuery.isLoading ? (
                      <Loader2 className="mx-auto my-6 h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      (lookupsQuery.data?.roles ?? []).map(role => (
                        <label key={role.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedRoleIds.includes(role.id)}
                            onChange={() => toggleId(selectedRoleIds, role.id, setSelectedRoleIds)}
                          />
                          {role.name}
                        </label>
                      ))
                    )
                  ) : null}

                  {targetMode === 'locations' ? (
                    locationOptions.map(loc => (
                      <label key={loc.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedLocationIds.includes(loc.id)}
                          onChange={() =>
                            toggleId(selectedLocationIds, loc.id, setSelectedLocationIds)
                          }
                        />
                        {loc.name}
                      </label>
                    ))
                  ) : null}

                  {targetMode === 'workAreas' ? (
                    (lookupsQuery.data?.workAreas ?? []).map(wa => (
                      <label key={wa.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedWorkAreaIds.includes(wa.id)}
                          onChange={() =>
                            toggleId(selectedWorkAreaIds, wa.id, setSelectedWorkAreaIds)
                          }
                        />
                        {wa.name}
                      </label>
                    ))
                  ) : null}
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <Users className="h-4 w-4" />
                  Confirm assignment
                </p>
                <p>
                  Course:{' '}
                  <span className="font-medium">
                    {courseOptions.find(c => c.value === courseId)?.label ?? courseId}
                  </span>
                </p>
                <p>
                  Target: <span className="font-medium">{targetMode}</span> ({selectedCount} selected)
                </p>
                <p className="text-muted-foreground">
                  Roles, locations, and work areas are resolved to individual employees. Staff who
                  already have an active assignment for this course are skipped.
                </p>
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step > 0 ? (
              <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)}>
                Back
              </Button>
            ) : null}
            {step < 2 ? (
              <Button type="button" disabled={!canGoNext} onClick={() => setStep(s => s + 1)}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={bulkMut.isPending || !canGoNext}>
                {bulkMut.isPending ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Assigning…
                  </>
                ) : (
                  'Confirm assignment'
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
