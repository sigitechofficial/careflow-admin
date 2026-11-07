/**
 * Survey journey: takes new TEST people through the real care and staff journeys, through the API only (the same
 * calls the screens make), then shows which surveys become due and when.
 *
 *   npm run test:e2e:survey-journey                         set up people and events, wait for the survey job, report
 *   SURVEY_JOURNEY_MODE=report npm run test:e2e:survey-journey   report again later (no changes)
 *   SURVEY_JOURNEY_MODE=cleanup npm run test:e2e:survey-journey  switch the test surveys off and close them
 *
 * Everything it makes is clearly marked TEST and kept apart from real people:
 *   - one branch, "TEST Survey journey", holds the test people and carers;
 *   - each test survey is a copy of a ready-made survey titled "TEST journey – …", limited to that branch, so its
 *     "Sent when something happens" setting only ever picks up the test people. A ready-made survey not yet
 *     adopted is adopted first (it then appears under Surveys → templates, as when a manager adopts it).
 *   - applicant invitations are switched on only if no survey has them on, and switched off again straight away.
 * Real people, real surveys and their settings are never changed.
 *
 * Needs E2E_API_BASE_URL, E2E_LOGIN_EMAIL and E2E_LOGIN_PASSWORD in .env (as the other e2e tests), the API running
 * locally, and careflow-api next to this repo (its visits script builds the rota).
 */
import { test, type APIRequestContext } from '@playwright/test'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { hasApiCreds } from '../helpers/auth'
import { autofillInitialAssessmentViaApi } from '../helpers/initial-assessment-autofill'

const API = (process.env.E2E_API_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const MODE = (process.env.SURVEY_JOURNEY_MODE ?? 'run').toLowerCase()
const WAIT_MINUTES = Number(process.env.SURVEY_JOURNEY_WAIT_MINUTES ?? 16)
const BRANCH_NAME = 'TEST Survey journey'
const TITLE_PREFIX = 'TEST journey – '

const here = path.dirname(fileURLToPath(import.meta.url))
const adminRoot = path.resolve(here, '../../..')
const apiRoot = path.resolve(adminRoot, '../careflow-api')
const outDir = path.join(adminRoot, '.survey-journey')
const statePath = path.join(outDir, 'state.json')
const reportPath = path.join(outDir, 'report.md')

/** Ready-made surveys sent after an event, and what this journey does to make each one happen. */
const TRIGGERED: Array<{ ref: string; who: 'SERVICE_USER' | 'EMPLOYEE'; expect: string }> = [
  { ref: 'SUR-PWS-001', who: 'SERVICE_USER', expect: 'Amelia: first visit completed today' },
  { ref: 'SUR-PWS-002', who: 'SERVICE_USER', expect: 'Amelia: first care plan review due in 10 days' },
  { ref: 'SUR-PWS-005', who: 'SERVICE_USER', expect: 'Bernard: new medicines, 60 days into care' },
  { ref: 'SUR-PWS-006', who: 'SERVICE_USER', expect: 'Amelia: her complaint closed today' },
  { ref: 'SUR-PWS-007', who: 'SERVICE_USER', expect: 'Bernard: home from hospital today after 3 nights' },
  { ref: 'SUR-PWS-008', who: 'SERVICE_USER', expect: 'Clara: care ended today' },
  { ref: 'SUR-STF-003', who: 'EMPLOYEE', expect: 'Dina: induction check-in signed off today' },
  { ref: 'SUR-STF-004', who: 'EMPLOYEE', expect: 'Dina: probation review signed off today' },
  { ref: 'SUR-STF-005', who: 'EMPLOYEE', expect: 'Dina and Ezra: attended training today' },
  { ref: 'SUR-STF-015', who: 'EMPLOYEE', expect: 'Ezra: gave notice today' },
  { ref: 'SUR-STF-022', who: 'EMPLOYEE', expect: 'Ezra: back today after 30 days off sick' },
]
/** Asked by staff at assessments and reviews (no event): sent to the test people, then shown as "to collect". */
const ASKED_AT_VISITS = 'SUR-PWS-021'
const APPLICANT_REF = 'SUR-APP-001'

type State = {
  stamp: string
  branchId?: string
  surveys: Record<string, string>
  serviceUsers: Record<string, string>
  carers: Record<string, string>
  candidates: string[]
}

type Step = { name: string; ok: boolean; detail: string }
const steps: Step[] = []
let token = ''

function readState(): State | null {
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8')) as State
  } catch {
    return null
  }
}
function writeState(s: State) {
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(statePath, JSON.stringify(s, null, 2))
}

