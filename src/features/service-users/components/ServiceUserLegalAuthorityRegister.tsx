import * as React from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import type {
  ServiceUserLegalAuthorityCategory,
  ServiceUserLegalAuthorityPayload,
  ServiceUserLegalAuthorityRow,
  ServiceUserLegalAuthorityVerification,
} from '@/features/service-users/api/service-users.api'
import {
  useDeleteServiceUserLegalAuthority,
  useSaveServiceUserLegalAuthority,
} from '@/features/service-users/hooks/useServiceUserMutations'
import {
  categoryGivesCareAuthority,
  LEGAL_AUTHORITY_CATEGORY_LABEL,
  LEGAL_AUTHORITY_VERIFICATION_LABEL,
} from '@/features/service-users/initial-assessment/utils/legal-authority-coverage'
import { useAuthStore } from '@/features/auth/store'
import { useServiceUserDocuments } from '@/features/service-users/hooks/useServiceUserTabs'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

type Form = {
  category: ServiceUserLegalAuthorityCategory
  holderName: string
  holderRelationship: string
  holderContact: string
  scope: string
  lifeSustainingTreatment: '' | 'yes' | 'no'
  registeredOn: string
  expiresOn: string
  reference: string
  verificationStatus: ServiceUserLegalAuthorityVerification
  verificationMethod: string
  notes: string
}

const EMPTY: Form = {
  category: 'LPA_HEALTH_WELFARE',
  holderName: '',
  holderRelationship: '',
  holderContact: '',
  scope: '',
  lifeSustainingTreatment: '',
  registeredOn: '',
  expiresOn: '',
  reference: '',
  verificationStatus: 'REPORTED',
  verificationMethod: '',
  notes: '',
}

function toForm(row: ServiceUserLegalAuthorityRow): Form {
  return {
    category: row.category,
    holderName: row.holderName,
    holderRelationship: row.holderRelationship,
    holderContact: row.holderContact,
    scope: row.scope,
    lifeSustainingTreatment: row.lifeSustainingTreatment == null ? '' : row.lifeSustainingTreatment ? 'yes' : 'no',
    registeredOn: row.registeredOn ?? '',
    expiresOn: row.expiresOn ?? '',
    reference: row.reference,
    verificationStatus: row.verificationStatus,
    verificationMethod: row.verificationMethod,
    notes: row.notes,
  }
}

function toPayload(f: Form): ServiceUserLegalAuthorityPayload {
  return {
    category: f.category,
    holderName: f.holderName.trim(),
    holderRelationship: f.holderRelationship,
    holderContact: f.holderContact,
    scope: f.scope,
    lifeSustainingTreatment: f.lifeSustainingTreatment === '' ? null : f.lifeSustainingTreatment === 'yes',
    registeredOn: f.registeredOn || null,
    expiresOn: f.expiresOn || null,
    reference: f.reference,
    verificationStatus: f.verificationStatus,
    verificationMethod: f.verificationMethod,
    notes: f.notes,
  }
}

const STATUS_CLASS: Record<ServiceUserLegalAuthorityVerification, string> = {
  REPORTED: 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100',
  DOCUMENT_SEEN: 'bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100',
  VERIFIED: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100',
  NOT_VALID: 'bg-muted text-muted-foreground line-through',
}

const SELECT_CLASS = 'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
const LABEL_CLASS = 'mb-1 block text-xs font-medium text-muted-foreground'

type Props = {
  serviceUserId: string
  rows: ServiceUserLegalAuthorityRow[]
  canUpdate: boolean
  canDelete: boolean
}

/**
 * Who may legally decide for the person, for what, and how it was checked. A finance LPA / EPA /
 * appointee never covers care; next of kin is not an authority and is not recorded here.
 */
