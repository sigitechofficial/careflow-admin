/** True in Vite dev, or when explicitly enabled for staging/live builds. */
export function isIaPlaywrightAutofillEnabled(): boolean {
  if (import.meta.env.DEV) return true
  const flag = import.meta.env.VITE_ENABLE_IA_PLAYWRIGHT
  return flag === 'true' || flag === '1'
}
