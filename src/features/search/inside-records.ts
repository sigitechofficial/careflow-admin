import type { RecordSearchHit } from '@/components/layout/useRecordSearch'
import { CATALOG_RECORD_TABS } from './catalog.generated'
import { normalise, queryTerms } from './search-engine'

/** Other words for a record's tabs (a service user's "Meds" is what people call medication, MAR...). */
const SERVICE_USER_TAB_WORDS: Record<string, string> = {
  Profile: 'details personal address',
  Overview: 'summary dashboard',
  'Initial Assessment': 'ia assessment pre assessment',
  Invoices: 'billing bills charges',
  ECM: 'electronic call monitoring gps check in clock in late visits',
  Observations: 'vitals blood pressure temperature pulse weight news2',
  Comms: 'communication notes messages',
  'Tasks Planner': 'tasks visit tasks',
  'Visit Plan': 'visits calls schedule rota call pattern',
  'Care Plan': 'support plan care plans',
  Meds: 'medication medications medicines mar emar allergies blister',
  Documents: 'files uploads attachments',
  'Body Map': 'wounds bruises skin pressure',
  'Medical Alerts': 'alerts conditions allergies medical history',
  Activity: 'history log audit',
}
const EMPLOYEE_TAB_WORDS: Record<string, string> = {
  overview: 'summary',
  personal: 'details address contact next of kin',
  employment: 'job contract start date',
  'pay-card': 'pay rates wages',
  earning: 'earnings pay',
  visits: 'calls rota',
  salary: 'wages pay',
  skills: 'competencies',
  'staff-reviews': 'supervision supervisions appraisal spot check reviews',
  surveys: 'questionnaires feedback',
  documents: 'files uploads',
  'non-core-activity': 'non core activities meetings',
  holidays: 'holiday leave absence annual leave time off sickness',
  'working-pattern': 'availability hours pattern',
  'employment-compliance': 'compliance dbs right to work visa checks expiry',
  learning: 'training courses certificates',
  suspensions: 'suspended disciplinary',
  incidents: 'accidents',
  allocation: 'allocated equipment ppe kit',
}

type RecordTab = { label: string; words: string[]; href: (id: string) => string; search?: Record<string, string> }

const SERVICE_USER_TABS: RecordTab[] = CATALOG_RECORD_TABS.serviceUser.map(t => ({
  label: t.label === 'Meds' ? 'Medication' : t.label,
  words: normalise(`${t.label} ${SERVICE_USER_TAB_WORDS[t.label] ?? ''}`).split(' '),
  href: id => t.path.replace('$serviceUserId', id),
}))
const EMPLOYEE_TABS: RecordTab[] = CATALOG_RECORD_TABS.employee.map(t => ({
  label: t.label,
  words: normalise(`${t.label} ${EMPLOYEE_TAB_WORDS[t.id] ?? ''}`).split(' '),
  href: id => `/employee/${id}/edit`,
  search: { tab: t.id },
}))

/**
 * "Mary Jones medication" → Mary Jones › Medication. For each person found, the typed words that are not part of
 * their name are matched to one of their tabs (by name or by everyday words). Only when such words were typed.
 */
export function insideRecordHits(query: string, records: RecordSearchHit[]): RecordSearchHit[] {
  const terms = queryTerms(query)
  if (terms.length < 2) return []
  const out: RecordSearchHit[] = []
  for (const r of records) {
    const tabs = r.recordType === 'serviceUser' ? SERVICE_USER_TABS : r.recordType === 'employee' ? EMPLOYEE_TABS : null
    if (!tabs || !r.recordId) continue
    // Typed words that are the person's name, each name word used once ("mary mar": "mar" is MAR, not Mary).
    const name = normalise(r.label).split(' ')
    const rest = terms.filter(alts => {
      const typed = alts[0] ?? ''
      const at = name.findIndex(n => n === typed) >= 0 ? name.findIndex(n => n === typed) : name.findIndex(n => n.startsWith(typed) || typed.startsWith(n))
      if (at < 0) return true
      name.splice(at, 1)
      return false
    })
    if (!rest.length || rest.length === terms.length) continue
    for (const tab of tabs) {
      const hit = rest.every(alts => alts.some(a => tab.words.some(w => w === a || (a.length >= 3 && w.startsWith(a)))))
      if (!hit) continue
      out.push({ id: `inside:${r.id}:${tab.label}`, section: 'Go straight to', label: `${r.label} › ${tab.label}`, detail: r.section, href: tab.href(r.recordId), search: tab.search })
      break
    }
    if (out.length >= 4) break
  }
  return out
}

const ALL_TAB_WORDS = new Set([...SERVICE_USER_TABS, ...EMPLOYEE_TABS].flatMap(t => t.words).filter(w => w.length >= 3))

/**
 * The query without words that name a record's tab ("Mary Jones medication" → "Mary Jones"), for searching people.
 * Unchanged when every word is a tab word (then it is a search for that thing itself).
 */
export function withoutRecordTabWords(query: string): string {
  const parts = query.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2) return query.trim()
  const kept = parts.filter(p => !ALL_TAB_WORDS.has(normalise(p)))
  return kept.length && kept.length < parts.length ? kept.join(' ') : query.trim()
}
