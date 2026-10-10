export type RoleTaskRecurrence = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'
export type RoleTaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
export type RoleTaskListStatus = 'open' | 'done' | 'all'

export type IdName = { id: string; name: string }

export type RoleTask = {
  id: string
  templateId: string
  title: string
  description: string | null
  link: string | null
  /** YYYY-MM-DD (organisation day). */
  dueDate: string
  dueState: 'overdue' | 'today' | 'upcoming' | null
  status: RoleTaskStatus
  note: string | null
  role: IdName
  location: IdName | null
  startedAt: string | null
  completedAt: string | null
  completedByName: string | null
}

export type RoleTaskList = { today: string; tasks: RoleTask[] }

export type RoleTaskTemplate = {
  id: string
  title: string
  description: string | null
  link: string | null
  role: IdName
  location: IdName | null
  recurrence: RoleTaskRecurrence
  startDate: string
  weekday: number | null
  dayOfMonth: number | null
  isActive: boolean
  nextDue: string | null
  openCount: number
  updatedAt: string
}

export type RoleTaskTemplateInput = {
  title: string
  description?: string | null
  roleId: string
  locationId?: string | null
  link?: string | null
  recurrence: RoleTaskRecurrence
  startDate: string
  weekday?: number | null
  dayOfMonth?: number | null
  isActive?: boolean
}

export type RoleTaskOptions = {
  roles: IdName[]
  locations: IdName[]
  /** Manager is limited to their branches (must pick one). */
  branchRestricted: boolean
}
