import { useAuthStore } from '@/features/auth/store'

let hydratePromise: Promise<void> | null = null

/** Wait for persisted auth once per session — do not call on every client navigation. */
export async function ensureAuthHydrated(): Promise<void> {
  if (useAuthStore.persist.hasHydrated()) return

  if (!hydratePromise) {
    hydratePromise = new Promise<void>((resolve) => {
      const unsub = useAuthStore.persist.onFinishHydration(() => {
        unsub()
        resolve()
      })
      void useAuthStore.persist.rehydrate()
    })
  }

  await hydratePromise
}
