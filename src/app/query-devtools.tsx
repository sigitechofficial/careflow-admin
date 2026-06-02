import { lazy, Suspense } from 'react'

const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((mod) => ({
    default: mod.ReactQueryDevtools,
  })),
)

/** TanStack Query inspector — dev only, tree-shaken from production builds. */
export function QueryDevtools() {
  if (!import.meta.env.DEV) return null
  return (
    <Suspense fallback={null}>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </Suspense>
  )
}
