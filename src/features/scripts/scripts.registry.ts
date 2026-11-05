/**
 * Automation scripts on the Scripts page. Each runs in the browser as the signed-in user, calling
 * the same API endpoints as the admin screens, so every app rule and audit log applies.
 * Add a script here (and its runner beside this file) to list it on the page.
 */
import { runCreateVisits, type CreateVisitsInput, type Summary } from '@/features/scripts/create-visits.runner'

export type ScriptDefinition = {
  id: string
  title: string
  description: string
  /** What the script does, step by step, shown on its card. */
  steps: string[]
  /** Input pre-filled in the editor (JSON). */
  exampleInput: () => unknown
  run: (input: unknown, options: { dryRun: boolean; log: (line: string) => void }) => Promise<Summary[]>
}

/** Monday after today (YYYY-MM-DD), so the example's dates are always ahead. */
function nextMonday(): string {
  const d = new Date()
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y ?? 0, (m ?? 1) - 1, (d ?? 1) + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export const SCRIPTS: ScriptDefinition[] = [
  {
    id: 'create-visits',
    title: 'Create visits with carers, tasks and medicines',
    description:
      'Adds visits to one or more service users’ visit plans, puts one or several carers on them, adds their tasks and medicines, then builds the rota.',
    steps: [
      'Finds each service user (number or name) and the carers (full name).',
      'Adds the visits to the visit plan, with the weekly-hours and working-pattern checks the Visit plan tab runs.',
      'Adds the tasks (existing ones are kept) and the medicines (one per name, a time for each round).',
      'Activates a draft plan, builds the rota for the dates, then lists any visit still missing carers.',
    ],
    exampleInput: () => {
      const fromDate = nextMonday()
      const example: CreateVisitsInput = {
        fromDate,
        toDate: addDays(fromDate, 13),
        amendmentReason: 'Visits set up from the Scripts page',
        respectWorkingPatterns: true,
        serviceUsers: [
          {
            serviceUser: 'SU-GW-03',
            visits: [
              {
                round: 'MORNING',
                start: '08:00',
                end: '09:00',
                days: 'daily',
                carers: ['Amina Yusuf'],
                tasks: [{ task: 'Assisted wash', instructions: 'Assist with a wash at the sink', priority: 'important' }],
                medicines: [{ name: 'Paracetamol', dose: '500 mg', route: 'ORAL' }],
              },
              {
                round: 'EVENING',
                start: '18:00',
                end: '18:30',
                days: 'weekdays',
                carers: ['Chloe Mensah'],
                carersByDay: { Fri: 'Liam Walsh' },
                tasks: [{ task: 'Meal prep', instructions: 'Light supper' }],
              },
            ],
          },
        ],
      }
      return example
    },
    run: (input, options) => runCreateVisits(input as CreateVisitsInput, options),
  },
]
