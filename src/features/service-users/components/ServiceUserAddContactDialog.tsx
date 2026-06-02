import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { useServiceUserLookups } from '@/features/service-users/hooks/useServiceUserLookups'
import { useCreateServiceUserContact } from '@/features/service-users/hooks/useServiceUserMutations'
import { serviceUserKeys } from '@/features/service-users/keys'
import type { CreateServiceUserContactPayload } from '@/features/service-users/types'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Checkbox } from '@/shared/ui/toggle-controls'

type ContactFormState = {
  firstName: string
  lastName: string
  relationshipTypeId: string
  phone: string
  mobile: string
  email: string
  address: string
  notes: string
  isPrimary: boolean
  isEmergencyContact: boolean
  canReceiveUpdates: boolean
}

function emptyForm(defaults?: Partial<ContactFormState>): ContactFormState {
  return {
    firstName: '',
    lastName: '',
    relationshipTypeId: '',
    phone: '',
    mobile: '',
    email: '',
    address: '',
    notes: '',
    isPrimary: false,
    isEmergencyContact: true,
    canReceiveUpdates: false,
    ...defaults,
  }
}

function formToPayload(f: ContactFormState): CreateServiceUserContactPayload {
  return {
    firstName: f.firstName.trim(),
    lastName: f.lastName.trim() || undefined,
    relationshipTypeId: f.relationshipTypeId.trim() || undefined,
    phone: f.phone.trim() || undefined,
    mobile: f.mobile.trim() || undefined,
    email: f.email.trim() || undefined,
    address: f.address.trim() || undefined,
    notes: f.notes.trim() || undefined,
    isPrimary: f.isPrimary,
    isEmergencyContact: f.isEmergencyContact,
    canReceiveUpdates: f.canReceiveUpdates,
  }
}

type Props = {
  serviceUserId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  defaultIsEmergencyContact?: boolean
  title?: string
}

export function ServiceUserAddContactDialog({
  serviceUserId,
  open,
  onOpenChange,
  onSuccess,
  defaultIsEmergencyContact = true,
  title = 'Add contact',
}: Props) {
  const qc = useQueryClient()
  const canCreate = useAuthStore((s) => s.can('service_users.contacts.create'))
  const lookupsQuery = useServiceUserLookups()
  const createMutation = useCreateServiceUserContact(serviceUserId)
  const [form, setForm] = React.useState<ContactFormState>(() =>
    emptyForm({ isEmergencyContact: defaultIsEmergencyContact }),
  )
  const [formError, setFormError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setForm(emptyForm({ isEmergencyContact: defaultIsEmergencyContact }))
    setFormError(null)
  }, [open, defaultIsEmergencyContact])

  const relationshipTypes = lookupsQuery.data?.relationshipTypes ?? []

  async function submit() {
    if (!canCreate) return
    setFormError(null)
    if (!form.firstName.trim()) {
      setFormError('First name is required.')
      toastError('Cannot save contact', 'First name is required.')
      return
    }
    try {
      await createMutation.mutateAsync(formToPayload(form))
      await qc.refetchQueries({ queryKey: serviceUserKeys.profile(serviceUserId) })
      onOpenChange(false)
      onSuccess?.()
      toastSuccess('Contact added', 'The contact has been saved to the service user profile.')
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Save failed')
      toastApiError(e, 'Save failed')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {!canCreate ? (
            <p className="text-sm text-muted-foreground">You do not have permission to add contacts.</p>
          ) : null}
          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">First name *</label>
              <Input
                value={form.firstName}
                disabled={!canCreate}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Last name</label>
              <Input
                value={form.lastName}
                disabled={!canCreate}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm text-muted-foreground">Relationship</label>
              <Select
                value={form.relationshipTypeId ? form.relationshipTypeId : '__none__'}
                disabled={!canCreate}
                onValueChange={(v) => setForm((p) => ({ ...p, relationshipTypeId: v === '__none__' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {relationshipTypes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Phone</label>
              <Input
                value={form.phone}
                disabled={!canCreate}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Mobile</label>
              <Input
                value={form.mobile}
                disabled={!canCreate}
                onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm text-muted-foreground">Email</label>
              <Input
                type="email"
                value={form.email}
                disabled={!canCreate}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm text-muted-foreground">Address</label>
              <Input
                value={form.address}
                disabled={!canCreate}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm text-muted-foreground">Notes / role</label>
              <Input
                value={form.notes}
                disabled={!canCreate}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox
                checked={form.isPrimary}
                disabled={!canCreate}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isPrimary: v === true }))}
              />
              Primary contact
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox
                checked={form.isEmergencyContact}
                disabled={!canCreate}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isEmergencyContact: v === true }))}
              />
              Emergency contact
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox
                checked={form.canReceiveUpdates}
                disabled={!canCreate}
                onCheckedChange={(v) => setForm((p) => ({ ...p, canReceiveUpdates: v === true }))}
              />
              Portal / can receive updates
            </label>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={!canCreate || createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
