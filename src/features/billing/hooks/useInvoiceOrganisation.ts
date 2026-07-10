import * as React from 'react'
import { useCompanyBranding } from '@/features/settings/hooks/useCompanySettings'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { useCompanyStore } from '@/store/company.store'

export type InvoiceOrganisation = {
  companyName: string
  logoUrl: string | null
  phone: string
  email: string
  website: string | null
  vatNumber: string | null
  companyNumber: string | null
}

export function useInvoiceOrganisation(enabled = true): InvoiceOrganisation {
  const profile = useCompanyStore(s => s.profile)
  const storeBranding = useCompanyStore(s => s.branding)
  const brandingQuery = useCompanyBranding(enabled)

  return React.useMemo(() => {
    const branding = brandingQuery.data ?? storeBranding
    const companyName = profile?.companyName ?? branding?.companyName ?? ''
    const logoPath =
      profile?.companyLogoUrl ??
      branding?.companyLogoUrl ??
      profile?.displayLogoUrl ??
      branding?.displayLogoUrl
    const cacheKey = profile?.updatedAt ?? branding?.updatedAt

    return {
      companyName,
      logoUrl: resolveMediaUrl(logoPath, cacheKey),
      phone: profile?.phoneNumber ?? branding?.phoneNumber ?? '',
      email: profile?.email ?? branding?.email ?? '',
      website: profile?.companyWebsite ?? branding?.companyWebsite ?? null,
      vatNumber: profile?.vatNumber ?? branding?.vatNumber ?? null,
      companyNumber: profile?.companyNumber ?? branding?.companyNumber ?? null,
    }
  }, [profile, storeBranding, brandingQuery.data])
}
