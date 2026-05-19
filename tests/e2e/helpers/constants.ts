/** Skip message when E2E API credentials are not configured in `.env`. */
export const E2E_SKIP_NO_API =
  'Set E2E_API_BASE_URL, E2E_LOGIN_EMAIL, and E2E_LOGIN_PASSWORD in `.env`.'

export const ROUTES = {
  home: '/',
  login: '/auth/login',
  serviceUsersAll: '/service-users/all',
  serviceUsersAdd: '/service-users/add',
  employeeStaffList: '/employee/staff-list',
  employeeAdd: '/employee/add',
  showcase: '/showcase',
} as const
