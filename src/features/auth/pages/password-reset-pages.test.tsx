import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const routerState = vi.hoisted(() => ({ searchStr: '', apiBase: 'https://example-api.test' }))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...rest }: { to: string; children?: React.ReactNode } & Record<string, unknown>) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useRouterState: ({ select }: { select: (s: { location: { searchStr: string } }) => unknown }) =>
    select({ location: { searchStr: routerState.searchStr } }),
}))

vi.mock('@/shared/lib/api-base', () => ({
  getApiBaseUrl: () => routerState.apiBase,
}))

import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage'

function withQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>
}

const fetchMock = vi.fn()

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  routerState.searchStr = ''
  routerState.apiBase = 'https://example-api.test'
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ForgotPasswordPage', () => {
  it('posts the email and shows the generic confirmation (form hidden)', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { success: true, message: 'Anything the server says', data: null, meta: null }),
    )
    render(withQuery(<ForgotPasswordPage />))

    await userEvent.type(screen.getByLabelText('Email'), '  someone@example.com ')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByTestId('forgot-confirmation')).toHaveTextContent(
      "If an account exists for that email, we've sent a link to reset your password. The link expires in 60 minutes.",
    )
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://example-api.test/auth/forgot-password')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ email: 'someone@example.com' })
    expect(new Headers(init.headers).has('Authorization')).toBe(false)
  })

  it('shows the rate-limit message on 429', async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, { message: 'ThrottlerException: Too Many Requests' }))
    render(withQuery(<ForgotPasswordPage />))

    await userEvent.type(screen.getByLabelText('Email'), 'someone@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByTestId('forgot-error')).toHaveTextContent(
      'Too many requests. Please wait a few minutes and try again.',
    )
    expect(screen.queryByTestId('forgot-confirmation')).not.toBeInTheDocument()
  })

  it('shows a generic error on other failures', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { message: 'Internal server error' }))
    render(withQuery(<ForgotPasswordPage />))

    await userEvent.type(screen.getByLabelText('Email'), 'someone@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByTestId('forgot-error')).toHaveTextContent('Something went wrong. Please try again.')
  })

  it('demo mode (no API URL) shows the confirmation without any network call', async () => {
    routerState.apiBase = ''
    render(withQuery(<ForgotPasswordPage />))

    await userEvent.type(screen.getByLabelText('Email'), 'someone@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByTestId('forgot-confirmation')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('ResetPasswordPage', () => {
  it('shows the invalid-link message when there is no token', () => {
    render(withQuery(<ResetPasswordPage />))

    expect(screen.getByTestId('reset-invalid-link')).toHaveTextContent('This reset link is invalid or has expired.')
    expect(screen.getByRole('link', { name: 'Request a new reset link' })).toHaveAttribute(
      'href',
      '/auth/forgot-password',
    )
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
  })

  it('blocks mismatched passwords without calling the API', async () => {
    routerState.searchStr = '?token=abc123'
    render(withQuery(<ResetPasswordPage />))

    await userEvent.type(screen.getByLabelText('New password'), 'Password123')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'Password124')
    await userEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(screen.getByTestId('reset-error')).toHaveTextContent('Passwords do not match.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('blocks passwords shorter than 8 characters', async () => {
    routerState.searchStr = '?token=abc123'
    render(withQuery(<ResetPasswordPage />))

    await userEvent.type(screen.getByLabelText('New password'), 'short')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'short')
    await userEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(screen.getByTestId('reset-error')).toHaveTextContent('Password must be at least 8 characters.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the API message on 400', async () => {
    routerState.searchStr = '?token=abc123'
    fetchMock.mockResolvedValue(
      jsonResponse(400, { success: false, message: 'This reset link is invalid or has expired.' }),
    )
    render(withQuery(<ResetPasswordPage />))

    await userEvent.type(screen.getByLabelText('New password'), 'Password123')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'Password123')
    await userEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(await screen.findByTestId('reset-error')).toHaveTextContent('This reset link is invalid or has expired.')
    expect(screen.getByRole('link', { name: 'Request a new reset link' })).toBeInTheDocument()
  })

  it('keeps an all-digit token as a string and shows success', async () => {
    routerState.searchStr = '?token=00123456789012345678901234567890'
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, message: 'OK', data: null, meta: null }))
    render(withQuery(<ResetPasswordPage />))

    await userEvent.type(screen.getByLabelText('New password'), 'Password123')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'Password123')
    await userEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(await screen.findByTestId('reset-success')).toHaveTextContent(
      'Your password has been reset. You can now sign in.',
    )
    expect(screen.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', '/auth/login')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://example-api.test/auth/reset-password')
    expect(JSON.parse(String(init.body))).toEqual({
      token: '00123456789012345678901234567890',
      newPassword: 'Password123',
    })
    expect(url).not.toContain('Password123')
  })
})
