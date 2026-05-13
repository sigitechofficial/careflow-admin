import * as React from 'react'
import { Info, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  createServiceUserCustomRateCard,
  createServiceUserFundingProfile,
  deleteServiceUserFundingProfile,
  fetchServiceUserFunding,
  fetchServiceUserFundingLookups,
  patchServiceUserFundingRefs,
  updateServiceUserFundingProfile,
  type CreateFundingProfileBody,
  type FundingBillingType,
  type FundingCareServiceRow,
  type FundingFunderKind,
  type FundingRateCardRow,
  type ServiceUserDetailContact,
  type ServiceUserFundingProfileRow,
} from '@/lib/service-users-api'
import { toastApiError, toastError, toastSuccess } from '@/lib/toast'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/toggle-controls'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const BILLING_OPTIONS: { value: FundingBillingType; label: string }[] = [
  { value: 'SINGLE_FUNDER', label: 'Single Funder' },
  { value: 'SPLIT_SU_WEEKLY_CONTRIBUTION', label: 'Split-SU Weekly Contribution' },
]

const FUNDER_OPTIONS: { value: FundingFunderKind; label: string }[] = [
  { value: 'SERVICE_USER', label: 'Service User' },
  { value: 'CONTACT', label: 'Contact' },
  { value: 'EXTERNAL_FUNDER', label: 'Funder' },
]

function billingLabel(t: FundingBillingType): string {
  return BILLING_OPTIONS.find((o) => o.value === t)?.label ?? t
}