/** Today and other days in the organisation's day (UK). */
function day(offset = 0): string {
  const d = new Date(Date.now() + offset * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.E2E_LOGIN_EMAIL, password: process.env.E2E_LOGIN_PASSWORD }),
  })
  const json = await res.json()
  token = json?.data?.accessToken ?? json?.accessToken ?? ''
  if (!token) throw new Error(`Login failed: ${res.status}`)
}

async function call<T = any>(method: string, p: string, body?: unknown, retried = false): Promise<T> {
  const res = await fetch(`${API}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  // The sign-in lasts about 15 minutes: the journey waits longer than that, so sign in again once.
  if (res.status === 401 && !retried) {
    await login()
    return call<T>(method, p, body, true)
  }
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${p} → ${res.status} ${text.slice(0, 400)}`)
  const json = text ? JSON.parse(text) : {}
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T
}

/** A list from any of the API's list shapes. */
function rows<T = any>(x: any): T[] {
  if (Array.isArray(x)) return x
  if (Array.isArray(x?.items)) return x.items
  if (Array.isArray(x?.data)) return x.data
  return []
}

/** Runs one step: records OK or the error, and never stops the journey. */
async function step<T>(name: string, fn: () => Promise<T>, detail?: (r: T) => string): Promise<T | null> {
  try {
    const r = await fn()
    steps.push({ name, ok: true, detail: detail ? detail(r) : '' })
    console.log(`  ✓ ${name}${detail ? ` — ${detail(r)}` : ''}`)
    return r
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    steps.push({ name, ok: false, detail: msg })
    console.log(`  ✗ ${name} — ${msg}`)
    return null
  }
}

const byName = (list: any[], ...names: string[]) =>
  list.find((x) => names.some((n) => String(x.name ?? x.label ?? '').toLowerCase() === n.toLowerCase())) ??
  list.find((x) => names.some((n) => String(x.name ?? x.label ?? '').toLowerCase().includes(n.toLowerCase())))
const byCode = (list: any[], code: string) => list.find((x) => String(x.code ?? '').toUpperCase() === code)

// ─── Set-up ────────────────────────────────────────────────────────────────

/** The test branch's location (what people, staff and surveys point at), made under the first zone when missing. */
async function ensureBranch(state: State) {
  const find = async () =>
    rows((await call('GET', '/lookups/employee')).locations).find((l: any) => l.name === BRANCH_NAME || String(l.name).endsWith(` - ${BRANCH_NAME}`))
  let location = await find()
  if (!location) {
    const zone = rows((await call('GET', '/lookups/employee')).zones)[0]
    if (!zone) throw new Error('No zone to put the test branch in')
    await call('POST', '/location-management/branches', { zoneId: zone.id, name: BRANCH_NAME, code: 'TESTSJ' })
    location = await find()
  }
  if (!location) throw new Error('The test branch has no location')
  return (state.branchId = location.id as string)
}

/** A TEST copy of a ready-made survey, limited to the test branch (reused when it exists). */
async function ensureTestSurvey(state: State, ref: string): Promise<string> {
  if (state.surveys[ref]) {
    await call('PATCH', `/surveys/${state.surveys[ref]}`, { locationIds: [state.branchId] })
    return state.surveys[ref]
  }
  const library = rows(await call('GET', '/survey-library'))
  const item = library.find((s: any) => (s.reference ?? s.libraryReference) === ref)
  if (!item) throw new Error(`${ref} is not in the ready-made surveys`)
  const adopted = await call('POST', '/survey-library/adopt', { surveyIds: [item.id] })
  const templateId = [...rows(adopted.created), ...rows(adopted.skipped)].find((x: any) => x.templateId)?.templateId
  if (!templateId) throw new Error(`${ref}: no template after adopting`)
  const copy = await call('POST', `/surveys/${templateId}/duplicate`, { title: `${TITLE_PREFIX}${item.title} (${ref})` })
  const id = copy.id ?? copy.survey?.id
  await call('PATCH', `/surveys/${id}`, { locationIds: [state.branchId] })
  state.surveys[ref] = id
  return id
}

