function normalizeBranchLabelToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseLocationLabel(name: string): { zoneName: string; branchName: string } {
  if (!name.trim()) return { zoneName: '', branchName: '' }
  const idx = name.indexOf(' - ')
  if (idx === -1) return { zoneName: name.trim(), branchName: name.trim() }
  return {
    zoneName: name.slice(0, idx).trim(),
    branchName: name.slice(idx + 3).trim(),
  }
}

function pushLayer(layers: string[], value: string | null | undefined): void {
  const trimmed = value?.trim()
  if (!trimmed) return
  const norm = normalizeBranchLabelToken(trimmed)
  if (layers.some((layer) => normalizeBranchLabelToken(layer) === norm)) return
  layers.push(trimmed)
}

function buildLayersFromFields(input: {
  locationName?: string | null
  zoneName?: string | null
  branchName?: string | null
}): string[] {
  const layers: string[] = []
  const location = input.locationName?.trim()
  const parsed = location ? parseLocationLabel(location) : { zoneName: '', branchName: '' }

  const zoneCandidates = [input.zoneName, parsed.zoneName]
  for (const candidate of zoneCandidates) {
    if (!candidate?.trim()) continue
    const zonePart = candidate.includes(' - ')
      ? parseLocationLabel(candidate).zoneName
      : candidate.trim()
    if (zonePart) pushLayer(layers, zonePart)
    if (layers.length) break
  }

  const branchCandidates = [input.branchName, parsed.branchName]
  for (const candidate of branchCandidates) {
    if (!candidate?.trim()) continue
    pushLayer(layers, candidate.trim())
    break
  }

  if (
    layers.length === 2 &&
    layers[0] != null &&
    layers[1] != null &&
    normalizeBranchLabelToken(layers[0]) === normalizeBranchLabelToken(layers[1])
  ) {
    return [layers[1]]
  }

  if (!layers.length && location) {
    pushLayer(layers, parsed.branchName || parsed.zoneName || location)
  }

  return layers
}

export function formatServiceUserBranchLabel(input: {
  locationId?: string | null
  locationName?: string | null
  zoneName?: string | null
  branchName?: string | null
  branchLayers?: string[] | null
  displayLabel?: string | null
  notAssignedLabel?: string
}): string {
  const unassigned =
    !input.locationId &&
    !input.displayLabel &&
    !input.branchLayers?.length &&
    !input.branchName &&
    !input.zoneName &&
    !input.locationName

  if (unassigned) return input.notAssignedLabel ?? 'Not assigned'

  if (input.displayLabel?.trim()) return input.displayLabel.trim()

  const layers = input.branchLayers?.filter(Boolean) ?? buildLayersFromFields(input)
  if (layers.length) return layers.join(' · ')

  return input.notAssignedLabel ?? '—'
}

export function branchLayerCount(input: {
  branchLayers?: string[] | null
  zoneName?: string | null
  branchName?: string | null
  locationName?: string | null
  displayLabel?: string | null
}): number {
  if (input.branchLayers?.length) return input.branchLayers.length
  return buildLayersFromFields(input).length
}
