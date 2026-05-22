import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { FigmaActionIcon } from '@/components/service-user/FigmaActionIcon'
import {
  figmaModuleTabIcon,
  type ServiceUserModuleTabIconId,
} from '@/features/service-users/figma-action-icons'

type ModuleTab = {
  id: ServiceUserModuleTabIconId
  label: string
  to?:
    | '/service-users/$serviceUserId/care-plan'
    | '/service-users/$serviceUserId/medication'
    | '/service-users/$serviceUserId/observations'
}

/** Light circle behind glyph exports that omit a filled disc (meds includes its own). */
const MODULE_TAB_CIRCLE_BG: Record<ServiceUserModuleTabIconId, string | null> = {
  observations: '#E8F5F2',
  comms: '#F4EDF9',
  'care-plan': '#E9F7FE',
  meds: null,
  history: '#EDF3FE',
  'body-map': '#F1F2F3',
  alerts: '#FEEEEE',
}

const MODULE_TABS: ModuleTab[] = [
  {
    id: 'observations',
    label: 'Observations',
    to: '/service-users/$serviceUserId/observations',
  },
  { id: 'comms', label: 'Comms' },
  {
    id: 'care-plan',
    label: 'Care Plan',
    to: '/service-users/$serviceUserId/care-plan',
  },
  {
    id: 'meds',
    label: 'Meds',
    to: '/service-users/$serviceUserId/medication',
  },
  { id: 'history', label: 'History' },
  { id: 'body-map', label: 'Body Map' },
  { id: 'alerts', label: 'Alerts' },
]

function isTabActive(tab: ModuleTab, pathname: string): boolean {
  if (!tab.to) return false
  if (tab.id === 'meds') return pathname.includes('/medication')
  if (tab.id === 'observations') return pathname.includes('/observations')
  if (tab.id === 'care-plan') return pathname.includes('/care-plan')
  return false
}

function TabContent({ tab, active }: { tab: ModuleTab; active: boolean }) {
  const circleBg = MODULE_TAB_CIRCLE_BG[tab.id]
  const fullTile = circleBg === null

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className={cn(
          'flex h-11 w-11 items-center justify-center overflow-hidden rounded-full shadow-sm',
          active && 'ring-2 ring-teal-500 ring-offset-2',
        )}
        style={circleBg ? { backgroundColor: circleBg } : undefined}
      >
        <FigmaActionIcon
          src={figmaModuleTabIcon(tab.id)}
          title={tab.label}
          className={fullTile ? 'h-11 w-11' : 'h-10 w-10'}
        />
      </span>
      <span
        className={cn(
          'text-xs font-medium',
          active
            ? 'text-teal-700 underline decoration-2 underline-offset-4 dark:text-teal-300'
            : 'text-muted-foreground',
        )}
      >
        {tab.label}
      </span>
    </div>
  )
}

export function ServiceUserModuleTabs({ serviceUserId }: { serviceUserId: string }) {
  const pathname = useRouterState({ select: s => s.location.pathname })

  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-center gap-4 px-4 py-3 sm:gap-6">
        {MODULE_TABS.map(tab => {
          const active = isTabActive(tab, pathname)
          const content = <TabContent tab={tab} active={active} />

          if (tab.to) {
            return (
              <Link key={tab.id} to={tab.to} params={{ serviceUserId }} title={tab.label}>
                {content}
              </Link>
            )
          }
          return (
            <div key={tab.id} className="opacity-60" title={`${tab.label} (coming soon)`}>
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}
