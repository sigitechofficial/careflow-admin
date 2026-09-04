import { useNavigate, useRouterState } from '@tanstack/react-router'
import { cn } from '@/shared/lib/utils'
import type { RolesPermissionsSubTab } from '@/features/settings/roles-permissions/roles-permissions.types'
import { OfficeUsersPanel } from '@/features/settings/components/roles-permissions/OfficeUsersPanel'
import { RolesPanel } from '@/features/settings/components/roles-permissions/RolesPanel'
import { PermissionsCatalogPanel } from '@/features/settings/components/roles-permissions/PermissionsCatalogPanel'
import { usePermissionsCatalog } from '@/features/settings/hooks/useRolesPermissions'
import { useAuthStore } from '@/features/auth/store'

const SUB_TABS: { id: RolesPermissionsSubTab; label: string }[] = [
  { id: 'office-users', label: 'Office users' },
  { id: 'roles', label: 'Roles' },
  { id: 'permissions', label: 'Permissions' },
]

export function RolesPermissionsPanel() {
  const navigate = useNavigate()
  const search = useRouterState({
    select: s => s.location.search as { sub?: string },
  })
  const activeSub: RolesPermissionsSubTab =
    search.sub === 'roles' || search.sub === 'permissions' ? search.sub : 'office-users'

  const canViewCatalog = useAuthStore(s => s.can('permissions.manage') || s.can('roles.manage'))
  const catalogQuery = usePermissionsCatalog(canViewCatalog)
  const permissionCount = catalogQuery.data?.length

  const setSub = (sub: RolesPermissionsSubTab) => {
    void navigate({
      to: '/settings/roles-permissions',
      search: { sub } as Record<string, string>,
    })
  }

  return (
    <div className="space-y-4" data-testid="roles-permissions-panel">
      <nav
        className="flex flex-wrap gap-0 border-b border-border"
        aria-label="Roles and permissions sections"
      >
        {SUB_TABS.map(tab => {
          const isActive = tab.id === activeSub
          const label =
            tab.id === 'permissions' && permissionCount != null
              ? `${tab.label} (${permissionCount})`
              : tab.label
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-testid={`roles-permissions-subtab-${tab.id}`}
              onClick={() => setSub(tab.id)}
              className={cn(
                'shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              )}
            >
              {label}
            </button>
          )
        })}
      </nav>

      {activeSub === 'office-users' && <OfficeUsersPanel />}
      {activeSub === 'roles' && <RolesPanel />}
      {activeSub === 'permissions' && <PermissionsCatalogPanel />}
    </div>
  )
}
