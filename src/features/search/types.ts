/** A page of the app (from the router: its title and the permission its route needs; any one of them). */
export type CatalogPage = {
  path: string
  title: string
  permissions: string[]
  /** Opened by anyone who can see the rota (requireScheduleAccess). */
  scheduleAccess?: boolean
}

/** A tab of a tabbed page, opened by a URL parameter. */
export type CatalogTab = {
  label: string
  pageTitle: string
  path: string
  search: Record<string, string>
  permissions: string[]
}

/** One option on a settings screen, with the card it sits in and its help text. */
export type CatalogSetting = {
  label: string
  group?: string
  pageTitle: string
  tabLabel?: string
  path: string
  search?: Record<string, string>
  permissions: string[]
  hint?: string
}

/** Tabs inside a record: a service user's pages, a staff member's tabs. */
export type CatalogRecordTabs = {
  serviceUser: { label: string; path: string; permission?: string }[]
  employee: { id: string; label: string }[]
}
