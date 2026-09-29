import { useMutation } from '@tanstack/react-query'
import { backendForgotPassword, backendResetPassword } from '@/features/auth/api'

/** Public POST /auth/forgot-password (no session required). */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => backendForgotPassword(email),
  })
}

/** Public POST /auth/reset-password with the emailed one-time token. */
export function useResetPassword() {
  return useMutation({
    mutationFn: (vars: { token: string; newPassword: string }) =>
      backendResetPassword(vars.token, vars.newPassword),
  })
}
