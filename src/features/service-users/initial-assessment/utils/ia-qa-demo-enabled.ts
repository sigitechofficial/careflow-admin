/**
 * Production-safe IA QA Demo Data visibility.
 *
 * Shown when Vite DEV (`import.meta.env.DEV`) or `VITE_ENABLE_IA_QA_DEMO=true`.
 * Hidden when DEV is false and the flag is not exactly `'true'`.
 * Applies to any currently opened Service User. Unrelated Vite/dev tooling is not gated here.
 */

export type IaQaDemoEnv = {
  DEV?: boolean
  VITE_ENABLE_IA_QA_DEMO?: string
}

/** True when the compile-time flag would show QA Demo. */
export function isIaQaDemoFlagOn(env: IaQaDemoEnv = import.meta.env): boolean {
  return env.DEV === true || env.VITE_ENABLE_IA_QA_DEMO === 'true'
}

/**
 * Whether the Admin Initial Assessment QA Demo UI may render.
 * Hidden when both DEV is false and `VITE_ENABLE_IA_QA_DEMO` is not `'true'`.
 */
export function isIaQaDemoUiEnabled(env: IaQaDemoEnv = import.meta.env): boolean {
  return isIaQaDemoFlagOn(env)
}
