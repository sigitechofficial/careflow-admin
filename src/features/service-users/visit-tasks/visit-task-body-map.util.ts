/** Catalogue `flagsJson.feedsObservation` includes `body_map`. */
export function catalogueFeedsBodyMap(
  flagsJson: Record<string, unknown> | null | undefined,
): boolean {
  const feeds = flagsJson?.feedsObservation
  if (!Array.isArray(feeds)) return false
  return feeds.some((raw) => String(raw).toLowerCase() === 'body_map')
}
