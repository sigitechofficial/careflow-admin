import * as React from 'react'
import { Plus, Search } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'
import type { AllocationItemCategory, EmployeeAllocationStatus, EmployeeListRow } from '@/features/employees/types'
import {
  useAllocationItemTypes,
  useEmployeeAllocationsRegistry,
} from '@/features/employees/hooks/useEmployeeAllocations'
import { useAllEmployees } from '@/features/employees/hooks/useEmployeeTabs'
import { Button } from '@/shared/ui/button'
import type { ComboboxOption } from '@/shared/ui/combobox'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { AllocationsManager } from '@/features/employees/components/employee-allocations/AllocationsManager'
import {
  ALLOCATION_CATEGORIES,
  ALLOCATION_CATEGORY_LABEL,
  ALLOCATION_STATUSES,
  ALLOCATION_STATUS_LABEL,
} from '@/features/employees/components/employee-allocations/allocation-labels'

const ALL = '__all__'

function employeeDisplayName(emp: EmployeeListRow): string {
  return emp.fullName?.trim() || [emp.firstName, emp.lastName].filter(Boolean).join(' ').trim() || '—'
}

/** Employee → Allocations: who has which laptop, phone, PPE or uniform. */
export function EmployeeAllocationsTab() {
  const canUpdate = useAuthStore(s => s.can('employees.update'))
  const [search, setSearch] = React.useState('')
  const deferredSearch = React.useDeferredValue(search)
  const [status, setStatus] = React.useState<EmployeeAllocationStatus | typeof ALL>('ISSUED')
  const [category, setCategory] = React.useState<AllocationItemCategory | typeof ALL>(ALL)
  const [itemTypeId, setItemTypeId] = React.useState(ALL)
  const [assignOpen, setAssignOpen] = React.useState(false)

  const itemsQuery = useAllocationItemTypes()
  const employeesQuery = useAllEmployees({ sortOrder: 'desc' }, canUpdate)
  const registryQuery = useEmployeeAllocationsRegistry({
    status: status === ALL ? undefined : status,
    category: category === ALL ? undefined : category,
    itemTypeId: itemTypeId === ALL ? undefined : itemTypeId,
    search: deferredSearch.trim() || undefined,
  })

  const rows = registryQuery.data ?? []
  const items = (itemsQuery.data ?? []).filter(i => category === ALL || i.category === category)
  const employeeOptions = React.useMemo<ComboboxOption[]>(
    () => (employeesQuery.data ?? []).map(e => ({ value: e.id, label: employeeDisplayName(e) })),
    [employeesQuery.data],
  )
  const employeeCount = new Set(rows.map(r => r.employeeId)).size
  const totalQty = rows.reduce((sum, r) => sum + r.quantity, 0)
  const error =
    registryQuery.error instanceof ApiError
      ? registryQuery.error.message
      : registryQuery.error
        ? 'Could not load allocations.'
        : null

  return (
    <div className="space-y-4" data-testid="employee-allocations-tab">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Allocations</h2>
          <p className="text-sm text-muted-foreground">
            Equipment, PPE and uniform issued to staff.
            {registryQuery.isLoading
              ? ''
              : ` ${rows.length} record${rows.length === 1 ? '' : 's'} · ${totalQty} item${totalQty === 1 ? '' : 's'} · ${employeeCount} employee${employeeCount === 1 ? '' : 's'}`}
          </p>
        </div>
        {canUpdate ? (
          <Button type="button" size="sm" onClick={() => setAssignOpen(true)} data-testid="allocations-assign">
            <Plus className="mr-1 h-4 w-4" />
            Assign item
          </Button>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Employee, serial no. or notes…"
            className="pl-8"
            data-testid="allocations-search"
          />
        </div>
        <Select
          value={category}
          onValueChange={v => {
            setCategory(v as AllocationItemCategory | typeof ALL)
            setItemTypeId(ALL)
          }}
        >
          <SelectTrigger data-testid="allocations-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {ALLOCATION_CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>
                {ALLOCATION_CATEGORY_LABEL[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={itemTypeId} onValueChange={setItemTypeId}>
          <SelectTrigger data-testid="allocations-item">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All items</SelectItem>
            {items.map(i => (
              <SelectItem key={i.id} value={i.id}>
                {i.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={v => setStatus(v as EmployeeAllocationStatus | typeof ALL)}>
          <SelectTrigger data-testid="allocations-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {ALLOCATION_STATUSES.map(s => (
              <SelectItem key={s} value={s}>
                {ALLOCATION_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <AllocationsManager
        rows={rows}
        loading={registryQuery.isLoading}
        canUpdate={canUpdate}
        emptyText="No allocations match these filters."
        employeeOptions={employeeOptions}
        assignOpen={assignOpen}
        onAssignOpenChange={setAssignOpen}
      />
    </div>
  )
}
