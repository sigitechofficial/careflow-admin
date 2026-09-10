import type { OrganisationAlertsSettings } from '@/features/settings/types'

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
    'Organisation setting for incident follow-up overdue timing. Independent notification behaviour is unchanged.',
  actionsOverdueMinutes:
    'Stored threshold (minutes) for incident follow-up overdue timing.',
  requiredCheckNotTicked:
    'Persisted organisation setting. Existing independent notification behaviour is unchanged.',
  requiredMedicationNotGiven:
    'Persisted organisation setting for medication not-given handling. Existing MAR notifications are unchanged.',
  scheduleJobsBeforeHours:
    'Persisted setting for operations dashboards.',
  beepOnNewAlert:
    'Persisted setting for operations dashboard sound.',
  fluidAlerts:
    'Persisted organisation setting for fluid-alert preferences.',
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
