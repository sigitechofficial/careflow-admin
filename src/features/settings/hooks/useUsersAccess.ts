import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createOfficeUser,
  fetchOfficeUsers,
  setOfficeUserLocations,
  setOfficeUserRoles,
  updateOfficeUser,
  BRANCH_SCOPED_ROLE_NAMES,
  COMPANY_WIDE_ROLE_NAMES,
  type CreateOfficeUserInput,
  type UpdateOfficeUserInput,
} from '@/features/settings/api/users-access.api'
import { settingsKeys } from '@/features/settings/keys'
import { apiErrorMessage } from '@/shared/lib/api-error-message'
import { useToastStore } from '@/store/toast.store'

export function useOfficeUsers(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.officeUsers(),
    queryFn: ({ signal }) => fetchOfficeUsers(signal),
    enabled,
    staleTime: 30_000,
  })
}

export function useCreateOfficeUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateOfficeUserInput & {
      roleNames?: string[]
      locationIds?: string[]
    }) => {
      const { roleNames = [], locationIds = [], ...profile } = input
      const created = await createOfficeUser(profile)
      if (roleNames.length > 0) {
        await setOfficeUserRoles(created.id, roleNames)
      }
      if (locationIds.length > 0) {
        await setOfficeUserLocations(created.id, locationIds)
      }
      return { id: created.id, roleNames, locationIds }
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: settingsKeys.officeUsers() })
      const needsBranch =
        data.roleNames.some(r => BRANCH_SCOPED_ROLE_NAMES.has(r))
        && !data.roleNames.some(r => COMPANY_WIDE_ROLE_NAMES.has(r))
        && data.locationIds.length === 0
      useToastStore.getState().push({
        title: 'Office user created',
        description: needsBranch
          ? 'Assign at least one branch for this branch-scoped role.'
          : undefined,
        variant: needsBranch ? 'warning' : 'success',
      })
    },
    onError: (err) => {
      useToastStore.getState().push({
        title: 'Could not create user',
        description: apiErrorMessage(err),
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateOfficeUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, ...input }: UpdateOfficeUserInput & { userId: string }) =>
      updateOfficeUser(userId, input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: settingsKeys.officeUsers() })
      useToastStore.getState().push({
        title: 'Office user updated',
        description: vars.password ? 'The new password works from their next sign-in.' : undefined,
        variant: 'success',
      })
    },
    onError: (err) => {
      useToastStore.getState().push({
        title: 'Could not update user',
        description: apiErrorMessage(err),
        variant: 'destructive',
      })
    },
  })
}

export function useSetOfficeUserRoles() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, roleNames }: { userId: string; roleNames: string[] }) =>
      setOfficeUserRoles(userId, roleNames),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: settingsKeys.officeUsers() })
      useToastStore.getState().push({
        title: 'Roles updated',
        description: data.requiresBranchAssignment
          ? 'Assign at least one branch for this branch-scoped role.'
          : undefined,
        variant: data.requiresBranchAssignment ? 'warning' : 'success',
      })
    },
    onError: (err) => {
      useToastStore.getState().push({
        title: 'Could not update roles',
        description: apiErrorMessage(err),
        variant: 'destructive',
      })
    },
  })
}

export function useSetOfficeUserLocations() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, locationIds }: { userId: string; locationIds: string[] }) =>
      setOfficeUserLocations(userId, locationIds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.officeUsers() })
      useToastStore.getState().push({
        title: 'Branches updated',
        variant: 'success',
      })
    },
    onError: (err) => {
      useToastStore.getState().push({
        title: 'Could not update branches',
        description: apiErrorMessage(err),
        variant: 'destructive',
      })
    },
  })
}
