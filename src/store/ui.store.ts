import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

/** Reading comfort: text size scale and weight, applied app-wide (see globals.css). */
export type TextSize = 'standard' | 'large' | 'larger' | 'largest'
export type TextWeight = 'standard' | 'medium' | 'bold'

export const TEXT_SIZE_SCALE: Record<TextSize, number> = {
  standard: 1,
  large: 1.125,
  larger: 1.25,
  largest: 1.375,
}

/** Puts the reading preferences on <html> so CSS can scale text and weight everywhere. */
export function applyTextPreferences(size: TextSize, weight: TextWeight) {
  const root = document.documentElement
  root.style.setProperty('--text-scale', String(TEXT_SIZE_SCALE[size] ?? 1))
  root.dataset.textSize = size
  root.dataset.textWeight = weight
}

interface UIState {
  theme: Theme
  sidebarCollapsed: boolean
  sidebarMobileOpen: boolean
  /** Office module sidebar: keep the page panel open next to the rail (default: show on hover only). */
  pagePanelPinned: boolean
  /** null = All locations (org-wide). */
  selectedLocationId: string | null
  textSize: TextSize
  textWeight: TextWeight

  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarMobileOpen: (open: boolean) => void
  togglePagePanelPinned: () => void
  setSelectedLocationId: (locationId: string | null) => void
  setTextSize: (size: TextSize) => void
  setTextWeight: (weight: TextWeight) => void
  resetTextPreferences: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      pagePanelPinned: false,
      selectedLocationId: null,
      textSize: 'standard',
      textWeight: 'standard',

      setTheme: (theme) => {
        set({ theme })
        const root = document.documentElement
        if (theme === 'dark') {
          root.classList.add('dark')
        } else if (theme === 'light') {
          root.classList.remove('dark')
        } else {
          // system
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          root.classList.toggle('dark', prefersDark)
        }
      },

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),
      togglePagePanelPinned: () => set((state) => ({ pagePanelPinned: !state.pagePanelPinned })),
      setSelectedLocationId: (locationId) => set({ selectedLocationId: locationId }),
      setTextSize: (textSize) => set({ textSize }),
      setTextWeight: (textWeight) => set({ textWeight }),
      resetTextPreferences: () => set({ textSize: 'standard', textWeight: 'standard' }),
    }),
    {
      name: 'care-admin-ui',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        pagePanelPinned: state.pagePanelPinned,
        selectedLocationId: state.selectedLocationId,
        textSize: state.textSize,
        textWeight: state.textWeight,
      }),
    },
  ),
)
