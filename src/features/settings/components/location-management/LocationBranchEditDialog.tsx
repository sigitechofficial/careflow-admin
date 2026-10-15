import * as React from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import type {
  BranchStatus,
  LocationTreeBranch,
  LocationTreeZone,
} from '@/features/settings/location-management/location-management.types'
import {
  addListItem,
  applyGoogleAddress,
  BRANCH_STATUS_OPTIONS,
  branchFormToPayload,
  branchToForm,
  CQC_RATING_OPTIONS,
  removeListItem,
  updateListItem,
  type BranchFormState,
  type BranchListField,
  type BranchRatingChoice,
} from '@/features/settings/location-management/branch-form.util'
import { ZONE_COUNTRY_OPTIONS } from '@/features/settings/location-management/country-city'
import { ORGANISATION_TIMEZONE_OPTIONS } from '@/features/settings/organisation-timezone'
import { useUpdateLocationBranch } from '@/features/settings/hooks/useLocationManagement'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { GoogleBranchAddressField } from '@/shared/ui/google-branch-address-field'

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60'

/** Keep the dialog open when clicking the portaled Google address suggestions. */
function keepOpenForListbox(e: { target: EventTarget | null; preventDefault: () => void }) {
  if (e.target instanceof Element && e.target.closest('[role="listbox"]')) e.preventDefault()
}

