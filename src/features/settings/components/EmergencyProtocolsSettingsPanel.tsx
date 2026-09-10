import * as React from 'react'
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type {
  EmergencyProtocolIconKey,
  EmergencyProtocolRow,
} from '@/features/settings/api/lookups-admin-api'
import { EMERGENCY_PROTOCOL_ICON_KEYS } from '@/features/settings/api/lookups-admin-api'
import {
  useCreateEmergencyProtocol,
  useDeleteEmergencyProtocol,
  useEmergencyProtocols,
  useUpdateEmergencyProtocol,
} from '@/features/settings/hooks/useLookupsAdmin'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'
import { cn } from '@/shared/lib/utils'

const ICON_LABELS: Record<EmergencyProtocolIconKey, string> = {
  activity: 'Activity',
  droplet: 'Droplet',
  wind: 'Wind',
  smile: 'Smile',
  heart: 'Heart',
  alert: 'Alert',
  brain: 'Brain',
  pulse: 'Pulse',
}

type StepDraft = { action: string; detail: string }

function kebabCode(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function IconSelect({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
    >
      {EMERGENCY_PROTOCOL_ICON_KEYS.map(key => (
        <option key={key} value={key}>
          {ICON_LABELS[key]}
        </option>
      ))}
    </select>
  )
}

function ProtocolEditor({
  canManage,
  saving,
  title,
  setTitle,
  code,
  setCode,
  subtitle,
  setSubtitle,
  version,
  setVersion,
  iconKey,
  setIconKey,
  steps,
  setSteps,
  onSave,
  onCancel,
  saveLabel,
}: {
  canManage: boolean
  saving: boolean
  title: string
  setTitle: (v: string) => void
  code: string
  setCode: (v: string) => void
  subtitle: string
  setSubtitle: (v: string) => void
  version: string
  setVersion: (v: string) => void
  iconKey: string
  setIconKey: (v: string) => void
  steps: StepDraft[]
  setSteps: (v: StepDraft[]) => void
  onSave: () => void
  onCancel?: () => void
  saveLabel: string
}) {
  const valid = title.trim() && code.trim() && steps.some(s => s.action.trim())

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Title</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} disabled={saving || !canManage} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Code</label>
          <Input
            value={code}
            onChange={e => setCode(e.target.value.toLowerCase())}
            className="font-mono text-xs"
            disabled={saving || !canManage}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Subtitle</label>
          <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} disabled={saving || !canManage} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Version</label>
            <Input value={version} onChange={e => setVersion(e.target.value)} disabled={saving || !canManage} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Icon</label>
            <IconSelect value={iconKey} onChange={setIconKey} disabled={saving || !canManage} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Steps (shown in order on the carer app)</p>
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-md border border-border p-2 sm:flex-row">
            <div className="w-8 shrink-0 pt-2 text-xs font-semibold text-muted-foreground">{i + 1}</div>
            <div className="min-w-0 flex-1 space-y-2">
              <Input
                value={step.action}
                onChange={e => {
                  const current = steps[i]
                  if (!current) return
                  const next = [...steps]
                  next[i] = { ...current, action: e.target.value }
                  setSteps(next)
                }}
                placeholder="Action"
                disabled={saving || !canManage}
              />
              <textarea
                value={step.detail}
                onChange={e => {
                  const current = steps[i]
                  if (!current) return
                  const next = [...steps]
                  next[i] = { ...current, detail: e.target.value }
                  setSteps(next)
                }}
                placeholder="Detail"
                disabled={saving || !canManage}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
              />
            </div>
            {canManage ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="shrink-0 self-start text-destructive"
                disabled={saving || steps.length <= 1}
                onClick={() => setSteps(steps.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        ))}
        {canManage ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() => setSteps([...steps, { action: '', detail: '' }])}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add step
          </Button>
        ) : null}
      </div>

      {canManage ? (
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={saving || !valid} onClick={onSave}>
            {saveLabel}
          </Button>
          {onCancel ? (
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function EmergencyProtocolsSettingsPanel() {
  const canManage = useAuthStore(s => s.can('lookups.manage'))
  const listQuery = useEmergencyProtocols()
  const createMutation = useCreateEmergencyProtocol()
  const updateMutation = useUpdateEmergencyProtocol()
  const deleteMutation = useDeleteEmergencyProtocol()

  const rows = listQuery.data ?? []
  const loading = listQuery.isLoading
  const saving =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  const error =
    listQuery.error instanceof ApiError
      ? listQuery.error.message
      : listQuery.error
        ? 'Could not load emergency protocols.'
        : null

  const [title, setTitle] = React.useState('')
  const [code, setCode] = React.useState('')
  const [subtitle, setSubtitle] = React.useState('')
  const [version, setVersion] = React.useState('')
  const [iconKey, setIconKey] = React.useState('alert')
  const [steps, setSteps] = React.useState<StepDraft[]>([{ action: '', detail: '' }])
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editTitle, setEditTitle] = React.useState('')
  const [editCode, setEditCode] = React.useState('')
  const [editSubtitle, setEditSubtitle] = React.useState('')
  const [editVersion, setEditVersion] = React.useState('')
  const [editIconKey, setEditIconKey] = React.useState('alert')
  const [editSteps, setEditSteps] = React.useState<StepDraft[]>([])
  const [actionError, setActionError] = React.useState<string | null>(null)

  const startEdit = (row: EmergencyProtocolRow) => {
    setEditingId(row.id)
    setEditTitle(row.title)
    setEditCode(row.code)
    setEditSubtitle(row.subtitle)
    setEditVersion(row.version)
    setEditIconKey(row.iconKey)
    setEditSteps(
      row.steps.length > 0
        ? row.steps.map(s => ({ action: s.action, detail: s.detail }))
        : [{ action: '', detail: '' }],
    )
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditSteps([])
  }

  const resetCreate = () => {
    setTitle('')
    setCode('')
    setSubtitle('')
    setVersion('')
    setIconKey('alert')
    setSteps([{ action: '', detail: '' }])
  }

  const onCreate = async () => {
    setActionError(null)
    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        code: kebabCode(code || title),
        subtitle: subtitle.trim(),
        version: version.trim(),
        iconKey,
        sortOrder: (rows[rows.length - 1]?.sortOrder ?? 0) + 10,
        steps: steps.filter(s => s.action.trim()),
      })
      resetCreate()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not create protocol.')
    }
  }

  const onSaveEdit = async () => {
    if (!editingId) return
    setActionError(null)
    try {
      await updateMutation.mutateAsync({
        id: editingId,
        body: {
          title: editTitle.trim(),
          code: kebabCode(editCode),
          subtitle: editSubtitle.trim(),
          version: editVersion.trim(),
          iconKey: editIconKey,
          steps: editSteps.filter(s => s.action.trim()),
        },
      })
      cancelEdit()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not save protocol.')
    }
  }

  const onDelete = async (row: EmergencyProtocolRow) => {
    if (!window.confirm(`Remove “${row.title}” from the carer app?`)) return
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(row.id)
      if (openId === row.id) setOpenId(null)
      if (editingId === row.id) cancelEdit()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not delete protocol.')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Emergency protocols</h2>
        <p className="text-sm text-muted-foreground">
          Step-by-step clinical protocols shown in the carer app (visit info icon). Order here is
          the order on the device.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

      {canManage ? (
        <div className="rounded-lg border border-border p-3">
          <p className="mb-3 text-sm font-medium">Add protocol</p>
          <ProtocolEditor
            canManage={canManage}
            saving={saving}
            title={title}
            setTitle={v => {
              setTitle(v)
              if (!code || code === kebabCode(title)) setCode(kebabCode(v))
            }}
            code={code}
            setCode={setCode}
            subtitle={subtitle}
            setSubtitle={setSubtitle}
            version={version}
            setVersion={setVersion}
            iconKey={iconKey}
            setIconKey={setIconKey}
            steps={steps}
            setSteps={setSteps}
            onSave={() => void onCreate()}
            saveLabel="Add"
          />
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No emergency protocols yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => {
            const open = openId === row.id
            const editing = editingId === row.id
            return (
              <div key={row.id} className="overflow-hidden rounded-lg border border-border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 bg-muted/40 px-3 py-2.5 text-left"
                  onClick={() => setOpenId(open ? null : row.id)}
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      <span className="mr-2 font-mono text-xs font-normal text-muted-foreground">
                        {index + 1}.
                      </span>
                      {row.title}
                      <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                        {row.code}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[row.subtitle, row.version].filter(Boolean).join(' · ') || 'No subtitle'}
                      {` · ${row.steps.length} step${row.steps.length === 1 ? '' : 's'}`}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                      open && 'rotate-180',
                    )}
                  />
                </button>
                {open ? (
                  <div className="space-y-3 border-t border-border p-3">
                    {editing ? (
                      <ProtocolEditor
                        canManage={canManage}
                        saving={saving}
                        title={editTitle}
                        setTitle={setEditTitle}
                        code={editCode}
                        setCode={setEditCode}
                        subtitle={editSubtitle}
                        setSubtitle={setEditSubtitle}
                        version={editVersion}
                        setVersion={setEditVersion}
                        iconKey={editIconKey}
                        setIconKey={setEditIconKey}
                        steps={editSteps}
                        setSteps={setEditSteps}
                        onSave={() => void onSaveEdit()}
                        onCancel={cancelEdit}
                        saveLabel="Save"
                      />
                    ) : (
                      <>
                        <ol className="list-decimal space-y-2 pl-5 text-sm">
                          {row.steps.map((step, i) => (
                            <li key={step.id ?? i}>
                              <p className="font-medium">{step.action}</p>
                              {step.detail ? (
                                <p className="text-muted-foreground">{step.detail}</p>
                              ) : null}
                            </li>
                          ))}
                        </ol>
                        {canManage ? (
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(row)}
                            >
                              <Pencil className="mr-1 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              disabled={saving}
                              onClick={() => void onDelete(row)}
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              Remove
                            </Button>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
