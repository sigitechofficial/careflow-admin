import * as React from 'react'

export const SETTINGS_TABLE_PAGE_SIZE = 25
export const SETTINGS_TABLE_PAGE_SIZES = [10, 25, 50, 100] as const

type UseClientPaginationOptions = {
  pageSize?: number
  resetDeps?: readonly unknown[]
}

export function useClientPagination<T>(
  items: readonly T[],
  { pageSize = SETTINGS_TABLE_PAGE_SIZE, resetDeps = [] }: UseClientPaginationOptions = {},
) {
  const [page, setPage] = React.useState(1)
  const [pageSizeState, setPageSize] = React.useState(pageSize)

  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSizeState))
  const safePage = Math.min(page, totalPages)

  React.useEffect(() => {
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies filter keys via resetDeps
  }, [totalItems, pageSizeState, ...resetDeps])

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paginatedItems = React.useMemo(() => {
    const start = (safePage - 1) * pageSizeState
    return items.slice(start, start + pageSizeState)
  }, [items, safePage, pageSizeState])

  return {
    page: safePage,
    setPage,
    pageSize: pageSizeState,
    setPageSize,
    totalPages,
    totalItems,
    paginatedItems,
    showPagination: totalItems > pageSizeState,
    rangeStart: totalItems === 0 ? 0 : (safePage - 1) * pageSizeState + 1,
    rangeEnd: Math.min(safePage * pageSizeState, totalItems),
  }
}
