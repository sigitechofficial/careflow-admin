/**
 * Create staff — a staff record ready to work, with sign-in — calling the same API endpoints in the same order as
 * the admin screens, as the signed-in user (Scripts → Staff Creation):
 *
 *   Personal tab        → create the employee, then their personal details (address with coordinates, phone, DOB)
 *   Employment tab      → work area, role, job title, RBAC level, branch, start date, contract, hours
 *   Working pattern tab → the weekly availability (one-week cycle)
 *   Sign-in access      → Care app and/or office login with a password set now (one password for both)
 *   Office users        → for roles that are not RBAC levels (HR): the office login with that role and branch
 *   Compliance          → the required checklist, dated and verified (optional)
 *   Skills, contact     → the preset's skills and an emergency contact (optional)
 *   Check               → read sign-in access and compliance back
 *
 * Every app rule still runs and every change is audited under the signed-in user. Generated people are marked as
 * test data: the name prefix ("Test"), a `test.` username and an email on the reserved `careflow.test` domain.
 */
import { apiJson } from '@/shared/api/api-client'
import { apiErrorMessage } from '@/shared/lib/api-error-message'
import { useAuthStore } from '@/features/auth/store'
import {
  createEmergencyContact,
  createEmployee,
  createEmployeeSkill,
  fetchEmployeeLookups,
  listEmployees,
  patchEmployment,
  patchPersonalDetails,
  replaceWorkingPatternsBulk,
  type BulkWorkingPatternWeekPayload,
  type EmployeeLookupsBundle,
  type LookupRow,
} from '@/features/employees/api/employees.api'
import {
  createEmployeeCompliance,
  ensureEmployeeComplianceChecklist,
  fetchComplianceChecklist,
  updateEmployeeCompliance,
  type ComplianceChecklistItem,
} from '@/features/employees/api/employee-compliance-api'
import { fetchSignInAccess, setSignInAccess } from '@/features/employees/api/staff-sign-in-access.api'
import {
  createOfficeUser,
  fetchOfficeUsers,
  maxRolePrivilege,
  setOfficeUserLocations,
  setOfficeUserRoles,
} from '@/features/settings/api/users-access.api'
import { RBAC_LEVEL_ROLE } from '@/features/scripts/staff-rbac'
import {
  TEST_ADDRESSES,
  TEST_EMAIL_DOMAIN,
  presetById,
  type StaffPreset,
  type StaffPresetId,
} from '@/features/scripts/staff-presets'

// ── Input ─────────────────────────────────────────────────────────────────────

export type CreateStaffInput = {
  preset: StaffPresetId
  /** How many people (1–20). */
  count: number
  /** Their branch (Settings → Lookup data → Locations). */
  locationId: string
  /** Employment start date (YYYY-MM-DD). */
  startDate: string
  /** The password for their sign-in (at least 8 characters). Only its hash is kept by the API. */
  password: string
  /** First name of every generated person; also marks them as test data. Default "Test". */
  namePrefix?: string
  /** Fill in and verify the required compliance checklist (default on). */
  compliance?: boolean
  /** Add the preset's skills (default on). */
  skills?: boolean
  /** Add an emergency contact (default on). */
  emergencyContact?: boolean
}

export const MAX_STAFF_PER_RUN = 20
export const MIN_PASSWORD = 8

/** Problems with the input itself (nothing looked up yet). */
export function inputProblems(input: CreateStaffInput): string[] {
  const out: string[] = []
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > MAX_STAFF_PER_RUN) {
    out.push(`Choose between 1 and ${MAX_STAFF_PER_RUN} people.`)
  }
  if (!input.locationId) out.push('Choose a branch.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) out.push('Choose a start date.')
  if ((input.password ?? '').length < MIN_PASSWORD) out.push(`The password needs at least ${MIN_PASSWORD} characters.`)
  const prefix = (input.namePrefix ?? 'Test').trim()
  if (!prefix || !/^[a-zA-Z][a-zA-Z ]{0,29}$/.test(prefix)) out.push('The name prefix must be letters only (up to 30).')
  return out
}

// ── Lookups for a preset ──────────────────────────────────────────────────────

