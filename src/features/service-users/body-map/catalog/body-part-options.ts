import type { ComboboxOption } from '@/shared/ui/combobox'
import {
  BODY_PART_NAMES,
  LEANING_BODY_PART_NAMES,
  LEANING_BODY_PART_POSITION,
  SITTING_BODY_PART_NAMES,
} from '@/features/service-users/body-map/catalog/body-part-names'

const GROUP_GENERAL = 'General body parts'
const GROUP_LEANING = 'Leaning posture'
const GROUP_SITTING = 'Sitting posture'

function addParts(
  seen: Set<string>,
  out: ComboboxOption[],
  group: string,
  parts: readonly string[],
  positionHint?: (part: string) => string | undefined,
) {
  for (const part of parts) {
    if (seen.has(part)) continue
    seen.add(part)
    const hint = positionHint?.(part)
    out.push({
      value: part,
      label: part,
      description: hint ? `${group} · ${hint}` : group,
    })
  }
}

/** Searchable combobox options; posture groups surface first when marker is on leaning/sitting map. */
export function buildBodyPartComboboxOptions(canvasView?: string | null): ComboboxOption[] {
  const seen = new Set<string>()
  const out: ComboboxOption[] = []

  const leaningHint = (part: string) =>
    LEANING_BODY_PART_POSITION[part as keyof typeof LEANING_BODY_PART_POSITION]

  if (canvasView === 'leaning') {
    addParts(seen, out, GROUP_LEANING, LEANING_BODY_PART_NAMES, leaningHint)
    addParts(seen, out, GROUP_GENERAL, BODY_PART_NAMES)
    addParts(seen, out, GROUP_SITTING, SITTING_BODY_PART_NAMES)
  } else if (canvasView === 'sitting') {
    addParts(seen, out, GROUP_SITTING, SITTING_BODY_PART_NAMES)
    addParts(seen, out, GROUP_GENERAL, BODY_PART_NAMES)
    addParts(seen, out, GROUP_LEANING, LEANING_BODY_PART_NAMES, leaningHint)
  } else {
    addParts(seen, out, GROUP_GENERAL, BODY_PART_NAMES)
    addParts(seen, out, GROUP_LEANING, LEANING_BODY_PART_NAMES, leaningHint)
    addParts(seen, out, GROUP_SITTING, SITTING_BODY_PART_NAMES)
  }

  return out
}

/** Flat deduplicated list for legacy selects / validation */
export function allBodyPartNames(): string[] {
  return buildBodyPartComboboxOptions().map(o => o.value)
}
