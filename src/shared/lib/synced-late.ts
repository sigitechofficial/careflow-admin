/** A clock-in/out that reached the server later than this is shown as "Synced late". */
const SYNCED_LATE_THRESHOLD_MS = 5 * 60_000

/**
 * True when the server received a clock-in/out well after it happened on the carer's
 * phone (the phone was offline). The recorded time then comes from the phone's clock.
 */
export function isSyncedLate(
  occurredAt: string | null | undefined,
  receivedAt: string | null | undefined,
): boolean {
  if (!occurredAt || !receivedAt) return false
  const occurred = new Date(occurredAt).getTime()
  const received = new Date(receivedAt).getTime()
  if (Number.isNaN(occurred) || Number.isNaN(received)) return false
  return received - occurred > SYNCED_LATE_THRESHOLD_MS
}
