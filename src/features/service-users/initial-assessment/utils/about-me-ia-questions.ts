/** Spec refs for About Me profile tab questions (seed: initial-assessment-about-me.seed.ts). */
export const ABOUT_ME_IA_SPEC_REFS = [
  '1.3a',
  '1.3b',
  '1.3c',
  '1.3d',
  '1.3e',
  '1.3f',
  '1.3g',
] as const

export type AboutMeIaTabId =
  | 'about-main'
  | 'interests'
  | 'history'
  | 'routine'
  | 'support'
  | 'favourites'
  | 'id-chars'

export const ABOUT_ME_IA_TABS: ReadonlyArray<{ id: AboutMeIaTabId; label: string }> = [
  { id: 'about-main', label: 'What matters to me' },
  { id: 'interests', label: 'Interests' },
  { id: 'history', label: 'My Life History' },
  { id: 'routine', label: 'My Daily Routine' },
  { id: 'support', label: 'Support I Need' },
  { id: 'favourites', label: 'My Favourite Things' },
  { id: 'id-chars', label: 'Identification Characteristics' },
]

export function isAboutMeIaSpecRef(specRef: string): boolean {
  return (ABOUT_ME_IA_SPEC_REFS as readonly string[]).includes(specRef)
}

export function aboutMeTabFromQuestionMetadata(metadata: Record<string, unknown> | undefined): AboutMeIaTabId | null {
  const tab = metadata?.aboutMeTab
  if (typeof tab !== 'string') return null
  return ABOUT_ME_IA_TABS.some((t) => t.id === tab) ? (tab as AboutMeIaTabId) : null
}

export function isAboutMeProfileQuestion(metadata: Record<string, unknown> | undefined): boolean {
  return metadata?.aboutMeProfileField === true
}
