import * as React from 'react'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'
import { useCreatePolicyTag, usePolicyTags } from '@/features/policies/hooks/usePolicies'
import { policyErrorCopy } from '@/features/policies/policy-error'
import { toastError, toastSuccess } from '@/shared/lib/toast'
import { Loader2, Plus } from 'lucide-react'

type Props = {
  value: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
}

/**
 * Inline "New tag" control. It sits inside the policy <form>, so Enter is handled here
 * instead of submitting the policy.
 */
function NewTagInline({
  existing,
  onCreated,
}: {
  existing: Array<{ id: string; name: string }>
  onCreated: (id: string) => void
}) {
  const createMut = useCreatePolicyTag()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')

  const close = () => {
    setOpen(false)
    setName('')
  }

  const add = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    // Re-use a tag that already exists with the same name rather than creating a duplicate.
    const match = existing.find(t => t.name.trim().toLowerCase() === trimmed.toLowerCase())
    if (match) {
      onCreated(match.id)
      close()
      return
    }
    try {
      const created = await createMut.mutateAsync(trimmed)
      onCreated(created.id)
      toastSuccess(`Tag "${created.name}" created`)
      close()
    } catch (err) {
      const copy = policyErrorCopy(err)
      toastError(copy.title, copy.message)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary/60 px-3 py-1 text-sm font-medium text-primary hover:bg-primary/5"
        data-testid="policy-tag-new"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        New tag
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void add()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            close()
          }
        }}
        placeholder="Tag name, e.g. CQC"
        maxLength={100}
        className="h-8 w-48"
        aria-label="New tag name"
        data-testid="policy-tag-new-input"
      />
      <Button type="button" size="sm" onClick={() => void add()} disabled={!name.trim() || createMut.isPending}>
        {createMut.isPending ? 'Adding…' : 'Add'}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={close}>
        Cancel
      </Button>
    </div>
  )
}

export function PolicyTagPicker({ value, onChange, disabled }: Props) {
  const canManage = useAuthStore(s => s.can('policies.categories.manage'))
  const tagsQuery = usePolicyTags({ limit: 100, isActive: true })
  const rows = tagsQuery.data?.rows ?? []
  const canCreate = canManage && !disabled

  if (tagsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading tags…
      </div>
    )
  }

  const newTag = canCreate ? (
    <NewTagInline
      existing={rows}
      onCreated={id => {
        if (!value.includes(id)) onChange([...value, id])
      }}
    />
  ) : null

  if (rows.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">{canManage ? 'No tags yet.' : 'No tags available.'}</p>
        {newTag}
      </div>
    )
  }

  return (
    <ul className="flex flex-wrap items-center gap-2">
      {rows.map(tag => {
        const checked = value.includes(tag.id)
        return (
          <li key={tag.id}>
            <label className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm">
              <Checkbox
                checked={checked}
                disabled={disabled}
                onCheckedChange={next => {
                  if (next === true) onChange([...value, tag.id])
                  else onChange(value.filter(id => id !== tag.id))
                }}
              />
              {tag.name}
            </label>
          </li>
        )
      })}
      {newTag ? <li>{newTag}</li> : null}
    </ul>
  )
}
