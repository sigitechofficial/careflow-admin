import { specRefLabel } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'

/** §12 embedded panel title from the enterprise catalog (`spec-ref-groups`). */
export function section12PanelTitle(specRef: string): string {
  return specRefLabel(specRef)
}

/** Paper worksheet block spanning §12.1 legend through §12.5 activity score groups. */
export const SECTION_12_ADL_WORKSHEET_PANEL_TITLE = 'Activities of daily living'