export function ServiceUserLegalAuthorityRegister({ serviceUserId, rows, canUpdate, canDelete }: Props) {
  const save = useSaveServiceUserLegalAuthority(serviceUserId)
  const remove = useDeleteServiceUserLegalAuthority(serviceUserId)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState<Form>(EMPTY)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const patch = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }))

  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY)
    setOpen(true)
  }
  const openEdit = (row: ServiceUserLegalAuthorityRow) => {
    setEditingId(row.id)
    setForm(toForm(row))
    setOpen(true)
  }
  const onSave = async () => {
    if (!form.holderName.trim()) return
    try {
      await save.mutateAsync({ authorityId: editingId ?? undefined, body: toPayload(form) })
      toastSuccess(editingId ? 'Legal authority updated' : 'Legal authority added')
      setOpen(false)
    } catch (e) {
      toastApiError(e, 'Could not save legal authority')
    }
  }
  const onDelete = async () => {
    if (!deleteId) return
    try {
      await remove.mutateAsync(deleteId)
      toastSuccess('Legal authority removed')
    } catch (e) {
      toastApiError(e, 'Could not remove legal authority')
    } finally {
      setDeleteId(null)
    }
  }

  const careCategory = categoryGivesCareAuthority(form.category)

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm" data-testid="legal-authority-register">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-sky-600 dark:text-sky-400">Legal authority register</h2>
        {canUpdate ? (
          <Button type="button" size="sm" variant="outline" onClick={openAdd}>
            Add legal authority
          </Button>
        ) : null}
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Record each LPA, deputyship, court order or appointeeship with what it covers and how it was checked. A
        property &amp; finance LPA, EPA or appointee never gives authority over care. Next of kin is not a legal
        authority. An attorney or deputy decides only when the person lacks capacity for that decision.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No legal authority recorded.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Held by</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Covers</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Checked</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Expires</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0" data-testid="legal-authority-row">
                  <td className="px-3 py-2 align-top">
                    <div className="font-medium">{LEGAL_AUTHORITY_CATEGORY_LABEL[row.category]}</div>
                    {!categoryGivesCareAuthority(row.category) ? (
                      <div className="text-xs text-muted-foreground">Does not cover care or health decisions</div>
                    ) : null}
                    {row.source === 'INITIAL_ASSESSMENT' ? (
                      <div className="text-xs text-muted-foreground">Reported in the initial assessment</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {row.holderName}
                    {row.holderRelationship ? (
                      <div className="text-xs text-muted-foreground">{row.holderRelationship}</div>
                    ) : null}
                  </td>
                  <td className="max-w-[16rem] px-3 py-2 align-top">
                    <span className="line-clamp-3 whitespace-pre-wrap">{row.scope || '—'}</span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium', STATUS_CLASS[row.verificationStatus])}>
                      {LEGAL_AUTHORITY_VERIFICATION_LABEL[row.verificationStatus]}
                    </span>
                    {row.verifiedAt ? (
                      <div className="mt-1 text-xs text-muted-foreground">{row.verifiedAt.slice(0, 10)}</div>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 align-top">{row.expiresOn ?? '—'}</td>
                  <td className="px-3 py-2 text-right align-top">
                    <div className="inline-flex gap-1">
                      {canUpdate ? (
                        <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setDeleteId(row.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit legal authority' : 'Add legal authority'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL_CLASS}>Type</label>
                <select
                  className={SELECT_CLASS}
                  value={form.category}
                  aria-label="Type"
                  onChange={(e) => patch({ category: e.target.value as ServiceUserLegalAuthorityCategory })}
                >
                  {(Object.keys(LEGAL_AUTHORITY_CATEGORY_LABEL) as ServiceUserLegalAuthorityCategory[]).map((c) => (
                    <option key={c} value={c}>
                      {LEGAL_AUTHORITY_CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS}>Held by *</label>
                <Input value={form.holderName} aria-label="Held by" onChange={(e) => patch({ holderName: e.target.value })} />
              </div>
              <div>
                <label className={LABEL_CLASS}>Relationship</label>
                <Input
                  value={form.holderRelationship}
                  aria-label="Relationship"
                  onChange={(e) => patch({ holderRelationship: e.target.value })}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Contact</label>
                <Input value={form.holderContact} aria-label="Contact" onChange={(e) => patch({ holderContact: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={LABEL_CLASS}>What it covers</label>
              <Textarea
                rows={3}
                value={form.scope}
                aria-label="What it covers"
                placeholder="Decisions covered, any conditions or restrictions, whether attorneys must act together"
                onChange={(e) => patch({ scope: e.target.value })}
              />
            </div>
            {form.category === 'LPA_HEALTH_WELFARE' ? (
              <div>
                <label className={LABEL_CLASS}>Can the attorney decide about life-sustaining treatment?</label>
                <select
                  className={SELECT_CLASS}
                  value={form.lifeSustainingTreatment}
                  aria-label="Life-sustaining treatment"
                  onChange={(e) => patch({ lifeSustainingTreatment: e.target.value as Form['lifeSustainingTreatment'] })}
                >
                  <option value="">Not recorded</option>
                  <option value="yes">Yes (option A signed)</option>
                  <option value="no">No</option>
                </select>
              </div>
            ) : null}
            {!careCategory ? (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                This type covers finances only — it does not let anyone decide about care or health.
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={LABEL_CLASS}>Registered / made on</label>
                <Input type="date" value={form.registeredOn} aria-label="Registered on" onChange={(e) => patch({ registeredOn: e.target.value })} />
              </div>
              <div>
                <label className={LABEL_CLASS}>Expires on</label>
                <Input type="date" value={form.expiresOn} aria-label="Expires on" onChange={(e) => patch({ expiresOn: e.target.value })} />
              </div>
              <div>
                <label className={LABEL_CLASS}>Reference</label>
                <Input
                  value={form.reference}
                  aria-label="Reference"
                  placeholder="OPG / court / DWP ref"
                  onChange={(e) => patch({ reference: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL_CLASS}>How it was checked</label>
                <select
                  className={SELECT_CLASS}
                  value={form.verificationStatus}
                  aria-label="Verification"
                  onChange={(e) => patch({ verificationStatus: e.target.value as ServiceUserLegalAuthorityVerification })}
                >
                  {(Object.keys(LEGAL_AUTHORITY_VERIFICATION_LABEL) as ServiceUserLegalAuthorityVerification[]).map((v) => (
                    <option key={v} value={v}>
                      {LEGAL_AUTHORITY_VERIFICATION_LABEL[v]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS}>Check details</label>
                <Input
                  value={form.verificationMethod}
                  aria-label="Check details"
                  placeholder="e.g. OPG register search, certified copy seen"
                  onChange={(e) => patch({ verificationMethod: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className={LABEL_CLASS}>Notes</label>
              <Textarea rows={2} value={form.notes} aria-label="Notes" onChange={(e) => patch({ notes: e.target.value })} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={!form.holderName.trim() || save.isPending} onClick={() => void onSave()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this legal authority?</AlertDialogTitle>
            <AlertDialogDescription>
              It is removed from the register (kept in the audit trail). To record that it ended, edit it and mark it
              not valid instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onDelete()}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

/** Documents page section: loads the register and applies the documents permissions. */
export function ServiceUserLegalAuthoritySection({ serviceUserId }: { serviceUserId: string }) {
  const can = useAuthStore((s) => s.can)
  const canRead = can('service_users.documents.read') || can('service_users.read')
  const canUpdate = can('service_users.documents.update') || can('service_users.update')
  const canDelete = can('service_users.documents.delete') || can('service_users.delete')
  const query = useServiceUserDocuments(serviceUserId, canRead)
  if (!canRead || !query.data) return null
  return (
    <ServiceUserLegalAuthorityRegister
      serviceUserId={serviceUserId}
      rows={query.data.legalAuthorities ?? []}
      canUpdate={canUpdate}
      canDelete={canDelete}
    />
  )
}
