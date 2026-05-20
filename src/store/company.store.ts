import { create } from 'zustand'
import {
  fetchCompanyBranding,
  fetchCompanyProfile,
  type CompanyBranding,
  type CompanyProfile,
} from '@/lib/company-settings-api'
import { useAuthStore } from '@/store/auth.store'

type CompanyState = {
  profile: CompanyProfile | null
  branding: CompanyBranding | null
  loading: boolean
  loadProfile: () => Promise<void>
  loadBranding: () => Promise<void>
  setProfile: (profile: CompanyProfile) => void
  clear: () => void
}

export const useCompanyStore = create<CompanyState>((set) => ({
  profile: null,
  branding: null,
  loading: false,

  loadProfile: async () => {
    if (!useAuthStore.getState().accessToken) return
    set({ loading: true })
    try {
      const profile = await fetchCompanyProfile()
      set({
        profile,
        branding: {
          displayName: profile.displayName,
          groupName: profile.groupName,
          displayLogoUrl: profile.displayLogoUrl,
          companyLogoUrl: profile.companyLogoUrl,
          updatedAt: profile.updatedAt,
        },
        loading: false,
      })
    } catch {
      set({ loading: false })
    }
  },

  loadBranding: async () => {
    try {
      const branding = await fetchCompanyBranding()
      set({ branding })
    } catch {
      /* login shell can fall back to defaults */
    }
  },

  setProfile: (profile) =>
    set({
      profile,
      branding: {
        displayName: profile.displayName,
        groupName: profile.groupName,
        displayLogoUrl: profile.displayLogoUrl,
        companyLogoUrl: profile.companyLogoUrl,
        updatedAt: profile.updatedAt,
      },
    }),

  clear: () => set({ profile: null, branding: null }),
}))
