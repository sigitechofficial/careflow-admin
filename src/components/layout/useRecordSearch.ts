import { useQuery } from '@tanstack/react-query'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'
import { useDebouncedValue } from '@/features/policies/hooks/useDebouncedValue'
import { withoutRecordTabWords } from '@/features/search/inside-records'

/** A record found by "Find anything" (GET /search). */
export type RecordSearchHit = {
  id: string
  section: string
  label: string
  detail?: string
  href: string
  search?: Record<string, string>
  /** For "go straight to" a tab of this record ("Mary Jones medication"). */
  recordType?: 'serviceUser' | 'employee'
  recordId?: string
}

const MIN_QUERY = 2

/**
 * Records the signed-in person may see, in one request: service users, staff, enquiries, incidents, safeguarding,
 * complaints, policies, documents (also by the text inside them), contacts, surveys, courses, candidates, office
 * users, roles, branches and funders. The API checks each kind's permission and branch rules (the list pages'
 * own). "Mary Jones medication" searches people for "Mary Jones" (the tab words are for going straight to a tab).
 */
export function useRecordSearch(query: string) {
  const signedIn = useAuthStore(s => Boolean(s.user))
  const debounced = useDebouncedValue(query.trim(), 300)
  const recordQuery = withoutRecordTabWords(debounced)
  const enabled = signedIn && recordQuery.length >= MIN_QUERY

  const result = useQuery({
    queryKey: ['find-anything', recordQuery],
    enabled,
    staleTime: 30_000,
    queryFn: async () =>
      (
        await apiJson<ApiEnvelope<{ hits: RecordSearchHit[]; didYouMean: string | null; suggested: RecordSearchHit[] }>>(
          `/search?q=${encodeURIComponent(recordQuery)}`,
          { method: 'GET' },
        )
      ).data,
  })

  return {
    hits: enabled ? (result.data?.hits ?? []) : [],
    /** Nothing matched, but a name close to what was typed did: shown as "Did you mean …?". */
    didYouMean: enabled ? (result.data?.didYouMean ?? null) : null,
    suggested: enabled ? (result.data?.suggested ?? []) : [],
    isSearching: enabled && result.isFetching,
    pending: query.trim().length >= MIN_QUERY && (query.trim() !== debounced || (enabled && result.isFetching)),
  }
}
