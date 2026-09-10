/** Shared board column grouping (mirrors API BOARD_COLUMN_DEFS groups). */
export const COMPLIANCE_BOARD_GROUPS: Array<{ id: string; label: string; codes: string[] }> = [
  {
    id: 'identity',
    label: 'Identity & RTW',
    codes: ['DBS', 'DBS_CODE', 'BIOMETRIC_CARD'],
  },
  {
    id: 'performance',
    label: 'Performance',
    codes: ['ANNUAL_APPRAISAL', 'SUPERVISION'],
  },
  {
    id: 'references',
    label: 'References',
    codes: ['REFERENCE_1', 'REFERENCE_2'],
  },
  {
    id: 'employment',
    label: 'Employment',
    codes: ['MEDICAL_QUESTIONNAIRE', 'ID_PASSPORT', 'INDUCTION_CHECKLIST', 'EMPLOYMENT_CONTRACT', 'PROBATION'],
  },
]

export function formatBoardDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(`${iso}T12:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return iso
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

export type CellPresentation = {
  primary: string
  secondary: string | null
  tone: 'muted' | 'quiet' | 'warning' | 'urgent' | 'danger' | 'missing'
}

/**
 * Compact cell copy for the operational matrix.
 * Visual weight is applied via cellToneClass — valid/N/A stay quiet.
 */
export function presentBoardCell(input: {
  applicable: boolean
  effectiveStatus: string
  daysRemaining: number | null
  expiryDate: string | null
  blocksRostering?: boolean
}): CellPresentation {
  if (!input.applicable || input.effectiveStatus === 'NOT_APPLICABLE') {
    return { primary: 'N/A', secondary: null, tone: 'muted' }
  }
  if (input.effectiveStatus === 'NO_LONGER_REQUIRED') {
    return { primary: 'N/A', secondary: null, tone: 'muted' }
  }

  const date = formatBoardDate(input.expiryDate)
  const days = input.daysRemaining

  if (input.effectiveStatus === 'MISSING' || input.effectiveStatus === 'REQUIRED') {
    return { primary: 'MISSING', secondary: null, tone: 'missing' }
  }
  if (input.effectiveStatus === 'REJECTED') {
    return { primary: 'REJECTED', secondary: date, tone: 'danger' }
  }
  if (input.effectiveStatus === 'EXPIRED' || (days != null && days < 0)) {
    const overdue = days != null ? Math.abs(days) : null
    return {
      primary: 'EXPIRED',
      secondary:
        overdue != null
          ? `${overdue}d overdue${date ? ` · ${date}` : ''}`
          : date,
      tone: 'danger',
    }
  }
  if (days === 0) {
    return { primary: 'EXPIRES TODAY', secondary: date, tone: 'urgent' }
  }
  if (days != null && days >= 1 && days <= 7) {
    return {
      primary: `${days}D LEFT`,
      secondary: date,
      tone: 'urgent',
    }
  }
  if (days != null && days >= 8 && days <= 30) {
    return {
      primary: `${days}D LEFT`,
      secondary: date,
      tone: 'warning',
    }
  }
  if (input.effectiveStatus === 'PENDING_REVIEW' || input.effectiveStatus === 'SUBMITTED') {
    return { primary: 'REVIEW', secondary: date, tone: 'warning' }
  }
  if (input.effectiveStatus === 'VALID' || input.effectiveStatus === 'EXPIRING_SOON') {
    return { primary: 'VALID', secondary: date, tone: 'quiet' }
  }
  return { primary: input.effectiveStatus.replace(/_/g, ' '), secondary: date, tone: 'quiet' }
}

/** Tone classes — exceptions strong, valid/N/A quiet (no wall of coloured boxes). */
export function cellToneClass(tone: CellPresentation['tone']): string {
  switch (tone) {
    case 'danger':
      return 'bg-destructive/12 text-destructive ring-1 ring-inset ring-destructive/25'
    case 'urgent':
      return 'bg-warning/12 text-warning ring-1 ring-inset ring-warning/30'
    case 'warning':
      return 'text-warning'
    case 'missing':
      return 'border border-dashed border-border/80 text-foreground/80'
    case 'muted':
      return 'text-muted-foreground/45'
    case 'quiet':
    default:
      return 'text-muted-foreground/65'
  }
}
