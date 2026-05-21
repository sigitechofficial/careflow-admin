import { useNavigate, useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import type { LocationManagementSubTab } from '@/features/settings/location-management/location-management.types'
import { LocationManagementZonesPanel } from '@/features/settings/components/location-management/LocationManagementZonesPanel'
import { LocationServiceUserLocationsPanel } from '@/features/settings/components/location-management/LocationServiceUserLocationsPanel'
import { LocationEmployeeLocationsPanel } from '@/features/settings/components/location-management/LocationEmployeeLocationsPanel'

const SUB_TABS: { id: LocationManagementSubTab; label: string }[] = [
  { id: 'zones', label: 'Location Management' },
  { id: 'service-users', label: 'Service User Location Management' },
  { id: 'employees', label: 'Employee Locations allocation' },
]

export function LocationManagementPanel() {
  const navigate = useNavigate()
  const search = useRouterState({
    select: s => s.location.search as { sub?: string },
  })
  const activeSub: LocationManagementSubTab =
    search.sub === 'service-users' || search.sub === 'employees' ? search.sub : 'zones'

  const setSub = (sub: LocationManagementSubTab) => {
    void navigate({
      to: '/settings/location-management',
      search: { sub } as Record<string, string>,
    })
  }

  return (
    <div className="space-y-4" data-testid="location-management-panel">
      <nav
        className="flex flex-wrap gap-0 border-b border-border"
        aria-label="Location management sections"
      >
        {SUB_TABS.map(tab => {
          const isActive = tab.id === activeSub
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-testid={`location-management-subtab-${tab.id}`}
              onClick={() => setSub(tab.id)}
              className={cn(
                'shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>

      {activeSub === 'zones' && <LocationManagementZonesPanel />}
      {activeSub === 'service-users' && <LocationServiceUserLocationsPanel />}
      {activeSub === 'employees' && <LocationEmployeeLocationsPanel />}
    </div>
  )
}
