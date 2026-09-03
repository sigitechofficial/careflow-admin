import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createRole,
  fetchPermissionsCatalog,
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
