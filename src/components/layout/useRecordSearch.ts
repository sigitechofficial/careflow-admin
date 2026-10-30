import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import type { Permission } from '@/features/auth/types'
import { useDebouncedValue } from '@/features/policies/hooks/useDebouncedValue'
import { listServiceUsers } from '@/features/service-users/api/service-users.api'
import { listEmployees } from '@/features/employees/api/employees.api'
import { fetchIncidents } from '@/features/incidents/api/incidents.api'
import { fetchFeedbackList } from '@/features/complaints/api/complaints.api'
import { listEnquiries } from '@/features/crm/api/crm.api'
import { listSafeguarding } from '@/features/safeguarding/api/safeguarding.api'
import { fetchPolicies } from '@/features/policies/api/policies.api'

/** A database record matched by the header search. */
export type RecordSearchHit = {
  id: string
  section: string
  label: string
  detail?: string
  href: string
}

const PER_GROUP = 5
const MIN_QUERY = 2

type Source = {
  section: string
  /** Shown when the user holds any of these (same as the module's list endpoint). */
  anyOf: Permission[]
  run: (q: string) => Promise<RecordSearchHit[]>
}

const SOURCES: Source[] = [
  {
    section: 'Service users',
    anyOf: ['service_users.read'],
    run: async q => {
      const { rows } = await listServiceUsers({ search: q, limit: PER_GROUP })
      return rows.map(r => ({
        id: `su:${r.id}`,
        section: 'Service users',
        label: `${r.firstName} ${r.lastName}`.trim(),
        detail: r.serviceUserNumber ?? undefined,
        href: `/service-users/${r.id}/profile`,
      }))
    },
  },
  {
    section: 'Employees',
    anyOf: ['employees.read'],
    run: async q => {
      const { rows } = await listEmployees({ search: q, limit: PER_GROUP })
      return rows.map(r => ({
        id: `emp:${r.id}`,
        section: 'Employees',
        label: r.fullName ?? `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim(),
        detail: r.jobTitle?.name ?? undefined,
        href: `/employee/${r.id}/edit`,
      }))
    },
  },
  {
    section: 'Enquiries & Referrals',
    anyOf: ['crm.read', 'crm.manage'],
    run: async q => {
      const rows = await listEnquiries({ search: q })
      return rows.slice(0, PER_GROUP).map(r => ({
        id: `enq:${r.id}`,
        section: 'Enquiries & Referrals',
        label: `${r.firstName} ${r.lastName}`.trim(),
        detail: r.kind === 'REFERRAL' ? `${r.referenceNumber} · Referral` : r.referenceNumber,
        href: `/crm/${r.id}`,
      }))
    },
  },
  {
    section: 'Incidents',
    anyOf: ['incidents.read'],
    run: async q => {
      const { items } = await fetchIncidents({ search: q, page: 1, limit: PER_GROUP })
      return items.map(r => ({
        id: `inc:${r.id}`,
        section: 'Incidents',
        label: r.primaryPersonName ? `${r.referenceNumber} · ${r.primaryPersonName}` : r.referenceNumber,
        detail: r.category.label,
        href: `/incidents/${r.id}`,
      }))
    },
  },
  {
    section: 'Complaints & compliments',
    anyOf: ['complaints.read'],
    run: async q => {
      const rows = await fetchFeedbackList({ search: q })
      return rows.slice(0, PER_GROUP).map(r => ({
        id: `fb:${r.id}`,
        section: 'Complaints & compliments',
        label: r.subject,
        detail: r.referenceNumber,
        href: `/incidents/feedback/${r.id}`,
      }))
    },
  },
  {
    section: 'Safeguarding',
    anyOf: ['safeguarding.read', 'safeguarding.manage'],
    run: async q => {
      const rows = await listSafeguarding({ search: q })
      return rows.slice(0, PER_GROUP).map(r => ({
        id: `sg:${r.id}`,
        section: 'Safeguarding',
        label: r.serviceUserName ?? r.personDescription ?? r.referenceNumber,
        detail: r.referenceNumber,
        href: `/safeguarding/${r.id}`,
      }))
    },
  },
  {
    section: 'Policies',
    anyOf: ['policies.read'],
    run: async q => {
      const { rows } = await fetchPolicies({ search: q, limit: PER_GROUP })
      return rows.map(r => ({
        id: `pol:${r.id}`,
        section: 'Policies',
        label: r.title,
        detail: r.reference,
        href: `/policies/${r.id}`,
      }))
    },
  },
]

/**
 * Searches records the signed-in user can see (service users, employees, enquiries, incidents,
 * complaints, safeguarding, policies) through each module's own list endpoint, so branch scoping
 * and permissions stay exactly as on those pages. One failing source does not hide the others.
 */
export function useRecordSearch(query: string) {
  const can = useAuthStore(s => s.can)
  const debounced = useDebouncedValue(query.trim(), 300)
  const sources = SOURCES.filter(s => s.anyOf.some(p => can(p)))
  const enabled = debounced.length >= MIN_QUERY && sources.length > 0

  const result = useQuery({
    queryKey: ['global-record-search', debounced, sources.map(s => s.section)],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const settled = await Promise.allSettled(sources.map(s => s.run(debounced)))
      return settled.flatMap(r => (r.status === 'fulfilled' ? r.value : []))
    },
  })

  return {
    hits: enabled ? (result.data ?? []) : [],
    isSearching: enabled && result.isFetching,
    pending: query.trim().length >= MIN_QUERY && (query.trim() !== debounced || (enabled && result.isFetching)),
  }
}
