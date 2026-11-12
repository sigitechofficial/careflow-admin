/**
 * Automation workflows on the Scripts page. Each runs in the browser as the signed-in user, calling
 * the same API endpoints as the admin screens, so every app rule and audit entry applies.
 * Add a workflow here (with its page and route) to list it.
 */
export type ScriptWorkflow = {
  id: string
  title: string
  description: string
  /** Its details page. */
  href: '/scripts/visit-creation' | '/scripts/visit-completion'
}

export const SCRIPT_WORKFLOWS: ScriptWorkflow[] = [
  {
    id: 'visit-creation',
    title: 'Visit Creation',
    description:
      'Automatically create service user visits, assign carers, and configure associated tasks and medications using the existing CareFlow visit scheduling and rota generation functionality.',
    href: '/scripts/visit-creation',
  },
  {
    id: 'visit-completion',
    title: 'Visit Completion',
    description:
      "Complete a carer's visits on a day the way the office records them — tasks ticked, actual times, reasons — then see the pay, charge, travel time and mileage CareFlow works out for each visit.",
    href: '/scripts/visit-completion',
  },
]
