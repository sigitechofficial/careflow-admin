export const LEARNING_PATHS = {
  root: '/learning',
  dashboard: '/learning/dashboard',
  courses: '/learning/courses',
  courseNew: '/learning/courses/new',
  courseDetail: '/learning/courses/$courseId',
  assignments: '/learning/assignments',
  compliance: '/learning/compliance',
  trainingEvents: '/learning/training-events',
  certificates: '/learning/certificates',
  externalTraining: '/learning/external-training',
  reports: '/learning/reports',
  settings: '/learning/settings',
} as const

export type LearningPathKey = keyof typeof LEARNING_PATHS
