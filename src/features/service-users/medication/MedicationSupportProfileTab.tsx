import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useAuthStore } from '@/features/auth/store'
import {
  useMedicationSupportProfile,
  useUpdateMedicationSupportProfile,
} from '@/features/service-users/hooks/useMedicationSupportProfile'
import type { MedicationSupportProfile } from '@/features/service-users/api/medication-support-profile.api'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'

type Props = {
  serviceUserId: string
}

function boolLabel(v: boolean): string {
  return v ? 'Yes' : 'No'
}

export function MedicationSupportProfileTab({ serviceUserId }: Props) {
  const canEdit = React.useMemo(() => {
    const p = (useAuthStore.getState().user?.permissions ?? []) as string[]
    return (
      p.includes('service_users.update') ||
      p.includes('service_users.medications.support_profile.update') ||
      p.includes('service_users.medications.update')
    )
  }, [])

  const profileQuery = useMedicationSupportProfile(serviceUserId)
  const updateMutation = useUpdateMedicationSupportProfile(serviceUserId)

  const [draft, setDraft] = React.useState<MedicationSupportProfile | null>(null)
  const [dirty, setDirty] = React.useState(false)

  React.useEffect(() => {
    if (profileQuery.data && !dirty) {
      setDraft(profileQuery.data)
    }
  }, [profileQuery.data, dirty])

  const data = draft ?? profileQuery.data

  const setFlag = (key: keyof Pick<
    MedicationSupportProfile,
    | 'selfAdministersMedication'
    | 'requiresPrompting'
    | 'requiresSupervision'
    | 'requiresCarerAdministration'
    | 'familyMemberOrCarerSupportsMedication'
  >) => {
    setDirty(true)
    setDraft(prev =>
      prev
        ? { ...prev, [key]: !prev[key] }
        : prev,
    )
  }

  const save = async () => {
    if (!draft) return
    try {
      await updateMutation.mutateAsync({
        selfAdministersMedication: draft.selfAdministersMedication,
        requiresPrompting: draft.requiresPrompting,
        requiresSupervision: draft.requiresSupervision,
        requiresCarerAdministration: draft.requiresCarerAdministration,
        familyMemberOrCarerSupportsMedication: draft.familyMemberOrCarerSupportsMedication,
        storageLocation: draft.storageLocation?.trim() ? draft.storageLocation.trim() : null,
        notes: draft.notes?.trim() ? draft.notes.trim() : null,
      })
      toastSuccess('Support profile saved')
      setDirty(false)
    } catch (err) {
      toastApiError(err, 'Could not save support profile')
    }
  }

  if (profileQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading support profile…
      </div>
    )
  }

  if (profileQuery.isError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {profileQuery.error instanceof Error
          ? profileQuery.error.message
          : 'Could not load support profile'}
      </p>
    )
  }

  if (!data) return null

  const flags: {
    key: keyof Pick<
      MedicationSupportProfile,
      | 'selfAdministersMedication'
      | 'requiresPrompting'
      | 'requiresSupervision'
      | 'requiresCarerAdministration'
      | 'familyMemberOrCarerSupportsMedication'
    >
    label: string
    hint: string
  }[] = [
    {
      key: 'selfAdministersMedication',
      label: 'Self-administers medication',
      hint: 'Service user takes their own medicines without carer administration.',
    },
    {
      key: 'requiresPrompting',
      label: 'Requires prompting',
      hint: 'Carer may need to remind the person to take medication.',
    },
    {
      key: 'requiresSupervision',
      label: 'Requires supervision',
      hint: 'Carer observes while the person takes medication.',
    },
    {
      key: 'requiresCarerAdministration',
      label: 'Requires carer administration',
      hint: 'Carer must give medication directly.',
    },
    {
      key: 'familyMemberOrCarerSupportsMedication',
      label: 'Family member or carer gives medicines support',
      hint:
        'A family member or carer may give medicines support that care staff would usually provide. Agree with the person and family how this is recorded on the MAR (CQC / NICE NG67).',
    },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Medication support profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          How this person is supported with medicines. Use notes for GP, pharmacy, risk context, or
          other clinical detail not captured elsewhere.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card">
        <div className="divide-y divide-border">
          {flags.map(item => (
            <label
              key={item.key}
              className="flex cursor-pointer gap-3 px-4 py-3 has-[:disabled]:cursor-default"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={data[item.key]}
                disabled={!canEdit || updateMutation.isPending}
                onChange={() => setFlag(item.key)}
              />
              <span>
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block text-xs text-muted-foreground">{item.hint}</span>
                {!canEdit && (
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Current: {boolLabel(data[item.key])}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <label htmlFor="med-support-storage" className="text-sm font-medium">
          Medication storage location
        </label>
        <p className="text-xs text-muted-foreground">
          Where medicines are kept in the property. Shown on the carer app visit Overview (not the
          home address).
        </p>
        <textarea
          id="med-support-storage"
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={data.storageLocation ?? ''}
          disabled={!canEdit || updateMutation.isPending}
          onChange={e => {
            setDirty(true)
            setDraft(d => (d ? { ...d, storageLocation: e.target.value } : d))
          }}
          placeholder='e.g. Kitchen cupboard, above the sink (left-hand side, labelled “MAR”).'
        />
      </section>

      <section className="space-y-2">
        <label htmlFor="med-support-notes" className="text-sm font-medium">
          Notes (GP, pharmacy, risks)
        </label>
        <textarea
          id="med-support-notes"
          rows={5}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={data.notes ?? ''}
          disabled={!canEdit || updateMutation.isPending}
          onChange={e => {
            setDirty(true)
            setDraft(d => (d ? { ...d, notes: e.target.value } : d))
          }}
          placeholder="e.g. GP: Dr Smith · Pharmacy: High Street · Allergies reviewed monthly"
        />
      </section>

      {canEdit && (
        <div className="flex gap-2">
          <Button
            type="button"
            disabled={!dirty || updateMutation.isPending}
            onClick={() => void save()}
          >
            {updateMutation.isPending ? 'Saving…' : 'Save profile'}
          </Button>
          {dirty && (
            <Button
              type="button"
              variant="outline"
              disabled={updateMutation.isPending}
              onClick={() => {
                setDraft(profileQuery.data ?? null)
                setDirty(false)
              }}
            >
              Reset
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
