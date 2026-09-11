import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Award, Trash2, Filter } from 'lucide-react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { ApiError } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useAuthStore } from '@/features/auth/store'
import { type EmployeeListRow } from '@/features/employees/types'
import {
  useCreateEmployeeSkillMutation,
  useDeleteEmployeeSkillMutation,
} from '@/features/employees/hooks/useEmployeeMutations'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import {
  useAllEmployees,
  useEmployeeSkills,
  useEmployeeSkillsOverview,
} from '@/features/employees/hooks/useEmployeeTabs'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { MultiSelect, type MultiSelectOption } from '@/shared/ui/multi-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { cn, formatDate } from '@/shared/lib/utils'
import { EmployeeEditCertificationsPanel } from '@/features/employees/components/EmployeeEditCertificationsPanel'
import { EmployeeSkillTypePicker } from '@/features/employees/components/EmployeeSkillTypePicker'
import {
  EmployeeSkillDocumentCell,
  SKILL_DOCUMENT_ACCEPT,
  uploadSkillEvidence,
} from '@/features/employees/components/EmployeeSkillDocumentCell'

function employeeDisplayName(emp: EmployeeListRow): string {
  return emp.fullName?.trim() || [emp.firstName, emp.lastName].filter(Boolean).join(' ').trim() || '—'
}

function formatSkillExpiry(iso: string | null | undefined): string {
  return formatDate(iso)
}

