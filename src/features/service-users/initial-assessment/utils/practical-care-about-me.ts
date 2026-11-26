import type { AboutMeV1 } from '@/features/service-users/service-user-about-me'
import type { PracticalCareTasksMetadata } from '@/features/service-users/initial-assessment/utils/mobility-metadata'

/**
 * §12 Practical tasks ↔ About Me profile: shopping ↔ "shopping arrangements", laundry + cleaning ↔
 * "domestic support". The API writes the profile side (initial-assessment-about-me-sync.util.ts) with
 * these labels; unlabelled profile text is cleaning and housework.
 */
const LAUNDRY_LABEL = 'Laundry:'
const CLEANING_LABEL = 'Cleaning and housework:'

/** Splits the About Me "domestic support" text into the Practical tasks laundry and cleaning notes. */
export function splitDomesticSupport(text: string): { laundry: string; cleaning: string } {
  const value = text.trim()
  if (!value) return { laundry: '', cleaning: '' }
  const lines = value.split('\n')
  if (!lines.some((l) => l.startsWith(LAUNDRY_LABEL) || l.startsWith(CLEANING_LABEL))) {
    return { laundry: '', cleaning: value }
  }
  const out = { laundry: [] as string[], cleaning: [] as string[] }
  let current: 'laundry' | 'cleaning' = 'cleaning'
  for (const line of lines) {
    if (line.startsWith(LAUNDRY_LABEL)) {
      current = 'laundry'
      out.laundry.push(line.slice(LAUNDRY_LABEL.length).trim())
    } else if (line.startsWith(CLEANING_LABEL)) {
      current = 'cleaning'
      out.cleaning.push(line.slice(CLEANING_LABEL.length).trim())
    } else {
      out[current].push(line)
    }
  }
  return { laundry: out.laundry.join('\n').trim(), cleaning: out.cleaning.join('\n').trim() }
}

/** Practical tasks with empty notes pre-filled from the About Me profile (the same object when nothing applies). */
export function practicalCareWithAboutMePrefill(
  practicalCare: PracticalCareTasksMetadata,
  about: AboutMeV1,
): PracticalCareTasksMetadata {
  const { laundry, cleaning } = splitDomesticSupport(about.domesticSupport ?? '')
  const fill: Partial<PracticalCareTasksMetadata> = {}
  if (!practicalCare.shopping?.trim() && about.shoppingArrangements?.trim()) fill.shopping = about.shoppingArrangements.trim()
  if (!practicalCare.laundry?.trim() && laundry) fill.laundry = laundry
  if (!practicalCare.cleaning?.trim() && cleaning) fill.cleaning = cleaning
  return Object.keys(fill).length ? { ...practicalCare, ...fill } : practicalCare
}
