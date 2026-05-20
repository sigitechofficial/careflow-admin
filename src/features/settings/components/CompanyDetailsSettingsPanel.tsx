import * as React from 'react'
import { Camera, Info, Loader2, Trash2 } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import { resolveMediaUrl } from '@/lib/media-url'
import { toastApiError, toastSuccess } from '@/lib/toast'
import {
  clearDisplayLogo,
  fetchCompanyProfile,
  updateCompanyProfile,
  uploadCompanyLogo,
  uploadDisplayLogo,
  type CompanyProfile,
} from '@/lib/company-settings-api'
import { CompanyActiveModulesField } from '@/features/settings/components/CompanyActiveModulesField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { useCompanyStore } from '@/store/company.store'

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
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [profile, setProfile] = React.useState<CompanyProfile | null>(null)

  const displayLogoRef = React.useRef<HTMLInputElement>(null)
  const companyLogoRef = React.useRef<HTMLInputElement>(null)

  const [draft, setDraft] = React.useState({
    groupName: '',
    companyName: '',
    odsCsCode: '',
    displayName: '',
    companyWebsite: '',
    contactName: '',
    email: '',
    phoneNumber: '',
    companyNumber: '',
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
      companyNumber: p.companyNumber ?? '',
      vatNumber: p.vatNumber ?? '',
      bankName: p.bankName ?? '',
      bankSortCode: p.bankSortCode ?? '',
      bankAccountNumber: p.bankAccountNumber ?? '',
      activeModules: [...p.activeModules],
    })
  }, [syncCompanyStore])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const p = await fetchCompanyProfile()
        if (!cancelled) applyProfile(p)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Could not load company details.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [applyProfile])

  function setField<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft(prev => ({ ...prev, [key]: value }))
  }

  async function onSave() {
    if (!canUpdate) return
    setSaving(true)
    setError(null)
    try {
      const updated = await updateCompanyProfile({
        groupName: draft.groupName.trim() || undefined,
        companyName: draft.companyName.trim(),
        odsCsCode: draft.odsCsCode.trim(),
        displayName: draft.displayName.trim(),
        companyWebsite: draft.companyWebsite.trim() || undefined,
        contactName: draft.contactName.trim(),
        email: draft.email.trim(),
        phoneNumber: draft.phoneNumber.trim(),
        companyNumber: draft.companyNumber.trim() || undefined,
        vatNumber: draft.vatNumber.trim() || undefined,
        bankName: draft.bankName.trim() || undefined,
        bankSortCode: draft.bankSortCode.trim() || undefined,
        bankAccountNumber: draft.bankAccountNumber.trim() || undefined,
        activeModules: draft.activeModules,
      })
      applyProfile(updated)
      toastSuccess('Saved', 'Company details updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    } finally {
      setSaving(false)
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
      const updated = await uploadDisplayLogo(file)
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
      const updated = await uploadCompanyLogo(file)
      applyProfile(updated)
      toastSuccess('Uploaded', 'Company logo updated.')
    } catch (err) {
      toastApiError(err, 'Upload failed')
    }
  }

  async function onRemoveDisplayLogo() {
    if (!canUpdate) return
    try {
      const updated = await clearDisplayLogo()
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
          <FieldRow label="Company Number">
            <Input
              value={draft.companyNumber}
              onChange={e => setField('companyNumber', e.target.value)}
              disabled={!canUpdate}
            />
          </FieldRow>
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
