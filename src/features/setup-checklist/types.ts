export type ChecklistStatus = 'complete' | 'partial' | 'missing'

export type ChecklistItem = {
  key: string
  label: string
  description: string
  status: ChecklistStatus
  count?: number
  total?: number
  value?: number
  /** `value` counts problems to fix (0 = all good). */
  problems?: boolean
  link: string
  missing?: { id: string; name: string; link: string }[]
}

export type ChecklistSection = { key: string; title: string; items: ChecklistItem[] }

export type SetupChecklist = {
  sections: ChecklistSection[]
  summary: { complete: number; total: number }
}