function Field({
  id,
  label,
  children,
  hint,
}: {
  id?: string
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

/** Editable list of free-text values (add / edit / remove rows). */
export function EditableStringList({
  id,
  label,
  items,
  onChange,
  addLabel,
  placeholder,
  disabled,
}: {
  id: string
  label: string
  items: string[]
  onChange: (next: string[]) => void
  addLabel: string
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <div className="space-y-1.5 sm:col-span-2" data-testid={`${id}-list`}>
      <p className="text-sm font-medium">{label}</p>
      {items.length === 0 ? <p className="text-xs text-muted-foreground">None added.</p> : null}
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <Input
              aria-label={`${label} ${index + 1}`}
              value={item}
              placeholder={placeholder}
              disabled={disabled}
              onChange={e => onChange(updateListItem(items, index, e.target.value))}
            />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              title={`Remove ${label.toLowerCase()} ${index + 1}`}
              aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
              disabled={disabled}
              onClick={() => onChange(removeListItem(items, index))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onChange(addListItem(items))}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {addLabel}
      </Button>
    </div>
  )
}

export function LocationBranchEditDialog({
  target,
  onClose,
}: {
  target: { zone: LocationTreeZone; branch: LocationTreeBranch } | null
  onClose: () => void
}) {
  const updateBranchMutation = useUpdateLocationBranch()
  // Parent re-mounts this dialog (key) per branch, so the form is seeded once from the target.
  const [form, setForm] = React.useState<BranchFormState | null>(() =>
    target ? branchToForm(target.branch) : null,
  )
  const saving = updateBranchMutation.isPending

  function set<K extends keyof BranchFormState>(key: K, value: BranchFormState[K]) {
    setForm(prev => (prev ? { ...prev, [key]: value } : prev))
  }

  function setList(key: BranchListField, next: string[]) {
    set(key, next)
  }

  async function onSave() {
    if (!target || !form || !form.name.trim()) return
    try {
      await updateBranchMutation.mutateAsync({
        branchId: target.branch.scheduleAreaId,
        body: branchFormToPayload(form),
      })
      toastSuccess('Saved', 'Branch updated.')
      onClose()
    } catch (e) {
      toastApiError(e, 'Could not update branch')
    }
  }

  const countryRestriction =
    ZONE_COUNTRY_OPTIONS.find(c => c.name === (target?.zone.country ?? 'United Kingdom'))?.code.toLowerCase() ??
    'gb'

  return (
    <Dialog open={Boolean(target)} onOpenChange={open => (!open ? onClose() : undefined)}>
      <DialogContent
        size="xl"
        onPointerDownOutside={keepOpenForListbox}
        onInteractOutside={keepOpenForListbox}
        onFocusOutside={keepOpenForListbox}
      >
        <DialogHeader>
          <DialogTitle>Edit branch</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[70vh] space-y-6 overflow-y-auto">
          {target && form ? (
            <>
              <p className="text-sm text-muted-foreground">
                {target.zone.name} · {target.branch.name}
              </p>

              <Section title="Branch">
                <Field id="lm-edit-branch-name" label="Branch name">
                  <Input
                    id="lm-edit-branch-name"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                  />
                </Field>
                <Field id="lm-edit-branch-status" label="Status">
                  <select
                    id="lm-edit-branch-status"
                    className={SELECT_CLASS}
                    value={form.status}
                    onChange={e => set('status', e.target.value as BranchStatus)}
                  >
                    {BRANCH_STATUS_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  id="lm-edit-branch-visitref"
                  label="Visit reference code"
                  hint="Read-only — already used in visit references."
                >
                  <Input
                    id="lm-edit-branch-visitref"
                    value={target.branch.visitRefCode ?? '—'}
                    readOnly
                    disabled
                  />
                </Field>
              </Section>

              <Section title="CQC registration">
                <Field id="lm-edit-branch-cqc-id" label="CQC location ID">
                  <Input
                    id="lm-edit-branch-cqc-id"
                    value={form.cqcLocationId}
                    onChange={e => set('cqcLocationId', e.target.value)}
                    placeholder="e.g. 1-115898258"
                  />
                </Field>
                <Field id="lm-edit-branch-cqc-name" label="Official CQC name">
                  <Input
                    id="lm-edit-branch-cqc-name"
                    value={form.officialCqcName}
                    onChange={e => set('officialCqcName', e.target.value)}
                  />
                </Field>
                <Field id="lm-edit-branch-rating" label="CQC rating">
                  <select
                    id="lm-edit-branch-rating"
                    className={SELECT_CLASS}
                    value={form.rating}
                    onChange={e => set('rating', e.target.value as BranchRatingChoice)}
                  >
                    {CQC_RATING_OPTIONS.map(o => (
                      <option key={o.value || 'none'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="lm-edit-branch-cqc-date" label="CQC registration date">
                  <Input
                    id="lm-edit-branch-cqc-date"
                    type="date"
                    value={form.cqcRegistrationDate}
                    onChange={e => set('cqcRegistrationDate', e.target.value)}
                  />
                </Field>
                <Field id="lm-edit-branch-ni" label="Nominated individual">
                  <Input
                    id="lm-edit-branch-ni"
                    value={form.nominatedIndividual}
                    onChange={e => set('nominatedIndividual', e.target.value)}
                  />
                </Field>
                <Field id="lm-edit-branch-la" label="Local authority">
                  <Input
                    id="lm-edit-branch-la"
                    value={form.localAuthority}
                    onChange={e => set('localAuthority', e.target.value)}
                  />
                </Field>
                <EditableStringList
                  id="lm-edit-branch-managers"
                  label="Registered managers"
                  items={form.registeredManagers}
                  onChange={next => setList('registeredManagers', next)}
                  addLabel="Add manager"
                  placeholder="Full name"
                />
                <EditableStringList
                  id="lm-edit-branch-service-types"
                  label="Service types"
                  items={form.serviceTypes}
                  onChange={next => setList('serviceTypes', next)}
                  addLabel="Add service type"
                  placeholder="e.g. Homecare agency"
                />
                <EditableStringList
                  id="lm-edit-branch-activities"
                  label="Regulated activities"
                  items={form.regulatedActivities}
                  onChange={next => setList('regulatedActivities', next)}
                  addLabel="Add regulated activity"
                  placeholder="e.g. Personal care"
                />
              </Section>

              <Section title="Address">
                <div className="sm:col-span-2">
                  <Field id="lm-edit-branch-address" label="Address">
                    <GoogleBranchAddressField
                      id="lm-edit-branch-address"
                      value={form.address}
                      onChange={(address, meta) =>
                        setForm(prev => (prev ? applyGoogleAddress(prev, address, meta) : prev))
                      }
                      countryRestriction={countryRestriction}
                    />
                  </Field>
                </div>
                <Field id="lm-edit-branch-line1" label="Address line 1">
                  <Input
                    id="lm-edit-branch-line1"
                    value={form.addressLine1}
                    onChange={e => set('addressLine1', e.target.value)}
                  />
                </Field>
                <Field id="lm-edit-branch-line2" label="Address line 2">
                  <Input
                    id="lm-edit-branch-line2"
                    value={form.addressLine2}
                    onChange={e => set('addressLine2', e.target.value)}
                  />
                </Field>
                <Field id="lm-edit-branch-town" label="Town / city">
                  <Input
                    id="lm-edit-branch-town"
                    value={form.town}
                    onChange={e => set('town', e.target.value)}
                  />
                </Field>
                <Field id="lm-edit-branch-county" label="County">
                  <Input
                    id="lm-edit-branch-county"
                    value={form.county}
                    onChange={e => set('county', e.target.value)}
                  />
                </Field>
                <Field id="lm-edit-branch-postcode" label="Postcode">
                  <Input
                    id="lm-edit-branch-postcode"
                    value={form.postcode}
                    onChange={e => set('postcode', e.target.value)}
                  />
                </Field>
                <Field id="lm-edit-branch-country" label="Country">
                  <Input
                    id="lm-edit-branch-country"
                    value={form.country}
                    onChange={e => set('country', e.target.value)}
                  />
                </Field>
                <Field
                  id="lm-edit-branch-coords"
                  label="Latitude / longitude"
                  hint="Read-only — filled from the Google address or by geocoding."
                >
                  <Input
                    id="lm-edit-branch-coords"
                    readOnly
                    disabled
                    value={
                      form.latitude !== null && form.longitude !== null
                        ? `${form.latitude}, ${form.longitude}`
                        : 'Not geocoded yet'
                    }
                  />
                </Field>
              </Section>

              <Section title="Contact">
                <Field id="lm-edit-branch-phone" label="Phone">
                  <Input
                    id="lm-edit-branch-phone"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                  />
                </Field>
                <Field id="lm-edit-branch-email" label="Email">
                  <Input
                    id="lm-edit-branch-email"
                    type="email"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                  />
                </Field>
                <Field id="lm-edit-branch-website" label="Website">
                  <Input
                    id="lm-edit-branch-website"
                    value={form.website}
                    onChange={e => set('website', e.target.value)}
                  />
                </Field>
              </Section>

              <Section title="Locale">
                <Field id="lm-edit-branch-tz" label="Timezone">
                  <select
                    id="lm-edit-branch-tz"
                    className={SELECT_CLASS}
                    value={form.timezone}
                    onChange={e => set('timezone', e.target.value)}
                  >
                    {ORGANISATION_TIMEZONE_OPTIONS.some(o => o.value === form.timezone) ? null : (
                      <option value={form.timezone}>{form.timezone}</option>
                    )}
                    {ORGANISATION_TIMEZONE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="lm-edit-branch-country-code" label="Country code" hint="ISO 3166-1, e.g. GB">
                  <Input
                    id="lm-edit-branch-country-code"
                    value={form.countryCode}
                    maxLength={2}
                    onChange={e => set('countryCode', e.target.value)}
                  />
                </Field>
                <Field id="lm-edit-branch-currency" label="Currency" hint="ISO 4217, e.g. GBP">
                  <Input
                    id="lm-edit-branch-currency"
                    value={form.currency}
                    maxLength={3}
                    onChange={e => set('currency', e.target.value)}
                  />
                </Field>
                <Field id="lm-edit-branch-locale" label="Locale" hint="e.g. en-GB">
                  <Input
                    id="lm-edit-branch-locale"
                    value={form.locale}
                    onChange={e => set('locale', e.target.value)}
                  />
                </Field>
              </Section>
            </>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void onSave()}
            disabled={saving || !form?.name.trim()}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
