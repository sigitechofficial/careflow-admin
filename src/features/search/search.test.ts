import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { prepare, rank, type FindEntry } from './search-engine'
import { insideRecordHits, withoutRecordTabWords } from './inside-records'
import { CATALOG_PAGES, CATALOG_SETTINGS, CATALOG_TABS } from './catalog.generated'
import { HOW_TO_ANSWERS } from './how-to'

const entries: FindEntry[] = [
  { id: 'p1', kind: 'page', title: 'Equipment', href: '/equipment' },
  { id: 'p2', kind: 'page', title: 'Rota view', href: '/scheduling/view' },
  { id: 'p3', kind: 'page', title: 'Compliance board', context: 'Staff', href: '/employee/compliance' },
  { id: 's1', kind: 'setting', title: 'Allow multiple device login?', context: 'General Settings › App Setting › Office website sign-in', href: '/settings/general', search: { tab: 'app-setting' } },
  { id: 's2', kind: 'setting', title: 'Fingerprint Login: Care app', context: 'General Settings › App Setting', keywords: 'biometric', href: '/settings/general' },
  { id: 'h1', kind: 'howto', title: 'How do I add an independent reviewer for a survey?', keywords: 'external evaluator', href: '/surveys/reviewers' },
]
const find = (q: string) => rank(prepare(entries), q).map(e => e.id)

describe('Find anything: matching', () => {
  it('everyday words find the real name ("PPE" → Equipment, "DBS" → Compliance, "roster" → Rota)', () => {
    expect(find('ppe')[0]).toBe('p1')
    expect(find('dbs')[0]).toBe('p3')
    expect(find('roster')[0]).toBe('p2')
  })

  it('finds settings by their words and by where they are', () => {
    expect(find('multiple device')[0]).toBe('s1')
    expect(find('biometric')).toEqual(['s2'])
    expect(find('fingerprint')).toEqual(['s2'])
  })

  it('small typos still find it', () => {
    expect(find('rotta')[0]).toBe('p2')
    expect(find('equipmnet')[0]).toBe('p1')
  })

  it('questions: filler words are ignored ("how do I add a reviewer")', () => {
    expect(find('how do I add a reviewer')[0]).toBe('h1')
    expect(find('external evaluator')).toEqual(['h1'])
  })

  it('every typed word must match something', () => {
    expect(find('fingerprint rota')).toEqual([])
  })
})

describe('Find anything: go straight to a tab of a person', () => {
  const mary = { id: 'su:1', section: 'Service users', label: 'Mary Jones', href: '/service-users/1/profile', recordType: 'serviceUser' as const, recordId: '1' }
  const sam = { id: 'emp:2', section: 'Staff', label: 'Sam Office', href: '/employee/2/edit', recordType: 'employee' as const, recordId: '2' }

  it('"Mary Jones medication" → Mary Jones › Medication', () => {
    expect(insideRecordHits('Mary Jones medication', [mary])).toEqual([
      expect.objectContaining({ label: 'Mary Jones › Medication', href: '/service-users/1/medication' }),
    ])
    expect(insideRecordHits('mary mar', [mary])[0]?.href).toBe('/service-users/1/medication')
  })

  it('"Sam Office training" → the Learning tab of Sam’s record', () => {
    expect(insideRecordHits('Sam Office training', [sam])).toEqual([
      expect.objectContaining({ label: 'Sam Office › Learning', href: '/employee/2/edit', search: { tab: 'learning' } }),
    ])
  })

  it('just a name: no tab shortcut', () => {
    expect(insideRecordHits('Mary Jones', [mary])).toEqual([])
  })

  it('people are searched by the name part only', () => {
    expect(withoutRecordTabWords('Mary Jones medication')).toBe('Mary Jones')
    expect(withoutRecordTabWords('care plan')).toBe('care plan')
    expect(withoutRecordTabWords('Mary')).toBe('Mary')
  })
})

describe('Find anything: the catalogue covers the whole app', () => {
  it('is up to date with the pages, tabs and settings in the code (run scripts/generate-search-catalog.mjs)', () => {
    const script = resolve(__dirname, '../../../scripts/generate-search-catalog.mjs')
    expect(() => execFileSync(process.execPath, [script, '--check'], { stdio: 'pipe' })).not.toThrow()
  })

  it('has every kind of entry, including the settings people asked about', () => {
    expect(CATALOG_PAGES.length).toBeGreaterThan(100)
    expect(CATALOG_TABS.some(t => t.label === 'App Setting')).toBe(true)
    expect(CATALOG_SETTINGS.some(s => s.label === 'Allow multiple device login?' && s.group === 'Office website sign-in')).toBe(true)
  })

  it('every how-to answer points to a real page', () => {
    const paths = new Set(CATALOG_PAGES.map(p => p.path))
    expect(HOW_TO_ANSWERS.filter(h => !paths.has(h.href)).map(h => h.href)).toEqual([])
  })
})
