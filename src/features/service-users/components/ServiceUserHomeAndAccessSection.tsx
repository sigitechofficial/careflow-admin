import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { extractApiErrorMessage, toastApiError, toastSuccess } from '@/shared/lib/toast'
import type { ServiceUserDetail } from '@/features/service-users/types'
import { useUpdateServiceUser } from '@/features/service-users/hooks/useServiceUserMutations'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { AddressPlacesField } from '@/shared/ui/address-places-field'
import { ServiceUserZoneBranchSelect } from '@/features/service-users/components/ServiceUserZoneBranchSelect'
import { HomeAccessFields } from '@/features/service-users/components/HomeAccessFields'

/**
 * Domiciliary / Home Care — location, address and how carers enter the home.
 * Moved out of the Personal Details profile form so all home-care information
 * lives in one place (the DOM Care tab). Saves through the same service-user
 * update + address API the profile form used, so the underlying data store is
 * unchanged — only where it is edited has moved.
 */

const decStr = (v: unknown): string => (v === null || v === undefined ? '' : String(v))

type Props = {
  serviceUserId: string
  detail: ServiceUserDetail
  onSaved: () => void
}

type HomeAccessState = {
  locationId: string
  serviceUserAreaId: string
  addressLine1: string
  addressLine2: string
  town: string
  county: string
  country: string
  postcode: string
  secondaryPostcode: string
  latitude: string
  longitude: string
  accessMethod: string
  keySafeLocation: string
  keySafeNumber: string
  accessInstructions: string
}

function detailToState(d: ServiceUserDetail): HomeAccessState {
  return {
    locationId: d.location?.id ?? '',
    serviceUserAreaId: d.serviceUserAreaId ?? d.serviceUserArea?.id ?? '',
    addressLine1: d.address?.addressLine1 ?? '',
    addressLine2: d.address?.addressLine2 ?? '',
    town: d.address?.town ?? '',
    county: d.address?.county ?? '',
    country: d.address?.country ?? '',
    postcode: d.address?.postcode ?? '',
    secondaryPostcode: d.address?.secondaryPostcode ?? '',
    latitude: decStr(d.address?.latitude),
    longitude: decStr(d.address?.longitude),
    accessMethod: d.address?.accessMethod ?? '',
    keySafeLocation: d.address?.keySafeLocation ?? '',
    keySafeNumber: d.address?.keySafeNumber ?? '',
    accessInstructions: d.address?.accessInstructions ?? '',
  }
}

export function ServiceUserHomeAndAccessSection({ serviceUserId, detail, onSaved }: Props) {
  const canUpdate = useAuthStore((s) => s.can('service_users.update'))
  const canAddress = useAuthStore((s) => s.can('service_users.address.update'))

  const [form, setForm] = React.useState<HomeAccessState>(() => detailToState(detail))
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [saveOk, setSaveOk] = React.useState(false)

  // Reload local state when the underlying service user detail changes.
  React.useEffect(() => {
    setForm(detailToState(detail))
  }, [detail])

  const updateMutation = useUpdateServiceUser(serviceUserId)

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!canUpdate) return
    setSaveError(null)
    setSaveOk(false)
    try {
      await updateMutation.mutateAsync({
        body: {
          locationId: form.locationId || undefined,
          serviceUserAreaId: form.serviceUserAreaId || null,
        },
        address: canAddress
          ? {
              addressLine1: form.addressLine1.trim() || undefined,
              addressLine2: form.addressLine2.trim() || undefined,
              town: form.town.trim() || undefined,
              county: form.county.trim() || undefined,
              country: form.country.trim() || undefined,
              postcode: form.postcode.trim() || undefined,
              secondaryPostcode: form.secondaryPostcode.trim() || undefined,
              accessInstructions: form.accessInstructions.trim() || undefined,
              keySafeNumber: form.keySafeNumber.trim() || null,
              accessMethod: form.accessMethod.trim() || null,
              keySafeLocation: form.keySafeLocation.trim() || null,
              latitude: form.latitude.trim() ? Number(form.latitude) : undefined,
              longitude: form.longitude.trim() ? Number(form.longitude) : undefined,
            }
          : undefined,
      })
      onSaved()
      setSaveOk(true)
      toastSuccess('Home & access saved', 'Your changes were applied successfully.')
      window.setTimeout(() => setSaveOk(false), 4000)
    } catch (err) {
      setSaveError(extractApiErrorMessage(err, 'Save failed'))
      toastApiError(err, 'Save failed')
    }
  }

  return (
    <form className="space-y-6" onSubmit={onSave}>
      {saveError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {saveError}
        </div>
      )}
      {saveOk && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
          Home &amp; access saved successfully.
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-sky-600 dark:text-sky-400">Service location</h2>
        <div className="space-y-1.5">
          <span className="text-sm text-muted-foreground">
            Zone, branch &amp; area<span className="text-destructive">*</span>
          </span>
          <ServiceUserZoneBranchSelect
            value={form.locationId}
            areaId={form.serviceUserAreaId}
            mainPostcode={form.postcode}
            onChange={({ locationId, serviceUserAreaId }) =>
              setForm((prev) => ({ ...prev, locationId, serviceUserAreaId }))
            }
            onApplyMainPostcode={(postcode) => setForm((prev) => ({ ...prev, postcode }))}
            required
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-sky-600 dark:text-sky-400">
          Address (optional — includes map coordinates)
        </h2>
        <AddressPlacesField
          postcodeLabel="Secondary postcode"
          value={{
            addressLine1: form.addressLine1,
            addressLine2: form.addressLine2,
            town: form.town,
            county: form.county,
            country: form.country,
            postcode: form.secondaryPostcode,
            latitude: form.latitude,
            longitude: form.longitude,
          }}
          onChange={(patch) =>
            setForm((prev) => {
              const { postcode, ...rest } = patch
              return {
                ...prev,
                ...rest,
                ...(postcode !== undefined ? { secondaryPostcode: postcode } : {}),
              }
            })
          }
          disabled={!canAddress}
        />
        {!canAddress && (
          <p className="mt-3 text-xs text-muted-foreground">
            Address fields require the service_users.address.update permission to save.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="mb-1 text-sm font-semibold text-sky-600 dark:text-sky-400">How to enter the home</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Separate from the service address. Choose how carers get in, then add only the details they need.
        </p>
        <HomeAccessFields
          value={{
            accessMethod: form.accessMethod,
            keySafeLocation: form.keySafeLocation,
            keySafeNumber: form.keySafeNumber,
            accessInstructions: form.accessInstructions,
          }}
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          disabled={!canAddress}
        />
      </section>

      {canUpdate && (
        <div className="flex justify-end">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save home &amp; access
          </Button>
        </div>
      )}
    </form>
  )
}
