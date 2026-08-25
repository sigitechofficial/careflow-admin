import * as React from 'react'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import { useHrEmployees } from '@/features/hr/hooks/useHr'
import { useCreateVacancy } from '@/features/hr/recruitment/hooks/useRecruitment'
import type { RecruitmentEmploymentType } from '@/features/hr/recruitment/api/recruitment.api'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

const EMPLOYMENT_TYPES: RecruitmentEmploymentType[] = [
  'PERMANENT',
  'FIXED_TERM',
  'BANK',
  'AGENCY',
  'APPRENTICE',
  'VOLUNTEER',
]

const NONE = '__none__'

const fieldClass = 'flex flex-col gap-1.5'
const labelClass = 'block text-sm font-medium leading-none text-foreground'

const textareaClass = cn(
  'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
  'shadow-sm placeholder:text-muted-foreground/60',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
)

export function VacancyFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const lookupsQuery = useEmployeeLookups(open)
  const managersQuery = useHrEmployees({ page: 1, limit: 200 }, open)
  const createMutation = useCreateVacancy()

  const [title, setTitle] = React.useState('')
  const [jobTitleId, setJobTitleId] = React.useState('')
  const [locationId, setLocationId] = React.useState('')
  const [employmentType, setEmploymentType] = React.useState<RecruitmentEmploymentType>('PERMANENT')
  const [salaryRange, setSalaryRange] = React.useState('')
  const [numberOfPositions, setNumberOfPositions] = React.useState('1')
  const [hiringManagerId, setHiringManagerId] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [requirements, setRequirements] = React.useState('')

  React.useEffect(() => {
    if (!open) {
      setTitle('')
      setJobTitleId('')
      setLocationId('')
      setEmploymentType('PERMANENT')
      setSalaryRange('')
      setNumberOfPositions('1')
      setHiringManagerId('')
      setDescription('')
      setRequirements('')
    }
  }, [open])

  const lookups = lookupsQuery.data
  const managers = managersQuery.data?.data ?? []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await createMutation.mutateAsync({
      title: title.trim(),
      employmentType,
      jobTitleId: jobTitleId || undefined,
      locationId: locationId || undefined,
      salaryRange: salaryRange.trim() || undefined,
      numberOfPositions: Number(numberOfPositions) || 1,
      hiringManagerId: hiringManagerId || undefined,
      description: description.trim() || undefined,
      requirements: requirements.trim() || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create vacancy</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => void handleSubmit(e)} className="space-y-5">
          <div className={fieldClass}>
            <label htmlFor="vacancy-title" className={labelClass}>
              Title
            </label>
            <Input
              id="vacancy-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className={fieldClass}>
              <label className={labelClass}>Job title</label>
              <Select
                value={jobTitleId || undefined}
                onValueChange={v => setJobTitleId(v === NONE ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value={NONE}>None</SelectItem>
                  {(lookups?.jobTitles ?? []).map(jt => (
                    <SelectItem key={jt.id} value={jt.id}>
                      {jt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Location</label>
              <Select
                value={locationId || undefined}
                onValueChange={v => setLocationId(v === NONE ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value={NONE}>None</SelectItem>
                  {(lookups?.locations ?? []).map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className={fieldClass}>
              <label className={labelClass}>Employment type</label>
              <Select
                value={employmentType}
                onValueChange={v => setEmploymentType(v as RecruitmentEmploymentType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {EMPLOYMENT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={fieldClass}>
              <label htmlFor="vacancy-positions" className={labelClass}>
                Positions
              </label>
              <Input
                id="vacancy-positions"
                type="number"
                min={1}
                value={numberOfPositions}
                onChange={e => setNumberOfPositions(e.target.value)}
              />
            </div>
          </div>

          <div className={fieldClass}>
            <label htmlFor="vacancy-salary" className={labelClass}>
              Salary range
            </label>
            <Input
              id="vacancy-salary"
              value={salaryRange}
              onChange={e => setSalaryRange(e.target.value)}
              placeholder="e.g. £22,000 – £25,000"
            />
          </div>

          <div className={fieldClass}>
            <label className={labelClass}>Hiring manager</label>
            <Select
              value={hiringManagerId || undefined}
              onValueChange={v => setHiringManagerId(v === NONE ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    managersQuery.isLoading
                      ? 'Loading…'
                      : managersQuery.isError
                        ? 'Unable to load managers'
                        : 'Optional'
                  }
                />
              </SelectTrigger>
              <SelectContent className="z-[100] max-h-64">
                <SelectItem value={NONE}>None</SelectItem>
                {managers.map(emp => (
                  <SelectItem key={emp.employeeId} value={emp.employeeId}>
                    {emp.name}
                    {emp.jobTitle ? ` — ${emp.jobTitle}` : ''}
                  </SelectItem>
                ))}
                {!managersQuery.isLoading && managers.length === 0 ? (
                  <SelectItem value="__empty__" disabled>
                    No employees found
                  </SelectItem>
                ) : null}
              </SelectContent>
            </Select>
            {managersQuery.isError ? (
              <p className="text-xs text-destructive">
                Could not load hiring managers. Check you have HR employee access.
              </p>
            ) : null}
          </div>

          <div className={fieldClass}>
            <label htmlFor="vacancy-description" className={labelClass}>
              Description
            </label>
            <textarea
              id="vacancy-description"
              className={textareaClass}
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="vacancy-requirements" className={labelClass}>
              Requirements
            </label>
            <textarea
              id="vacancy-requirements"
              className={textareaClass}
              value={requirements}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRequirements(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create vacancy'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
