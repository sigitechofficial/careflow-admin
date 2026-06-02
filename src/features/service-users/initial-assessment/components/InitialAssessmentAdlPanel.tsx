/**
 * @deprecated Replaced by {@link InitialAssessmentAdlWorksheetPanel} (paper §7 / spec §12.2–12.5).
 * Re-export kept so older imports do not break during transition.
 */
export { InitialAssessmentAdlWorksheetPanel as InitialAssessmentAdlPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentAdlWorksheetPanel'

/*
 * --- Previous simplified 6-activity ADL panel (§12 legacy stub) ---
 *
 * import { Input } from '@/shared/ui/input'
 * import { Label } from '@/shared/ui/form-field'
 * import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
 * import {
 *   ADL_ACTIVITIES,
 *   ADL_LEVELS,
 *   defaultAdlRows,
 *   type AdlMetadata,
 *   type AdlRow,
 * } from '@/features/service-users/initial-assessment/utils/submission-metadata'
 *
 * Activities scored: Mobility, Transfer, Personal hygiene, Toilet use, Continence, Feeding.
 * Replaced by full worksheet: self care, everyday tasks, mobility inside/outside (21 activities).
 *
 * export function InitialAssessmentAdlPanel({ value, disabled, onChange }: Props) {
 *   ...
 * }
 */
