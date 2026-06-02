import * as React from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type { EmergencyContactRow } from '@/features/employees/types'
import {
  useCreateEmergencyContact,
  useDeleteEmergencyContact,
  useEmergencyContacts,
  useUpdateEmergencyContact,
} from '@/features/employees/hooks/useEmployeeProfileExtras'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

type DraftRow =
  | (EmergencyContactRow & { isDraft?: false })
  | {
      id?: undefined
      clientKey: string
      firstName: string
      lastName: string
      relationship: string
      phone: string
      isDraft: true
    }

function isDraft(r: DraftRow): r is Extract<DraftRow, { isDraft: true }> {
  return 'isDraft' in r && r.isDraft === true
}

export function EmployeeEmergencyContactsEditor({
  employeeId,
  apiReady,
}: {
  employeeId: string | null
  apiReady: boolean
}) {
  const contactsQuery = useEmergencyContacts(employeeId, !!employeeId && apiReady)
  const createMutation = useCreateEmergencyContact(employeeId ?? '')
  const updateMutation = useUpdateEmergencyContact(employeeId ?? '')
  const deleteMutation = useDeleteEmergencyContact(employeeId ?? '')

  const [rows, setRows] = React.useState<DraftRow[]>([])
  const loading = contactsQuery.isLoading
  const [actionError, setActionError] = React.useState<string | null>(null)
  const error =
    actionError ??
    (contactsQuery.error instanceof ApiError
      ? contactsQuery.error.message
      : contactsQuery.error
        ? 'Could not load contacts.'
        : null)
  const [savingKey, setSavingKey] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!employeeId || !apiReady) {
      setRows([])
      return
    }
    if (contactsQuery.data) {
      setRows(contactsQuery.data.map(r => ({ ...r, isDraft: false as const })))
    }
  }, [employeeId, apiReady, contactsQuery.data])

  const addDraft = () => {
    setRows(prev => [
      ...prev,
      {
        clientKey: `draft_${Date.now()}`,
        firstName: '',
        lastName: '',
        relationship: '',
        phone: '',
        isDraft: true,
      },
    ])
  }

  const updateRow = (
    key: string,
    patch: Partial<{ firstName: string; lastName: string; relationship: string; phone: string }>,
  ) => {
    setRows(prev =>
      prev.map(r => {
        const k = isDraft(r) ? r.clientKey : r.id
        if (k !== key) return r
        return { ...r, ...patch }
      }),
    )
  }

  const removeRow = async (row: DraftRow) => {
    if (!employeeId || !apiReady) return
    if (isDraft(row)) {
      setRows(prev => prev.filter(r => !(isDraft(r) && r.clientKey === row.clientKey)))
      return
    }
    setSavingKey(row.id)
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(row.id)
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Delete failed.')
    } finally {
      setSavingKey(null)
    }
  }

  const saveRow = async (row: DraftRow) => {
    if (!employeeId || !apiReady) return
    const firstName = row.firstName.trim()
    const lastName = row.lastName.trim()
    const relationship = row.relationship.trim()
    const phone = row.phone.trim()
    if (!firstName || !lastName || !relationship || !phone) {
      setActionError('Each contact needs first name, last name, relationship, and phone.')
      return
    }
    const key = isDraft(row) ? row.clientKey : row.id
    setSavingKey(key)
    setActionError(null)
    try {
      if (isDraft(row)) {
        await createMutation.mutateAsync({ firstName, lastName, relationship, phone })
      } else {
        await updateMutation.mutateAsync({
          contactId: row.id,
          body: { firstName, lastName, relationship, phone },
        })
      }
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Save failed.')
    } finally {
      setSavingKey(null)
    }
  }

  if (!employeeId) {
    return (
      <p className="text-sm text-muted-foreground">
        Save personal details first — then you can add emergency contacts here.
      </p>
    )
  }

  if (!apiReady) {
    return <p className="text-sm text-muted-foreground">Sign in with API configured to manage emergency contacts.</p>
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading contacts…</p> : null}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {['First name', 'Last name', 'Relationship', 'Phone', ''].map(h => (
                <th key={h || 'actions'} className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  No contacts yet. Use &quot;Add contact&quot; to create one.
                </td>
              </tr>
            ) : (
              rows.map(row => {
                const key = isDraft(row) ? row.clientKey : row.id
                return (
                  <tr key={key} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 align-top">
                      <Input
                        value={row.firstName}
                        onChange={e => updateRow(key, { firstName: e.target.value })}
                        placeholder="First name"
                        className="h-9 min-w-[7rem]"
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Input
                        value={row.lastName}
                        onChange={e => updateRow(key, { lastName: e.target.value })}
                        placeholder="Last name"
                        className="h-9 min-w-[7rem]"
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Input
                        value={row.relationship}
                        onChange={e => updateRow(key, { relationship: e.target.value })}
                        placeholder="e.g. Spouse"
                        className="h-9 min-w-[6rem]"
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Input
                        value={row.phone}
                        onChange={e => updateRow(key, { phone: e.target.value })}
                        placeholder="Phone"
                        className="h-9 min-w-[8rem]"
                      />
                    </td>
                    <td className="px-3 py-2 align-top whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-8 gap-1 px-2"
                          disabled={savingKey === key}
                          onClick={() => void saveRow(row)}
                        >
                          <Save className="h-3.5 w-3.5" />
                          {isDraft(row) ? 'Add' : 'Save'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-destructive"
                          disabled={savingKey === key}
                          onClick={() => void removeRow(row)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addDraft} disabled={loading}>
        <Plus className="h-4 w-4" />
        Add contact
      </Button>
    </div>
  )
}
