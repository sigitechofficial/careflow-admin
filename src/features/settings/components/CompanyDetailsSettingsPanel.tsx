import * as React from 'react'
import { Camera, Info, Loader2, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import type { CompanyProfile } from '@/features/settings/types'
import {
  useClearDisplayLogo,
  useCompanyProfile,
  useUpdateCompanyProfile,
  useUploadCompanyLogo,
  useUploadDisplayLogo,
} from '@/features/settings/hooks/useCompanySettings'
import { CompanyActiveModulesField } from '@/features/settings/components/CompanyActiveModulesField'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'
import { useCompanyStore } from '@/store/company.store'
import {
  companyLegalDraft,
  companyLegalPayload,
  type CompanyLegalDraft,
} from '@/features/settings/company/company-legal.util'

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-medium text-foreground">
      {children}
      {required && <span className="text-destructive"> *</span>}
    </label>
  )
}

function FieldRow({
  label,
  required,
  children,
  hint,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[minmax(0,11rem)_1fr] sm:items-center sm:gap-4">
      <div className="flex items-center gap-1">
        <FieldLabel required={required}>{label}</FieldLabel>
        {hint && (
          <span title={hint} className="text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function CompanyDetailsSettingsPanel() {
  const canUpdate = useAuthStore(
    s => s.can('settings.company.update') || s.can('lookups.manage'),
  )
  const { data: profileData, isLoading: loading, error: queryError } = useCompanyProfile()
  const updateMutation = useUpdateCompanyProfile()
  const uploadDisplayLogoMutation = useUploadDisplayLogo()
  const uploadCompanyLogoMutation = useUploadCompanyLogo()
  const clearDisplayLogoMutation = useClearDisplayLogo()
  const [profile, setProfile] = React.useState<CompanyProfile | null>(null)
  const saving =
    updateMutation.isPending ||
    uploadDisplayLogoMutation.isPending ||
    uploadCompanyLogoMutation.isPending ||
    clearDisplayLogoMutation.isPending
  const error =
    queryError instanceof ApiError
      ? queryError.message
      : queryError
        ? 'Could not load company details.'
        : null

  const displayLogoRef = React.useRef<HTMLInputElement>(null)
  const companyLogoRef = React.useRef<HTMLInputElement>(null)

  const [legal, setLegal] = React.useState<CompanyLegalDraft | null>(null)

  const [draft, setDraft] = React.useState({
    groupName: '',
    companyName: '',
    odsCsCode: '',
    displayName: '',
    companyWebsite: '',
    contactName: '',
    email: '',
    phoneNumber: '',
    vatNumber: '',
    bankName: '',
    bankSortCode: '',
    bankAccountNumber: '',
    activeModules: [] as string[],
  })

  const syncCompanyStore = useCompanyStore(s => s.setProfile)

  const applyProfile = React.useCallback((p: CompanyProfile) => {
    setProfile(p)
    syncCompanyStore(p)
    setDraft({
      groupName: p.groupName ?? '',
      companyName: p.companyName,
      odsCsCode: p.odsCsCode,
      displayName: p.displayName,
      companyWebsite: p.companyWebsite ?? '',
      contactName: p.contactName,
      email: p.email,
      phoneNumber: p.phoneNumber,
      vatNumber: p.vatNumber ?? '',
      bankName: p.bankName ?? '',
      bankSortCode: p.bankSortCode ?? '',
      bankAccountNumber: p.bankAccountNumber ?? '',
      activeModules: [...p.activeModules],
    })
    setLegal(companyLegalDraft(p))
  }, [syncCompanyStore])

  React.useEffect(() => {
    if (profileData) applyProfile(profileData)
  }, [profileData, applyProfile])

  function setField<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft(prev => ({ ...prev, [key]: value }))
  }

  function setLegalField<K extends keyof CompanyLegalDraft>(key: K, value: CompanyLegalDraft[K]) {
    setLegal(prev => (prev ? { ...prev, [key]: value } : prev))
  }

  async function onSave() {
    if (!canUpdate) return
    try {
      const updated = await updateMutation.mutateAsync({
        groupName: draft.groupName.trim() || undefined,
        companyName: draft.companyName.trim(),
        odsCsCode: draft.odsCsCode.trim(),
        displayName: draft.displayName.trim(),
        companyWebsite: draft.companyWebsite.trim() || undefined,
        contactName: draft.contactName.trim(),
        email: draft.email.trim(),
        phoneNumber: draft.phoneNumber.trim(),
        vatNumber: draft.vatNumber.trim() || undefined,
        bankName: draft.bankName.trim() || undefined,
        bankSortCode: draft.bankSortCode.trim() || undefined,
        bankAccountNumber: draft.bankAccountNumber.trim() || undefined,
        activeModules: draft.activeModules,
        ...(legal ? companyLegalPayload(legal) : {}),
      })
      applyProfile(updated)
      toastSuccess('Saved', 'Company details updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    }
  }

  function onCancel() {
    if (profile) applyProfile(profile)
  }

  async function onDisplayLogoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !canUpdate) return
    try {
      const updated = await uploadDisplayLogoMutation.mutateAsync(file)
      applyProfile(updated)
      toastSuccess('Uploaded', 'Display logo updated.')
    } catch (err) {
      toastApiError(err, 'Upload failed')
    }
  }

  async function onCompanyLogoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !canUpdate) return
    try {
      const updated = await uploadCompanyLogoMutation.mutateAsync(file)
      applyProfile(updated)
      toastSuccess('Uploaded', 'Company logo updated.')
    } catch (err) {
      toastApiError(err, 'Upload failed')
    }
  }

  async function onRemoveDisplayLogo() {
    if (!canUpdate) return
    try {
      const updated = await clearDisplayLogoMutation.mutateAsync()
      applyProfile(updated)
      toastSuccess('Removed', 'Display logo removed.')
    } catch (err) {
      toastApiError(err, 'Remove failed')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="company-details-settings">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <FieldRow label="Group Name">
            <Input
              value={draft.groupName}
              onChange={e => setField('groupName', e.target.value)}
              disabled={!canUpdate}
            />
          </FieldRow>
          <FieldRow label="Company Name" required>
            <Input
              value={draft.companyName}
              onChange={e => setField('companyName', e.target.value)}
              disabled={!canUpdate}
            />
          </FieldRow>
          <FieldRow label="ODS / CS Code" required hint="Organisation Data Service code">
            <Input
              value={draft.odsCsCode}
              onChange={e => setField('odsCsCode', e.target.value)}
              disabled={!canUpdate}
            />
          </FieldRow>
          <FieldRow label="Display Name" required>
            <Input
              value={draft.displayName}
              onChange={e => setField('displayName', e.target.value)}
              disabled={!canUpdate}
            />
          </FieldRow>
          <FieldRow label="Display Logo">
            <div className="flex gap-2">
              <Input
                readOnly
                value={profile?.displayLogoFileName ?? ''}
                placeholder="No file"
                className="bg-muted/30"
              />
              {profile?.displayLogoUrl && (
                <img
                  src={resolveMediaUrl(profile.displayLogoUrl, profile.updatedAt) ?? ''}
                  key={`display-${profile.updatedAt}`}
                  alt=""
                  className="h-10 w-10 rounded border object-cover"
                />
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                disabled={!canUpdate || !profile?.displayLogoUrl}
                onClick={() => void onRemoveDisplayLogo()}
                title="Remove display logo"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!canUpdate}
                onClick={() => displayLogoRef.current?.click()}
                title="Upload display logo"
              >
                <Camera className="h-4 w-4" />
              </Button>
              <input
                ref={displayLogoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={e => void onDisplayLogoPick(e)}
              />
            </div>
          </FieldRow>
          <FieldRow label="Company Logo">
            <div className="flex gap-2">
              <Input
                readOnly
                value={profile?.companyLogoFileName ?? ''}
                placeholder="Upload logo"
                className="bg-muted/30"
              />
              {profile?.companyLogoUrl && (
                <img
                  src={resolveMediaUrl(profile.companyLogoUrl, profile.updatedAt) ?? ''}
                  key={`company-${profile.updatedAt}`}
                  alt=""
                  className="h-10 w-10 rounded border object-cover"
                />
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                disabled={!canUpdate}
                onClick={() => companyLogoRef.current?.click()}
                title="Upload company logo"
              >
                <Camera className="h-4 w-4" />
              </Button>
              <input
                ref={companyLogoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={e => void onCompanyLogoPick(e)}
              />
            </div>
          </FieldRow>
          <FieldRow label="Company Website">
            <Input
              value={draft.companyWebsite}
              onChange={e => setField('companyWebsite', e.target.value)}
              disabled={!canUpdate}
            />
          </FieldRow>
          <FieldRow label="Contact Name" required>
            <Input
              value={draft.contactName}
              onChange={e => setField('contactName', e.target.value)}
              disabled={!canUpdate}
            />
          </FieldRow>
          <FieldRow label="Email" required>
            <Input
              type="email"
              value={draft.email}
              onChange={e => setField('email', e.target.value)}
              disabled={!canUpdate}
            />
          </FieldRow>
          <FieldRow label="Phone Number" required>
            <Input
              value={draft.phoneNumber}
              onChange={e => setField('phoneNumber', e.target.value)}
              disabled={!canUpdate}
            />
          </FieldRow>
        </div>

        <div className="space-y-4">
          <FieldRow label="VAT Number">
            <Input
              value={draft.vatNumber}
              onChange={e => setField('vatNumber', e.target.value)}
              disabled={!canUpdate}
            />
          </FieldRow>
          <FieldRow label="Bank Name">
            <Input
              value={draft.bankName}
              onChange={e => setField('bankName', e.target.value)}
              disabled={!canUpdate}
            />
          </FieldRow>
          <FieldRow label="Bank Sort Code">
            <Input
              value={draft.bankSortCode}
              onChange={e => setField('bankSortCode', e.target.value)}
              disabled={!canUpdate}
            />
          </FieldRow>
          <FieldRow label="Bank Account Number">
            <Input
              value={draft.bankAccountNumber}
              onChange={e => setField('bankAccountNumber', e.target.value)}
              disabled={!canUpdate}
            />
          </FieldRow>
          <FieldRow label="Number of Carers">
            <div className="space-y-1">
              <p className="text-lg font-semibold tabular-nums">{profile?.numberOfCarers ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Active employees in the system</p>
            </div>
          </FieldRow>
          <FieldRow label="Number of Service Users">
            <div className="space-y-1">
              <p className="text-lg font-semibold tabular-nums">{profile?.numberOfServiceUsers ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Active service users in the system</p>
            </div>
          </FieldRow>
          <FieldRow label="Active Modules">
            <CompanyActiveModulesField
              catalog={profile?.moduleCatalog ?? []}
              value={draft.activeModules}
              onChange={modules => setField('activeModules', modules)}
              disabled={!canUpdate}
            />
          </FieldRow>
        </div>
      </div>

      {legal ? (
        <section className="space-y-4 border-t border-border pt-6" data-testid="company-legal-section">
          <div>
            <h3 className="text-base font-semibold text-foreground">Legal &amp; regulatory</h3>
            <p className="text-sm text-muted-foreground">
              Companies House and CQC registration details for the organisation.
            </p>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <FieldRow label="Legal Name" hint="Registered name at Companies House">
                <Input
                  value={legal.legalName}
                  onChange={e => setLegalField('legalName', e.target.value)}
                  disabled={!canUpdate}
                  data-testid="company-legal-legalName"
                />
              </FieldRow>
              <FieldRow label="Companies House Number">
                <Input
                  value={legal.companyNumber}
                  onChange={e => setLegalField('companyNumber', e.target.value)}
                  disabled={!canUpdate}
                  data-testid="company-legal-companyNumber"
                />
              </FieldRow>
              <FieldRow label="CQC Provider ID" hint="e.g. 1-101656545">
                <Input
                  value={legal.cqcProviderId}
                  onChange={e => setLegalField('cqcProviderId', e.target.value)}
                  disabled={!canUpdate}
                  data-testid="company-legal-cqcProviderId"
                />
              </FieldRow>
              <FieldRow label="Company Status" hint="As published by Companies House, e.g. Active">
                <Input
                  value={legal.companyStatus}
                  onChange={e => setLegalField('companyStatus', e.target.value)}
                  disabled={!canUpdate}
                  data-testid="company-legal-companyStatus"
                />
              </FieldRow>
              <FieldRow label="Company Type">
                <Input
                  value={legal.companyType}
                  onChange={e => setLegalField('companyType', e.target.value)}
                  disabled={!canUpdate}
                  data-testid="company-legal-companyType"
                />
              </FieldRow>
              <FieldRow label="Incorporation Date">
                <Input
                  type="date"
                  value={legal.incorporationDate}
                  onChange={e => setLegalField('incorporationDate', e.target.value)}
                  disabled={!canUpdate}
                  data-testid="company-legal-incorporationDate"
                />
              </FieldRow>
              <FieldRow label="SIC Codes" hint="UK SIC 2007 codes, separated by commas">
                <Input
                  value={legal.sicCodes}
                  onChange={e => setLegalField('sicCodes', e.target.value)}
                  disabled={!canUpdate}
                  data-testid="company-legal-sicCodes"
                />
              </FieldRow>
            </div>
            <div className="space-y-4">
              <FieldRow label="Registered Address Line 1">
                <Input
                  value={legal.registeredAddressLine1}
                  onChange={e => setLegalField('registeredAddressLine1', e.target.value)}
                  disabled={!canUpdate}
                  data-testid="company-legal-registeredAddressLine1"
                />
              </FieldRow>
              <FieldRow label="Registered Address Line 2">
                <Input
                  value={legal.registeredAddressLine2}
                  onChange={e => setLegalField('registeredAddressLine2', e.target.value)}
                  disabled={!canUpdate}
                  data-testid="company-legal-registeredAddressLine2"
                />
              </FieldRow>
              <FieldRow label="Registered Town">
                <Input
                  value={legal.registeredTown}
                  onChange={e => setLegalField('registeredTown', e.target.value)}
                  disabled={!canUpdate}
                  data-testid="company-legal-registeredTown"
                />
              </FieldRow>
              <FieldRow label="Registered County">
                <Input
                  value={legal.registeredCounty}
                  onChange={e => setLegalField('registeredCounty', e.target.value)}
                  disabled={!canUpdate}
                  data-testid="company-legal-registeredCounty"
                />
              </FieldRow>
              <FieldRow label="Registered Postcode">
                <Input
                  value={legal.registeredPostcode}
                  onChange={e => setLegalField('registeredPostcode', e.target.value)}
                  disabled={!canUpdate}
                  data-testid="company-legal-registeredPostcode"
                />
              </FieldRow>
              <FieldRow label="Registered Country">
                <Input
                  value={legal.registeredCountry}
                  onChange={e => setLegalField('registeredCountry', e.target.value)}
                  disabled={!canUpdate}
                  data-testid="company-legal-registeredCountry"
                />
              </FieldRow>
              <FieldRow label="Country Code" hint="ISO 3166-1 alpha-2, e.g. GB">
                <Input
                  value={legal.countryCode}
                  onChange={e => setLegalField('countryCode', e.target.value)}
                  disabled={!canUpdate}
                  data-testid="company-legal-countryCode"
                />
              </FieldRow>
              <FieldRow label="Currency" hint="ISO 4217, e.g. GBP">
                <Input
                  value={legal.currency}
                  onChange={e => setLegalField('currency', e.target.value)}
                  disabled={!canUpdate}
                  data-testid="company-legal-currency"
                />
              </FieldRow>
              <FieldRow label="Locale" hint="e.g. en-GB">
                <Input
                  value={legal.locale}
                  onChange={e => setLegalField('locale', e.target.value)}
                  disabled={!canUpdate}
                  data-testid="company-legal-locale"
                />
              </FieldRow>
            </div>
          </div>
        </section>
      ) : null}

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" onClick={() => void onSave()} disabled={!canUpdate || saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save
        </Button>
      </div>
    </div>
  )
}
