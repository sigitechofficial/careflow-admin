import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createOfficeUser,
  fetchOfficeUsers,
  sendOfficeUserInvite,
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
import { backendForgotPassword } from '@/features/auth/api'

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
      // Roles and branches first, so the welcome email shows their access. Nobody types a password.
      let invited: string | null = null
      let inviteError: string | null = null
      try {
        invited = await sendOfficeUserInvite(created.id, { passwordGiven: Boolean(profile.password) })
      } catch (err) {
        inviteError = apiErrorMessage(err)
      }
      return { id: created.id, roleNames, locationIds, invited, inviteError }
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: settingsKeys.officeUsers() })
      const needsBranch =
        data.roleNames.some(r => BRANCH_SCOPED_ROLE_NAMES.has(r))
        && !data.roleNames.some(r => COMPANY_WIDE_ROLE_NAMES.has(r))
        && data.locationIds.length === 0
      useToastStore.getState().push({
        title: 'Office user added',
        description: [
          data.invited ?? `The welcome email didn’t go (${data.inviteError}). Use “Send the link again”.`,
          needsBranch ? 'Assign at least one branch for this branch-scoped role.' : null,
        ].filter(Boolean).join(' '),
        variant: needsBranch || data.inviteError ? 'warning' : 'success',
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
        description: [
          vars.email ? 'They sign in with the new email from now on.' : null,
          vars.password ? 'New password set. Give it to them yourself: it isn’t emailed.' : null,
        ].filter(Boolean).join(' ') || undefined,
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

/** "Send the link again": the welcome email while they haven't chosen a password, else a reset link. */
export function useSendOfficeUserLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (user: { id: string; email: string; invitePending?: boolean; name: string }) => {
      if (user.invitePending) return sendOfficeUserInvite(user.id)
      // The public "Forgot password" flow: same link, same 60 minutes, and their current password keeps working.
      await backendForgotPassword(user.email)
      return `We’ve emailed ${user.name} a link to choose a new password. It works for 60 minutes.`
    },
    onSuccess: (message) => {
      void qc.invalidateQueries({ queryKey: settingsKeys.officeUsers() })
      useToastStore.getState().push({ title: 'Link sent', description: message, variant: 'success' })
    },
    onError: (err) => {
      useToastStore.getState().push({ title: 'Link not sent', description: apiErrorMessage(err), variant: 'destructive' })
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
