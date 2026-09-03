/**
 * Production-safe IA QA Demo Data visibility.
 *
 * The UI is shown when:
 * - Vite DEV (`import.meta.env.DEV`), or
 * - `VITE_ENABLE_IA_QA_DEMO=true` in a production build
 *
 * Production builds additionally restrict the UI to designated QA Service User
 * numbers so real customers never see Fill Demo Data. DEV keeps the existing
 * any-SU behaviour for local work.
 *
 * Unrelated Vite/dev tooling is not gated by this helper.
 */

/** Existing IA demo identifier (Margaret Hughes). Do not invent extra numbers. */
export const IA_QA_DEMO_SERVICE_USER_NUMBERS = ['SU-1042'] as const

export type IaQaDemoEnv = {
  DEV?: boolean
  VITE_ENABLE_IA_QA_DEMO?: string
}

export function isDesignatedIaQaDemoServiceUserNumber(
  serviceUserNumber: string | null | undefined,
): boolean {
  return (
    typeof serviceUserNumber === 'string' &&
    (IA_QA_DEMO_SERVICE_USER_NUMBERS as readonly string[]).includes(serviceUserNumber)
  )
}

/** True when the compile-time flag would show QA Demo (before designated-SU check). */
export function isIaQaDemoFlagOn(env: IaQaDemoEnv = import.meta.env): boolean {
  return env.DEV === true || env.VITE_ENABLE_IA_QA_DEMO === 'true'
}

/**
 * Whether the Admin Initial Assessment QA Demo UI may render for this Service User.
 * Hidden when both DEV is false and `VITE_ENABLE_IA_QA_DEMO` is not `'true'`.
 */
export function isIaQaDemoUiEnabled(
  serviceUserNumber: string | null | undefined,
  env: IaQaDemoEnv = import.meta.env,
): boolean {
  if (!isIaQaDemoFlagOn(env)) return false
  if (env.DEV === true) return true
  return isDesignatedIaQaDemoServiceUserNumber(serviceUserNumber)
}
