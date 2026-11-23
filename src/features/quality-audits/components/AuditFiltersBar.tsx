import * as React from 'react'
import { useAuthStore } from '@/features/auth/store'
import { useOfficeUsers } from '@/features/settings/hooks/useUsersAccess'
import { useBranchOptions } from '@/features/cqc-mock-inspection/components/StartInspectionDialog'
import { feedbackSelectClass } from '@/features/complaints/components/FeedbackFormDialog'
import { cn } from '@/shared/lib/utils'
import type { AuditFilters } from '../types'
import { useAuditAreas } from '../hooks'

/** People who can be accountable for audits: office users, or just you when the list is not available. */
export function useAccountableOptions(enabled = true) {
  const me = useAuthStore(s => s.user)
  const canSeeUsers = useAuthStore(s => s.can('users.read'))
  const users = useOfficeUsers(enabled && canSeeUsers)
  return React.useMemo(() => {
    const list = (users.data ?? [])
      .filter(u => u.isActive && !u.invitePending)
      .map(u => ({ id: u.id, label: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email }))
      .sort((a, b) => a.label.localeCompare(b.label))
    if (me?.id && !list.some(u => u.id === me.id))
      list.unshift({ id: me.id, label: [me.firstName, me.lastName].filter(Boolean).join(' ').trim() || 'Me' })
    return list
  }, [users.data, me])
}

/** Branch, area and person accountable, as on the audit dashboard and reports. */
export function AuditFiltersBar({
  value,
  onChange,
  showPerson = true,
  className,
  children,
}: {
  value: AuditFilters
  onChange: (next: AuditFilters) => void
  showPerson?: boolean
  className?: string
  children?: React.ReactNode
}) {
  const { wholeOrg, options: branches } = useBranchOptions(true)
  const areas = useAuditAreas()
  const people = useAccountableOptions(showPerson)
  const me = useAuthStore(s => s.user?.id)
  const set = (patch: Partial<AuditFilters>) => onChange({ ...value, ...patch })
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)} data-testid="audit-filters">
      <select
        className={`${feedbackSelectClass} max-w-[13rem]`}
        value={value.locationId ?? ''}
        onChange={e => set({ locationId: e.target.value || undefined })}
        aria-label="Branch"
        data-testid="audit-filter-branch"
      >
        <option value="">{wholeOrg ? 'All branches' : 'All my branches'}</option>
        {branches.map(b => (
          <option key={b.id} value={b.id}>
            {b.label}
          </option>
        ))}
      </select>
      <select
        className={`${feedbackSelectClass} max-w-[13rem]`}
        value={value.areaCode ?? ''}
        onChange={e => set({ areaCode: e.target.value || undefined })}
        aria-label="Area"
        data-testid="audit-filter-area"
      >
        <option value="">Show all areas</option>
        {(areas.data ?? []).map(a => (
          <option key={a.code} value={a.code}>
            {a.name}
          </option>
        ))}
      </select>
      {showPerson ? (
        <select
          className={`${feedbackSelectClass} max-w-[13rem]`}
          value={value.accountableUserId ?? ''}
          onChange={e => set({ accountableUserId: e.target.value || undefined })}
          aria-label="Person accountable"
          data-testid="audit-filter-person"
        >
          <option value="">Show all staff</option>
          {me ? <option value={me}>Me</option> : null}
          {people
            .filter(p => p.id !== me)
            .map(p => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
        </select>
      ) : null}
      {children}
    </div>
  )
}