/** Switch on the ready-made "Sent when something happens" setting. */
async function switchOnTrigger(surveyId: string) {
  const settings = await call('GET', `/surveys/${surveyId}/event-trigger`)
  if (settings.trigger) return settings.trigger.label
  const lib = settings.library
  if (!lib) throw new Error('No ready-made event for this survey')
  const { event, delayDays, windowDays, exclusions, options, checkFirst } = lib
  const saved = await call('PUT', `/surveys/${surveyId}/event-trigger`, { trigger: { event, delayDays, windowDays, exclusions, options, checkFirst } })
  return saved.trigger?.label ?? event
}

async function createServiceUser(state: State, key: string, first: string, last: string, startOffset: number) {
  if (state.serviceUsers[key]) return state.serviceUsers[key]
  const lk = await call('GET', '/service-user-lookups')
  const status = byName(rows(lk.statuses), 'Active', 'In service')
  const made = await call('POST', '/service-users', {
    firstName: first,
    lastName: last,
    dateOfBirth: '1941-03-14',
    titleId: rows(lk.titles)[0]?.id,
    genderId: rows(lk.genders)[0]?.id,
    statusId: status?.id ?? rows(lk.statuses)[0]?.id,
    locationId: state.branchId,
    serviceStartDate: day(startOffset),
    serviceUserNumber: `SJ-${state.stamp}-${key}`,
    notes: 'TEST person for the survey journey. Not a real person.',
  })
  state.serviceUsers[key] = made.id
  return made.id as string
}

/** A TEST carer in the test branch (made once, then reused): employment, branch and an all-week working pattern. */
async function createCarer(state: State, key: string, first: string, last: string) {
  const lk = await call('GET', '/lookups/employee')
  if (!state.carers[key]) {
    const username = `sj-${state.stamp}-${key}`.toLowerCase()
    const made = await call('POST', '/employees', {
      firstName: first,
      lastName: last,
      username,
      email: `${username}@example.invalid`,
      statusId: byName(rows(lk.employeeStatuses), 'Active')?.id,
      titleId: rows(lk.titles)[0]?.id,
      genderId: rows(lk.genders)[0]?.id,
      nationalityId: rows(lk.nationalities)[0]?.id,
    })
    state.carers[key] = made.id as string
  }
  const id = state.carers[key]
  await call('PATCH', `/employees/${id}/employment`, {
    workAreaId: byName(rows(lk.workAreas), 'Care')?.id,
    roleId: byName(rows(lk.roles), 'Carer')?.id,
    jobTitleId: byName(rows(lk.jobTitles), 'Carer')?.id,
    gradeId: rows(lk.grades)[0]?.id,
    contractTypeId: rows(lk.contractTypes)[0]?.id,
    rbacLevelId: rows(lk.rbacLevels)[0]?.id,
    travelPaymentTypeId: rows(lk.travelPaymentTypes)[0]?.id,
    locationId: state.branchId,
    baseLocationId: state.branchId,
    visaTypeId: 'british_citizen',
    isInCountry: true,
    accessAllZones: true,
    contractedWeeklyHours: 37.5,
    minimumWeeklyHours: 0,
    maximumWeeklyHours: 48,
    startDate: day(-40),
    isAgencyStaff: false,
    isBankStaff: false,
  })
  await call('PATCH', `/location-management/employees/${id}/location`, { locationId: state.branchId, accessAllZones: true })
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
  await call('PUT', `/employees/${id}/working-patterns/bulk`, {
    cycleWeeks: 1,
    weeks: days.map((d) => ({ weekInCycle: 1, dayOfWeek: d, startTime: '06:00', endTime: '22:00', isAvailable: true, notes: 'TEST' })),
  })
  return id
}

