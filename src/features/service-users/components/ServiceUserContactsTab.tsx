import * as React from 'react'
import { Loader2, Pencil, Shield, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastError, toastSuccess } from '@/shared/lib/toast'
import type {
  CreateServiceUserContactPayload,
  UpdateServiceUserContactPayload,
  ServiceUserDetail,
  ServiceUserDetailContact,
  ServiceUserLookupsBundle,
} from '@/features/service-users/types'
import {
  useCreateServiceUserContact,
  useDeleteServiceUserContact,
  useUpdateServiceUserContact,
} from '@/features/service-users/hooks/useServiceUserMutations'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/dialog'
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

const PROF_CODES = new Set(['SOCIAL_WORKER', 'OTHER'])

function splitContacts(contacts: ServiceUserDetailContact[]) {
  const gp = contacts.filter((c) => c.relationshipType?.code === 'GP')
  const professional = contacts.filter((c) => PROF_CODES.has(c.relationshipType?.code ?? ''))
  const gpIds = new Set(gp.map((c) => c.id))
  const profIds = new Set(professional.map((c) => c.id))
  const personal = contacts.filter((c) => !gpIds.has(c.id) && !profIds.has(c.id))
  return { gp, professional, personal }
}

function contactName(c: ServiceUserDetailContact): string {
  return [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || '—'
}

function contactPhone(c: ServiceUserDetailContact): string {
  return c.phone?.trim() || '—'
}

function contactOtherPhone(c: ServiceUserDetailContact): string {
  if (c.phone?.trim() && c.mobile?.trim()) return c.mobile.trim()
  return c.mobile?.trim() || '—'
}

function relationshipIdByCode(rows: ServiceUserLookupsBundle['relationshipTypes'], code: string): string {
  return rows.find((r) => r.code === code)?.id ?? ''
}

type ContactSectionKind = 'personal' | 'gp' | 'professional'

export type ContactFormState = {
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

function emptyForm(defaultRelationshipId: string): ContactFormState {
  return {
    firstName: '',
    lastName: '',
    relationshipTypeId: defaultRelationshipId,
    phone: '',
    mobile: '',
    email: '',
    address: '',
    notes: '',
    isPrimary: false,
    isEmergencyContact: false,
    canReceiveUpdates: false,
  }
}

function contactToForm(c: ServiceUserDetailContact): ContactFormState {
  return {
    firstName: c.firstName,
    lastName: c.lastName ?? '',
    relationshipTypeId: c.relationshipType?.id ?? '',
    phone: c.phone ?? '',
    mobile: c.mobile ?? '',
    email: c.email ?? '',
    address: c.address ?? '',
    notes: c.notes ?? '',
    isPrimary: c.isPrimary,
    isEmergencyContact: c.isEmergencyContact,
    canReceiveUpdates: c.canReceiveUpdates,
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
    // canReceiveUpdates is not sent: it follows Profile → Privacy.
  }
}

/**
 * Editing: a field emptied in the form is sent as null so it is cleared. Left out, the API keeps the
 * old value, so a removed email or mobile came back when the contact was opened again.
 */
export function formToUpdatePayload(f: ContactFormState): UpdateServiceUserContactPayload {
  const cleared = (v: string) => v.trim() || null
  return {
    firstName: f.firstName.trim(),
    lastName: cleared(f.lastName),
    phone: cleared(f.phone),
    mobile: cleared(f.mobile),
    email: cleared(f.email),
    address: cleared(f.address),
    notes: cleared(f.notes),
    // Relationship: kept unless one is chosen (the list has no "none").
    relationshipTypeId: f.relationshipTypeId.trim() || undefined,
    isPrimary: f.isPrimary,
    isEmergencyContact: f.isEmergencyContact,
  }
}

export function ServiceUserContactsTab({
  serviceUserId,
  detail,
  lookups,
  onSaved,
  openPrivacy,
}: {
  serviceUserId: string
  detail: ServiceUserDetail
  lookups: ServiceUserLookupsBundle
  onSaved: (d: ServiceUserDetail) => void
  /** Who may be told what is recorded on the Privacy tab. */
  openPrivacy?: () => void
}) {
  const canContactsRead = useAuthStore((s) => s.can('service_users.contacts.read'))
  const canContactsCreate = useAuthStore((s) => s.can('service_users.contacts.create'))
  const canContactsUpdate = useAuthStore((s) => s.can('service_users.contacts.update'))
  const canContactsDelete = useAuthStore((s) => s.can('service_users.contacts.delete'))

  const createContactMutation = useCreateServiceUserContact(serviceUserId)
  const updateContactMutation = useUpdateServiceUserContact(serviceUserId)
  const deleteContactMutation = useDeleteServiceUserContact(serviceUserId)

  const { gp, professional, personal } = React.useMemo(() => splitContacts(detail.contacts), [detail.contacts])

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [dialogKind, setDialogKind] = React.useState<ContactSectionKind>('personal')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<ContactFormState>(() => emptyForm(''))
  const [formError, setFormError] = React.useState<string | null>(null)

  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  const formSaving = createContactMutation.isPending || updateContactMutation.isPending
  const deleteSaving = deleteContactMutation.isPending

  function openAdd(kind: ContactSectionKind) {
    setDialogKind(kind)
    setEditingId(null)
    setFormError(null)
    let def = ''
    if (kind === 'gp') def = relationshipIdByCode(lookups.relationshipTypes, 'GP')
    else if (kind === 'professional') def = relationshipIdByCode(lookups.relationshipTypes, 'SOCIAL_WORKER')
    setForm(emptyForm(def))
    setDialogOpen(true)
  }

  function openEdit(c: ServiceUserDetailContact, kind: ContactSectionKind) {
    setDialogKind(kind)
    setEditingId(c.id)
    setFormError(null)
    setForm(contactToForm(c))
    setDialogOpen(true)
  }

  async function submitContactForm() {
    setFormError(null)
    if (!form.firstName.trim()) {
      setFormError('First name is required.')
      toastError('Cannot save contact', 'First name is required.')
      return
    }
    try {
      if (editingId) {
        if (!canContactsUpdate) return
        await updateContactMutation.mutateAsync({ contactId: editingId, body: formToUpdatePayload(form) })
      } else {
        if (!canContactsCreate) return
        await createContactMutation.mutateAsync(formToPayload(form))
      }
      setDialogOpen(false)
      onSaved(detail)
      toastSuccess(editingId ? 'Contact updated' : 'Contact added', 'The contact list has been saved.')
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Save failed')
      toastApiError(e, 'Save failed')
    }
  }

  async function confirmDelete() {
    if (!deleteId || !canContactsDelete) return
    setDeleteError(null)
    try {
      await deleteContactMutation.mutateAsync(deleteId)
      setDeleteId(null)
      onSaved(detail)
      toastSuccess('Contact removed', 'The contact was deleted.')
    } catch (e) {
      setDeleteError(e instanceof ApiError ? e.message : 'Delete failed')
      toastApiError(e, 'Delete failed')
    }
  }

  if (!canContactsRead) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
        You do not have permission to view service user contacts.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm"
        data-testid="contacts-privacy-link"
      >
        <p className="flex items-center gap-2 text-muted-foreground">
          <Shield className="h-4 w-4 shrink-0" aria-hidden />
          Who may be told about their care, what they may be told, and until when, is recorded in Privacy.
        </p>
        {openPrivacy ? (
          <Button type="button" size="sm" variant="outline" onClick={openPrivacy}>
            Open Privacy
          </Button>
        ) : null}
      </div>

      <ContactTableSection
        title="Personal Contacts"
        variant="personal"
        rows={personal}
        onAdd={() => openAdd('personal')}
        onEdit={(c) => openEdit(c, 'personal')}
        onDelete={(id) => setDeleteId(id)}
        canCreate={canContactsCreate}
        canUpdate={canContactsUpdate}
        canDelete={canContactsDelete}
      />
      <ContactTableSection
        title="GP Details"
        variant="gp"
        rows={gp}
        onAdd={() => openAdd('gp')}
        onEdit={(c) => openEdit(c, 'gp')}
        onDelete={(id) => setDeleteId(id)}
        canCreate={canContactsCreate}
        canUpdate={canContactsUpdate}
        canDelete={canContactsDelete}
      />
      <ContactTableSection
        title="Professional Contacts"
        variant="professional"
        rows={professional}
        onAdd={() => openAdd('professional')}
        onEdit={(c) => openEdit(c, 'professional')}
        onDelete={(id) => setDeleteId(id)}
        canCreate={canContactsCreate}
        canUpdate={canContactsUpdate}
        canDelete={canContactsDelete}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? 'Edit contact'
                : `Add contact${
                    dialogKind === 'gp' ? ' (GP)' : dialogKind === 'professional' ? ' (professional)' : ''
                  }`}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">First name *</label>
                <Input value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Last name</label>
                <Input value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm text-muted-foreground">Relationship</label>
                <Select
                  value={form.relationshipTypeId ? form.relationshipTypeId : '__none__'}
                  onValueChange={(v) => setForm((p) => ({ ...p, relationshipTypeId: v === '__none__' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {lookups.relationshipTypes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Phone</label>
                <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Mobile</label>
                <Input value={form.mobile} onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm text-muted-foreground">Email</label>
                <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm text-muted-foreground">Address</label>
                <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm text-muted-foreground">Notes / role</label>
                <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <Checkbox checked={form.isPrimary} onCheckedChange={(v) => setForm((p) => ({ ...p, isPrimary: v === true }))} />
                Primary contact
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <Checkbox
                  checked={form.isEmergencyContact}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, isEmergencyContact: v === true }))}
                />
                Emergency contact
              </label>
              <p className="text-xs text-muted-foreground sm:col-span-2" data-testid="contact-updates-from-privacy">
                Can receive updates: <span className="font-medium text-foreground">{form.canReceiveUpdates ? 'Yes' : 'No'}</span>.
                This follows what is recorded in Privacy (who we may share information with), so it is changed there.
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void submitContactForm()}
              disabled={formSaving || (editingId ? !canContactsUpdate : !canContactsCreate)}
            >
              {formSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? 'Save changes' : 'Add contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteId)}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteId(null)
            setDeleteError(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This contact will be removed from the service user record. You can add a new contact later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="px-6 text-sm text-destructive">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
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

function ContactTableSection({
  title,
  variant,
  rows,
  onAdd,
  onEdit,
  onDelete,
  canCreate,
  canUpdate,
  canDelete,
}: {
  title: string
  variant: 'personal' | 'gp' | 'professional'
  rows: ServiceUserDetailContact[]
  onAdd: () => void
  onEdit: (c: ServiceUserDetailContact) => void
  onDelete: (id: string) => void
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}) {
  const compact = variant === 'gp' || variant === 'professional'
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-sky-600 dark:text-sky-400">{title}</h2>
        <button
          type="button"
          className={
            'text-lg font-bold text-sky-600 hover:text-sky-700' +
            (!canCreate ? ' cursor-not-allowed opacity-40 hover:text-sky-600' : '')
          }
          aria-label={`Add ${title}`}
          disabled={!canCreate}
          onClick={() => canCreate && onAdd()}
        >
          +
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {compact ? (
                <>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Phone</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Other Phone</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Portal Access</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Action</th>
                </>
              ) : (
                <>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Relationship</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Role</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Phone</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Other Phone</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Portal Access</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Action</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={compact ? 5 : 7} className="px-3 py-8 text-center text-muted-foreground">
                  No contacts in this category.
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-medium">{contactName(c)}</td>
                  {!compact && (
                    <>
                      <td className="px-3 py-2 text-muted-foreground">{c.relationshipType?.name ?? '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.notes?.trim() || '—'}</td>
                    </>
                  )}
                  <td className="px-3 py-2 text-muted-foreground">{contactPhone(c)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{contactOtherPhone(c)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.canReceiveUpdates ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Edit contact"
                        disabled={!canUpdate}
                        onClick={() => canUpdate && onEdit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        aria-label="Delete contact"
                        disabled={!canDelete}
                        onClick={() => canDelete && onDelete(c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
