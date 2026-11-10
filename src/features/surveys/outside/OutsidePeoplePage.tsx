import * as React from 'react'
import { Plus, Search, Users } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
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
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import {
  OUTSIDE_KIND_LABEL,
  useAddOutsideSource,
  useOutsideContacts,
  useOutsideLists,
  useOutsideOptOut,
  useOutsideSources,
  useRemoveOutsideContact,
  useRemoveOutsideList,
  useSaveOutsideContact,
  useSaveOutsideList,
  type ContactInput,
  type OutsideContact,
  type OutsideKind,
  type OutsideList,
} from './survey-outside'

const fieldClass =
  'mt-1 w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

const SOURCE_LABEL: Record<OutsideContact['sourceType'], string> = {
  TYPED: 'Typed in',
  SERVICE_USER_CONTACT: 'People involved',
  FUNDER: 'Funder',
  PATHWAY_PROFESSIONAL: 'Pathway professional',
}

/**
 * Surveys → Outside people: families, professionals and commissioners that named public surveys are sent to,
 * each with their own link. Typed in once, or taken from records CareFlow keeps (funders, pathway
 * professionals; families come from People involved when a survey is sent). Reusable lists, and each person's
 * survey contact preferences (opt-outs are honoured everywhere).
 */
export default function OutsidePeoplePage() {
  const canManage = useAuthStore(s => s.can('surveys.manage'))
  const [search, setSearch] = React.useState('')
  const [kind, setKind] = React.useState('')
  const { data: contacts, isLoading } = useOutsideContacts(search, kind)
  const { data: lists } = useOutsideLists()
  const [editing, setEditing] = React.useState<OutsideContact | 'new' | null>(null)
  const [adding, setAdding] = React.useState(false)
  const [listEditing, setListEditing] = React.useState<OutsideList | 'new' | null>(null)
  const remove = useRemoveOutsideContact()
  const optOut = useOutsideOptOut()
  const removeList = useRemoveOutsideList()

  if (!canManage) {
    return <p className="text-sm text-muted-foreground">Only people who manage surveys can see outside people.</p>
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Outside people"
        description="Families, professionals and commissioners your public surveys can be sent to, each with their own link."
        icon={<Users className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Surveys', href: '/surveys' }, { label: 'Outside people' }]}
      >
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setAdding(true)}>
            Add from CareFlow
          </Button>
          <Button type="button" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>
            Add a person
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-wrap items-end gap-2">
        <label className="relative block w-full max-w-xs text-sm">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input className="pl-8" placeholder="Search name, organisation or email" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="sr-only">Who</span>
          <select className={fieldClass} value={kind} onChange={e => setKind(e.target.value)} aria-label="Who">
            <option value="">Everyone</option>
            {(Object.keys(OUTSIDE_KIND_LABEL) as OutsideKind[]).map(k => (
              <option key={k} value={k}>
                {OUTSIDE_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="overflow-x-auto rounded-xl border border-border bg-card" aria-label="Outside people">
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : !contacts?.length ? (
          <p className="p-4 text-sm text-muted-foreground">Nobody yet. Add a person, or add commissioners and professionals CareFlow already holds.</p>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Who</th>
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 font-medium">Survey messages</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{c.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {[c.role, c.organisation].filter(Boolean).join(', ') || SOURCE_LABEL[c.sourceType]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">{OUTSIDE_KIND_LABEL[c.kind]}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{[c.email, c.mobile ?? c.phone].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="px-4 py-2.5">
                    {c.optedOut.includes('ALL') ? (
                      <span className="text-amber-700 dark:text-amber-300">Does not want surveys</span>
                    ) : c.optedOut.length ? (
                      <span className="text-amber-700 dark:text-amber-300">Not by {c.optedOut.map(x => x.toLowerCase()).join(', ')}</span>
                    ) : (
                      'Yes'
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right">
                    {c.canChange ? (
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(c)} aria-label={`Change ${c.name}`}>
                        Change
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={c.optedOut.includes('ALL') ? `Allow surveys to ${c.name}` : `Stop surveys to ${c.name}`}
                      onClick={() =>
                        void optOut.mutateAsync({ id: c.id, channels: c.optedOut.includes('ALL') ? [] : ['ALL'] }).then(
                          () => toastSuccess('Saved'),
                          e => toastApiError(e, 'Could not save'),
                        )
                      }
                    >
                      {c.optedOut.includes('ALL') ? 'Allow surveys' : 'Stop surveys'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      aria-label={`Remove ${c.name}`}
                      onClick={() => void remove.mutateAsync(c.id).then(() => toastSuccess('Removed'), e => toastApiError(e, 'Could not remove'))}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="space-y-2" aria-labelledby="outside-lists">
        <div className="flex items-center justify-between">
          <h2 id="outside-lists" className="text-base font-semibold">
            Lists
          </h2>
          <Button type="button" size="sm" variant="outline" onClick={() => setListEditing('new')}>
            New list
          </Button>
        </div>
        {!lists?.length ? (
          <p className="text-sm text-muted-foreground">Make a list (for example "GP practices") to send to everyone on it at once.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {lists.map(l => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span>
                  <span className="font-medium">{l.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {l.members} {l.members === 1 ? 'person' : 'people'}
                    {l.description ? ` · ${l.description}` : ''}
                  </span>
                </span>
                {l.canChange ? (
                  <span className="flex gap-1">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setListEditing(l)}>
                      Change
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => void removeList.mutateAsync(l.id).then(() => toastSuccess('Removed'), e => toastApiError(e, 'Could not remove'))}
                    >
                      Remove
                    </Button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing ? <ContactDialog contact={editing === 'new' ? null : editing} onClose={() => setEditing(null)} /> : null}
      {adding ? <AddFromCareFlowDialog onClose={() => setAdding(false)} /> : null}
      {listEditing ? <ListDialog list={listEditing === 'new' ? null : listEditing} contacts={contacts ?? []} onClose={() => setListEditing(null)} /> : null}
    </div>
  )
}

function ContactDialog({ contact, onClose }: { contact: OutsideContact | null; onClose: () => void }) {
  const save = useSaveOutsideContact()
  const [form, setForm] = React.useState<ContactInput>({
    kind: contact?.kind ?? 'PROFESSIONAL',
    name: contact?.name ?? '',
    organisation: contact?.organisation ?? '',
    role: contact?.role ?? '',
    email: contact?.email ?? '',
    mobile: contact?.mobile ?? '',
    phone: contact?.phone ?? '',
  })
  const set = (k: keyof ContactInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  const submit = async () => {
    try {
      await save.mutateAsync({ id: contact?.id ?? null, input: form })
      toastSuccess('Saved')
      onClose()
    } catch (e) {
      toastApiError(e, 'Could not save')
    }
  }
  return (
    <Dialog open onOpenChange={o => (o ? null : onClose())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{contact ? 'Change outside person' : 'Add an outside person'}</DialogTitle>
          <DialogDescription>They are sent public surveys with their own link. An email or a UK mobile is needed to send; a phone is enough for a call or paper.</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">Who they are</span>
            <select className={fieldClass} value={form.kind} onChange={set('kind')}>
              {(Object.keys(OUTSIDE_KIND_LABEL) as OutsideKind[]).map(k => (
                <option key={k} value={k}>
                  {OUTSIDE_KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium">Name</span>
            <Input value={form.name} onChange={set('name')} maxLength={120} />
          </label>
          <label className="text-sm">
            <span className="font-medium">Organisation</span>
            <Input value={form.organisation ?? ''} onChange={set('organisation')} maxLength={160} />
          </label>
          <label className="text-sm">
            <span className="font-medium">Role</span>
            <Input value={form.role ?? ''} onChange={set('role')} maxLength={120} />
          </label>
          <label className="text-sm">
            <span className="font-medium">Email</span>
            <Input type="email" value={form.email ?? ''} onChange={set('email')} maxLength={200} />
          </label>
          <label className="text-sm">
            <span className="font-medium">Mobile</span>
            <Input value={form.mobile ?? ''} onChange={set('mobile')} maxLength={40} />
          </label>
          <label className="text-sm">
            <span className="font-medium">Phone</span>
            <Input value={form.phone ?? ''} onChange={set('phone')} maxLength={40} />
          </label>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={save.isPending || form.name.trim().length < 2} onClick={() => void submit()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddFromCareFlowDialog({ onClose }: { onClose: () => void }) {
  const [type, setType] = React.useState<'FUNDER' | 'PATHWAY_PROFESSIONAL'>('FUNDER')
  const [search, setSearch] = React.useState('')
  const { data } = useOutsideSources(type, search, true)
  const add = useAddOutsideSource()
  return (
    <Dialog open onOpenChange={o => (o ? null : onClose())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Add from CareFlow</DialogTitle>
          <DialogDescription>Commissioners from your funders, or professionals on specialist pathways. Their details are read again from CareFlow each time a survey is sent.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <select className={fieldClass + ' w-auto'} value={type} onChange={e => setType(e.target.value as typeof type)} aria-label="From">
              <option value="FUNDER">Funders (commissioners)</option>
              <option value="PATHWAY_PROFESSIONAL">Pathway professionals</option>
            </select>
            <Input className="max-w-xs" placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search" />
          </div>
          <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border">
            {(data ?? []).map(r => (
              <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span>
                  {r.name}
                  <span className="block text-xs text-muted-foreground">{[r.role, r.organisation, r.email].filter(Boolean).join(' · ')}</span>
                </span>
                {r.added ? (
                  <span className="text-xs text-muted-foreground">Added</span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={add.isPending}
                    onClick={() => void add.mutateAsync({ type, sourceId: r.id }).then(() => toastSuccess('Added'), e => toastApiError(e, 'Could not add'))}
                  >
                    Add
                  </Button>
                )}
              </li>
            ))}
            {data && !data.length ? <li className="px-3 py-2 text-sm text-muted-foreground">Nobody found.</li> : null}
          </ul>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ListDialog({ list, contacts, onClose }: { list: OutsideList | null; contacts: OutsideContact[]; onClose: () => void }) {
  const save = useSaveOutsideList()
  const [name, setName] = React.useState(list?.name ?? '')
  const [description, setDescription] = React.useState(list?.description ?? '')
  const [chosen, setChosen] = React.useState<string[]>(list ? contacts.filter(c => c.listIds.includes(list.id)).map(c => c.id) : [])
  const submit = async () => {
    try {
      await save.mutateAsync({ id: list?.id ?? null, input: { name, description, contactIds: chosen } })
      toastSuccess('Saved')
      onClose()
    } catch (e) {
      toastApiError(e, 'Could not save')
    }
  }
  return (
    <Dialog open onOpenChange={o => (o ? null : onClose())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{list ? 'Change list' : 'New list'}</DialogTitle>
          <DialogDescription>Send a public survey to everyone on the list at once.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium">Name</span>
            <Input value={name} onChange={e => setName(e.target.value)} maxLength={120} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Description (optional)</span>
            <Input value={description} onChange={e => setDescription(e.target.value)} maxLength={500} />
          </label>
          <fieldset className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border p-2 text-sm">
            <legend className="px-1 font-medium">People on it</legend>
            {contacts.map(c => (
              <label key={c.id} className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border-input" checked={chosen.includes(c.id)} onChange={e => setChosen(v => (e.target.checked ? [...v, c.id] : v.filter(x => x !== c.id)))} />
                {c.name}
                {c.organisation ? <span className="text-xs text-muted-foreground">{c.organisation}</span> : null}
              </label>
            ))}
          </fieldset>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={save.isPending || name.trim().length < 2} onClick={() => void submit()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