// ─── The care journey ──────────────────────────────────────────────────────

async function carePlansFromIa(serviceUserId: string, reviewInDays: number) {
  const subs = rows(await call('GET', `/service-users/${serviceUserId}/initial-assessments?limit=5&sortOrder=desc`))
  const sub = subs.find((s: any) => s.status === 'SUBMITTED' || s.status === 'REVIEWED')
  if (!sub) throw new Error('No submitted initial assessment')
  if (sub.status === 'SUBMITTED') {
    await call('PATCH', `/service-users/${serviceUserId}/initial-assessments/${sub.id}/review`, {
      status: 'REVIEWED',
      approvedForCareStart: true,
      reviewNotes: 'TEST survey journey — approved for care start.',
    })
  }
  const summary = await call('GET', `/service-users/${serviceUserId}/initial-assessments/${sub.id}/summary`)
  const recs = rows(summary.carePlanRecommendations)
  let accepted = 0
  for (const rec of recs) {
    if (rec.status !== 'pending' || !rec.carePathwayFormId) continue
    await call('PATCH', `/service-users/${serviceUserId}/initial-assessments/${sub.id}/care-plan-recommendations/${rec.id}`, { decision: 'accepted' })
    accepted += 1
  }
  const plans = rows(await call('GET', `/service-users/${serviceUserId}/initial-assessments/accepted-care-plans`))
  let published = 0
  const failed: string[] = []
  for (const plan of plans) {
    const formId = plan.formId ?? plan.carePathwayFormId
    if (!formId) continue
    try {
      await call('POST', `/service-users/${serviceUserId}/care-plans/${formId}/instance`)
      const compose = await call('GET', `/service-users/${serviceUserId}/care-plans/${formId}/compose`)
      const values: Record<string, unknown> = { ...(compose.values ?? {}) }
      for (const gap of rows(compose.gaps)) {
        if (values[gap.fieldKey] == null || values[gap.fieldKey] === '') values[gap.fieldKey] = `TEST — ${gap.label}`
      }
      // The review date staff pick when publishing (Care plan → Next review).
      values['__meta.nextReviewDate'] = day(reviewInDays)
      await call('PATCH', `/service-users/${serviceUserId}/care-plans/${formId}/draft`, { values, composedFrom: compose.composedFrom, gaps: compose.gaps })
      await call('POST', `/service-users/${serviceUserId}/care-plans/${formId}/publish`, { summary: 'TEST survey journey', gapAcknowledged: true })
      published += 1
    } catch (e) {
      failed.push(`${plan.formName ?? formId}: ${(e as Error).message.slice(0, 120)}`)
    }
  }
  const assessments = rows(await call('GET', `/service-users/${serviceUserId}/assessments`))
  return { recommendations: recs.length, accepted, published, failed, assessments: assessments.map((a: any) => a.title ?? a.assessmentKey) }
}

