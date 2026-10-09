import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface UIState {
  theme: Theme
  sidebarCollapsed: boolean
  sidebarMobileOpen: boolean
  /** Office module sidebar: keep the page panel open next to the rail (default: show on hover only). */
  pagePanelPinned: boolean
  /** null = All locations (org-wide). */
  selectedLocationId: string | null

  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarMobileOpen: (open: boolean) => void
  togglePagePanelPinned: () => void
  setSelectedLocationId: (locationId: string | null) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      pagePanelPinned: false,
      selectedLocationId: null,

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
    }),
    {
      name: 'care-admin-ui',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        pagePanelPinned: state.pagePanelPinned,
        selectedLocationId: state.selectedLocationId,
      }),
    },
  ),
)
