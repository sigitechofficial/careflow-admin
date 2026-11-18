import * as React from 'react'
import { Input } from '@/shared/ui/input'

/** Same rule as the API (MinLength 8). */
export const MIN_STAFF_PASSWORD = 8

export type PasswordChoice = { mode: 'link' } | { mode: 'password'; password: string }

/** null when the choice can be saved, else what to fix. */
export function passwordChoiceError(mode: 'link' | 'password', password: string, confirm: string): string | null {
  if (mode === 'link') return null
  if (password.length < MIN_STAFF_PASSWORD) return `Use at least ${MIN_STAFF_PASSWORD} characters.`
  if (password !== confirm) return 'The passwords don’t match.'
  return null
}

/**
 * How the person gets their password when access is given: an emailed link to choose their own (recommended), or a
 * password the office sets now and gives them itself. Either way the welcome email never contains a password.
 */
export function PasswordChoiceForm({
  name,
  idPrefix,
  allowLink = true,
  onChange,
}: {
  name: string
  idPrefix: string
  /** false: only "set a password now" (changing the password of access that's already on). */
  allowLink?: boolean
  onChange: (choice: PasswordChoice | null) => void
}) {
  const [mode, setMode] = React.useState<'link' | 'password'>(allowLink ? 'link' : 'password')
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const error = passwordChoiceError(mode, password, confirm)

  React.useEffect(() => {
    onChange(error ? null : mode === 'link' ? { mode: 'link' } : { mode: 'password', password })
  }, [mode, password, error, onChange])

  return (
    <div className="space-y-2 text-sm" data-testid={`${idPrefix}-password-choice`}>
      {allowLink ? (
        <fieldset className="space-y-1.5">
          <legend className="sr-only">How {name} gets a password</legend>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name={`${idPrefix}-mode`}
              className="mt-0.5"
              checked={mode === 'link'}
              onChange={() => setMode('link')}
              data-testid={`${idPrefix}-mode-link`}
            />
            <span>
              Email {name} a link to choose their own password <span className="text-muted-foreground">(recommended)</span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name={`${idPrefix}-mode`}
              className="mt-0.5"
              checked={mode === 'password'}
              onChange={() => setMode('password')}
              data-testid={`${idPrefix}-mode-password`}
            />
            <span>Set a password now and give it to {name} yourself</span>
          </label>
        </fieldset>
      ) : null}
      {mode === 'password' ? (
        <div className="space-y-1.5">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="Password"
              aria-label="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              data-testid={`${idPrefix}-password`}
            />
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="Confirm password"
              aria-label="Confirm password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              data-testid={`${idPrefix}-password-confirm`}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            It works for the website and the Care app. The welcome email won’t include it, so tell {name} yourself.
          </p>
          {password && error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
