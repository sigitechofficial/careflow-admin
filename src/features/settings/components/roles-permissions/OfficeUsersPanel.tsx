import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useAuthStore } from '@/features/auth/store'
import {
  useCreateOfficeUser,
  useOfficeUsers,
  useSetOfficeUserEmployee,
  useSetOfficeUserLocations,
  useSetOfficeUserRoles,
} from '@/features/settings/hooks/useUsersAccess'
import {
  assignableRolesForActor,
  BRANCH_SCOPED_ROLE_NAMES,
  COMPANY_WIDE_ROLE_NAMES,
  type OfficeUserRow,
} from '@/features/settings/api/users-access.api'
import { fetchLookupList } from '@/features/settings/api/lookups-admin-api'
import { settingsKeys } from '@/features/settings/keys'
import { accessibleBranchIds, isBranchScoped } from '@/features/auth/org-scope'

function displayName(u: OfficeUserRow): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
  return name || u.email
}

function rolesNeedBranches(roleNames: string[]): boolean {
  return (
    roleNames.some(r => BRANCH_SCOPED_ROLE_NAMES.has(r))
    && !roleNames.some(r => COMPANY_WIDE_ROLE_NAMES.has(r))
  )
}

/** Link an office user to their HR employee record so they can be paid through Payroll. */
function EmployeeLinkSection({ user, canEdit }: { user: OfficeUserRow; canEdit: boolean }) {
  const canSeePayroll = useAuthStore(s => s.can('payroll.employees.read'))
  const setEmployee = useSetOfficeUserEmployee()
  const [search, setSearch] = React.useState('')
  const [pickedId, setPickedId] = React.useState('')
  const employeesQuery = useEmployees({ limit: 50, search: search || undefined }, canEdit && !user.employee)
  const options: ComboboxOption[] = (employeesQuery.data?.rows ?? []).map(r => ({
    value: r.id,
    label: r.fullName || [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
    description: r.jobTitle?.name ?? undefined,
  }))
  React.useEffect(() => {
    setPickedId('')
    setSearch('')
  }, [user.id])
  const link = (employeeId: string | null) => setEmployee.mutate({ userId: user.id, employeeId })

  return (
    <fieldset disabled={!canEdit || setEmployee.isPending} className="space-y-2">
      <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Employee record (for payroll)
      </legend>
      {user.employee ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
          <div className="text-sm">
            Linked to{' '}
            <Link
              to="/hr/employees/$employeeId"
              params={{ employeeId: user.employee.id }}
              className="font-medium text-primary underline underline-offset-2 hover:no-underline"
            >
              {user.employee.name}
            </Link>
            {canSeePayroll ? (
              <>
                {' · '}
                <Link to="/payroll/employees" className="text-primary underline underline-offset-2 hover:no-underline">
                  Set up salary in Payroll
                </Link>
              </>
            ) : null}
          </div>
          {canEdit ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => link(null)}>
              Unlink
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Link this login to the person&apos;s employee record so they can be paid through Payroll. Not on
            your payroll? Leave it unlinked. No employee record yet? Create one with Add employee first.
          </p>
          {canEdit && user.suggestedEmployee ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm">
              <span>
                Suggested: <span className="font-medium">{user.suggestedEmployee.name}</span>
                <span className="text-xs text-muted-foreground"> (same email)</span>
              </span>
              <Button type="button" size="sm" onClick={() => link(user.suggestedEmployee!.id)}>
                Link
              </Button>
            </div>
          ) : null}
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <div className="min-w-[220px] flex-1">
                <Combobox
                  options={options}
                  value={pickedId}
                  onChange={setPickedId}
                  onSearchChange={setSearch}
                  loading={employeesQuery.isLoading}
                  placeholder="Find employee…"
                  searchPlaceholder="Search employees…"
                  emptyText="No employees match your search."
                />
              </div>
              <Button type="button" size="sm" disabled={!pickedId} onClick={() => link(pickedId)}>
                Link employee
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not linked.</p>
          )}
        </>
      )}
    </fieldset>
  )
}

const emptyCreateForm = {
  email: '',
  username: '',
  firstName: '',
  lastName: '',
  password: '',
  roleNames: [] as string[],
  locationIds: [] as string[],
}

