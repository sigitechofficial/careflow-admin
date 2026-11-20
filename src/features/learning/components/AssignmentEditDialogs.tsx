import * as React from 'react'
import { Loader2, Lock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { Combobox } from '@/shared/ui/combobox'
import { DateTimeInput } from '@/shared/ui/date-time-input'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { isoToOrgDatetimeLocal, orgDatetimeLocalToIso } from '@/shared/lib/operational-day.util'
import { listAllEmployees } from '@/features/employees/api/employees.api'
import { employeeListRowDisplayName } from '@/features/employees/lib/employee-display-name'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import {
  useCancelLearningAssignment,
  useLearningCourses,
  useUpdateLearningAssignment,
} from '@/features/learning/hooks/useLearning'
import { LEARNING_DELIVERY_METHOD_OPTIONS } from '@/features/learning/types/learning.types'
import type { LearningAssignment } from '@/features/learning/types/learning.types'

/**
 * Edit / unassign (18 Nov 2026, user decision): only an open course (Scheduled or In progress)
 * whose due date has not passed. Course and carer can change only before the carer starts.
 */
export function canEditAssignment(a: Pick<LearningAssignment, 'status' | 'dueAt'>): boolean {
  if (!['ASSIGNED', 'NOT_STARTED', 'IN_PROGRESS'].includes(a.status)) return false
  return !a.dueAt || new Date(a.dueAt).getTime() > Date.now()
}

/** Course and carer are locked once the carer has started (or the course is booked on a session). */
function lockReason(a: Pick<LearningAssignment, 'status' | 'courseCarerLock'>): 'STARTED' | 'BOOKED' | null {
  if (a.courseCarerLock) return a.courseCarerLock
  return a.status === 'ASSIGNED' || a.status === 'NOT_STARTED' ? null : 'STARTED'
}

function isCarerRole(name?: string | null) {
  return !!name && /carer/i.test(name)
}

function errorText(e: unknown, fallback: string) {
  return e instanceof ApiError ? e : new Error(fallback)
}

export function EditAssignmentDialog({
  assignment,
  onOpenChange,
}: {
  assignment: LearningAssignment | null
  onOpenChange: (open: boolean) => void
}) {
  const open = !!assignment
  const { locationId } = useGlobalLocationScope()
  const mut = useUpdateLearningAssignment()
  const coursesQuery = useLearningCourses({ limit: 100, status: 'PUBLISHED' })
  const employeesQuery = useQuery({
    queryKey: ['learning', 'assignment-wizard-employees', locationId ?? 'all'],
    queryFn: () => listAllEmployees(locationId ? { locationIds: [locationId] } : {}),
    enabled: open,
    staleTime: 60_000,
  })

  const [courseId, setCourseId] = React.useState('')
  const [employeeId, setEmployeeId] = React.useState('')
  const [dueAt, setDueAt] = React.useState('')
  const [note, setNote] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!assignment) return
    setCourseId(assignment.courseId)
    setEmployeeId(assignment.employeeId ?? '')
    setDueAt(isoToOrgDatetimeLocal(assignment.dueAt))
    setNote('')
    setError(null)
  }, [assignment])

  if (!assignment) return null
  const lock = lockReason(assignment)
  const locked = lock !== null

  const courseOptions = (coursesQuery.data?.rows ?? [])
    .filter(c => c.status === 'PUBLISHED' || c.id === assignment.courseId)
    .map(c => ({
      value: c.id,
      label: c.title,
      description: [c.code, LEARNING_DELIVERY_METHOD_OPTIONS.find(o => o.value === c.deliveryMethod)?.label]
        .filter(Boolean)
        .join(' · '),
    }))
  if (!courseOptions.some(o => o.value === assignment.courseId)) {
    courseOptions.unshift({ value: assignment.courseId, label: assignment.courseTitle ?? 'Current course', description: '' })
  }
  const carerOptions = (employeesQuery.data ?? [])
    .filter(e => isCarerRole(e.role?.name) || e.id === assignment.employeeId)
    .map(e => ({ value: e.id, label: employeeListRowDisplayName(e), description: e.role?.name ?? '' }))
  if (assignment.employeeId && !carerOptions.some(o => o.value === assignment.employeeId)) {
    carerOptions.unshift({ value: assignment.employeeId, label: assignment.employeeName ?? 'Current carer', description: '' })
  }

  const save = async () => {
    const dueIso = dueAt ? orgDatetimeLocalToIso(dueAt) || undefined : undefined
    if (!dueIso) return setError('Choose the due date')
    if (dueAt !== isoToOrgDatetimeLocal(assignment.dueAt) && new Date(dueIso).getTime() <= Date.now()) {
      return setError('The due date must be in the future')
    }
    const body = {
      courseId: !locked && courseId !== assignment.courseId ? courseId : undefined,
      employeeId: !locked && employeeId !== assignment.employeeId ? employeeId : undefined,
      // Compare in the same minute-precision form the picker shows, so an untouched date is not sent.
      dueAt: dueAt !== isoToOrgDatetimeLocal(assignment.dueAt) ? dueIso : undefined,
      note: note.trim() || undefined,
    }
    if (!body.courseId && !body.employeeId && !body.dueAt) return setError('Nothing has changed')
    setError(null)
    try {
      await mut.mutateAsync({ id: assignment.id, body })
      toastSuccess(
        body.employeeId
          ? 'Saved. The new carer has been told about the course.'
          : body.courseId
            ? 'Saved. The carer has been told about the new course.'
            : 'Due date changed. The carer has been told.',
      )
      onOpenChange(false)
    } catch (e) {
      toastApiError(errorText(e, 'Could not save the changes'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="edit-assignment-dialog">
        <DialogHeader>
          <DialogTitle>Edit assignment</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {locked ? (
            <div
              className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
              data-testid="assignment-edit-locked"
            >
              <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>
                {lock === 'BOOKED'
                  ? 'This course is booked on a session, so only the due date can change.'
                  : 'The carer has already started this course, so only the due date can change.'}{' '}
                Course and carer are locked. To give a different course or carer, unassign it and assign again.
              </p>
            </div>
          ) : null}
          <FormField label="Course" required hint={locked ? 'Locked' : undefined}>
            {coursesQuery.isLoading ? (
              <div className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading courses…
              </div>
            ) : (
              <Combobox
                value={courseId}
                onChange={setCourseId}
                options={courseOptions}
                placeholder="Choose a course"
                searchPlaceholder="Search courses…"
                allowDeselect={false}
                disabled={locked}
              />
            )}
          </FormField>
          <FormField label="Carer" required hint={locked ? 'Locked' : undefined}>
            {employeesQuery.isLoading ? (
              <div className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading carers…
              </div>
            ) : (
              <Combobox
                value={employeeId}
                onChange={setEmployeeId}
                options={carerOptions}
                placeholder="Choose a carer"
                searchPlaceholder="Search carers…"
                allowDeselect={false}
                disabled={locked}
              />
            )}
          </FormField>
          <FormField label="Due date" required>
            <DateTimeInput value={dueAt} onChange={e => setDueAt(e.target.value)} />
          </FormField>
          <FormField label="Why are you changing it? (optional)">
            <Textarea rows={2} value={note} placeholder="Wrong course chosen" onChange={e => setNote(e.target.value)} />
          </FormField>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={mut.isPending} data-testid="save-assignment-edit">
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function UnassignAssignmentDialog({
  assignment,
  onOpenChange,
}: {
  assignment: LearningAssignment | null
  onOpenChange: (open: boolean) => void
}) {
  const mut = useCancelLearningAssignment()
  const [reason, setReason] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (assignment) {
      setReason('')
      setError(null)
    }
  }, [assignment])

  if (!assignment) return null

  const confirm = async () => {
    if (reason.trim().length < 3) return setError('Write why the course is unassigned')
    setError(null)
    try {
      await mut.mutateAsync({ id: assignment.id, reason: reason.trim() })
      toastSuccess('Course unassigned. It is kept under Cancelled.')
      onOpenChange(false)
    } catch (e) {
      toastApiError(errorText(e, 'Could not unassign the course'))
    }
  }

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="unassign-assignment-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Unassign this course?</AlertDialogTitle>
          <AlertDialogDescription>
            {assignment.courseTitle ?? 'This course'} will be removed from {assignment.employeeName ?? 'the carer'}’s
            courses in the app. Any session booking for it is cancelled. The record is kept under Cancelled.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FormField label="Reason" required>
          <Textarea rows={2} value={reason} placeholder="Assigned by mistake" onChange={e => setReason(e.target.value)} />
        </FormField>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Keep course</AlertDialogCancel>
          <Button variant="destructive" onClick={() => void confirm()} loading={mut.isPending} data-testid="confirm-unassign">
            Unassign
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
