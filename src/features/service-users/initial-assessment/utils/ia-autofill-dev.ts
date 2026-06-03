import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type IaAutofillLevel = 'low' | 'normal' | 'critical'

const IA_AUTOFILL_DEV_PATH = '/dev/run-ia-playwright'

/** Playwright can run several minutes; keep the request open until the backend finishes. */
const IA_AUTOFILL_TIMEOUT_MS = 10 * 60 * 1000

export async function runIaAutofillDev(
  serviceUserId: string,
  level: IaAutofillLevel,
): Promise<string> {
  const res = await apiJson<ApiEnvelope<{ message: string }>>(
    IA_AUTOFILL_DEV_PATH,
    {
      method: 'POST',
      body: JSON.stringify({ serviceUserId, level }),
    },
    { timeoutMs: IA_AUTOFILL_TIMEOUT_MS },
  )
  return res.data?.message ?? res.message ?? `Autofill (${level}) completed.`
}