export function OfficeUsersPanel() {
  const canManage = useAuthStore(s => s.can('roles.manage'))
  const canCreate = useAuthStore(s => s.can('users.create'))
  const actorRoles = useAuthStore(s => s.user?.backendRoles ?? [])
  const actorBranchScoped = useAuthStore(s => isBranchScoped(s.user))
  const actorBranchIds = useAuthStore(s => accessibleBranchIds(s.user))
  const actorAssignedLocations = useAuthStore(s => s.user?.assignedLocations ?? null)
  const assignableRoles = React.useMemo(
    () => assignableRolesForActor(actorRoles),
    [actorRoles],
  )
  const usersQuery = useOfficeUsers(true)
  const locationsQuery = useQuery({
    queryKey: settingsKeys.lookups('locations'),
    queryFn: () => fetchLookupList('locations'),
    staleTime: 30_000,
  })
  const setRoles = useSetOfficeUserRoles()
  const setLocations = useSetOfficeUserLocations()
  const createUser = useCreateOfficeUser()

  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [draftRoles, setDraftRoles] = React.useState<string[]>([])
  const [draftLocationIds, setDraftLocationIds] = React.useState<string[]>([])
  const [createOpen, setCreateOpen] = React.useState(false)
  const [createForm, setCreateForm] = React.useState(emptyCreateForm)
  const [createError, setCreateError] = React.useState<string | null>(null)

  const locationOptions = React.useMemo(() => {
    const rows = locationsQuery.data ?? []
    const byId = new Map(rows.map(r => [r.id, r.name]))
    // Prefer auth labels when lookups miss a name.
    for (const loc of actorAssignedLocations ?? []) {
      if (!byId.has(loc.id)) byId.set(loc.id, loc.name)
    }
    const selected = usersQuery.data?.find(u => u.id === selectedId)
    for (const loc of selected?.locations ?? []) {
      if (!byId.has(loc.id)) byId.set(loc.id, loc.name)
    }
    let options = [...byId.entries()].map(([id, label]) => ({ id, label }))
    // Branch-scoped actors only see / assign their own branches.
    if (Array.isArray(actorBranchIds)) {
      const allowed = new Set(actorBranchIds)
      options = options.filter(o => allowed.has(o.id))
    }
    return options.sort((a, b) => a.label.localeCompare(b.label))
  }, [locationsQuery.data, usersQuery.data, selectedId, actorBranchIds, actorAssignedLocations])

  const selected = usersQuery.data?.find(u => u.id === selectedId) ?? null

  React.useEffect(() => {
    if (!selected) {
      setDraftRoles([])
      setDraftLocationIds([])
      return
    }
    setDraftRoles(selected.roles.map(r => r.name))
    setDraftLocationIds(selected.locations.map(l => l.id))
  }, [selected])

  const needsBranches = rolesNeedBranches(draftRoles) || actorBranchScoped
  const createNeedsBranches = rolesNeedBranches(createForm.roleNames) || actorBranchScoped
  const allBranchesSelected =
    locationOptions.length > 0 && draftLocationIds.length === locationOptions.length
  const allCreateBranchesSelected =
    locationOptions.length > 0 && createForm.locationIds.length === locationOptions.length

  const toggleRole = (name: string) => {
    setDraftRoles(prev => (prev.includes(name) ? prev.filter(r => r !== name) : [...prev, name]))
  }

  const toggleLocation = (id: string) => {
    setDraftLocationIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  const openCreate = () => {
    const defaultLocs =
      Array.isArray(actorBranchIds) && actorBranchIds.length > 0 ? [...actorBranchIds] : []
    setCreateForm({ ...emptyCreateForm, locationIds: defaultLocs })
    setCreateError(null)
    setCreateOpen(true)
  }

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    const email = createForm.email.trim()
    if (!email) {
      setCreateError('Email is required.')
      return
    }
    if (createForm.password.length < 8) {
      setCreateError('Password must be at least 8 characters.')
      return
    }
    if (createNeedsBranches && createForm.locationIds.length === 0) {
      setCreateError('Select at least one branch for this role.')
      return
    }
    try {
      const created = await createUser.mutateAsync({
        email,
        password: createForm.password,
        username: createForm.username.trim() || undefined,
        firstName: createForm.firstName.trim() || undefined,
        lastName: createForm.lastName.trim() || undefined,
        roleNames: createForm.roleNames,
        locationIds: createForm.locationIds,
      })
      setCreateOpen(false)
      setCreateForm(emptyCreateForm)
      setSelectedId(created.id)
    } catch {
      // Toast handled in mutation
    }
  }

  return (
    <div className="space-y-4" data-testid="office-users-panel">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Office users</h2>
              <p className="text-xs text-muted-foreground">Select a user to edit roles and branches.</p>
            </div>
            {canCreate ? (
              <Button type="button" size="sm" onClick={openCreate} data-testid="users-access-add">
                <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                Add user
              </Button>
            ) : null}
          </div>
          {usersQuery.isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading users…</p>
          ) : usersQuery.isError ? (
            <p className="p-4 text-sm text-destructive">Could not load users.</p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-border overflow-auto">
              {(usersQuery.data ?? []).map(u => {
                const active = u.id === selectedId
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(u.id)}
                      className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/60 ${active ? 'bg-muted' : ''}`}
                    >
                      <span className="text-sm font-medium">{displayName(u)}</span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                      <span className="text-xs text-muted-foreground">
                        {u.employee ? `Employee: ${u.employee.name}` : 'No employee record linked'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {u.roles.map(r => r.name).join(', ') || 'No roles'}
                        {' · '}
                        {u.scopeType}
                        {u.locations.length
                          ? ` · ${u.locations.map(l => l.name).join(', ')}`
                          : u.scopeType === 'branch'
                            ? ' · no branches'
                            : ' · all branches'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          {!selected ? (
            <p className="text-sm text-muted-foreground">
              {canCreate
                ? 'Choose a user from the list, or add a new office user.'
                : 'Choose a user from the list.'}
            </p>
          ) : (
            <>
              <div>
                <h2 className="text-sm font-semibold">{displayName(selected)}</h2>
                <p className="text-xs text-muted-foreground">{selected.email}</p>
              </div>

              <EmployeeLinkSection user={selected} canEdit={canCreate} />

              <fieldset disabled={!canManage || setRoles.isPending} className="space-y-2">
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Identity roles
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {assignableRoles.map(role => (
                    <label key={role} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draftRoles.includes(role)}
                        onChange={() => toggleRole(role)}
                        className="h-4 w-4 rounded border-border"
                      />
                      {role}
                    </label>
                  ))}
                </div>
                {canManage ? (
                  <Button
                    type="button"
                    size="sm"
                    className="mt-2"
                    disabled={setRoles.isPending}
                    onClick={() => setRoles.mutate({ userId: selected.id, roleNames: draftRoles })}
                  >
                    Save roles
                  </Button>
                ) : null}
              </fieldset>

              <fieldset disabled={!canManage || setLocations.isPending} className="space-y-2">
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Authorization branches
                </legend>
                <p className="text-xs text-muted-foreground">
                  {actorBranchScoped
                    ? 'You can only assign branches in your scope. At least one branch is required.'
                    : needsBranches
                      ? 'Required for branch-scoped roles. Save replaces the full branch list — uncheck any branch you do not want.'
                      : 'Leave empty for all branches (company-wide roles only). Save replaces the full list. Super Admin / Admin / Master Allocator stay company-wide.'}
                </p>
                {locationsQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading locations…</p>
                ) : locationOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No locations found.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={setLocations.isPending || allBranchesSelected}
                        onClick={() => setDraftLocationIds(locationOptions.map(l => l.id))}
                      >
                        Select all branches
                      </Button>
                      {draftLocationIds.length > 0 && !actorBranchScoped ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={setLocations.isPending}
                          onClick={() => setDraftLocationIds([])}
                        >
                          Clear selection
                        </Button>
                      ) : null}
                    </div>
                    <div className="max-h-56 space-y-2 overflow-auto rounded-md border border-border p-3">
                      {locationOptions.map(loc => (
                        <label key={loc.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={draftLocationIds.includes(loc.id)}
                            onChange={() => toggleLocation(loc.id)}
                            className="h-4 w-4 rounded border-border"
                          />
                          {loc.label}
                        </label>
                      ))}
                    </div>
                  </>
                )}
                {draftLocationIds.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Selected ({draftLocationIds.length}/{locationOptions.length}):{' '}
                    {locationOptions
                      .filter(l => draftLocationIds.includes(l.id))
                      .map(l => l.label)
                      .join(', ')}
                  </p>
                ) : null}
                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="mt-2"
                      disabled={setLocations.isPending}
                      onClick={() =>
                        setLocations.mutate({
                          userId: selected.id,
                          locationIds: draftLocationIds,
                        })
                      }
                    >
                      Save branches
                    </Button>
                  </div>
                ) : null}
              </fieldset>
            </>
          )}
        </div>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={open => {
          if (!createUser.isPending) setCreateOpen(open)
        }}
      >
        <DialogContent size="lg">
          <form
            onSubmit={e => void submitCreate(e)}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <DialogHeader>
              <DialogTitle>Add office user</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="ua-email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="ua-email"
                    type="email"
                    autoComplete="off"
                    required
                    value={createForm.email}
                    onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="user@company.local"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="ua-first" className="text-sm font-medium">
                    First name
                  </label>
                  <Input
                    id="ua-first"
                    value={createForm.firstName}
                    onChange={e => setCreateForm(f => ({ ...f, firstName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="ua-last" className="text-sm font-medium">
                    Last name
                  </label>
                  <Input
                    id="ua-last"
                    value={createForm.lastName}
                    onChange={e => setCreateForm(f => ({ ...f, lastName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="ua-username" className="text-sm font-medium">
                    Username
                  </label>
                  <Input
                    id="ua-username"
                    autoComplete="off"
                    value={createForm.username}
                    onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="ua-password" className="text-sm font-medium">
                    Temporary password
                  </label>
                  <Input
                    id="ua-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={createForm.password}
                    onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Min. 8 characters"
                  />
                </div>
              </div>

              {canManage ? (
                <>
                  <fieldset className="space-y-2">
                    <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Roles (optional)
                    </legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {assignableRoles.map(role => (
                        <label key={role} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={createForm.roleNames.includes(role)}
                            onChange={() =>
                              setCreateForm(f => ({
                                ...f,
                                roleNames: f.roleNames.includes(role)
                                  ? f.roleNames.filter(r => r !== role)
                                  : [...f.roleNames, role],
                              }))
                            }
                            className="h-4 w-4 rounded border-border"
                          />
                          {role}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="space-y-2">
                    <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Branches {createNeedsBranches ? '(required)' : '(optional)'}
                    </legend>
                    <p className="text-xs text-muted-foreground">
                      {createNeedsBranches
                        ? 'Branch-scoped roles need at least one branch.'
                        : 'Leave empty for company-wide access when using Admin / Master Allocator.'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={allCreateBranchesSelected}
                        onClick={() =>
                          setCreateForm(f => ({
                            ...f,
                            locationIds: locationOptions.map(l => l.id),
                          }))
                        }
                      >
                        Select all branches
                      </Button>
                      {createForm.locationIds.length > 0 && !actorBranchScoped ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setCreateForm(f => ({ ...f, locationIds: [] }))}
                        >
                          Clear selection
                        </Button>
                      ) : null}
                    </div>
                    <div className="max-h-40 space-y-2 overflow-auto rounded-md border border-border p-3">
                      {locationOptions.map(loc => (
                        <label key={loc.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={createForm.locationIds.includes(loc.id)}
                            onChange={() =>
                              setCreateForm(f => ({
                                ...f,
                                locationIds: f.locationIds.includes(loc.id)
                                  ? f.locationIds.filter(x => x !== loc.id)
                                  : [...f.locationIds, loc.id],
                              }))
                            }
                            className="h-4 w-4 rounded border-border"
                          />
                          {loc.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  User will be created without roles. Someone with roles.manage can assign them after.
                </p>
              )}

              {createError ? (
                <p className="text-sm text-destructive" role="alert">
                  {createError}
                </p>
              ) : null}
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={createUser.isPending}
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? 'Creating…' : 'Create user'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