function contactLabel(c: ServiceUserDetailContact): string {
  return [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || c.id
}

type ProfileForm = {
  careServiceId: string
  billingType: FundingBillingType
  funder1Kind: FundingFunderKind
  funder1ContactId: string
  funder1ExternalName: string
  rateCardId: string
  invoiceMileage: boolean
}

function emptyProfileForm(): ProfileForm {
  return {
    careServiceId: '',
    billingType: 'SINGLE_FUNDER',
    funder1Kind: 'SERVICE_USER',
    funder1ContactId: '',
    funder1ExternalName: '',
    rateCardId: '',
    invoiceMileage: false,
  }
}

function rowToForm(row: ServiceUserFundingProfileRow): ProfileForm {
  return {
    careServiceId: row.careService.id,
    billingType: row.billingType,
    funder1Kind: row.funder1Kind,
    funder1ContactId: row.funder1ContactId ?? '',
    funder1ExternalName: row.funder1ExternalName ?? '',
    rateCardId: row.rateCard.id,
    invoiceMileage: row.invoiceMileage,
  }
}

export function ServiceUserFundingTab({
  serviceUserId,
  displayName,
  contacts,
  onDetailPatch,
}: {
  serviceUserId: string
  displayName: string
  contacts: ServiceUserDetailContact[]
  onDetailPatch: (patch: { nhsNumber?: string | null; socialServicesRef?: string | null }) => void
}) {
  const can = useAuthStore((s) => s.can)
  const canRead = can('service_users.funding.read') || can('service_users.read')
  const canUpdate = can('service_users.funding.update') || can('service_users.update')

  const [careServices, setCareServices] = React.useState<FundingCareServiceRow[]>([])
  const [rateCards, setRateCards] = React.useState<FundingRateCardRow[]>([])
  const [profiles, setProfiles] = React.useState<ServiceUserFundingProfileRow[]>([])
  const [socialServicesRef, setSocialServicesRef] = React.useState('')
  const [nhsNumber, setNhsNumber] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [refsSaving, setRefsSaving] = React.useState(false)

  const [profileDialogOpen, setProfileDialogOpen] = React.useState(false)
  const [editingProfileId, setEditingProfileId] = React.useState<string | null>(null)
  const [profileForm, setProfileForm] = React.useState<ProfileForm>(() => emptyProfileForm())
  const [profileSaving, setProfileSaving] = React.useState(false)

  const [customOpen, setCustomOpen] = React.useState(false)
  const [customName, setCustomName] = React.useState('')
  const [customCareServiceId, setCustomCareServiceId] = React.useState('')
  const [customStart, setCustomStart] = React.useState('')
  const [customHourly, setCustomHourly] = React.useState('0')
  const [customMileage, setCustomMileage] = React.useState('')
  const [customSaving, setCustomSaving] = React.useState(false)

  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [deleteSaving, setDeleteSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!canRead) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [lu, bundle] = await Promise.all([
        fetchServiceUserFundingLookups(serviceUserId),
        fetchServiceUserFunding(serviceUserId),
      ])
      setCareServices(lu.careServices)
      setRateCards(lu.rateCards)
      setProfiles(bundle.profiles)
      setSocialServicesRef(bundle.socialServicesRef ?? '')
      setNhsNumber(bundle.nhsNumber ?? '')
    } catch (e) {
      setCareServices([])
      setRateCards([])
      setProfiles([])
      toastApiError(e, 'Failed to load funding')
    } finally {
      setLoading(false)
    }
  }, [canRead, serviceUserId])

  React.useEffect(() => {
    void load()
  }, [load])

  async function saveRefs() {
    if (!canUpdate) return
    setRefsSaving(true)
    try {
      const data = await patchServiceUserFundingRefs(serviceUserId, {
        socialServicesRef: socialServicesRef.trim() || null,
        nhsNumber: nhsNumber.trim() || null,
      })
      setSocialServicesRef(data.socialServicesRef ?? '')
      setNhsNumber(data.nhsNumber ?? '')
      onDetailPatch({ socialServicesRef: data.socialServicesRef, nhsNumber: data.nhsNumber })
      toastSuccess('Funding details saved', 'Reference fields were updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    } finally {
      setRefsSaving(false)
    }
  }

  function openAddProfile() {
    setEditingProfileId(null)
    setProfileForm(emptyProfileForm())
    setProfileDialogOpen(true)
  }

  function openEditProfile(row: ServiceUserFundingProfileRow) {
    setEditingProfileId(row.id)
    setProfileForm(rowToForm(row))
    setProfileDialogOpen(true)
  }

  function buildProfilePayload(): CreateFundingProfileBody {
    if (!profileForm.careServiceId) throw new Error('Select a service.')
    if (!profileForm.rateCardId) throw new Error('Select a rate card.')
    if (profileForm.funder1Kind === 'CONTACT' && !profileForm.funder1ContactId) {
      throw new Error('Select a contact for Funder 1.')
    }
    if (profileForm.funder1Kind === 'EXTERNAL_FUNDER' && !profileForm.funder1ExternalName.trim()) {
      throw new Error('Enter an external funder name.')
    }
    return {
      careServiceId: profileForm.careServiceId,
      billingType: profileForm.billingType,
      funder1Kind: profileForm.funder1Kind,
      funder1ContactId: profileForm.funder1Kind === 'CONTACT' ? profileForm.funder1ContactId : null,
      funder1ExternalName:
        profileForm.funder1Kind === 'EXTERNAL_FUNDER' ? profileForm.funder1ExternalName.trim() : null,
      rateCardId: profileForm.rateCardId,
      invoiceMileage: profileForm.invoiceMileage,
    }
  }

  async function saveProfile() {
    if (!canUpdate) return
    let payload: CreateFundingProfileBody
    try {
      payload = buildProfilePayload()
    } catch (err) {
      toastError('Cannot save funding profile', err instanceof Error ? err.message : 'Invalid form')
      return
    }
    setProfileSaving(true)
    try {
      if (editingProfileId) {
        await updateServiceUserFundingProfile(serviceUserId, editingProfileId, payload)
        toastSuccess('Funding profile updated')
      } else {
        await createServiceUserFundingProfile(serviceUserId, payload)
        toastSuccess('Funding profile added')
      }
      setProfileDialogOpen(false)
      await load()
    } catch (e) {
      toastApiError(e, 'Save failed')
    } finally {
      setProfileSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteId) return
    setDeleteSaving(true)
    try {
      await deleteServiceUserFundingProfile(serviceUserId, deleteId)
      setDeleteId(null)
      toastSuccess('Funding profile removed')
      await load()
    } catch (e) {
      toastApiError(e, 'Delete failed')
    } finally {
      setDeleteSaving(false)
    }
  }

  async function submitCustomRateCard() {
    if (!canUpdate) return
    const name = customName.trim()
    if (!name) {
      toastError('Cannot create rate card', 'Enter a rate card name.')
      return
    }
    if (!customCareServiceId) {
      toastError('Cannot create rate card', 'Select a service type.')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(customStart.trim())) {
      toastError('Cannot create rate card', 'Start date must be YYYY-MM-DD.')
      return
    }
    const hourly = Number.parseFloat(customHourly)
    if (!Number.isFinite(hourly) || hourly < 0) {
      toastError('Cannot create rate card', 'Enter a valid standard hourly rate.')
      return
    }
    const mileage =
      customMileage.trim() === '' ? undefined : Number.parseFloat(customMileage)
    if (mileage !== undefined && (!Number.isFinite(mileage) || mileage < 0)) {
      toastError('Cannot create rate card', 'Enter a valid mileage rate or leave it blank.')
      return
    }
    setCustomSaving(true)
    try {
      const created = await createServiceUserCustomRateCard(serviceUserId, {
        name,
        careServiceId: customCareServiceId,
        startDate: customStart.trim(),
        standardHourlyRate: hourly,
        mileageRatePerUnit: mileage,
      })
      setRateCards((prev) => [
        ...prev,
        {
          id: created.id,
          name: created.name,
          code: created.code,
          isCustom: created.isCustom,
          serviceUserId: created.serviceUserId,
        },
      ])
      setProfileForm((f) => ({ ...f, rateCardId: created.id }))
      setCustomOpen(false)
      setCustomName('')
      setCustomCareServiceId('')
      setCustomStart('')
      setCustomHourly('0')
      setCustomMileage('')
      toastSuccess('Custom rate card created', 'It is now available in the rate card list.')
    } catch (e) {
      toastApiError(e, 'Could not create rate card')
    } finally {
      setCustomSaving(false)
    }
  }

  if (!canRead) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
        You do not have permission to view funding. Ask an administrator to grant{' '}
        <span className="font-mono text-xs">service_users.read</span> or{' '}
        <span className="font-mono text-xs">service_users.funding.read</span>.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-sky-600 dark:text-sky-400">
            {displayName.trim() || 'Service user'}&apos;s Funding Profile
          </h2>
          {canUpdate && (
            <button
              type="button"
              title="Add funding profile"
              className={cn(
                'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border p-0 transition-colors',
                'border-sky-600 text-sky-600 hover:bg-sky-600/10',
              )}
              onClick={openAddProfile}
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No funding profiles yet. Add one to record billing setup.</p>
        ) : (
          <div className="space-y-3">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{p.careService.name}</p>
                  <p className="text-xs text-muted-foreground">{billingLabel(p.billingType)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Rate: {p.rateCard.name}
                    {p.invoiceMileage ? ' · Invoice mileage' : ''}
                  </p>
                </div>
                {canUpdate && (
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditProfile(p)}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-sky-600 dark:text-sky-400">Reference</h3>
        <div className="grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Social Services Ref.</label>
            <Input value={socialServicesRef} onChange={(e) => setSocialServicesRef(e.target.value)} disabled={!canUpdate} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">NHS Number</label>
            <Input value={nhsNumber} onChange={(e) => setNhsNumber(e.target.value)} disabled={!canUpdate} />
          </div>
        </div>
        {canUpdate && (
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => void load()} disabled={refsSaving || loading}>
              Close
            </Button>
            <Button type="button" className="bg-sky-600 text-white hover:bg-sky-700" onClick={() => void saveRefs()} disabled={refsSaving || loading}>
              {refsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        )}
      </section>

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="border-b border-border pb-3">
            <div className="flex items-start justify-between gap-2">
              <DialogTitle>Funding</DialogTitle>
              <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => setProfileDialogOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>
          <DialogBody className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Services</label>
              <Select
                value={profileForm.careServiceId || '__none__'}
                onValueChange={(v) => setProfileForm((f) => ({ ...f, careServiceId: v === '__none__' ? '' : v }))}
                disabled={!careServices.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select Service</SelectItem>
                  {careServices.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Billing Type</label>
              <Select
                value={profileForm.billingType}
                onValueChange={(v) => setProfileForm((f) => ({ ...f, billingType: v as FundingBillingType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Funder 1</label>
              <Select
                value={profileForm.funder1Kind}
                onValueChange={(v) =>
                  setProfileForm((f) => ({
                    ...f,
                    funder1Kind: v as FundingFunderKind,
                    funder1ContactId: v === 'CONTACT' ? f.funder1ContactId : '',
                    funder1ExternalName: v === 'EXTERNAL_FUNDER' ? f.funder1ExternalName : '',
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Funder Type" />
                </SelectTrigger>
                <SelectContent>
                  {FUNDER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {profileForm.funder1Kind === 'CONTACT' && (
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Contact</label>
                <Select
                  value={profileForm.funder1ContactId || '__none__'}
                  onValueChange={(v) => setProfileForm((f) => ({ ...f, funder1ContactId: v === '__none__' ? '' : v }))}
                  disabled={!contacts.length}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Select —</SelectItem>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {contactLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {profileForm.funder1Kind === 'EXTERNAL_FUNDER' && (
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Funder name</label>
                <Input
                  value={profileForm.funder1ExternalName}
                  onChange={(e) => setProfileForm((f) => ({ ...f, funder1ExternalName: e.target.value }))}
                  placeholder="Organisation or authority"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Rate Card</label>
                <span title="Standard rates from your catalogue, plus any custom cards created for this person.">
                  <Info className="h-3.5 w-3.5 text-sky-600" />
                </span>
              </div>
              <Select
                value={profileForm.rateCardId || '__none__'}
                onValueChange={(v) => setProfileForm((f) => ({ ...f, rateCardId: v === '__none__' ? '' : v }))}
                disabled={!rateCards.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Rate Card" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select Rate Card</SelectItem>
                  {rateCards.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                      {r.isCustom ? ' (custom)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canUpdate && (
                <button type="button" className="text-xs font-medium text-sky-600 underline hover:text-sky-700" onClick={() => setCustomOpen(true)}>
                  Create Custom
                </button>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Invoice Mileage?</span>
                <span title="When enabled, mileage can be invoiced under this funding line.">
                  <Info className="h-3.5 w-3.5 text-sky-600" />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{profileForm.invoiceMileage ? 'YES' : 'NO'}</span>
                <Switch
                  checked={profileForm.invoiceMileage}
                  onCheckedChange={(v) => setProfileForm((f) => ({ ...f, invoiceMileage: v }))}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter className="gap-2 border-t border-border pt-3">
            <Button type="button" variant="outline" onClick={() => setProfileDialogOpen(false)}>
              Close
            </Button>
            <Button type="button" className="bg-sky-600 text-white hover:bg-sky-700" onClick={() => void saveProfile()} disabled={profileSaving}>
              {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Custom Rate Card</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">
                Rate Card Name <span className="text-destructive">*</span>
              </label>
              <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Rate Card Name" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">
                Service Type <span className="text-destructive">*</span>
              </label>
              <Select value={customCareServiceId || '__none__'} onValueChange={(v) => setCustomCareServiceId(v === '__none__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select service type</SelectItem>
                  {careServices.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">
                Start Date <span className="text-destructive">*</span>
              </label>
              <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">
                Standard Hourly Rate <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm">£</span>
                <Input className="max-w-[120px]" value={customHourly} onChange={(e) => setCustomHourly(e.target.value)} inputMode="decimal" />
                <span className="text-xs text-muted-foreground">per hour</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Mileage rate (optional)</label>
              <div className="flex items-center gap-2">
                <span className="text-sm">£</span>
                <Input className="max-w-[120px]" value={customMileage} onChange={(e) => setCustomMileage(e.target.value)} inputMode="decimal" placeholder="0" />
              </div>
            </div>
          </DialogBody>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setCustomOpen(false)}>
              Close
            </Button>
            <Button type="button" className="bg-sky-600 text-white hover:bg-sky-700" onClick={() => void submitCustomRateCard()} disabled={customSaving}>
              {customSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove funding profile?</AlertDialogTitle>
            <AlertDialogDescription>This removes the billing line from this service user. You can add it again later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                void confirmDelete()
              }}
              disabled={deleteSaving}
            >
              {deleteSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
