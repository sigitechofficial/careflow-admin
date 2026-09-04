import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Save, UserRound } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import {
  useCreateHrProfile,
  useHrProfile,
  useUpdateHrProfile,
} from '@/features/hr/hooks/useHr'
import type {
  CareWorkforceCategory,
  EmployeeLifecycleStatus,
  HrDeploymentStatus,
  HrProfilePayload,
} from '@/features/hr/api/hr.api'
import { HrDocumentsTab } from '@/features/hr/components/HrDocumentsTab'
import { HrDeploymentBadge, HrLifecycleBadge } from '@/features/hr/components/HrStatusBadges'
import {
  canWriteHrProfile,
  CARE_WORKFORCE_CATEGORY_OPTIONS,
  DEPLOYMENT_STATUS_OPTIONS,
  LIFECYCLE_STATUS_OPTIONS,
} from '@/features/hr/utils/hr-display.util'
import { PageHeader } from '@/shared/ui/page-elements'
import { PolicyContextPanel } from '@/features/policies/components/PolicyContextPanel'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { formatDate } from '@/shared/lib/utils'

type TabId = 'profile' | 'documents'

function toDateInput(value: string | null | undefined): string {
  if (!value) return ''
  return value.slice(0, 10)
}

export default function HrEmployeeProfilePage() {
  const { employeeId = '' } = useParams({ strict: false }) as { employeeId?: string }
  const navigate = useNavigate()
  const can = useAuthStore(s => s.can)
  const canEdit = canWriteHrProfile(can)
  const [tab, setTab] = React.useState<TabId>('profile')
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [saveOk, setSaveOk] = React.useState(false)

  const profileQuery = useHrProfile(employeeId)
  const lookupsQuery = useEmployeeLookups()
  const createMutation = useCreateHrProfile(employeeId)
  const updateMutation = useUpdateHrProfile(employeeId)

  const profile = profileQuery.data
  const lookups = lookupsQuery.data

  const [form, setForm] = React.useState<HrProfilePayload>({})

  React.useEffect(() => {
    if (!profile) return
    setForm({
      legalName: profile.personal.legalName ?? '',
      preferredName: profile.personal.preferredName ?? '',
      dateOfBirth: toDateInput(profile.personal.dateOfBirth),
      profilePhoto: profile.personal.profilePhoto ?? '',
      jobTitleId: profile.employment.jobTitleId ?? undefined,
      contractTypeId: profile.employment.contractTypeId ?? undefined,
      careWorkforceCategory: profile.employment.careWorkforceCategory ?? undefined,
      contractedHours: profile.employment.contractedHours ?? undefined,
      branchTeam: profile.employment.branchTeam ?? '',
      branchLocationId: profile.employment.branchLocationId ?? undefined,
      reportingManagerId: profile.employment.reportingManagerId ?? undefined,
      employmentStartDate: toDateInput(profile.employment.employmentStartDate),
      employeeLifecycleStatus: profile.hrStatus.employeeLifecycleStatus,
      deploymentStatus: profile.hrStatus.deploymentStatus,
    })
  }, [profile])

  const displayName = profile
    ? [profile.personal.preferredName, profile.personal.firstName, profile.personal.lastName]
        .find(v => v?.trim())
        ?.trim() ||
      [profile.personal.firstName, profile.personal.lastName].filter(Boolean).join(' ')
    : 'Employee'

  const onSave = async () => {
    if (!canEdit || !profile) return
    setSaveError(null)
    setSaveOk(false)
    const payload: HrProfilePayload = {
      ...form,
      legalName: form.legalName || undefined,
      preferredName: form.preferredName || undefined,
      branchTeam: form.branchTeam || undefined,
      profilePhoto: form.profilePhoto || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      employmentStartDate: form.employmentStartDate || undefined,
    }
    try {
      if (profile.hasHrProfile) {
        await updateMutation.mutateAsync(payload)
      } else {
        await createMutation.mutateAsync(payload)
      }
      setSaveOk(true)
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Could not save HR profile.')
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="flex flex-col gap-4" data-testid="hr-employee-profile-page">
      <PageHeader
        title={displayName}
        description="HR worker profile — personal, employment, emergency contacts, and HR lifecycle status."
        icon={
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
            <UserRound className="h-4 w-4" aria-hidden />
          </span>
        }
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'HR', href: '/hr/employees' },
          { label: displayName },
        ]}
        actions={[
          {
            label: 'Back to list',
            icon: <ArrowLeft className="h-4 w-4" />,
            variant: 'outline',
            onClick: () => navigate({ to: '/hr/employees' }),
          },
          ...(canEdit
            ? [{
                label: saving ? 'Saving…' : 'Save changes',
                icon: <Save className="h-4 w-4" />,
                onClick: () => {
                  if (!saving && profile) void onSave()
                },
              }]
            : []),
        ]}
      />

      <PolicyContextPanel moduleType="HR" recordId={employeeId} />

      {profile ? (
        <div className="flex flex-wrap items-center gap-2">
          <HrLifecycleBadge status={profile.hrStatus.employeeLifecycleStatus} />
          <HrDeploymentBadge status={profile.hrStatus.deploymentStatus} />
          {profile.hrStatus.operationalStatus ? (
            <span className="text-sm text-muted-foreground">
              Operational status: {profile.hrStatus.operationalStatus}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex gap-2 border-b border-border">
        {(['profile', 'documents'] as TabId[]).map(id => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              tab === id
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {id}
          </button>
        ))}
      </div>

      {profileQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading HR profile…</p>
      ) : profileQuery.error ? (
        <p className="text-sm text-destructive">Could not load HR profile.</p>
      ) : tab === 'documents' ? (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
          <HrDocumentsTab employeeId={employeeId} />
        </div>
      ) : profile ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6 space-y-4">
            <h2 className="text-base font-semibold">Personal information</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Legal name">
                <Input
                  value={form.legalName ?? ''}
                  disabled={!canEdit}
                  onChange={e => setForm(f => ({ ...f, legalName: e.target.value }))}
                />
              </Field>
              <Field label="Preferred name">
                <Input
                  value={form.preferredName ?? ''}
                  disabled={!canEdit}
                  onChange={e => setForm(f => ({ ...f, preferredName: e.target.value }))}
                />
              </Field>
              <Field label="First name (operational)">
                <Input value={profile.personal.firstName ?? ''} disabled />
              </Field>
              <Field label="Last name (operational)">
                <Input value={profile.personal.lastName ?? ''} disabled />
              </Field>
              <Field label="Date of birth">
                <Input
                  type="date"
                  value={form.dateOfBirth ?? ''}
                  disabled={!canEdit}
                  onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                />
              </Field>
              <Field label="Profile photo URL">
                <Input
                  value={form.profilePhoto ?? ''}
                  disabled={!canEdit}
                  onChange={e => setForm(f => ({ ...f, profilePhoto: e.target.value }))}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6 space-y-4">
            <h2 className="text-base font-semibold">Employment information</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Job title">
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                  value={form.jobTitleId ?? ''}
                  disabled={!canEdit}
                  onChange={e => setForm(f => ({ ...f, jobTitleId: e.target.value || undefined }))}
                >
                  <option value="">—</option>
                  {(lookups?.jobTitles ?? []).map(jt => (
                    <option key={jt.id} value={jt.id}>{jt.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Contract type">
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                  value={form.contractTypeId ?? ''}
                  disabled={!canEdit}
                  onChange={e => setForm(f => ({ ...f, contractTypeId: e.target.value || undefined }))}
                >
                  <option value="">—</option>
                  {(lookups?.contractTypes ?? []).map(ct => (
                    <option key={ct.id} value={ct.id}>{ct.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Employment type (derived)">
                <Input value={profile.employment.employmentType ?? '—'} disabled />
              </Field>
              <Field label="Care workforce category">
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                  value={form.careWorkforceCategory ?? ''}
                  disabled={!canEdit}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      careWorkforceCategory: (e.target.value || undefined) as CareWorkforceCategory | undefined,
                    }))
                  }
                >
                  <option value="">—</option>
                  {CARE_WORKFORCE_CATEGORY_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Contracted hours (weekly)">
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={form.contractedHours ?? ''}
                  disabled={!canEdit}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      contractedHours: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </Field>
              <Field label="Employment start date">
                <Input
                  type="date"
                  value={form.employmentStartDate ?? ''}
                  disabled={!canEdit}
                  onChange={e => setForm(f => ({ ...f, employmentStartDate: e.target.value }))}
                />
              </Field>
              <Field label="Branch / team (HR label)">
                <Input
                  value={form.branchTeam ?? ''}
                  disabled={!canEdit}
                  onChange={e => setForm(f => ({ ...f, branchTeam: e.target.value }))}
                />
              </Field>
              <Field label="Branch location (operational)">
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                  value={form.branchLocationId ?? ''}
                  disabled={!canEdit}
                  onChange={e => setForm(f => ({ ...f, branchLocationId: e.target.value || undefined }))}
                >
                  <option value="">—</option>
                  {(lookups?.locations ?? []).map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Reporting manager ID">
                <Input
                  value={form.reportingManagerId ?? ''}
                  disabled={!canEdit}
                  placeholder="Employee UUID"
                  onChange={e => setForm(f => ({ ...f, reportingManagerId: e.target.value || undefined }))}
                />
              </Field>
              {profile.employment.reportingManagerName ? (
                <Field label="Reporting manager">
                  <Input value={profile.employment.reportingManagerName} disabled />
                </Field>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6 space-y-4">
            <h2 className="text-base font-semibold">Emergency contacts</h2>
            <p className="text-sm text-muted-foreground">
              Source of truth: employee emergency contacts. Edit via the{' '}
              <Link to="/employee/$employeeId/edit" params={{ employeeId }} search={{ tab: 'personal' }} className="text-primary hover:underline">
                employee record
              </Link>.
            </p>
            {profile.emergencyContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No emergency contacts recorded.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {profile.emergencyContacts.map(c => (
                  <li key={c.id} className="px-4 py-3 text-sm">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-muted-foreground">{c.relationship} · {c.phone}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6 space-y-4">
            <h2 className="text-base font-semibold">HR status</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Lifecycle status">
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                  value={form.employeeLifecycleStatus ?? 'ACTIVE'}
                  disabled={!canEdit}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      employeeLifecycleStatus: e.target.value as EmployeeLifecycleStatus,
                    }))
                  }
                >
                  {LIFECYCLE_STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Deployment status">
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                  value={form.deploymentStatus ?? 'GREEN'}
                  disabled={!canEdit}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      deploymentStatus: e.target.value as HrDeploymentStatus,
                    }))
                  }
                >
                  {DEPLOYMENT_STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Operational employee status">
                <Input value={profile.hrStatus.operationalStatus ?? '—'} disabled />
              </Field>
              <Field label="Profile created">
                <Input value={profile.hasHrProfile ? 'Yes' : 'No — will be created on save'} disabled />
              </Field>
            </div>
            {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
            {saveOk ? <p className="text-sm text-emerald-600">HR profile saved.</p> : null}
          </section>
        </div>
      ) : null}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