function buildRota(state: State) {
  const file = path.join(outDir, 'visits.json')
  const carers = [state.carers.dina, state.carers.ezra]
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        fromDate: day(0),
        toDate: day(13),
        amendmentReason: 'TEST survey journey — package agreed',
        serviceUsers: [
          {
            serviceUser: state.serviceUsers.amelia,
            weeklyContractedHours: 7,
            visits: [
              {
                round: 'MORNING',
                start: '06:30',
                end: '07:30',
                days: 'daily',
                carers: carers[0],
                tasks: [{ task: 'Meal prep', instructions: 'Breakfast and a hot drink' }],
              },
            ],
          },
          {
            serviceUser: state.serviceUsers.bernard,
            weeklyContractedHours: 3.5,
            visits: [
              {
                round: 'EVENING',
                start: '18:00',
                end: '18:30',
                days: 'daily',
                carers: carers[1],
                medicines: [{ name: 'Paracetamol', dose: '500 mg', route: 'ORAL' }],
              },
            ],
          },
        ],
      },
      null,
      2,
    ),
  )
  const isWin = process.platform === 'win32'
  const res = spawnSync(isWin ? 'cmd.exe' : 'npx', [...(isWin ? ['/d', '/c', 'npx'] : []), 'ts-node', '--transpile-only', 'prisma/scripts/create-visits-via-api.ts', `--file=${file}`], {
    cwd: apiRoot,
    env: { ...process.env, API_BASE_URL: API, VISITS_EMAIL: process.env.E2E_LOGIN_EMAIL, VISITS_PASSWORD: process.env.E2E_LOGIN_PASSWORD },
    encoding: 'utf8',
    timeout: 10 * 60_000,
  })
  const out = `${res.stdout ?? ''}\n${res.stderr ?? ''}`
  fs.writeFileSync(path.join(outDir, 'visits-output.txt'), out)
  if (res.status !== 0) throw new Error(`visits script failed (exit ${res.status}); see .survey-journey/visits-output.txt`)
  return out.split('\n').filter((l) => /visit|carer|rota/i.test(l)).slice(-4).join(' | ')
}

async function completeFirstVisit(serviceUserId: string) {
  const jobs = rows(await call('GET', `/scheduled-jobs?serviceUserId=${serviceUserId}&dateFrom=${day(0)}T00:00:00.000Z&dateTo=${day(0)}T23:59:59.999Z&limit=20`))
  const job = jobs.sort((a: any, b: any) => String(a.scheduledStartDateTime ?? a.startDateTime).localeCompare(String(b.scheduledStartDateTime ?? b.startDateTime)))[0]
  if (!job) throw new Error('No visit today to complete')
  const start = job.scheduledStartDateTime ?? job.startDateTime
  const end = job.scheduledEndDateTime ?? job.endDateTime
  await call('PATCH', `/scheduled-jobs-housekeeping/jobs/${job.id}/complete`, { actualStartDateTime: start, actualEndDateTime: end, notes: 'TEST survey journey' })
  return `visit at ${String(start).slice(11, 16)} marked completed`
}

// ─── Report ────────────────────────────────────────────────────────────────

async function report(state: State) {
  const lines: string[] = [`# Survey journey report`, ``, `Run ${state.stamp}, read ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}.`, ``]
  lines.push(`## Surveys sent after events`, ``, `| Survey | Expected | Who | Event day | Due | Status |`, `| --- | --- | --- | --- | --- | --- |`)
  for (const t of TRIGGERED) {
    const id = state.surveys[t.ref]
    if (!id) {
      lines.push(`| ${t.ref} | ${t.expect} | — | — | — | not set up |`)
      continue
    }
    const s = await call('GET', `/surveys/${id}/event-trigger`).catch((e: Error) => ({ error: e.message }))
    const occ = rows((s as any).occurrences)
    if (!occ.length) {
      lines.push(`| ${t.ref} | ${t.expect} | — | — | — | **nothing found**${(s as any).error ? ` (${(s as any).error.slice(0, 80)})` : ''} |`)
      continue
    }
    for (const o of occ) {
      lines.push(`| ${t.ref} | ${t.expect} | ${o.name} | ${o.eventOn} | ${o.dueOn} | ${o.status}${o.reason ? ` — ${o.reason}` : ''} |`)
    }
  }
  lines.push(``, `## Asked at assessments and reviews (${ASKED_AT_VISITS})`, ``)
  for (const [key, id] of Object.entries(state.serviceUsers)) {
    const due = rows(await call('GET', `/surveys-to-collect?serviceUserId=${id}`).catch(() => []))
    lines.push(`- ${key}: ${due.length ? due.map((d: any) => d.survey.title).join('; ') : 'nothing to collect'}`)
  }
  lines.push(``, `## Steps`, ``)
  for (const s of steps) lines.push(`- ${s.ok ? 'OK' : '**FAILED**'} — ${s.name}${s.detail ? `: ${s.detail.replace(/\n/g, ' ').slice(0, 300)}` : ''}`)
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(reportPath, lines.join('\n') + '\n')
  console.log('\n' + lines.join('\n'))
  console.log(`\nReport saved: ${reportPath}`)
}

