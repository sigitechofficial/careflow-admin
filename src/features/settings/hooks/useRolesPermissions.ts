import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  assignRoleResponsibility,
  createRole,
  fetchPermissionsCatalog,
  fetchFinancialAuthority,
  fetchRoleResponsibilities,
  fetchRoles,
  setRolePermissions,
  updateRole,
} from '@/features/settings/api/roles-permissions.api'
import { settingsKeys } from '@/features/settings/keys'
import { apiErrorMessage } from '@/shared/lib/api-error-message'
import { useToastStore } from '@/store/toast.store'

export function useIdentityRoles(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.identityRoles(),
    queryFn: ({ signal }) => fetchRoles(signal),
    enabled,
    staleTime: 30_000,
  })
}

export function usePermissionsCatalog(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.permissionsCatalog(),
    queryFn: ({ signal }) => fetchPermissionsCatalog(signal),
    enabled,
    staleTime: 60_000,
  })
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; description?: string }) => createRole(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.identityRoles() })
      useToastStore.getState().push({ title: 'Role created', variant: 'success' })
    },
    onError: (err) => {
      useToastStore.getState().push({
        title: 'Could not create role',
        description: apiErrorMessage(err),
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      roleId,
      ...input
    }: {
      roleId: string
      name?: string
      description?: string
      isActive?: boolean
    }) => updateRole(roleId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.identityRoles() })
      useToastStore.getState().push({ title: 'Role updated', variant: 'success' })
    },
    onError: (err) => {
      useToastStore.getState().push({
        title: 'Could not update role',
        description: apiErrorMessage(err),
        variant: 'destructive',
      })
    },
  })
}

export function useSetRolePermissions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ roleId, permissionKeys }: { roleId: string; permissionKeys: string[] }) =>
      setRolePermissions(roleId, permissionKeys),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.identityRoles() })
      useToastStore.getState().push({ title: 'Permissions saved', variant: 'success' })
    },
    onError: (err) => {
      useToastStore.getState().push({
        title: 'Could not save permissions',
        description: apiErrorMessage(err),
        variant: 'destructive',
      })
    },
  })
}

export function useRoleResponsibilities(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.roleResponsibilities(),
    queryFn: ({ signal }) => fetchRoleResponsibilities(signal),
    enabled,
  })
}

/** Who holds each pay authorisation power today. */
export function useFinancialAuthority(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.financialAuthority(),
    queryFn: ({ signal }) => fetchFinancialAuthority(signal),
    enabled,
  })
}

/** Save several jobs at once (one toast). */
export function useAssignRoleResponsibilities() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (changes: Array<{ key: string; roleIds: string[] }>) => {
      for (const c of changes) await assignRoleResponsibility(c.key, c.roleIds)
    },
    onSuccess: (_data, changes) => {
      useToastStore.getState().push({
        title: changes.length === 1 ? 'Responsibility saved' : `${changes.length} responsibilities saved`,
        variant: 'success',
      })
    },
    onError: (err) => {
      useToastStore.getState().push({
        title: 'Could not save responsibilities',
        description: apiErrorMessage(err),
        variant: 'destructive',
      })
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.roleResponsibilities() })
      void qc.invalidateQueries({ queryKey: settingsKeys.identityRoles() })
    },
  })
}
