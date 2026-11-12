/**
 * Words people type for the same thing. A search for any word in a group also finds the others, so "PPE" finds
 * Equipment, "rota" finds Scheduling, "DBS" finds Compliance. Add to a group (or a new group) whenever someone
 * can't find something because they call it by another name. Lower case; phrases are allowed.
 */
export const EVERYDAY_WORD_GROUPS: string[][] = [
  ['ppe', 'equipment', 'gloves', 'aprons', 'masks'],
  ['rota', 'roster', 'schedule', 'scheduling', 'shifts', 'shift', 'allocation', 'runs', 'calls planner'],
  ['dbs', 'compliance', 'checks', 'right to work', 'visa', 'immigration', 'expiry', 'expiring'],
  ['holiday', 'holidays', 'leave', 'annual leave', 'absence', 'absences', 'time off', 'sickness', 'sick'],
  ['mar', 'emar', 'medication', 'medications', 'meds', 'medicines', 'medicine', 'drugs', 'prn', 'blister'],
  ['carer', 'carers', 'staff', 'employee', 'employees', 'worker', 'workers', 'care worker', 'colleague', 'team'],
  ['service user', 'service users', 'client', 'clients', 'resident', 'residents', 'patient', 'patients', 'customer', 'person we support', 'people we support'],
  ['complaint', 'complaints', 'compliment', 'compliments', 'feedback', 'concern', 'grumble'],
  ['safeguarding', 'abuse', 'harm', 'neglect', 'protection', 'adult protection'],
  ['incident', 'incidents', 'accident', 'accidents', 'fall', 'falls', 'near miss', 'injury'],
  ['invoice', 'invoices', 'billing', 'charge', 'charges', 'bill', 'bills', 'charge card'],
  ['pay', 'payroll', 'wages', 'wage', 'salary', 'salaries', 'payslip', 'payslips', 'pay card', 'pay rate', 'paye'],
  ['sign in', 'login', 'log in', 'logged out', 'signed out', 'kicked out', 'password', 'device', 'devices', 'multiple device', 'session', 'two factor', '2fa'],
  ['care plan', 'care plans', 'support plan', 'plan of care'],
  ['assessment', 'assessments', 'initial assessment', 'ia', 'pre assessment', 'needs assessment', 'risk assessment'],
  ['visit', 'visits', 'call', 'calls', 'job', 'jobs', 'appointment'],
  ['training', 'learning', 'course', 'courses', 'e-learning', 'elearning', 'certificate', 'certificates'],
  ['supervision', 'supervisions', 'appraisal', 'appraisals', 'spot check', 'spot checks', 'one to one', '1:1'],
  ['survey', 'surveys', 'questionnaire', 'questionnaires', 'quality survey'],
  ['independent reviewer', 'reviewer', 'reviewers', 'external evaluator', 'evaluator', 'auditor'],
  ['enquiry', 'enquiries', 'referral', 'referrals', 'lead', 'leads', 'crm', 'new client'],
  ['policy', 'policies', 'procedure', 'procedures', 'sop', 'handbook'],
  ['document', 'documents', 'file', 'files', 'upload', 'uploads', 'attachment', 'attachments', 'pdf'],
  ['gps', 'geofence', 'check in', 'check-in', 'clock in', 'clock out', 'ecm', 'electronic call monitoring', 'nfc', 'qr'],
  ['body map', 'body maps', 'wound', 'wounds', 'bruise', 'bruising', 'skin', 'pressure sore', 'pressure ulcer'],
  ['observations', 'observation', 'vitals', 'blood pressure', 'temperature', 'pulse', 'news2', 'weight'],
  ['alert', 'alerts', 'flag', 'flags', 'warning', 'warnings', 'critical information'],
  ['branch', 'branches', 'location', 'locations', 'site', 'sites'],
  ['funder', 'funders', 'local authority', 'council', 'commissioner', 'icb', 'nhs', 'funding'],
  ['contact', 'contacts', 'next of kin', 'nok', 'family', 'relative', 'relatives'],
  ['task', 'tasks', 'to do', 'todo', 'actions', 'my actions'],
  ['report', 'reports', 'analytics', 'dashboard', 'stats', 'statistics', 'kpi', 'insight'],
  ['audit', 'audit log', 'log', 'logs', 'history', 'trail'],
  ['notification', 'notifications', 'message', 'messages', 'email', 'emails', 'sms', 'text', 'texts'],
  ['permission', 'permissions', 'role', 'roles', 'access', 'users', 'office users', 'responsibility', 'responsibilities'],
  ['recruitment', 'candidate', 'candidates', 'applicant', 'applicants', 'hiring', 'vacancy', 'vacancies', 'interview'],
  ['timesheet', 'timesheets', 'hours', 'over care', 'overtime'],
  ['mileage', 'travel', 'travel time', 'distance'],
  ['cqc', 'inspector', 'inspection', 'inspectors', 'regulator', 'kloe', 'evidence'],
  ['dementia', 'learning disability', 'pictures', 'picture', 'easy read', 'communication'],
  ['company', 'organisation', 'organization', 'business details', 'logo', 'branding'],
  ['on call', 'on-call', 'out of hours', 'emergency'],
  ['pathway', 'pathways', 'specialist pathway', 'end of life', 'palliative', 'reablement'],
  ['service user portal', 'portal', 'family portal', 'client portal'],
  ['quotation', 'quote', 'quotes', 'price', 'pricing'],
]

/** word → every word in its groups (itself included). */
export const EVERYDAY_WORDS: Map<string, string[]> = (() => {
  const map = new Map<string, Set<string>>()
  for (const group of EVERYDAY_WORD_GROUPS) {
    for (const w of group) {
      const set = map.get(w) ?? new Set<string>()
      group.forEach(g => set.add(g))
      map.set(w, set)
    }
  }
  return new Map([...map].map(([k, v]) => [k, [...v]]))
})()
