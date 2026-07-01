import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { toastApiError, toastError, toastSuccess } from '@/shared/lib/toast'
import {
  useCreatePortalContact,
  usePortalLookups,
} from '@/features/service-user-portal/hooks/usePortalAboutMe'
import type { CreatePortalContactPayload } from '@/features/service-user-portal/api/portal.api'
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

function emptyForm(): ContactFormState {
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
  }
}

function formToPayload(f: ContactFormState): CreatePortalContactPayload {
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
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PortalAddContactDialog({ open, onOpenChange }: Props) {
  const { data: lookups } = usePortalLookups()
  const createMutation = useCreatePortalContact()
  const [form, setForm] = React.useState<ContactFormState>(emptyForm)

  React.useEffect(() => {
    if (!open) return
    setForm(emptyForm())
  }, [open])

  const relationshipTypes = lookups?.relationshipTypes ?? []

  async function submit() {
    if (!form.firstName.trim()) {
      toastError('Cannot save contact', 'First name is required.')
      return
    }
    try {
      await createMutation.mutateAsync(formToPayload(form))
      onOpenChange(false)
      toastSuccess('Contact added', 'The contact has been saved to your record.')
    } catch (err) {
      toastApiError(err, 'Save failed')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add contact</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-muted-foreground">First name *</span>
              <Input
                value={form.firstName}
                onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-muted-foreground">Last name</span>
              <Input
                value={form.lastName}
                onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="font-medium text-muted-foreground">Relationship</span>
              <Select
                value={form.relationshipTypeId || '__none__'}
                onValueChange={v =>
                  setForm(p => ({ ...p, relationshipTypeId: v === '__none__' ? '' : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {relationshipTypes.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-muted-foreground">Phone</span>
              <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-muted-foreground">Mobile</span>
              <Input value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="font-medium text-muted-foreground">Email</span>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="font-medium text-muted-foreground">Address</span>
              <Input
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="font-medium text-muted-foreground">Notes</span>
              <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox
                checked={form.isPrimary}
                onCheckedChange={v => setForm(p => ({ ...p, isPrimary: v === true }))}
              />
              Primary contact
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox
                checked={form.isEmergencyContact}
                onCheckedChange={v => setForm(p => ({ ...p, isEmergencyContact: v === true }))}
              />
              Emergency contact
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox
                checked={form.canReceiveUpdates}
                onCheckedChange={v => setForm(p => ({ ...p, canReceiveUpdates: v === true }))}
              />
              Can receive care updates
            </label>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
