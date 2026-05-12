import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/globals.css'
import { loadAuditFromStorage } from '@/auth/audit'
import { AppRouter } from '@/router'

loadAuditFromStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
)