export type ResolvedPreset = {
  preset: StaffPreset
  workAreaId: string
  roleId: string
  jobTitleId: string
  rbacLevelId: string | null
  contractTypeId: string | null
  travelPaymentTypeId: string | null
  statusId: string | null
  /** Skill types found by name, with their default refresh months. */
  skills: Array<{ id: string; name: string; refreshMonths: number | null }>
  /** Preset values not found in the lookups (non-blocking ones are reported, blocking ones stop the run). */
  missing: string[]
  blocking: string[]
}

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()
const byName = (rows: LookupRow[] | undefined, name: string | null) =>
  name ? (rows ?? []).find((r) => norm(r.name) === norm(name)) ?? null : null

/** Match the preset's names to this database's lookups. Work area, role and job title are required. */
export function resolvePreset(preset: StaffPreset, lookups: EmployeeLookupsBundle): ResolvedPreset {
  const missing: string[] = []
  const blocking: string[] = []
  const need = (rows: LookupRow[] | undefined, name: string, what: string) => {
    const hit = byName(rows, name)
    if (!hit) blocking.push(`${what} "${name}" is not in Settings → Lookup data.`)
    return hit?.id ?? ''
  }
  const want = (rows: LookupRow[] | undefined, name: string | null, what: string) => {
    if (!name) return null
    const hit = byName(rows, name)
    if (!hit) missing.push(`${what} "${name}" is not in the lookups, so it is left empty.`)
    return hit?.id ?? null
  }
  const workAreaId = need(lookups.workAreas, preset.workArea, 'Work area')
  const roleId = need(lookups.roles, preset.role, 'Role')
  const jobTitleId = need(lookups.jobTitles, preset.jobTitle, 'Job title')
  // The office login's access comes from the RBAC level, so without it there is no office login to give.
  const rbacLevelId = preset.rbacLevel ? byName(lookups.rbacLevels, preset.rbacLevel)?.id ?? null : null
  if (preset.rbacLevel && !rbacLevelId) {
    const msg = `RBAC level "${preset.rbacLevel}" is not in the lookups.`
    if (preset.signIn.website && !preset.signIn.officeRole) blocking.push(`${msg} It decides their office access.`)
    else missing.push(`${msg} It is left empty.`)
  }
  const skills: ResolvedPreset['skills'] = []
  for (const name of preset.skills) {
    const hit = (lookups.skillTypes ?? []).find((s) => norm(s.name) === norm(name))
    if (hit) skills.push({ id: hit.id, name: hit.name, refreshMonths: hit.defaultRefreshMonths ?? null })
  }
  return {
    preset,
    workAreaId,
    roleId,
    jobTitleId,
    rbacLevelId,
    contractTypeId: want(lookups.contractTypes, preset.contractType, 'Contract type'),
    travelPaymentTypeId: want(lookups.travelPaymentTypes, preset.travelPaymentType, 'Travel payment type'),
    statusId: byName(lookups.employeeStatuses, 'Active')?.id ?? null,
    skills,
    missing,
    blocking,
  }
}

// ── Who to create ─────────────────────────────────────────────────────────────

