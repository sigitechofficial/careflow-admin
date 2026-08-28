import type {
  CandidateDocumentType,
  CandidateSource,
  CandidateStage,
  RecruitmentEmploymentType,
  VacancyStatus,
} from '@/features/hr/recruitment/api/recruitment.api'

export const PIPELINE_STAGES: CandidateStage[] = [
  'APPLIED',
  'SCREENING',
  'SHORTLISTED',
  'INTERVIEW',
  'ASSESSMENT',
  'OFFER',
  'VETTING',
  'ACCEPTED',
]

export function candidateStageLabel(stage: CandidateStage): string {
  return stage.replace(/_/g, ' ')
}

export function vacancyStatusLabel(status: VacancyStatus): string {
  return status.replace(/_/g, ' ')
}

export function candidateSourceLabel(source: CandidateSource): string {
  return source.replace(/_/g, ' ')
}

export function employmentTypeLabel(type: RecruitmentEmploymentType): string {
  return type.replace(/_/g, ' ')
}

export function candidateDocumentTypeLabel(type: CandidateDocumentType): string {
  return type.replace(/_/g, ' ')
}

export function nextPipelineStage(stage: CandidateStage): CandidateStage | null {
  const idx = PIPELINE_STAGES.indexOf(stage)
  if (idx < 0 || idx >= PIPELINE_STAGES.length - 1) return null
  return PIPELINE_STAGES[idx + 1] ?? null
}

export function prevPipelineStage(stage: CandidateStage): CandidateStage | null {
  const idx = PIPELINE_STAGES.indexOf(stage)
  if (idx <= 0) return null
  return PIPELINE_STAGES[idx - 1] ?? null
}
