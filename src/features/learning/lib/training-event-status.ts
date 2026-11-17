/** A scheduled session whose end time has passed shows as "Ended" (display only, the stored status is unchanged). */
export function trainingEventDisplayStatus(e: { status?: string | null; endAt: string }): string {
  const status = e.status ?? 'SCHEDULED'
  if ((status === 'SCHEDULED' || status === 'IN_PROGRESS') && new Date(e.endAt).getTime() < Date.now()) return 'ENDED'
  return status
}
