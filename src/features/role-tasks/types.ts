export type RoleTaskRecurrence = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'
export type RoleTaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
export type RoleTaskListStatus = 'open' | 'done' | 'all'

export type IdName = { id: string; name: string }

export type RoleTask = {
  id: string
  /** Null for a task raised by another feature (e.g. a survey alert). */
  templateId: string | null
  /** What raised it (CARER_SIGNUP, LEARNING_OVERDUE, SURVEY_ALERT…); null for a role task. */
  sourceType?: string | null
  /** Who the task is about (a carer, by name), when the source says so. */
  about?: { kind: 'CARER'; name: string } | null
  /** Course title for training tasks. */
  course?: string | null
  /** Waiting delete request: future visits that would be unassigned if approved. */
  futureVisits?: number | null
  /** Care app sign-up / delete request: the office's decision. */
  decision?: 'APPROVED' | 'DECLINED' | 'PENDING' | null
  title: string
  description: string | null
  link: string | null
  /** YYYY-MM-DD (organisation day). */
  dueDate: string
  dueState: 'overdue' | 'today' | 'upcoming' | null
  status: RoleTaskStatus
  note: string | null
  role: IdName
  /** `label`: "Zone · Branch", as in the staff record's branch picker. */
  location: (IdName & { label?: string }) | null
  startedAt: string | null
  completedAt: string | null
  completedByName: string | null
  /** Done on a later day than it was due (organisation's day). */
  completedLate?: boolean
}

export type RoleTaskList = {
  today: string
  tasks: RoleTask[]
  /** My tasks: every branch the user can see, "Zone · Branch" labels, for the Branch filter. */
  branches?: Array<{ id: string; label: string }>
}

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
