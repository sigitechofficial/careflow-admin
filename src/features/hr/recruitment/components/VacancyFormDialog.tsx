import * as React from 'react'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
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
  const employeesQuery = useEmployees({ page: 1, limit: 200 }, open)
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
  const employees = employeesQuery.data?.rows ?? []

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
        <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="vacancy-title" className="text-sm font-medium">Title</label>
            <Input
              id="vacancy-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Job title</label>
              <Select value={jobTitleId} onValueChange={setJobTitleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {(lookups?.jobTitles ?? []).map(jt => (
                    <SelectItem key={jt.id} value={jt.id}>{jt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {(lookups?.locations ?? []).map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Employment type</label>
              <Select
                value={employmentType}
                onValueChange={v => setEmploymentType(v as RecruitmentEmploymentType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="vacancy-positions" className="text-sm font-medium">Positions</label>
              <Input
                id="vacancy-positions"
                type="number"
                min={1}
                value={numberOfPositions}
                onChange={e => setNumberOfPositions(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="vacancy-salary" className="text-sm font-medium">Salary range</label>
            <Input
              id="vacancy-salary"
              value={salaryRange}
              onChange={e => setSalaryRange(e.target.value)}
              placeholder="e.g. £22,000 – £25,000"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Hiring manager</label>
            <Select value={hiringManagerId} onValueChange={setHiringManagerId}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.fullName ?? `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="vacancy-description" className="text-sm font-medium">Description</label>
            <textarea
              id="vacancy-description"
              className={textareaClass}
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="vacancy-requirements" className="text-sm font-medium">Requirements</label>
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