export function EmployeeSkillsTab() {
  const apiConfigured = Boolean(getApiBaseUrl())
  const accessToken = useAuthStore(s => s.accessToken)
  const jwtPresent = Boolean(accessToken?.includes('.'))
  const canUpdate = useAuthStore(s => s.can('employees.update'))
  const canUploadDocs = useAuthStore(s => s.can('employees.documents.upload'))
  const queryEnabled = apiConfigured && jwtPresent

  const [selectedEmployeeIds, setSelectedEmployeeIds] = React.useState<string[]>([])
  const [activeEmployeeId, setActiveEmployeeId] = React.useState<string>('')
  const [skillsSubTab, setSkillsSubTab] = React.useState<'manage' | 'overview'>('manage')
  const [manageKind, setManageKind] = React.useState<'skills' | 'certifications'>('skills')

  const lookupsQuery = useEmployeeLookups(queryEnabled)
  const employeesQuery = useAllEmployees({ sortOrder: 'desc' }, queryEnabled)
  const skillsQuery = useEmployeeSkills(activeEmployeeId, queryEnabled && Boolean(activeEmployeeId))
  const overviewQuery = useEmployeeSkillsOverview(queryEnabled && skillsSubTab === 'overview')
  const createSkillMutation = useCreateEmployeeSkillMutation()
  const deleteSkillMutation = useDeleteEmployeeSkillMutation()

  const lookups = lookupsQuery.data ?? null
  const employees = employeesQuery.data ?? []
  const skills = skillsQuery.data ?? []
  const overviewRows = overviewQuery.data ?? []

  const empLoading = employeesQuery.isLoading || lookupsQuery.isLoading
  const empError =
    !queryEnabled
      ? apiConfigured
        ? 'Sign in with a real JWT to manage skills.'
        : 'Set VITE_API_BASE_URL and sign in to load data.'
      : employeesQuery.error instanceof ApiError
        ? employeesQuery.error.message
        : lookupsQuery.error instanceof ApiError
          ? lookupsQuery.error.message
          : employeesQuery.error || lookupsQuery.error
            ? 'Could not load employees or lookups.'
            : null

  const skillsLoading = skillsQuery.isLoading
  const skillsError =
    skillsQuery.error instanceof ApiError
      ? skillsQuery.error.message
      : skillsQuery.error
        ? 'Could not load skills.'
        : null

  const overviewLoading = overviewQuery.isLoading
  const overviewError =
    overviewQuery.error instanceof ApiError
      ? overviewQuery.error.message
      : overviewQuery.error
        ? 'Could not load skills overview.'
        : null

  const [skillTypeId, setSkillTypeId] = React.useState('')
  const [expiryDate, setExpiryDate] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [skillFile, setSkillFile] = React.useState<File | null>(null)
  const skillFileRef = React.useRef<HTMLInputElement>(null)
  const [banner, setBanner] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [adding, setAdding] = React.useState(false)
  const saving = adding || createSkillMutation.isPending
  const [overviewNameFilter, setOverviewNameFilter] = React.useState('')
  const [nameFilterOpen, setNameFilterOpen] = React.useState(false)

  const employeeMultiOptions = React.useMemo<MultiSelectOption[]>(
    () =>
      employees.map(emp => ({
        value: emp.id,
        label: employeeDisplayName(emp),
      })),
    [employees],
  )

  const handleEmployeeIdsChange = (ids: string[]) => {
    setSelectedEmployeeIds(ids)
    setActiveEmployeeId(prev => {
      if (ids.length === 0) return ''
      if (prev && ids.includes(prev)) return prev
      return ids[0] ?? ''
    })
    setSkillTypeId('')
    setSkillFile(null)
    if (skillFileRef.current) skillFileRef.current.value = ''
    setBanner(null)
  }

  const assignedSkillTypeIds = React.useMemo(
    () => new Set(skills.map(s => s.skillTypeId).filter(Boolean) as string[]),
    [skills],
  )

  const skillTypes = lookups?.skillTypes ?? []

  const onAddSkill = async () => {
    if (!activeEmployeeId || !skillTypeId.trim()) {
      setBanner({ type: 'error', text: 'Select an employee and a skill type.' })
      return
    }
    if (assignedSkillTypeIds.has(skillTypeId.trim())) {
      setBanner({ type: 'error', text: 'That skill is already on this record.' })
      return
    }
    setBanner(null)
    setAdding(true)
    try {
      const body: { skillTypeId: string; expiryDate?: string; notes?: string; documentUrl?: string } = {
        skillTypeId: skillTypeId.trim(),
      }
      if (expiryDate.trim()) body.expiryDate = `${expiryDate.trim()}T12:00:00.000Z`
      if (notes.trim()) body.notes = notes.trim()
      if (skillFile) {
        if (!canUploadDocs) {
          setBanner({ type: 'error', text: 'You do not have permission to upload documents.' })
          return
        }
        body.documentUrl = await uploadSkillEvidence(activeEmployeeId, skillFile)
      }
      await createSkillMutation.mutateAsync({ employeeId: activeEmployeeId, body })
      setSkillTypeId('')
      setExpiryDate('')
      setNotes('')
      setSkillFile(null)
      if (skillFileRef.current) skillFileRef.current.value = ''
      setBanner({ type: 'success', text: 'Skill added.' })
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not add skill.'
      setBanner({ type: 'error', text: msg })
    } finally {
      setAdding(false)
    }
  }

  const onDeleteSkill = async (skillId: string) => {
    if (!activeEmployeeId) return
    if (!window.confirm('Remove this skill from the employee?')) return
    setBanner(null)
    try {
      await deleteSkillMutation.mutateAsync({ employeeId: activeEmployeeId, skillId })
      setBanner({ type: 'success', text: 'Skill removed.' })
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not remove skill.'
      setBanner({ type: 'error', text: msg })
    }
  }

  const selectedEmpsInOrder = React.useMemo(
    () => selectedEmployeeIds.map(id => employees.find(e => e.id === id)).filter(Boolean) as EmployeeListRow[],
    [employees, selectedEmployeeIds],
  )
  const activeEmp = employees.find(e => e.id === activeEmployeeId)

  const filteredOverviewRows = React.useMemo(() => {
    const q = overviewNameFilter.trim().toLowerCase()
    if (!q) return overviewRows
    return overviewRows.filter(r => r.displayName.toLowerCase().includes(q))
  }, [overviewRows, overviewNameFilter])

  return (
    <div className="space-y-6" data-testid="employee-skills-panel">
      <div className="flex gap-1 border-b border-border" role="tablist" aria-label="Skills views">
        {(['manage', 'overview'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={skillsSubTab === tab}
            data-testid={`employee-skills-subtab-${tab}`}
            onClick={() => {
              setSkillsSubTab(tab)
              setBanner(null)
            }}
            className={cn(
              'text-sm px-4 pb-2 border-b-2 -mb-px transition-colors font-medium',
              skillsSubTab === tab
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab === 'manage' ? 'Manage skills' : 'Employee skills list'}
          </button>
        ))}
      </div>

      {banner && skillsSubTab === 'manage' && manageKind === 'skills' ? (
        <div
          role="status"
          className={cn(
            'rounded-lg border px-4 py-3 text-sm',
            banner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
              : 'border-destructive/40 bg-destructive/10 text-destructive',
          )}
        >
          {banner.text}
        </div>
      ) : null}

      {skillsSubTab === 'manage' ? (
        <>
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex items-start gap-2">
              <Award className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Select one or more employees from the dropdown (search inside the panel), then pick who you are viewing
                if several are selected. Use Skills for operational capabilities and Work Certification for qualification
                proof. Expiry, notes, and documentation are optional.
                Requires <span className="font-mono text-foreground">employees.read</span> to view and{' '}
                <span className="font-mono text-foreground">employees.update</span> to add or remove.
              </p>
            </div>
          </div>

          {empError ? (
            <p className="text-sm text-amber-800 dark:text-amber-200">{empError}</p>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">1. Select employees</h3>
          {empLoading ? (
            <p className="text-sm text-muted-foreground">Loading employees…</p>
          ) : employees.length === 0 ? (
            <p className="text-sm text-muted-foreground">No employees loaded.</p>
          ) : (
            <MultiSelect
              className="w-full min-h-11"
              options={employeeMultiOptions}
              value={selectedEmployeeIds}
              onChange={handleEmployeeIdsChange}
              placeholder="Search and select employees…"
              searchPlaceholder="Search by name…"
              disabled={empLoading}
            />
          )}
          {selectedEmployeeIds.length > 0 && activeEmp ? (
            <p className="text-xs text-muted-foreground">
              {selectedEmployeeIds.length} selected · viewing{' '}
              <span className="font-medium text-foreground">{employeeDisplayName(activeEmp)}</span>
            </p>
          ) : null}
          {activeEmp && canUpdate ? (
            <p className="text-xs text-muted-foreground">
              Open full profile:{' '}
              <Link
                to="/employee/$employeeId/edit"
                params={{ employeeId: activeEmp.id }}
                className="text-primary underline-offset-2 hover:underline"
              >
                Edit employee
              </Link>
            </p>
          ) : null}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">2. Skills & work certification</h3>

          {selectedEmpsInOrder.length > 1 ? (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Viewing record for</label>
              <Select
                value={activeEmployeeId}
                onValueChange={id => {
                  setActiveEmployeeId(id)
                  setSkillTypeId('')
                  setSkillFile(null)
                  if (skillFileRef.current) skillFileRef.current.value = ''
                  setBanner(null)
                }}
              >
                <SelectTrigger className="h-9 w-full" aria-label="Employee to view skills for">
                  <SelectValue placeholder="Choose employee" />
                </SelectTrigger>
                <SelectContent>
                  {selectedEmpsInOrder.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {employeeDisplayName(emp)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {!activeEmployeeId ? (
            <p className="text-sm text-muted-foreground">Select at least one employee above.</p>
          ) : (
            <>
          <div className="flex gap-1 border-b border-border" role="tablist" aria-label="Skills sections">
            {(['skills', 'certifications'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={manageKind === tab}
                data-testid={`employee-skills-manage-subtab-${tab}`}
                onClick={() => {
                  setManageKind(tab)
                  setBanner(null)
                }}
                className={cn(
                  'text-sm px-3 pb-2 border-b-2 -mb-px transition-colors font-medium',
                  manageKind === tab
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tab === 'skills' ? 'Skills' : 'Work Certification'}
              </button>
            ))}
          </div>

          {manageKind === 'certifications' ? (
            <EmployeeEditCertificationsPanel employeeId={activeEmployeeId} showHeading={false} />
          ) : skillsError ? (
            <p className="text-sm text-destructive">{skillsError}</p>
          ) : skillsLoading ? (
            <p className="text-sm text-muted-foreground">Loading skills…</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left">
                    <th className="px-3 py-2 font-medium">Skill</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Expiry</th>
                    <th className="px-3 py-2 font-medium">Notes</th>
                    <th className="px-3 py-2 font-medium">Skill Documentation</th>
                    {canUpdate ? <th className="w-12 px-3 py-2" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {skills.length === 0 ? (
                    <tr>
                      <td colSpan={canUpdate ? 5 : 4} className="px-3 py-6 text-center text-muted-foreground">
                        No skills recorded yet.
                      </td>
                    </tr>
                  ) : (
                    skills.map(row => (
                      <tr key={row.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 font-medium">{row.skillType?.name ?? '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          {formatSkillExpiry(row.expiryDate)}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground max-w-[12rem] truncate" title={row.notes ?? ''}>
                          {row.notes?.trim() ? row.notes : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <EmployeeSkillDocumentCell
                            employeeId={activeEmployeeId}
                            skillId={row.id}
                            documentUrl={row.documentUrl}
                            canUpdate={canUpdate}
                            onError={text => setBanner({ type: 'error', text })}
                          />
                        </td>
                        {canUpdate ? (
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              title="Remove skill"
                              className="inline-flex rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => void onDeleteSkill(row.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {manageKind === 'skills' && activeEmployeeId && canUpdate ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/10 p-4 space-y-3">
              <p className="text-xs font-medium text-foreground">Add skill</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <EmployeeSkillTypePicker
                    types={skillTypes}
                    assignedIds={assignedSkillTypeIds}
                    value={skillTypeId}
                    onChange={setSkillTypeId}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Expiry (optional)</label>
                  <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs text-muted-foreground">Notes (optional)</label>
                  <Input
                    placeholder="e.g. Training provider, certificate ref"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs text-muted-foreground">Skill documentation (optional)</label>
              <Input
                ref={skillFileRef}
                type="file"
                accept={SKILL_DOCUMENT_ACCEPT}
                className="h-9"
                disabled={!canUploadDocs}
                onChange={e => setSkillFile(e.target.files?.[0] ?? null)}
              />
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={saving || !skillTypeId.trim() || assignedSkillTypeIds.has(skillTypeId)}
                onClick={() => void onAddSkill()}
              >
                {saving ? 'Saving…' : 'Add skill'}
              </Button>
            </div>
          ) : manageKind === 'skills' && activeEmployeeId && !canUpdate ? (
            <p className="text-xs text-muted-foreground">You do not have permission to add or remove skills.</p>
          ) : null}
            </>
          )}
        </div>
      </div>
        </>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            All employees and their recorded skill types. Click <span className="font-medium text-foreground">Employee Name</span> with the filter icon to narrow the list by name.
          </p>
          {!apiConfigured || !jwtPresent ? (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {apiConfigured ? 'Sign in with a real JWT to view the overview.' : 'Set VITE_API_BASE_URL and sign in to load data.'}
            </p>
          ) : overviewError ? (
            <p className="text-sm text-destructive">{overviewError}</p>
          ) : overviewLoading ? (
            <p className="text-sm text-muted-foreground">Loading overview…</p>
          ) : (
            <div className="max-w-5xl overflow-hidden rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="w-[min(40%,280px)] px-3 py-2.5 text-left font-medium text-foreground">
                      <PopoverPrimitive.Root open={nameFilterOpen} onOpenChange={setNameFilterOpen}>
                        <PopoverPrimitive.Trigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-md outline-none ring-offset-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            Employee Name
                            <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-70" aria-hidden />
                          </button>
                        </PopoverPrimitive.Trigger>
                        <PopoverPrimitive.Portal>
                          <PopoverPrimitive.Content
                            className="z-50 w-72 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                            align="start"
                            sideOffset={6}
                          >
                            <label className="text-xs font-medium text-muted-foreground" htmlFor="skills-overview-name-filter">
                              Filter by employee name
                            </label>
                            <Input
                              id="skills-overview-name-filter"
                              value={overviewNameFilter}
                              onChange={e => setOverviewNameFilter(e.target.value)}
                              placeholder="Type to filter…"
                              className="mt-2 h-9"
                              autoComplete="off"
                            />
                            {overviewNameFilter.trim() ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="mt-2 h-8 w-full text-xs"
                                onClick={() => setOverviewNameFilter('')}
                              >
                                Clear filter
                              </Button>
                            ) : null}
                          </PopoverPrimitive.Content>
                        </PopoverPrimitive.Portal>
                      </PopoverPrimitive.Root>
                    </th>
                    <th className="px-3 py-2.5 text-left font-medium text-foreground">Skills</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOverviewRows.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-3 py-8 text-center text-muted-foreground">
                        {overviewRows.length === 0 ? 'No employees found.' : 'No employees match this filter.'}
                      </td>
                    </tr>
                  ) : (
                    filteredOverviewRows.map(row => (
                      <tr key={row.employeeId} className="border-b border-border last:border-b-0">
                        <td className="align-top px-3 py-2.5 font-medium text-foreground">{row.displayName}</td>
                        <td className="align-top px-3 py-2.5 text-muted-foreground leading-relaxed">
                          {row.skillNames.length > 0 ? row.skillNames.join(', ') : ''}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
