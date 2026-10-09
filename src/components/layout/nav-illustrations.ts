/**
 * Colourful illustrations used in place of line icons in the navigation (rail, page panel,
 * module landing pages, coming-soon page). Files live in public/illustrations/fluent/ and come from
 * Microsoft Fluent Emoji (flat style, MIT licence — see public/illustrations/fluent/LICENSE.txt).
 *
 * Keyed by the menu label in Sidebar.tsx. A label with no entry keeps its line icon.
 */

/** Top-level modules (rail, panel header, landing page header). */
export const MODULE_ILLUSTRATION: Record<string, string> = {
  Home: 'house-with-garden',
  'My tasks': 'clipboard',
  'Service Users': 'older-person',
  'Care Operations': 'spiral-calendar',
  Workforce: 'woman-health-worker',
  Learning: 'graduation-cap',
  'Quality & Compliance': 'shield',
  Finance: 'money-bag',
  Messages: 'speech-balloon',
  Reports: 'bar-chart',
  Administration: 'gear',
}

/** Pages inside modules (page panel, hover menu, landing page tiles). */
export const PAGE_ILLUSTRATION: Record<string, string> = {
  // Service users
  'All Service Users': 'busts-in-silhouette',
  'Add Service User': 'bust-in-silhouette',
  'Service User hours': 'hourglass-not-done',
  Calendar: 'tear-off-calendar',
  'Portal access': 'globe-showing-europe-africa',
  'Referrals & enquiries': 'inbox-tray',
  'Private quotations': 'receipt',
  'Family & funder access': 'people-hugging',
  'Initial Assessment': 'clipboard',
  'Initial Assessment (Legacy)': 'card-file-box',
  'IA review queue': 'magnifying-glass-tilted-left',
  'Assessment review queue': 'check-mark-button',
  'Care plan reviews': 'memo',
  'Care Pathway': 'world-map',
  'Discharge & closure': 'door',

  // Care operations
  'Schedule Jobs': 'spiral-calendar',
  'Bulk generate rota': 'calendar',
  'Manage Schedule Jobs': 'card-index-dividers',
  'List View of Schedule': 'page-facing-up',
  'Rota suggestions & sickness cover': 'sparkles',
  'Route planning': 'motorway',
  'Live monitoring': 'satellite-antenna',
  'ECM graph': 'chart-increasing',
  'Visit reconciliation': 'balance-scale',
  'Live staff map': 'round-pushpin',
  'Voice notes to text': 'studio-microphone',
  'Medication exceptions': 'pill',
  'Stock & pharmacy orders': 'package',

  // Workforce
  'All Employee': 'woman-health-worker',
  'Add Employee': 'man-health-worker',
  'Compliance board': 'identification-card',
  'General Employee Documents': 'file-folder',
  'Employee hours': 'stopwatch',
  'Hours approvals': 'check-box-with-check',
  'Absence tracker': 'face-with-thermometer',
  Recruitment: 'briefcase',
  'Supervision & appraisals': 'handshake',

  // Learning
  'Learning dashboard': 'graduation-cap',
  Courses: 'books',
  Assignments: 'spiral-notepad',
  'Training events': 'teacher',
  'Course library': 'open-book',
  'Virtual competency checks': 'bullseye',
  'Training compliance': 'check-mark-button',
  Certificates: 'scroll',
  'External training': 'school',
  'Learning settings': 'gear',

  // Quality & compliance
  'Incident dashboard': 'warning',
  'All Incidents': 'file-cabinet',
  'Raise Incident': 'red-exclamation-mark',
  'My Actions': 'writing-hand',
  'Complaints & Compliments': 'left-speech-bubble',
  'Safeguarding cases': 'heart-hands',
  'Policy Library': 'ledger',
  'Policy categories': 'card-index',
  'Policy tags': 'label',
  'Signature requests': 'fountain-pen',
  Surveys: 'ballot-box-with-ballot',
  Audits: 'magnifying-glass-tilted-right',
  'Mock CQC inspection': 'glowing-star',
  'Action plans & evidence': 'bookmark-tabs',
  'Risk & assurance register': 'stop-sign',
  'CQC notifications': 'outbox-tray',

  // Finance
  'Billing management': 'pound-banknote',
  'Invoice runs': 'receipt',
  'Invoice audit trail': 'magnifying-glass-tilted-right',
  'Client payments & Direct Debit': 'credit-card',
  'Accounting export': 'outbox-tray',
  Salary: 'money-with-wings',
  'Employee payouts': 'coin',
  'Pay items': 'label',
  'On-demand pay': 'high-voltage',
  'Payroll overview': 'bank',
  'UK payroll runs': 'chart-increasing',
  Payslips: 'page-with-curl',
  Taxes: 'classical-building',
  'Employer PAYE': 'office-building',
  'Payroll employee setup': 'identification-card',
  'Schedules & periods': 'tear-off-calendar',
  'Tax years': 'calendar',
  'Office salaries': 'briefcase',

  // Messages
  'Staff messaging': 'speech-balloon',
  'SMS to staff & clients': 'mobile-phone',
  Announcements: 'megaphone',

  // Reports
  'Scheduling reports': 'spiral-calendar',
  'Carer reports': 'woman-health-worker',
  'ECM reports': 'satellite-antenna',
  'Incident analytics': 'chart-increasing',
  'Learning reports': 'graduation-cap',
  'Dashboards & KPIs': 'bar-chart',
  'Budgets & targets': 'bullseye',

  // Administration
  'Setup checklist': 'check-box-with-check',
  'Company Details': 'office-building',
  'Location Management': 'round-pushpin',
  'Roles & permissions': 'key',
  'Temporary Inspector Login': 'identification-card',
  'General Settings': 'gear',
  'Lookup data': 'card-index',
  'Tasks planner': 'spiral-notepad',
  'Automation rules': 'counterclockwise-arrows-button',
  'Audit log': 'scroll',
  Security: 'locked',
  'GP Connect': 'stethoscope',
  'Pharmacy integration': 'pill',
  Telecare: 'bell',
  'AI assistant': 'robot',
}

export function illustrationSrc(name: string): string {
  return `/illustrations/fluent/${name}.svg`
}
