import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { serviceUserKeys } from '@/features/service-users/keys'
import {
  createEnterpriseFunder,
  updateEnterpriseFunder,
  type EnterpriseFunderRow,
  type UpdateEnterpriseFunderBody,
} from '@/features/service-users/api/service-users.api'
import { useEnterpriseFundingTypes } from '@/features/service-users/hooks/useServiceUserTabs'
import { ChargeCardPicker } from '@/features/billing/components/ChargeCardPicker'

type FunderForm = {
  name: string
  fundingTypeId: string
  contactName: string
  email: string
  phone: string
  addressLine1: string
  addressLine2: string
  town: string
  county: string
  postcode: string
  paymentTerms: string
  notes: string
  /** The funder's standard rates: used for anyone it funds unless their funding line has its own. */
  defaultChargeCardId: string
}

const EMPTY: FunderForm = {
  name: '',
  fundingTypeId: '',
  contactName: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  town: '',
  county: '',
  postcode: '',
  paymentTerms: '',
  notes: '',
  defaultChargeCardId: '',
}

function toForm(r: EnterpriseFunderRow): FunderForm {
  return {
    name: r.name,
    fundingTypeId: r.fundingType?.id ?? r.fundingTypeId ?? '',
    contactName: r.contactName ?? '',
    email: r.email ?? '',
    phone: r.phone ?? '',
    addressLine1: r.addressLine1 ?? '',
    addressLine2: r.addressLine2 ?? '',
    town: r.town ?? '',
    county: r.county ?? '',
    postcode: r.postcode ?? '',
    paymentTerms: r.paymentTerms ?? '',
    notes: r.notes ?? '',
    defaultChargeCardId: r.defaultChargeCardId ?? '',
  }
}

/** Blank text is sent as null on edit (clears it) and left out on add. */
function toBody(f: FunderForm, mode: 'create' | 'update'): UpdateEnterpriseFunderBody & { name: string } {
  const v = (s: string) => (s.trim() ? s.trim() : mode === 'update' ? null : undefined)
  return {
    name: f.name.trim(),
    fundingTypeId: f.fundingTypeId || (mode === 'update' ? null : undefined),
    contactName: v(f.contactName),
    email: v(f.email),
    phone: v(f.phone),
    addressLine1: v(f.addressLine1),
    addressLine2: v(f.addressLine2),
    town: v(f.town),
    county: v(f.county),
    postcode: v(f.postcode),
    paymentTerms: v(f.paymentTerms),
    notes: v(f.notes),
    defaultChargeCardId: f.defaultChargeCardId || (mode === 'update' ? null : undefined),
  }
}

const SELECT_CLS = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm'

/**
 * Add or edit a funder (the organisation that pays, or a general entry such as self-funded). Used from
 * Settings → Funders and from the Funding tab, so a missing funder can be added without leaving the page.
 */
export function FunderFormDialog({
  open,
  onOpenChange,
  funder,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The funder to edit; leave out to add a new one. */
  funder?: EnterpriseFunderRow | null
  onSaved?: (funder: EnterpriseFunderRow) => void
}) {
  const qc = useQueryClient()
  const types = useEnterpriseFundingTypes().data ?? []
  const [form, setForm] = React.useState<FunderForm>(EMPTY)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setForm(funder ? toForm(funder) : EMPTY)
      setError(null)
    }
  }, [open, funder])

  const saveMut = useMutation({
    mutationFn: async () =>
      funder ? updateEnterpriseFunder(funder.id, toBody(form, 'update')) : createEnterpriseFunder(toBody(form, 'create')),
    onSuccess: async saved => {
      await qc.invalidateQueries({ queryKey: serviceUserKeys.funders() })
      onSaved?.(saved)
      onOpenChange(false)
    },
    onError: e => setError(e instanceof ApiError ? e.message : 'Could not save the funder.'),
  })

  const set = (k: keyof FunderForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const field = (label: string, k: keyof FunderForm, placeholder?: string, type = 'text') => (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input type={type} value={form[k]} onChange={set(k)} placeholder={placeholder} aria-label={label} />
    </div>
  )

  return (
    <Dialog
      open={open}
      onOpenChange={o => {
        if (!saveMut.isPending) onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-2xl" data-testid="funder-dialog">
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={e => {
            e.preventDefault()
            e.stopPropagation()
            setError(null)
            if (!form.name.trim()) return setError('Enter the funder name.')
            if (!form.fundingTypeId) return setError('Choose the funder type.')
            saveMut.mutate()
          }}
        >
          <DialogHeader>
            <DialogTitle>{funder ? 'Edit funder' : 'Add funder'}</DialogTitle>
            <DialogDescription>
              The organisation that pays, or a general entry such as self-funded. Its type decides which funding
              routes can be chosen with it. Invoices go to its billing contact and address.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="grid gap-3 md:grid-cols-2">
              {field('Name', 'name', 'e.g. Bromley Council')}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Type</label>
                <select
                  aria-label="Funder type"
                  className={SELECT_CLS}
                  value={form.fundingTypeId}
                  onChange={set('fundingTypeId')}
                >
                  <option value="">— Choose —</option>
                  {types.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              {field('Billing contact', 'contactName')}
              {field('Email', 'email', undefined, 'email')}
              {field('Phone', 'phone')}
              {field('Payment terms', 'paymentTerms', 'e.g. Net 30')}
              {field('Address line 1', 'addressLine1')}
              {field('Address line 2', 'addressLine2')}
              {field('Town', 'town')}
              {field('County', 'county')}
              {field('Postcode', 'postcode')}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Standard rates (charge card)</label>
              <ChargeCardPicker
                label="Standard rates (charge card)"
                placeholder="— No standard rates —"
                value={form.defaultChargeCardId}
                onChange={id => setForm(f => ({ ...f, defaultChargeCardId: id }))}
                testId="funder-standard-rates"
              />
              <p className="text-xs text-muted-foreground">
                Used for everyone this funder pays for, unless a person&apos;s funding line has rates of its own.
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Notes</label>
              <textarea
                className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.notes}
                onChange={set('notes')}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saveMut.isPending} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Saving…' : funder ? 'Save changes' : 'Add funder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
