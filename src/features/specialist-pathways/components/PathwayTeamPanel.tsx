import * as React from 'react'
import { Mail, Pencil, Phone, Plus, Trash2, Users } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useAddPathwayProfessional,
  useRemovePathwayProfessional,
  useUpdatePathwayProfessional,
} from '@/features/specialist-pathways/hooks/useSpecialistPathways'
import { PROFESSIONAL_ROLES } from '@/features/specialist-pathways/pathway-labels'
import type {
  PathwayCase,
  PathwayProfessional,
  ProfessionalInput,
} from '@/features/specialist-pathways/types/specialist-pathway.types'

type FormState = { name: string; role: string; organisation: string; phone: string; email: string; notes: string }

const blank: FormState = { name: '', role: '', organisation: '', phone: '', email: '', notes: '' }

const fromProfessional = (p: PathwayProfessional): FormState => ({
  name: p.name,
  role: p.role,
  organisation: p.organisation ?? '',
  phone: p.phone ?? '',
  email: p.email ?? '',
  notes: p.notes ?? '',
})

function ProfessionalForm({
  initial,
  busy,
  onSave,
  onCancel,
}: {
  initial: FormState
  busy: boolean
  onSave: (v: ProfessionalInput) => void
  onCancel: () => void
}) {
  const [f, setF] = React.useState<FormState>(initial)
  const set = (k: keyof FormState, v: string) => setF(p => ({ ...p, [k]: v }))

  const submit = () => {
    if (!f.name.trim() || !f.role.trim()) {
      toastApiError(null, 'Enter a name and a role')
      return
    }
    onSave({
      name: f.name.trim(),
      role: f.role.trim(),
      organisation: f.organisation.trim(),
      phone: f.phone.trim(),
      email: f.email.trim(),
      notes: f.notes.trim(),
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Name</span>
          <Input value={f.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Dr Sarah Khan" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Role</span>
          <Input list="pathway-professional-roles" value={f.role} onChange={e => set('role', e.target.value)} />
          <datalist id="pathway-professional-roles">
            {PROFESSIONAL_ROLES.map(r => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Organisation</span>
          <Input
            value={f.organisation}
            onChange={e => set('organisation', e.target.value)}
            placeholder="Practice, team or service"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Phone</span>
          <Input type="tel" value={f.phone} onChange={e => set('phone', e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Email</span>
          <Input type="email" value={f.email} onChange={e => set('email', e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium">Notes</span>
          <textarea
            className="min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={f.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="e.g. Visits monthly, contact before changing medication"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

export function PathwayTeamPanel({ caseData }: { caseData: PathwayCase }) {
  const canManage = useAuthStore(s => s.can)('specialist_pathways.manage') && caseData.status !== 'CLOSED'
  const add = useAddPathwayProfessional(caseData.id)
  const update = useUpdatePathwayProfessional(caseData.id)
  const remove = useRemovePathwayProfessional(caseData.id)
  const [editing, setEditing] = React.useState<string | 'new' | null>(null)
  const onError = (e: unknown) => toastApiError(e, 'Could not save')

  return (
    <div className="flex flex-col gap-4" data-testid="pathway-team-panel">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Professionals involved in this person’s care</p>
        {canManage && editing === null && (
          <Button variant="outline" onClick={() => setEditing('new')}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Add professional
          </Button>
        )}
      </div>

      {editing === 'new' && (
        <ProfessionalForm
          initial={blank}
          busy={add.isPending}
          onCancel={() => setEditing(null)}
          onSave={v =>
            add.mutate(v, {
              onSuccess: () => {
                toastSuccess('Professional added')
                setEditing(null)
              },
              onError,
            })
          }
        />
      )}

      {caseData.professionals.length === 0 && editing !== 'new' && (
        <Card>
          <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <Users className="h-5 w-5" aria-hidden />
            No professionals recorded yet.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {caseData.professionals.map(p =>
          editing === p.id ? (
            <div key={p.id} className="md:col-span-2">
              <ProfessionalForm
                initial={fromProfessional(p)}
                busy={update.isPending}
                onCancel={() => setEditing(null)}
                onSave={v =>
                  update.mutate(
                    { professionalId: p.id, ...v },
                    {
                      onSuccess: () => {
                        toastSuccess('Professional updated')
                        setEditing(null)
                      },
                      onError,
                    },
                  )
                }
              />
            </div>
          ) : (
            <Card key={p.id}>
              <CardContent className="flex flex-col gap-1.5 py-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.role}
                      {p.organisation && ` · ${p.organisation}`}
                    </p>
                  </div>
                  {canManage && (
                    <span className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(p.id)} aria-label={`Edit ${p.name}`}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={remove.isPending}
                        aria-label={`Remove ${p.name}`}
                        onClick={() => {
                          if (!window.confirm(`Remove ${p.name} from this case?`)) return
                          remove.mutate(p.id, {
                            onSuccess: () => toastSuccess('Professional removed'),
                            onError,
                          })
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </span>
                  )}
                </div>
                {p.phone && (
                  <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                    {p.phone}
                  </a>
                )}
                {p.email && (
                  <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                    <Mail className="h-3.5 w-3.5" aria-hidden />
                    {p.email}
                  </a>
                )}
                {p.notes && <p className="whitespace-pre-wrap text-muted-foreground">{p.notes}</p>}
              </CardContent>
            </Card>
          ),
        )}
      </div>
    </div>
  )
}
