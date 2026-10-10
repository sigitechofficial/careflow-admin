import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import '@/styles/globals.css'
import { loadAuditFromStorage } from '@/features/auth/audit'
import { AppRouter } from '@/router'
import { queryClient } from '@/app/query-client'
import { QueryDevtools } from '@/app/query-devtools'
import { useAuthStore } from '@/features/auth/store'
import { applyTextPreferences, useUIStore } from '@/store/ui.store'

loadAuditFromStorage()

// Apply saved reading preferences before the first paint (avoids a flash of small text).
{
  const ui = useUIStore.getState()
  applyTextPreferences(ui.textSize, ui.textWeight)
}

// Cached server data belongs to the signed-in user: drop it on logout or account switch so the
// next person on this browser never sees the previous user's records.
useAuthStore.subscribe((state, prev) => {
  if (prev.user && state.user?.id !== prev.user.id) queryClient.clear()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      <QueryDevtools />
    </QueryClientProvider>
  </StrictMode>,
)
