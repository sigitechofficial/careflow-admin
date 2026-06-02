import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import '@/styles/globals.css'
import { loadAuditFromStorage } from '@/features/auth/audit'
import { AppRouter } from '@/router'
import { queryClient } from '@/app/query-client'
import { QueryDevtools } from '@/app/query-devtools'

loadAuditFromStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      <QueryDevtools />
    </QueryClientProvider>
  </StrictMode>,
)
