import * as React from 'react'
import { MapPin, Pencil, PlusCircle, Trash2 } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { AddressPlacesField, type AddressPlacesValue } from '@/shared/ui/address-places-field'
import { cn } from '@/shared/lib/utils'

/**
 * Extra contact entries beyond the first phone / email / other method / address.
 * The first entry keeps using the core ServiceUser columns and profile references; extras are
 * JSON in their own reference types (kept out of SU_PROFILE_REF so other saves never drop them).
 */
export const SU_CONTACT_EXTRA_REF = {
  phones: 'SU_CONTACT_EXTRA_PHONES_V1',
  emails: 'SU_CONTACT_EXTRA_EMAILS_V1',
  otherMethods: 'SU_CONTACT_EXTRA_OTHER_V1',
  addresses: 'SU_CONTACT_EXTRA_ADDRESSES_V1',
} as const

const EXTRA_REF_TYPES = new Set<string>(Object.values(SU_CONTACT_EXTRA_REF))

export const CONTACT_PHONE_TYPE_OPTIONS = ['Mobile', 'Home', 'Work', 'Other']
export const CONTACT_EMAIL_TYPE_OPTIONS = ['Personal', 'Work', 'Shared', 'Other']

/** `preference` is free text (e.g. 1, 2 or a short note). */
export type ContactPhoneRow = { number: string; type: string; preference: string }
export type ContactEmailRow = { email: string; type: string; preference: string }
export type ContactAddress = AddressPlacesValue

export const emptyPhoneRow = (): ContactPhoneRow => ({ number: '', type: '', preference: '' })
export const emptyEmailRow = (): ContactEmailRow => ({ email: '', type: '', preference: '' })

/** Older records stored the preference as a tick ('true' / true); show that as "1". */
export function preferenceText(raw: unknown): string {
  if (raw === true || raw === 'true') return '1'
  if (raw === false || raw == null) return ''
  return String(raw)
}
export const emptyContactAddress = (): ContactAddress => ({
  addressLine1: '',
  addressLine2: '',
  town: '',
  county: '',
  country: '',
  postcode: '',
  latitude: '',
  longitude: '',
})

type RefRow = { id?: string; referenceType: string; referenceValue: string; notes?: string | null }

function parseJsonArray<T>(raw: string | undefined): T[] {
  if (!raw?.trim()) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

export function readContactExtras(references: RefRow[] | undefined) {
  const value = (type: string) => references?.find((r) => r.referenceType === type)?.referenceValue
  return {
    phones: parseJsonArray<ContactPhoneRow>(value(SU_CONTACT_EXTRA_REF.phones)).map((r) => ({
      number: String(r.number ?? ''),
      type: String(r.type ?? ''),
      preference: preferenceText(r.preference),
    })),
    emails: parseJsonArray<ContactEmailRow>(value(SU_CONTACT_EXTRA_REF.emails)).map((r) => ({
      email: String(r.email ?? ''),
      type: String(r.type ?? ''),
      preference: preferenceText(r.preference),
    })),
    otherMethods: parseJsonArray<string>(value(SU_CONTACT_EXTRA_REF.otherMethods)).map(String),
    addresses: parseJsonArray<Partial<ContactAddress>>(value(SU_CONTACT_EXTRA_REF.addresses)).map((a) => ({
      ...emptyContactAddress(),
      ...Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v == null ? '' : String(v)])),
    })),
  }
}

export const hasAddressText = (a: ContactAddress) =>
  [a.addressLine1, a.addressLine2, a.town, a.county, a.country, a.postcode].some((v) => v.trim())

/**
 * Replace the extra-contact references in `existing` with the given entries (blank ones dropped).
 * Other references are returned untouched.
 */
