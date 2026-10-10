import { useMutation, useQuery } from '@tanstack/react-query'
import { fetchCarerReport, type CarerReportParams } from '@/features/employees/api/employee-reports.api'
import { employeeKeys } from '@/features/employees/keys'

export function useCarerReport(slug: string, params: CarerReportParams, enabled = true) {
  return useQuery({
    queryKey: employeeKeys.carerReport(slug, params),
    queryFn: ({ signal }) => fetchCarerReport(slug, params, { signal }),
    enabled: enabled && Boolean(slug),
    // Keep the old page while paging, but never show another report's rows (different shape).
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[2] === slug ? prev : undefined),
  })
}

/** Every page of a carer report (CSV export), capped at 50 × 500 rows. */
export function useCarerReportAllPages() {
  return useMutation({
    mutationFn: async ({ slug, params }: { slug: string; params: Omit<CarerReportParams, 'page' | 'limit'> }) => {
      const rows: unknown[] = []
      for (let page = 1; page <= 50; page++) {
        const res = await fetchCarerReport(slug, { ...params, page, limit: 500 })
        rows.push(...((res.data.rows as unknown[] | undefined) ?? []))
        if (!res.meta?.hasNextPage) break
      }
      return rows
    },
  })
}
