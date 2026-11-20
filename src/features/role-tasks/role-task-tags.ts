import type { RoleTask } from '@/features/role-tasks/types'

export type RoleTaskTags = {
  /** What kind of work it is ("Type: Training overdue"). */
  type: string | null
  /** Who the task is about ("About: Carer · Priya Sharma"), when the source says so. */
  about: string | null
  /** Who asked for it, only when a person asked ("Requested by: Carer (Care app)"). */
  requestedBy: string | null
  /** Course title for training tasks. */
  course: string | null
}

/** Exact wording per source (19 Nov 2026, user-approved mockup). */
const TYPE_BY_SOURCE: Record<string, string> = {
  CARER_SIGNUP: 'Care app sign-up',
  CARER_DELETION_REQUEST: 'Account delete request',
  LEARNING_OVERDUE: 'Training overdue',
  LEARNING_LATE_REVIEW: 'Training finished late (review)',
  LEARNING_OUTCOME: 'Training outcome to record',
  LEARNING_CERTIFICATE: 'Certificate expiring or expired',
}

/** Every type a task can have, for the Type filter (not only those in the list now). */
export const ALL_ROLE_TASK_TYPES: string[] = [...Object.values(TYPE_BY_SOURCE), 'Training', 'Survey', 'Role task']

/**
 * Details for a My tasks row, from what raised the task. Shown as "Label: value" text like
 * "Branch: …", so a training task about a carer does not read as the carer's own request:
 * only Care app sign-ups and delete requests were asked for by the carer.
 */
export function roleTaskTags(
  task: Pick<RoleTask, 'sourceType' | 'templateId' | 'about' | 'course'>,
): RoleTaskTags {
  const source = task.sourceType ?? ''
  const carerAsked = source === 'CARER_SIGNUP' || source === 'CARER_DELETION_REQUEST'
  const aboutCarer = carerAsked || source.startsWith('LEARNING_')
  const type =
    TYPE_BY_SOURCE[source] ??
    (source.startsWith('LEARNING_') ? 'Training' : source.startsWith('SURVEY_') ? 'Survey' : !source ? 'Role task' : null)
  return {
    type,
    about: aboutCarer ? (task.about?.name ? `Carer · ${task.about.name}` : 'Carer') : null,
    requestedBy: carerAsked ? 'Carer (Care app)' : null,
    course: task.course ?? null,
  }
}