export function withContactExtraReferences<T extends RefRow>(
  existing: T[],
  extras: {
    phones: ContactPhoneRow[]
    emails: ContactEmailRow[]
    otherMethods: string[]
    addresses: ContactAddress[]
  },
): Array<T | { id?: string; referenceType: string; referenceValue: string }> {
  const prev = (type: string) => existing.find((r) => r.referenceType === type)
  const out: Array<T | { id?: string; referenceType: string; referenceValue: string }> = existing.filter(
    (r) => !EXTRA_REF_TYPES.has(r.referenceType),
  )
  const put = (type: string, list: unknown[]) => {
    if (!list.length) return
    const id = prev(type)?.id
    out.push({ ...(id ? { id } : {}), referenceType: type, referenceValue: JSON.stringify(list) })
  }
  put(
    SU_CONTACT_EXTRA_REF.phones,
    extras.phones.filter((r) => r.number.trim()).map((r) => ({ ...r, number: r.number.trim() })),
  )
  put(
    SU_CONTACT_EXTRA_REF.emails,
    extras.emails.filter((r) => r.email.trim()).map((r) => ({ ...r, email: r.email.trim() })),
  )
  put(
    SU_CONTACT_EXTRA_REF.otherMethods,
    extras.otherMethods.map((v) => v.trim()).filter(Boolean),
  )
  put(SU_CONTACT_EXTRA_REF.addresses, extras.addresses.filter(hasAddressText))
  return out
}

/** First "Mobile" phone row, used for the core mobile column. */
export function firstMobileNumber(rows: ContactPhoneRow[]): string {
  return rows.find((r) => r.type === 'Mobile' && r.number.trim())?.number.trim() ?? ''
}

export function formatContactAddress(a: ContactAddress): string {
  return [a.addressLine1, a.addressLine2, a.town, a.postcode, a.county, a.country, a.latitude, a.longitude]
    .map((v) => v.trim())
    .filter(Boolean)
    .join(', ')
}

function mapsHref(a: ContactAddress): string {
  const lat = a.latitude.trim()
  const lng = a.longitude.trim()
  const q = lat && lng ? `${lat},${lng}` : formatContactAddress(a)
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

/* ------------------------------------------------------------------ */

const ROW_LABEL = 'w-36 shrink-0 text-sm font-semibold text-foreground'
const INLINE_LABEL = 'w-28 shrink-0 text-sm text-muted-foreground'

function IconButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn('inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted', className)}
    >
      {children}
    </button>
  )
}

function RowActions({
  canDelete,
  canAdd,
  onDelete,
  onAdd,
  what,
}: {
  canDelete: boolean
  canAdd: boolean
  onDelete: () => void
  onAdd: () => void
  what: string
}) {
  return (
    <div className="flex w-20 shrink-0 items-center justify-end gap-1">
      {canDelete ? (
        <IconButton label={`Remove ${what}`} onClick={onDelete} className="text-red-400">
          <Trash2 className="h-4 w-4" />
        </IconButton>
      ) : null}
      {canAdd ? (
        <IconButton label={`Add ${what}`} onClick={onAdd} className="text-primary">
          <PlusCircle className="h-5 w-5" />
        </IconButton>
      ) : null}
    </div>
  )
}

function TypeSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder: string
}) {
  const opts = value && !options.includes(value) ? [value, ...options] : options
  return (
    <Select value={value || '__none__'} onValueChange={(v) => onChange(v === '__none__' ? '' : v)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">{placeholder}</SelectItem>
        {opts.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function PreferenceBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
      Preference
      <Input className="w-20" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Preference" />
    </label>
  )
}

export function ContactPhoneRows({
  rows,
  onChange,
}: {
  rows: ContactPhoneRow[]
  onChange: (rows: ContactPhoneRow[]) => void
}) {
  const list = rows.length ? rows : [emptyPhoneRow()]
  const patch = (i: number, p: Partial<ContactPhoneRow>) =>
    onChange(list.map((r, idx) => (idx === i ? { ...r, ...p } : r)))
  return (
    <div className="space-y-3">
      {list.map((row, i) => (
        <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className={ROW_LABEL}>Phone Number</span>
          <Input
            className="min-w-[12rem] flex-1"
            value={row.number}
            onChange={(e) => patch(i, { number: e.target.value })}
            data-testid={i === 0 ? 'service-user-phone' : undefined}
          />
          <div className="flex items-center gap-3">
            <span className={INLINE_LABEL}>Phone Type</span>
            <div className="w-56">
              <TypeSelect
                value={row.type}
                onChange={(type) => patch(i, { type })}
                options={CONTACT_PHONE_TYPE_OPTIONS}
                placeholder="Please select phone type."
              />
            </div>
          </div>
          <PreferenceBox value={row.preference} onChange={(preference) => patch(i, { preference })} />
          <RowActions
            what="phone number"
            canDelete={i > 0}
            canAdd={i === list.length - 1}
            onDelete={() => onChange(list.filter((_, idx) => idx !== i))}
            onAdd={() => onChange([...list, emptyPhoneRow()])}
          />
        </div>
      ))}
    </div>
  )
}

export function ContactEmailRows({
  rows,
  onChange,
}: {
  rows: ContactEmailRow[]
  onChange: (rows: ContactEmailRow[]) => void
}) {
  const list = rows.length ? rows : [emptyEmailRow()]
  const patch = (i: number, p: Partial<ContactEmailRow>) =>
    onChange(list.map((r, idx) => (idx === i ? { ...r, ...p } : r)))
  return (
    <div className="space-y-3">
      {list.map((row, i) => (
        <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className={ROW_LABEL}>Email</span>
          <Input
            className="min-w-[12rem] flex-1"
            type="email"
            value={row.email}
            onChange={(e) => patch(i, { email: e.target.value })}
            data-testid={i === 0 ? 'service-user-email' : undefined}
          />
          <div className="flex items-center gap-3">
            <span className={INLINE_LABEL}>Email Type</span>
            <div className="w-56">
              <TypeSelect
                value={row.type}
                onChange={(type) => patch(i, { type })}
                options={CONTACT_EMAIL_TYPE_OPTIONS}
                placeholder="Please select email type."
              />
            </div>
          </div>
          <PreferenceBox value={row.preference} onChange={(preference) => patch(i, { preference })} />
          <RowActions
            what="email"
            canDelete={i > 0}
            canAdd={i === list.length - 1}
            onDelete={() => onChange(list.filter((_, idx) => idx !== i))}
            onAdd={() => onChange([...list, emptyEmailRow()])}
          />
        </div>
      ))}
    </div>
  )
}

export function ContactOtherMethodRows({
  rows,
  onChange,
}: {
  rows: string[]
  onChange: (rows: string[]) => void
}) {
  const list = rows.length ? rows : ['']
  return (
    <div className="space-y-3">
      {list.map((row, i) => (
        <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className={ROW_LABEL}>Other Contact Method</span>
          <Input
            className="min-w-[12rem] max-w-xl flex-1"
            value={row}
            onChange={(e) => onChange(list.map((r, idx) => (idx === i ? e.target.value : r)))}
            placeholder="e.g. WhatsApp, relay service, via family member"
          />
          <RowActions
            what="contact method"
            canDelete={i > 0}
            canAdd={i === list.length - 1}
            onDelete={() => onChange(list.filter((_, idx) => idx !== i))}
            onAdd={() => onChange([...list, ''])}
          />
        </div>
      ))}
    </div>
  )
}

function AddressSummary({
  address,
  onEdit,
  onDelete,
  onAdd,
  editHint,
}: {
  address: ContactAddress
  onEdit?: () => void
  onDelete?: () => void
  onAdd?: () => void
  editHint?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="min-w-0 flex-1 text-sm text-foreground">{formatContactAddress(address)}</p>
      <div className="flex items-center gap-1">
        <a
          href={mapsHref(address)}
          target="_blank"
          rel="noreferrer"
          aria-label="Open in maps"
          title="Open in maps"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-emerald-500 hover:bg-muted"
        >
          <MapPin className="h-4 w-4" />
        </a>
        {onEdit ? (
          <IconButton label="Edit address" onClick={onEdit} className="text-foreground">
            <Pencil className="h-4 w-4" />
          </IconButton>
        ) : null}
        {onDelete ? (
          <IconButton label="Remove address" onClick={onDelete} className="text-red-400">
            <Trash2 className="h-4 w-4" />
          </IconButton>
        ) : null}
        {onAdd ? (
          <IconButton label="Add address" onClick={onAdd} className="text-primary">
            <PlusCircle className="h-5 w-5" />
          </IconButton>
        ) : null}
      </div>
      {editHint ? <p className="w-full text-xs text-muted-foreground">{editHint}</p> : null}
    </div>
  )
}

/**
 * Address row: main address (editable here, or read-only with a hint) followed by extra addresses.
 * Only one address editor is open at a time.
 */
export function ContactAddressList({
  primary,
  onPrimaryChange,
  onPrimaryClear,
  primaryReadOnlyHint,
  extras,
  onExtrasChange,
  required,
}: {
  primary: ContactAddress
  /** Omit to show the main address read-only (edited elsewhere). */
  onPrimaryChange?: (patch: Partial<ContactAddress>) => void
  onPrimaryClear?: () => void
  primaryReadOnlyHint?: string
  extras: ContactAddress[]
  onExtrasChange: (next: ContactAddress[]) => void
  required?: boolean
}) {
  const primaryEditable = Boolean(onPrimaryChange)
  // 'primary' | extra index | null
  const [editing, setEditing] = React.useState<'primary' | number | null>(() =>
    primaryEditable && !hasAddressText(primary) ? 'primary' : null,
  )

  const addExtra = () => {
    onExtrasChange([...extras, emptyContactAddress()])
    setEditing(extras.length)
  }

  const editor = (value: ContactAddress, onChange: (patch: Partial<ContactAddress>) => void) => (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <AddressPlacesField postcodeLabel="Postcode" value={value} onChange={onChange} />
      <div className="flex justify-end">
        <Button type="button" size="sm" variant="outline" onClick={() => setEditing(null)}>
          Done
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:gap-3">
      <span className={cn(ROW_LABEL, 'lg:pt-1.5')}>
        Address{required ? <span className="text-destructive"> *</span> : null}
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        {editing === 'primary' && onPrimaryChange ? (
          editor(primary, onPrimaryChange)
        ) : hasAddressText(primary) ? (
          <AddressSummary
            address={primary}
            onEdit={primaryEditable ? () => setEditing('primary') : undefined}
            onDelete={onPrimaryClear}
            onAdd={extras.length === 0 ? addExtra : undefined}
            editHint={primaryReadOnlyHint}
          />
        ) : (
          <div className="flex items-center gap-2">
            <p className="flex-1 text-sm text-muted-foreground">
              {primaryReadOnlyHint ?? 'No address yet.'}
            </p>
            {primaryEditable ? (
              <IconButton label="Edit address" onClick={() => setEditing('primary')}>
                <Pencil className="h-4 w-4" />
              </IconButton>
            ) : null}
            {extras.length === 0 ? (
              <IconButton label="Add address" onClick={addExtra} className="text-primary">
                <PlusCircle className="h-5 w-5" />
              </IconButton>
            ) : null}
          </div>
        )}

        {extras.map((address, i) =>
          editing === i ? (
            <div key={i}>
              {editor(address, (patch) =>
                onExtrasChange(extras.map((a, idx) => (idx === i ? { ...a, ...patch } : a))),
              )}
            </div>
          ) : (
            <AddressSummary
              key={i}
              address={hasAddressText(address) ? address : { ...address, addressLine1: '(empty address)' }}
              onEdit={() => setEditing(i)}
              onDelete={() => {
                onExtrasChange(extras.filter((_, idx) => idx !== i))
                setEditing(null)
              }}
              onAdd={i === extras.length - 1 ? addExtra : undefined}
            />
          ),
        )}
      </div>
    </div>
  )
}
