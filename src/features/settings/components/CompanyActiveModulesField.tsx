import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CompanyModuleCatalogItem } from '@/lib/company-settings-api'

type Props = {
  catalog: CompanyModuleCatalogItem[]
  value: string[]
  onChange: (modules: string[]) => void
  disabled?: boolean
}

export function CompanyActiveModulesField({ catalog, value, onChange, disabled }: Props) {
  const activeSet = React.useMemo(() => new Set(value), [value])
  const enabledCount = value.length
  const totalCount = catalog.length

  function setModuleEnabled(label: string, enabled: boolean) {
    if (disabled) return
    const next = new Set(value)
    if (enabled) next.add(label)
    else next.delete(label)
    onChange([...next])
  }

  if (catalog.length === 0) {
    return <p className="text-sm text-muted-foreground">No licensed modules are configured.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={enabledCount > 0 ? 'success' : 'muted'}>
          {enabledCount} of {totalCount} enabled
        </Badge>
        <p className="text-xs text-muted-foreground">
          Set each module below. Changes are saved with company details.
        </p>
      </div>

      <div className="divide-y divide-border rounded-lg border border-border">
        {catalog.map(mod => {
          const enabled = activeSet.has(mod.label)
          return (
            <div
              key={mod.id}
              className="grid gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center sm:gap-4"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium text-foreground">{mod.label}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{mod.description}</p>
              </div>
              <Select
                value={enabled ? 'enabled' : 'disabled'}
                onValueChange={v => setModuleEnabled(mod.label, v === 'enabled')}
                disabled={disabled}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )
        })}
      </div>
    </div>
  )
}
