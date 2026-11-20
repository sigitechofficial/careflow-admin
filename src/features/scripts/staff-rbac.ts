/**
 * RBAC level → the office role the API gives a login at that level. Must stay aligned with careflow-api
 * `src/employee-employment/rbac-employment-sync.config.ts` (RBAC_LEVEL_TO_IDENTITY_ROLE_NAME); a level not listed
 * here is given the role of the same name.
 */
export const RBAC_LEVEL_ROLE: Record<string, string> = {
  'Group Administrator': 'Admin',
  Administrator: 'Admin',
  Manager: 'Manager',
  'Privacy Officer': 'Admin',
  'Operation Management': 'Manager',
  'Staff Allocation': 'Staff Allocation',
  'Master Staff Allocation': 'Master Staff Allocation',
  'Branch Administrator': 'Branch Admin',
  'Senior Carer/Nurse': 'Senior Carer/Nurse',
  'Carer/Domestic': 'Carer/Domestic',
}
