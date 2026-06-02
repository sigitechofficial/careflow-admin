import { QueryClient } from '@tanstack/react-query'
import { isAbortError } from '@/shared/api/api-client'

/**
 * Singleton QueryClient for the application.
 *
 * Defaults:
 * - staleTime: 30 s  â€” data fetched within the last 30 s is served from cache
 *   without a network round-trip. Keeps SPA navigation snappy.
 * - gcTime: 5 min   â€” unused cache entries are garbage-collected after 5 min.
 * - retry: 1        â€” one automatic retry on transient failures (not 401/403/404).
 * - refetchOnWindowFocus: false â€” avoid surprise re-fetches when the user
 *   alt-tabs back. SessionRefresh handles token refresh proactively instead.
 * - throwOnError: false â€” errors surface through query.error, not as thrown
 *   exceptions, so every page controls its own error UI.
 *
 * AbortError is never treated as a failure â€” Query cancels in-flight requests
 * when the component unmounts or the query key changes, and those cancellations
 * must be silent.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        // Never retry aborts or client errors (4xx)
        if (isAbortError(error)) return false
        if (error instanceof Error && 'status' in error) {
          const status = (error as { status: number }).status
          if (status >= 400 && status < 500) return false
        }
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
