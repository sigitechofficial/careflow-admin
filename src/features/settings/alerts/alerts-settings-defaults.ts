import type { OrganisationAlertsSettings } from '@/lib/general-settings-api'

export const DEFAULT_ALERTS_SETTINGS: OrganisationAlertsSettings = {
  actionsOverdueEnabled: true,
  actionsOverdueMinutes: 30,
  requiredCheckNotTicked: true,
  requiredMedicationNotGiven: true,
  scheduleJobsBeforeHours: 24,
  beepOnNewAlert: true,
  fluidAlertsEnabled: false,
}

export const ALERTS_TOOLTIPS = {
  actionsOverdue:
    "If yes, actions with times will appear on the manager's dashboard when they are overdue by the time defined below.",
  actionsOverdueMinutes:
    'Number of minutes after the scheduled time before an overdue action appears on the manager dashboard.',
  requiredCheckNotTicked:
    "If yes, required checks not ticked off with times will appear on the manager's dashboard.",
  requiredMedicationNotGiven:
    'If yes, alerts appear when required medication has not been given as scheduled.',
  scheduleJobsBeforeHours:
    'How many hours before the start time schedule jobs are retrieved for the operations dashboard.',
  beepOnNewAlert: 'Sound Alerts on Operations Dashboard when new alert arrives.',
  fluidAlerts: 'Enable fluid intake and output alerting for service users.',
} as const

export function alertsSettingsToPayload(s: OrganisationAlertsSettings) {
  return {
    alertActionsOverdueEnabled: s.actionsOverdueEnabled,
    alertActionsOverdueMinutes: s.actionsOverdueMinutes,
    alertRequiredCheckNotTicked: s.requiredCheckNotTicked,
    alertRequiredMedicationNotGiven: s.requiredMedicationNotGiven,
    alertScheduleJobsBeforeHours: s.scheduleJobsBeforeHours,
    alertBeepOnNewAlert: s.beepOnNewAlert,
    alertFluidAlertsEnabled: s.fluidAlertsEnabled,
  }
}

export function clampAlertsDraft(s: OrganisationAlertsSettings): OrganisationAlertsSettings {
  return {
    ...s,
    actionsOverdueMinutes: Math.min(1440, Math.max(1, Math.round(s.actionsOverdueMinutes) || 30)),
    scheduleJobsBeforeHours: Math.min(168, Math.max(1, Math.round(s.scheduleJobsBeforeHours) || 24)),
  }
}
