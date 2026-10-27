import * as React from 'react'
import { useAuthStore } from '@/features/auth/store'
import { useLocationManagementTree } from '@/features/settings/hooks/useLocationManagement'
import { flattenLocationOptionsFromTree } from '@/features/locations/utils/flatten-location-options.util'

export type BranchOption = { id: string; label: string }

/**
 * Branches the current user may pick for a record — same rules as the header branch selector
 * (`TopbarLocationSelect`): every branch for company-wide users, otherwise their assigned branches.
 */
export function useBranchOptions(): { options: BranchOption[]; restricted: boolean; isLoading: boolean } {
  const assignedLocationIds = useAuthStore(s => s.user?.assignedLocationIds)
  const assignedLocations = useAuthStore(s => s.user?.assignedLocations)
  const restricted = assignedLocationIds != null
  const treeQuery = useLocationManagementTree(true)
  const allOptions = React.useMemo(() => flattenLocationOptionsFromTree(treeQuery.data), [treeQuery.data])

  const options = React.useMemo(() => {
    if (!restricted) return allOptions
    const fromAuth = assignedLocations?.map(l => ({ id: l.id, label: l.name?.trim() || 'Location' })) ?? []
    if (fromAuth.length) return fromAuth
    const allowed = new Set(assignedLocationIds)
    const fromTree = allOptions.filter(o => allowed.has(o.id))
    return fromTree.length ? fromTree : (assignedLocationIds ?? []).map(id => ({ id, label: 'Location' }))
  }, [allOptions, assignedLocationIds, assignedLocations, restricted])

  return { options, restricted, isLoading: treeQuery.isLoading }
}
