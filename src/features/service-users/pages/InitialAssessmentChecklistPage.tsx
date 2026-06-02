import * as React from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ClipboardList, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { type ServiceUserListRow } from '@/features/service-users/types'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import { useAuthStore } from '@/features/auth/store'
import { Label } from '@/shared/ui/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { ServiceUserInitialAssessmentTab } from '@/features/service-users/components/ServiceUserInitialAssessmentTab'

const CHECKLIST_PATH = '/service-users/initial-assessment-checklist'

function customerLabel(row: ServiceUserListRow): string {
  const name = row.preferredName?.trim() || [row.firstName, row.lastName].filter(Boolean).join(' ')
  const num = row.serviceUserNumber ? ` (${row.serviceUserNumber})` : ''
  return `${name}${num}`.trim() || row.id
}

function displayName(row: ServiceUserListRow): string {
  return row.preferredName?.trim() || [row.firstName, row.lastName].filter(Boolean).join(' ') || 'Customer'
}

function serviceUserIdFromSearch(search: unknown): string {
  if (search && typeof search === 'object' && 'serviceUserId' in search) {
    const id = (search as { serviceUserId?: unknown }).serviceUserId
    return typeof id === 'string' ? id.trim() : ''
  }
  return ''
}

export default function InitialAssessmentChecklistPage() {
  const navigate = useNavigate()
  const selectedId = useRouterState({
    select: s =>
      s.location.pathname === CHECKLIST_PATH ? serviceUserIdFromSearch(s.location.search) : '',
  })
  const can = useAuthStore(s => s.can)
  const canRead = can('service_users.initial_assessment.read') || can('service_users.read')
  const hasApi = !!getApiBaseUrl()

  const { data: listData, isLoading } = useServiceUsers(
    {
      limit: 100,
      sortBy: 'lastName',
      sortOrder: 'asc',
    },
    hasApi && canRead,
  )
  const serviceUsers = listData?.rows ?? []

  const selected = React.useMemo(
    () => serviceUsers.find(su => su.id === selectedId) ?? null,
    [serviceUsers, selectedId],
  )

  const onCustomerChange = (id: string) => {
    void navigate({
      to: CHECKLIST_PATH,
      search: id ? { serviceUserId: id } : {},
      replace: true,
    })
  }

  if (!hasApi) {
    return (
      <p className="p-6 text-sm text-muted-foreground">Configure VITE_API_BASE_URL to load the checklist.</p>
    )
  }

  if (!canRead) {
    return (
      <p className="p-6 text-sm text-destructive">
        You do not have permission to view the initial assessment checklist.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" data-testid="initial-assessment-checklist-page">
      <div className="flex flex-wrap items-center gap-3">
        <ClipboardList className="h-7 w-7 text-teal-700 dark:text-teal-400" aria-hidden />
        <h1 className="text-xl font-bold text-foreground md:text-2xl">Initial Assessment Checklist</h1>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
        <strong>Legacy checklist.</strong> Use the{' '}
        <Button variant="link" className="h-auto p-0 text-amber-950 underline dark:text-amber-100" asChild>
          <Link to="/service-users/initial-assessment" search={selectedId ? { serviceUserId: selectedId } : {}}>
            enterprise initial assessment
          </Link>
        </Button>{' '}
        (14 sections, submit, audit) for new work. This page remains for migration only.
      </div>

      <p className="text-sm text-muted-foreground">
        Select a service user to complete the legacy checkbox assessment. Answers are saved per service user.
      </p>

      <div className="max-w-xl space-y-2 rounded-xl border border-border bg-card p-4 shadow-sm">
        <Label htmlFor="ia-customer">
          Customer <span className="text-destructive">*</span>
        </Label>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading customers…
          </div>
        ) : (
          <Select value={selectedId || '_none'} onValueChange={v => onCustomerChange(v === '_none' ? '' : v)}>
            <SelectTrigger id="ia-customer" data-testid="initial-assessment-customer-select">
              <SelectValue placeholder="Select a customer…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Select a customer…</SelectItem>
              {serviceUsers.map(su => (
                <SelectItem key={su.id} value={su.id}>
                  {customerLabel(su)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!selectedId ? (
        <div
          className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground"
          data-testid="initial-assessment-select-prompt"
        >
          Choose a customer above to open the checklist (Mobility, Skin Condition, Medication, and all other
          sections).
        </div>
      ) : selected ? (
        <ServiceUserInitialAssessmentTab
          key={selected.id}
          serviceUserId={selected.id}
          displayName={displayName(selected)}
          dateOfBirth={selected.dateOfBirth}
        />
      ) : (
        <p className="text-sm text-destructive">Selected customer could not be found.</p>
      )}
    </div>
  )
}