export type PlannedPerson = {
  index: number
  firstName: string
  lastName: string
  username: string
  email: string
  mobile: string
  dateOfBirth: string
  address: (typeof TEST_ADDRESSES)[number]
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const slug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')

/**
 * The next free numbers for this preset: "Test Carer 01" / test.carer.01 / test.carer.01@careflow.test, skipping any
 * username or email already used by an employee or an office login.
 */
export function planPeople(
  preset: StaffPreset,
  count: number,
  namePrefix: string,
  taken: { usernames: Set<string>; emails: Set<string> },
): PlannedPerson[] {
  const prefix = namePrefix.trim() || 'Test'
  const out: PlannedPerson[] = []
  for (let n = 1; out.length < count && n < 1000; n += 1) {
    const num = n < 100 ? pad2(n) : String(n)
    const username = `${slug(prefix)}.${slug(preset.nameWord)}.${num}`
    const email = `${username}@${TEST_EMAIL_DOMAIN}`
    if (taken.usernames.has(username) || taken.emails.has(email)) continue
    out.push({
      index: n,
      firstName: prefix,
      lastName: `${preset.nameWord} ${num}`,
      username,
      email,
      // Ofcom's drama range (07700 900000–900999): never a real phone.
      mobile: `+44 7700 900${String(n % 1000).padStart(3, '0')}`,
      dateOfBirth: `${1970 + ((n * 7) % 30)}-${pad2(((n * 5) % 12) + 1)}-${pad2(((n * 3) % 28) + 1)}`,
      address: TEST_ADDRESSES[(n - 1) % TEST_ADDRESSES.length]!,
    })
  }
  return out
}

/** The working pattern: one-week cycle, the preset's days available with its hours, the rest unavailable. */
export function patternWeeks(preset: StaffPreset): BulkWorkingPatternWeekPayload[] {
  const all = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const
  return all.map((day) =>
    preset.pattern.days.includes(day)
      ? { weekInCycle: 1, dayOfWeek: day, startTime: preset.pattern.start, endTime: preset.pattern.end, isAvailable: true }
      : { weekInCycle: 1, dayOfWeek: day, isAvailable: false },
  )
}

const addMonths = (isoDate: string, months: number) => {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

/** Compliance dates: issued on the start date; expiry from the type's validity (12 months when it has none). */
export function complianceDates(item: Pick<ComplianceChecklistItem, 'hasExpiry' | 'defaultValidityMonths'>, startDate: string) {
  const issueDate = startDate
  const expiryDate = item.hasExpiry === false ? null : addMonths(startDate, item.defaultValidityMonths || 12)
  return { issueDate, expiryDate }
}

// ── The run ───────────────────────────────────────────────────────────────────

export type StaffResult = {
  name: string
  username: string
  email: string
  employeeId: string | null
  /** True when the staff record was created (later steps may still have warnings). */
  created: boolean
  /** What they can sign in to, read back from the API. */
  signIn: { website: string; app: string; roles: string[] } | null
  compliance: { valid: number; total: number } | null
  skillsAdded: number
  /** One line per step that went wrong (the person may still exist). */
  warnings: string[]
  outcome: string
}

export type StaffRunOutcome = { results: StaffResult[]; notes: string[] }

type RunOptions = { dryRun: boolean; log: (line: string) => void }

const toIso = (d: string) => new Date(`${d}T00:00:00Z`).toISOString()

/** Usernames and emails already used (employees named with the prefix, every office login). */
async function takenNames(prefix: string): Promise<{ usernames: Set<string>; emails: Set<string> }> {
  const usernames = new Set<string>()
  const emails = new Set<string>()
  for (let page = 1; page <= 20; page += 1) {
    const { rows, meta } = await listEmployees({ search: prefix, page, limit: 100 })
    for (const r of rows) if (r.username) usernames.add(norm(r.username))
    const totalPages = Number((meta as { totalPages?: number } | undefined)?.totalPages ?? 1)
    if (!rows.length || page >= totalPages) break
  }
  for (const u of await fetchOfficeUsers()) {
    emails.add(norm(u.email))
    if (u.username) usernames.add(norm(u.username))
  }
  return { usernames, emails }
}

/** The office role a preset gives, and whether the signed-in user may give it (same rank or lower). */
export function officeRoleCheck(preset: StaffPreset, actorRoles: string[]): string | null {
  if (!preset.signIn.website) return null
  const role = preset.signIn.officeRole ?? (preset.rbacLevel ? RBAC_LEVEL_ROLE[preset.rbacLevel] ?? preset.rbacLevel : null)
  if (!role) return null
  if (maxRolePrivilege([role]) > maxRolePrivilege(actorRoles)) {
    return `You can't give the ${role} office access, because it is above your own.`
  }
  return null
}

export async function runStaffCreation(input: CreateStaffInput, opts: RunOptions): Promise<StaffRunOutcome> {
  const { dryRun, log } = opts
  const problems = inputProblems(input)
  if (problems.length) throw new Error(problems.join(' '))

  const auth = useAuthStore.getState()
  const preset = presetById(input.preset)
  const prefix = (input.namePrefix ?? 'Test').trim() || 'Test'
  const wantCompliance = input.compliance !== false
  const wantSkills = input.skills !== false
  const wantContact = input.emergencyContact !== false
  const notes: string[] = []

  log(`${dryRun ? 'Checking' : 'Creating'} ${input.count} × ${preset.label}…`)
  const lookups = await fetchEmployeeLookups()
  const resolved = resolvePreset(preset, lookups)
  if (resolved.blocking.length) throw new Error(resolved.blocking.join(' '))
  for (const m of resolved.missing) {
    notes.push(m)
    log(`  note: ${m}`)
  }
  const branch = (lookups.locations ?? []).find((l) => l.id === input.locationId)
  if (!branch) throw new Error('That branch is not one you can choose. Pick another branch.')

  if (preset.signIn.website && !auth.can('users.create')) {
    throw new Error(`${preset.label} needs an office login, and you don't have permission to add office users.`)
  }
  if (preset.signIn.officeRole && !auth.can('roles.manage')) {
    throw new Error(`Giving the ${preset.signIn.officeRole} role needs permission to manage roles.`)
  }
  const rankProblem = officeRoleCheck(preset, auth.user?.backendRoles ?? [])
  if (rankProblem) throw new Error(rankProblem)
  if (wantCompliance && !auth.can('employees.compliance.verify')) {
    notes.push("You can't verify compliance, so the checklist is dated but left for someone who can verify it.")
  }
  if (wantSkills && !resolved.skills.length) notes.push('None of the preset skills are in Settings → Skill types, so no skills are added.')

  const people = planPeople(preset, input.count, prefix, await takenNames(prefix))
  if (people.length < input.count) throw new Error('Could not find enough free test usernames.')
  log(`  branch ${branch.name} · start ${input.startDate} · ${preset.summary}`)

  const results: StaffResult[] = []
  for (const p of people) {
    const name = `${p.firstName} ${p.lastName}`
    const r: StaffResult = {
      name,
      username: p.username,
      email: p.email,
      employeeId: null,
      created: false,
      signIn: null,
      compliance: null,
      skillsAdded: 0,
      warnings: [],
      outcome: '',
    }
    results.push(r)
    if (dryRun) {
      r.outcome = `Would create ${name} (${p.email}) — ${signInWords(preset)}.`
      log(`  ${r.outcome}`)
      continue
    }

    log(`• ${name}`)
    // Personal tab: create, then the details.
    try {
      const { id } = await createEmployee({
        firstName: p.firstName,
        lastName: p.lastName,
        username: p.username,
        email: p.email,
        ...(resolved.statusId ? { statusId: resolved.statusId } : {}),
      })
      r.employeeId = id
      r.created = true
    } catch (e) {
      r.outcome = `Not created: ${apiErrorMessage(e)}`
      log(`  ✗ ${r.outcome}`)
      continue
    }
    const id = r.employeeId!
    const step = async (label: string, fn: () => Promise<void>) => {
      try {
        await fn()
        log(`  ✓ ${label}`)
        return true
      } catch (e) {
        const msg = `${label}: ${apiErrorMessage(e)}`
        r.warnings.push(msg)
        log(`  ✗ ${msg}`)
        return false
      }
    }

    await step('Personal details', () =>
      patchPersonalDetails(id, {
        dateOfBirth: toIso(p.dateOfBirth),
        addressLine1: p.address.addressLine1,
        addressLine2: 'TEST record',
        town: p.address.town,
        country: 'United Kingdom',
        postcode: p.address.postcode,
        latitude: p.address.latitude,
        longitude: p.address.longitude,
        mobileTelephone: p.mobile,
        ...(resolved.statusId ? { statusId: resolved.statusId } : {}),
      }),
    )

    // Employment tab (the branch is saved with it, as the Personal tab's branch picker does).
    const employed = await step('Employment', () =>
      patchEmployment(id, {
        workAreaId: resolved.workAreaId,
        roleId: resolved.roleId,
        jobTitleId: resolved.jobTitleId,
        ...(resolved.rbacLevelId ? { rbacLevelId: resolved.rbacLevelId } : {}),
        ...(resolved.contractTypeId ? { contractTypeId: resolved.contractTypeId } : {}),
        ...(resolved.travelPaymentTypeId ? { travelPaymentTypeId: resolved.travelPaymentTypeId } : {}),
        locationId: input.locationId,
        baseLocationId: input.locationId,
        baseLocationIds: [],
        serviceUserAreaIds: [],
        accessAllZones: false,
        startDate: toIso(input.startDate),
        isInCountry: true,
        visaTypeId: null,
        contractedWeeklyHours: preset.contractedWeeklyHours,
      }),
    )

    // Working pattern tab.
    await step('Working pattern', async () => {
      await replaceWorkingPatternsBulk(id, { cycleWeeks: 1, weeks: patternWeeks(preset), syncAssignments: false })
    })

    // Sign-in access: the staff record's switches, or Office users for a role that is not an RBAC level.
    if (!employed && preset.signIn.website && !preset.signIn.officeRole) {
      r.warnings.push('Sign-in: skipped, because the office access comes from the Employment tab, which was not saved.')
    } else {
      const viaRecord = { website: preset.signIn.website && !preset.signIn.officeRole, app: preset.signIn.app }
      if (viaRecord.website || viaRecord.app) {
        await step(`Sign-in (${signInWords(preset)})`, async () => {
          const res = await setSignInAccess(id, {
            ...(viaRecord.website ? { website: true } : {}),
            ...(viaRecord.app ? { app: true } : {}),
            password: input.password,
          })
          if (res.message) log(`    ${res.message}`)
        })
      }
      if (preset.signIn.officeRole) {
        const role = preset.signIn.officeRole
        await step(`Office login with the ${role} role`, async () => {
          const user = await createOfficeUser({
            email: p.email,
            password: input.password,
            firstName: p.firstName,
            lastName: p.lastName,
          })
          await setOfficeUserRoles(user.id, [role])
          await setOfficeUserLocations(user.id, [input.locationId])
        })
      }
    }

    // Compliance: the required checklist, dated, then verified.
    if (wantCompliance) {
      await step('Compliance', async () => {
        const list = await ensureEmployeeComplianceChecklist(id)
        const canVerify = useAuthStore.getState().can('employees.compliance.verify')
        let failed = 0
        for (const item of list.items) {
          try {
            const { issueDate, expiryDate } = complianceDates(item, input.startDate)
            const row = item.record
              ? await updateEmployeeCompliance(id, item.record.id, { issueDate: toIso(issueDate), expiryDate: expiryDate ? toIso(expiryDate) : null })
              : await createEmployeeCompliance(id, {
                  complianceTypeId: item.complianceTypeId,
                  ...(item.requirementId ? { requirementId: item.requirementId } : {}),
                  issueDate: toIso(issueDate),
                  ...(expiryDate ? { expiryDate: toIso(expiryDate) } : {}),
                })
            if (canVerify) {
              await apiJson(`/employees/${id}/compliance/${row.id}/verify`, {
                method: 'PATCH',
                body: JSON.stringify({ notes: 'Test data (Scripts → Staff Creation)' }),
              })
            }
          } catch (e) {
            failed += 1
            r.warnings.push(`Compliance "${item.name}": ${apiErrorMessage(e)}`)
          }
        }
        if (failed) throw new Error(`${failed} of ${list.items.length} item(s) not filled in`)
      })
    }

    // Skills and emergency contact.
    if (wantSkills && resolved.skills.length) {
      await step('Skills', async () => {
        for (const s of resolved.skills) {
          await createEmployeeSkill(id, {
            skillTypeId: s.id,
            ...(s.refreshMonths ? { expiryDate: toIso(addMonths(input.startDate, s.refreshMonths)) } : {}),
            notes: 'Test data',
          })
          r.skillsAdded += 1
        }
      })
    }
    if (wantContact) {
      await step('Emergency contact', async () => {
        await createEmergencyContact(id, { firstName: 'Test', lastName: 'Contact', relationship: 'Friend', phone: '+44 7700 900999' })
      })
    }

    // Check: read back what they actually have.
    try {
      const access = await fetchSignInAccess(id)
      r.signIn = { website: access.website.state, app: access.app.state, roles: access.website.roles }
    } catch (e) {
      r.warnings.push(`Reading sign-in access: ${apiErrorMessage(e)}`)
    }
    if (wantCompliance) {
      try {
        const list = await fetchComplianceChecklist(id)
        const valid = list.items.filter((i) => i.record && ['VALID', 'EXPIRING_SOON'].includes(i.record.status)).length
        r.compliance = { valid, total: list.items.length }
      } catch (e) {
        r.warnings.push(`Reading compliance: ${apiErrorMessage(e)}`)
      }
    }
    r.outcome = r.warnings.length ? `Created, with ${r.warnings.length} problem(s).` : 'Created.'
    log(`  ${r.outcome}`)
  }

  const made = results.filter((x) => x.created).length
  log(dryRun ? 'Check finished — nothing was saved.' : `Done: ${made} of ${results.length} created.`)
  return { results, notes }
}

export function signInWords(preset: StaffPreset): string {
  const parts: string[] = []
  if (preset.signIn.website) parts.push(preset.signIn.officeRole ? `office login (${preset.signIn.officeRole})` : 'office login')
  if (preset.signIn.app) parts.push('Care app')
  return parts.length ? parts.join(' + ') : 'no sign-in'
}

/** For Visit Creation: the created people's ids as a carer pool. */
export function carerPoolJson(results: StaffResult[]): string {
  return JSON.stringify({ carerPool: results.filter((r) => r.created && r.employeeId).map((r) => r.employeeId) }, null, 2)
}
