import * as React from 'react'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { useAuthStore } from '@/features/auth/store'
import { usePolicyTags } from '@/features/policies/hooks/usePolicies'
import { Loader2 } from 'lucide-react'

type Props = {
  value: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
}

export function PolicyTagPicker({ value, onChange, disabled }: Props) {
  const canManage = useAuthStore(s => s.can('policies.categories.manage'))
  const tagsQuery = usePolicyTags({ limit: 100, isActive: true })
  const rows = tagsQuery.data?.rows ?? []

  if (tagsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading tags…
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {canManage ? 'No tags yet. Create tags from the Tags page.' : 'No tags available.'}
      </p>
    )
  }

  return (
    <ul className="flex flex-wrap gap-2">
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
    </ul>
  )
}