// ─── The test ──────────────────────────────────────────────────────────────

test.describe('Survey journey', () => {
  test.skip(!hasApiCreds, 'Set E2E_API_BASE_URL, E2E_LOGIN_EMAIL and E2E_LOGIN_PASSWORD in .env')

  test('people, care, staff events → when surveys become due', async ({ request }) => {
    test.setTimeout((WAIT_MINUTES + 20) * 60_000)
    await login()

    const previous = readState()
    if (MODE === 'report') {
      if (!previous) throw new Error('No earlier run to report on')
      await report(previous)
      return
    }
    if (MODE === 'cleanup') {
      if (!previous) throw new Error('No earlier run to clean up')
      for (const [ref, id] of Object.entries(previous.surveys)) {
        await step(`Switch off and close ${ref}`, async () => {
          await call('PUT', `/surveys/${id}/event-trigger`, { trigger: null }).catch(() => undefined)
          await call('POST', `/surveys/${id}/close`).catch(() => undefined)
          return 'done'
        })
      }
      return
    }

    const stamp = new Date().toISOString().slice(2, 16).replace(/[-:T]/g, '')
    // The test surveys and carers are made once and reused; the people we support are new each run.
    const state: State = { stamp, surveys: { ...(previous?.surveys ?? {}) }, serviceUsers: {}, carers: { ...(previous?.carers ?? {}) }, candidates: [] }
    console.log(`\nSurvey journey ${stamp}\n`)

    console.log('Set-up')
    await step('Test branch', () => ensureBranch(state), (id) => `${BRANCH_NAME} (${id})`)
    for (const t of TRIGGERED) {
      await step(`${t.ref}: TEST copy, branch only, sent after its event`, async () => switchOnTrigger(await ensureTestSurvey(state, t.ref)), (label) => String(label))
    }
    await step(`${ASKED_AT_VISITS}: TEST copy`, () => ensureTestSurvey(state, ASKED_AT_VISITS))
    writeState(state)

    console.log('\nCarers')
    await step('Dina Testcarer (new starter)', () => createCarer(state, 'dina', 'Dina', 'Testcarer'))
    await step('Ezra Testcarer', () => createCarer(state, 'ezra', 'Ezra', 'Testcarer'))
    writeState(state)

    console.log('\nPeople we support')
    await step('Amelia Testjourney (care starts today)', () => createServiceUser(state, 'amelia', 'Amelia', 'Testjourney', 0))
    await step('Bernard Testjourney (in care for 60 days)', () => createServiceUser(state, 'bernard', 'Bernard', 'Testjourney', -60))
    await step('Clara Testjourney (care ends today)', () => createServiceUser(state, 'clara', 'Clara', 'Testjourney', -120))
    writeState(state)

    for (const key of ['amelia', 'bernard'] as const) {
      const id = state.serviceUsers[key]
      if (!id) continue
      console.log(`\nAssessment and care plans: ${key}`)
      await step(`${key}: initial assessment filled and submitted`, () => autofillInitialAssessmentViaApi(request as APIRequestContext, id, 'normal'), (r) => `${r.answersSaved} answers`)
      await step(
        `${key}: review IA, accept suggested care plans, publish (next review in 10 days)`,
        () => carePlansFromIa(id, 10),
        (r) =>
          `${r.recommendations} suggested, ${r.accepted} accepted, ${r.published} published; assessments: ${r.assessments.join(', ') || 'none'}${r.failed.length ? `; failed: ${r.failed.join(' / ')}` : ''}`,
      )
    }

    console.log('\nTasks, visits, carers and rota')
    await step('Visit plans, tasks, medicines, carers and 2 weeks of rota (visits script)', async () => buildRota(state))
    if (state.serviceUsers.amelia) await step('Amelia: first visit completed', () => completeFirstVisit(state.serviceUsers.amelia))

    console.log('\nEvents in the care records')
    const lk = await call('GET', '/service-user-lookups').catch(() => ({}))
    if (state.serviceUsers.bernard) {
      await step('Bernard: 3 nights in hospital, home today', async () => {
        const reason = byCode(rows(lk.absenceReasons), 'HOSPITALISED') ?? byName(rows(lk.absenceReasons), 'Hospital')
        if (!reason) throw new Error('No "Hospitalised" absence reason')
        await call('POST', `/service-users/${state.serviceUsers.bernard}/absences`, {
          startDate: day(-3),
          endDate: day(0),
          absenceReasonCatalogId: reason.id,
          notes: 'TEST survey journey',
          applyToSchedule: false,
          retrospectiveReason: 'TEST survey journey',
        })
        return 'recorded'
      })
    }
    if (state.serviceUsers.amelia) {
      await step('Amelia: complaint made, answered and closed today', async () => {
        const c = await call('POST', '/feedback', {
          type: 'COMPLAINT',
          receivedAt: new Date(Date.now() - 3_600_000).toISOString(),
          channel: 'PHONE',
          fromKind: 'SERVICE_USER',
          fromServiceUserId: state.serviceUsers.amelia,
          aboutServiceUserId: state.serviceUsers.amelia,
          locationId: state.branchId,
          subject: 'TEST complaint — late visit',
          details: 'TEST survey journey: the visit was 20 minutes late.',
        })
        for (const action of ['ACKNOWLEDGE', 'START_INVESTIGATION', 'RESPOND', 'CLOSE']) {
          await call('POST', `/feedback/${c.id}/transition`, {
            action,
            note: 'TEST survey journey',
            ...(action === 'RESPOND' ? { responseSummary: 'TEST: apologised and changed the visit time.', outcome: 'UPHELD' } : {}),
          })
        }
        return 'closed'
      })
    }
    if (state.serviceUsers.clara) {
      await step('Clara: discharged, care ended today', async () => {
        const status = byCode(rows(lk.statuses), 'DISCHARGED') ?? byName(rows(lk.statuses), 'Discharged')
        if (!status) throw new Error('No "Discharged" status')
        await call('PATCH', `/service-users/${state.serviceUsers.clara}`, { statusId: status.id, serviceEndDate: day(0) })
        return 'discharged'
      })
    }

    console.log('\nStaff events')
    const elk = await call('GET', '/lookups/employee').catch(() => ({}))
    const reviewType = (code: string) => rows(elk.reviewTypes).find((r: any) => r.code === code)
    if (state.carers.dina) {
      for (const [code, label] of [
        ['INDUCTION_CHECKIN', 'induction check-in'],
        ['PROBATION_REVIEW', 'probation review'],
      ] as const) {
        await step(`Dina: ${label} signed off today`, async () => {
          const type = reviewType(code)
          if (!type) throw new Error(`No ${code} review type`)
          const r = await call('POST', `/employees/${state.carers.dina}/reviews`, { reviewTypeId: type.id, lastDone: day(0), nextDue: null, notes: 'TEST survey journey' })
          return `next due: ${r.nextDue ?? 'none'}`
        })
      }
    }
    if (state.carers.dina && state.carers.ezra) {
      await step('Dina and Ezra: attended a training session today', async () => {
        const start = new Date(Date.now() - 3 * 3_600_000)
        const ev = await call('POST', '/learning/training-events', {
          title: 'TEST survey journey — moving and handling refresher',
          trainerName: 'TEST trainer',
          startAt: start.toISOString(),
          endAt: new Date(start.getTime() + 2 * 3_600_000).toISOString(),
        })
        for (const emp of [state.carers.dina, state.carers.ezra]) {
          const a = await call('POST', `/learning/training-events/${ev.id}/attendees`, { employeeId: emp })
          await call('PATCH', `/learning/training-events/attendees/${a.id}`, { attendanceStatus: 'ATTENDED' })
        }
        return `event status: ${ev.status ?? 'unknown'}`
      })
    }
    if (state.carers.ezra) {
      await step('Ezra: 30 days off sick, back today', async () => {
        await call('POST', '/employee-absences', {
          employeeId: state.carers.ezra,
          absenceType: 'Sickness',
          fromDateTime: `${day(-30)}T00:00:00.000Z`,
          toDateTime: `${day(-1)}T23:00:00.000Z`,
          notes: 'TEST survey journey',
        })
        return 'recorded'
      })
      await step('Ezra: gave notice today', async () => {
        const reason = rows(elk.leavingReasons)[0]
        await call('POST', `/employees/${state.carers.ezra}/leaving-records`, { leavingReasonId: reason?.id, leavingDate: day(28), notes: 'TEST survey journey' })
        return 'recorded'
      })
    }

    console.log('\nJob applicants')
    await step('3 TEST applicants told the outcome', async () => {
      let vacancy = rows(await call('GET', '/hr/vacancies?limit=50')).find((v: any) => String(v.title).startsWith('TEST survey journey'))
      vacancy ??= await call('POST', '/hr/vacancies', { title: 'TEST survey journey — care worker', employmentType: 'PERMANENT' })
      const vacancies = [vacancy]
      for (const [i, stage] of (['REJECTED', 'WITHDRAWN', 'ACCEPTED'] as const).entries()) {
        const c = await call('POST', '/hr/candidates', {
          firstName: `Applicant${i + 1}`,
          lastName: 'Testjourney',
          email: `sj-${stamp}-applicant${i + 1}@example.invalid`,
          vacancyId: vacancies[0].id,
          source: 'MANUAL',
        })
        state.candidates.push(c.id)
        await call('PATCH', `/hr/candidates/${c.id}/stage`, { stage, notes: 'TEST survey journey' })
      }
      return `${state.candidates.length} applicants`
    })
    await step(`${APPLICANT_REF}: applicants waiting for next Monday's invitations`, async () => {
      const id = await ensureTestSurvey(state, APPLICANT_REF)
      const st = await call('GET', `/surveys/${id}/applicant-invites`)
      if (st.otherSurvey) {
        const other = await call('GET', `/surveys/${st.otherSurvey.id}/applicant-invites`)
        return `invitations are on for "${st.otherSurvey.title}" (left as it is): ${other.waiting} waiting`
      }
      if (!st.canTurnOn) return `cannot switch on: ${st.blockedBy}`
      await call('PUT', `/surveys/${id}/applicant-invites`, { on: true })
      const on = await call('GET', `/surveys/${id}/applicant-invites`)
      await call('PUT', `/surveys/${id}/applicant-invites`, { on: false })
      return `${on.waiting} waiting (switched on to count, then off again)`
    })

    console.log('\nPeople we support: asked at visits')
    const askId = state.surveys[ASKED_AT_VISITS]
    if (askId) {
      await step(`${ASKED_AT_VISITS}: sent to the test people (no portal: collected by staff)`, async () => {
        await call('PATCH', `/surveys/${askId}`, { locationIds: [state.branchId] })
        const r = await call('POST', `/surveys/${askId}/send`, {
          serviceUserIds: Object.values(state.serviceUsers),
          formerReason: 'TEST survey journey: asked when their care ended',
        })
        return JSON.stringify(r).slice(0, 120)
      })
    }
    writeState(state)

    console.log(`\nWaiting for the survey job to read the records (up to ${WAIT_MINUTES} minutes)…`)
    const deadline = Date.now() + WAIT_MINUTES * 60_000
    while (Date.now() < deadline) {
      let found = 0
      for (const t of TRIGGERED) {
        const id = state.surveys[t.ref]
        if (!id) continue
        const s = await call('GET', `/surveys/${id}/event-trigger`).catch(() => null)
        if (rows(s?.occurrences).length) found += 1
      }
      console.log(`  ${new Date().toLocaleTimeString('en-GB')}: ${found}/${TRIGGERED.length} surveys have found their event`)
      if (found === TRIGGERED.length) break
      await new Promise((r) => setTimeout(r, 60_000))
    }

    await report(state)
  })
})
