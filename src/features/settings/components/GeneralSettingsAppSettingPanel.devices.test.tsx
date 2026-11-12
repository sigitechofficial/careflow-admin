import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mutateAsync, settings } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  settings: {
    appSettings: {
      pinCodeRequired: false,
      viewPoliciesCareApp: true,
      viewPoliciesRosterApp: true,
      bookHolidaysCareApp: true,
      fingerprintLoginCareApp: true,
      singleDeviceLoginCareApp: false,
      maxDevicesCareApp: 0,
      officeMultipleDeviceLogin: true,
      officeMaxDevices: 0,
    },
  },
}))
vi.mock('@/features/settings/hooks/useGeneralSettings', () => ({
  useGeneralSettings: () => ({ data: settings, isLoading: false, error: null }),
  useUpdateGeneralSettings: () => ({ mutateAsync, isPending: false }),
}))
vi.mock('@/features/auth/store', () => ({ useAuthStore: (sel: (s: { can: () => boolean }) => unknown) => sel({ can: () => true }) }))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))

import { GeneralSettingsAppSettingPanel } from './GeneralSettingsAppSettingPanel'

describe('Sign-in on more than one device', () => {
  beforeEach(() => {
    mutateAsync.mockReset()
    mutateAsync.mockImplementation(async () => settings)
  })

  it('office website and Care app: allow more than one, choose how many, or one only; saved together', async () => {
    render(<GeneralSettingsAppSettingPanel />)
    const office = screen.getByTestId('office-device-login')
    const care = screen.getByTestId('care-app-device-login')

    // More than one allowed: choose how many (No limit by default).
    await userEvent.selectOptions(within(office).getByLabelText('How many at once?'), 'Up to 2 browsers or devices')
    await userEvent.selectOptions(within(care).getByLabelText('How many at once?'), 'Up to 3 phones')

    // One phone only: the number goes, and the rule is said plainly.
    await userEvent.click(within(care).getByRole('switch'))
    expect(within(care).queryByLabelText('How many at once?')).toBeNull()
    expect(care).toHaveTextContent('signing in on another phone signs the first one out')

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        officeMultipleDeviceLogin: true,
        officeMaxDevices: 2,
        appSettingSingleDeviceLoginCareApp: true,
        appSettingMaxDevicesCareApp: 3,
      }),
    )
  })
})
