/**
 * Figma exports for service user list row actions (node 354-10508).
 * Files live in public/ after `pnpm run fetch:figma-icons`.
 */
const base = '/care-plan-icons/figma'

export type ServiceUserFigmaActionId =
  | 'overview'
  | 'carePlan'
  | 'details'
  | 'serviceManagement'
  | 'calendar'
  | 'medication'
  | 'flash'
  | 'absence'

export const SERVICE_USER_FIGMA_ACTION_ICONS: Record<ServiceUserFigmaActionId, string> = {
  overview: `${base}/view.svg`,
  carePlan: `${base}/world-care.svg`,
  details: `${base}/world-care-1.svg`,
  serviceManagement: `${base}/meeting-room-1.svg`,
  calendar: `${base}/world-care-2.svg`,
  medication: `${base}/capsule-fill.svg`,
  flash: `${base}/meeting-room.svg`,
  absence: `${base}/round-pause.svg`,
}

export function figmaActionIcon(id: ServiceUserFigmaActionId): string {
  return SERVICE_USER_FIGMA_ACTION_ICONS[id]
}

/** Figma report letter buttons (node 354-10537). Run `pnpm run fetch:figma-reports`. */
const reportsBase = '/care-plan-icons/reports'

export type ServiceUserFigmaReportId = 'CS' | 'D' | 'O' | 'A' | 'C' | 'H'

export const SERVICE_USER_FIGMA_REPORT_ICONS: Record<ServiceUserFigmaReportId, string> = {
  CS: `${reportsBase}/cs.svg`,
  D: `${reportsBase}/d.svg`,
  O: `${reportsBase}/o.svg`,
  A: `${reportsBase}/a.svg`,
  C: `${reportsBase}/c.svg`,
  H: `${reportsBase}/h.svg`,
}

export function figmaReportIcon(id: ServiceUserFigmaReportId): string {
  return SERVICE_USER_FIGMA_REPORT_ICONS[id]
}

/** Quick-select filters on `/service-users/all` (Figma node 354-11100). */
const quickSelectBase = '/care-plan-icons/quick-select'

export type ServiceUserQuickSelectIconId =
  | 'person-all'
  | 'person-active'
  | 'person-discharged'
  | 'care-none'
  | 'care-low'
  | 'care-medium'
  | 'care-high'
  | 'dols'
  | 'absent'

export const SERVICE_USER_QUICK_SELECT_ICONS: Record<ServiceUserQuickSelectIconId, string> = {
  'person-all': `${quickSelectBase}/person-all.svg`,
  'person-active': `${quickSelectBase}/person-active.svg`,
  'person-discharged': `${quickSelectBase}/person-discharged.svg`,
  'care-none': `${quickSelectBase}/care-none.svg`,
  'care-low': `${quickSelectBase}/care-low.svg`,
  'care-medium': `${quickSelectBase}/care-medium.svg`,
  'care-high': `${quickSelectBase}/care-high.svg`,
  dols: `${quickSelectBase}/dols.svg`,
  absent: `${quickSelectBase}/absent.svg`,
}

export function figmaQuickSelectIcon(id: ServiceUserQuickSelectIconId): string {
  return SERVICE_USER_QUICK_SELECT_ICONS[id]
}

/** Maps quick-select list filter keys to Figma asset ids. */
export const QUICK_SELECT_LIST_ICON = {
  all: 'person-all',
  active: 'person-active',
  discharged: 'person-discharged',
  deleted: null,
} as const satisfies Record<string, ServiceUserQuickSelectIconId | null>

/** Maps care-plan risk filter keys to Figma asset ids. */
export const QUICK_SELECT_RISK_ICON = {
  LOW: 'care-low',
  MEDIUM: 'care-medium',
  HIGH: 'care-high',
  CRITICAL: 'care-high',
} as const satisfies Record<string, ServiceUserQuickSelectIconId>

/** Module tabs bar (Figma node 321-11019). */
const moduleTabsBase = '/care-plan-icons/module-tabs'

export type ServiceUserModuleTabIconId =
  | 'profile'
  | 'overview'
  | 'ecm'
  | 'observations'
  | 'comms'
  | 'tasks-planner'
  | 'visit-plan'
  | 'care-plan'
  | 'meds'
  | 'documents'
  | 'history'
  | 'body-map'
  | 'alerts'
  | 'activity'

export const SERVICE_USER_MODULE_TAB_ICONS: Record<ServiceUserModuleTabIconId, string> = {
  profile: `${moduleTabsBase}/profile.svg`,
  overview: `${base}/view.svg`,
  ecm: `${moduleTabsBase}/alerts.svg`,
  observations: `${moduleTabsBase}/observations.svg`,
  comms: `${moduleTabsBase}/comms.svg`,
  'tasks-planner': `${moduleTabsBase}/tasks-planner.svg`,
  'visit-plan': `${moduleTabsBase}/visit-plan.svg`,
  'care-plan': `${moduleTabsBase}/care-plan.svg`,
  meds: `${moduleTabsBase}/meds.svg`,
  documents: `${moduleTabsBase}/documents.svg`,
  history: `${moduleTabsBase}/history.svg`,
  'body-map': `${moduleTabsBase}/body-map.svg`,
  alerts: `${moduleTabsBase}/alerts.svg`,
  activity: `${moduleTabsBase}/history.svg`,
}

export function figmaModuleTabIcon(id: ServiceUserModuleTabIconId): string {
  return SERVICE_USER_MODULE_TAB_ICONS[id]
}
