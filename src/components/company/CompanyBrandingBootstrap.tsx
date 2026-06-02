import * as React from 'react'
import { useAuthStore } from '@/features/auth/store'
import { useCompanyStore } from '@/store/company.store'

/** Loads organisation branding when the user is signed in. */
export function CompanyBrandingBootstrap() {
  const accessToken = useAuthStore(s => s.accessToken)
  const loadProfile = useCompanyStore(s => s.loadProfile)
  const clear = useCompanyStore(s => s.clear)

  React.useEffect(() => {
    if (!accessToken) {
      clear()
      return
    }
    void loadProfile()
  }, [accessToken, loadProfile, clear])

  return null
}

/** Loads public branding for the login shell (no auth required). */
export function CompanyBrandingPublicBootstrap() {
  const loadBranding = useCompanyStore(s => s.loadBranding)

  React.useEffect(() => {
    void loadBranding()
  }, [loadBranding])

  return null
}
