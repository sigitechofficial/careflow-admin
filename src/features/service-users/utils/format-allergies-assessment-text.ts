import type { ServiceUserAllergyRow } from '@/features/service-users/api'

export function formatAllergiesAssessmentText(rows: ServiceUserAllergyRow[]): string {
  if (rows.length === 0) return 'No known allergies recorded'
  return rows
    .map((row) => {
      const comment = row.comment.trim()
      return comment ? `${row.allergyName} — ${comment}` : row.allergyName
    })
    .join('\n')
}
