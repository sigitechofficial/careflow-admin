import type { ServiceUserAllergyRow } from '@/features/service-users/api'

export function formatAllergiesAssessmentText(rows: ServiceUserAllergyRow[]): string {
  if (rows.length === 0) return 'No known allergies recorded'
  return rows
    .map((row) => {
      const comment = row.comment.trim()
      // A comment that only repeats the allergy name (the catalogue tick stores it) adds nothing.
      const sameAsName = comment.toLowerCase() === row.allergyName.trim().toLowerCase()
      return comment && !sameAsName ? `${row.allergyName} — ${comment}` : row.allergyName
    })
    .join('\n')
}
