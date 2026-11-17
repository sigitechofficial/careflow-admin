import { CheckCircle2, ClipboardCheck, Download, ExternalLink, PlayCircle } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { RichTextHtml } from '@/shared/ui/rich-text-html'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import type { LearningContentItem, LearningCourse, LearningCourseVersion } from '@/features/learning/types/learning.types'
import { formatFileSize, learningApiUrl, lessonTypeInfo } from '@/features/learning/lib/learning-lesson'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: LearningCourse
  version: LearningCourseVersion
}

function LinkOut({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-primary hover:bg-muted/50"
    >
      {children}
    </a>
  )
}

export function LessonBody({ lesson }: { lesson: LearningContentItem }) {
  switch (lesson.contentType) {
    case 'TEXT':
      return lesson.contentBody ? (
        <RichTextHtml html={lesson.contentBody} className="prose prose-sm max-w-none dark:prose-invert" />
      ) : (
        <p className="text-sm text-muted-foreground">No text yet.</p>
      )
    case 'IMAGE':
      return lesson.file ? (
        <img
          src={learningApiUrl(lesson.file.url)}
          alt={lesson.title}
          className="max-h-96 rounded-md border border-border object-contain"
        />
      ) : (
        <p className="text-sm text-muted-foreground">No image uploaded.</p>
      )
    case 'PDF':
    case 'DOCUMENT':
      return lesson.file ? (
        <LinkOut href={learningApiUrl(lesson.file.url)}>
          <Download className="h-4 w-4" />
          {lesson.file.originalName} ({formatFileSize(lesson.file.fileSize)})
        </LinkOut>
      ) : (
        <p className="text-sm text-muted-foreground">No file uploaded.</p>
      )
    case 'VIDEO':
      return lesson.videoUrl ? (
        <LinkOut href={lesson.videoUrl}>
          <PlayCircle className="h-4 w-4" />
          Watch the video
        </LinkOut>
      ) : null
    case 'EXTERNAL_LINK':
      return lesson.externalUrl ? (
        <LinkOut href={lesson.externalUrl}>
          <ExternalLink className="h-4 w-4" />
          Open the page
        </LinkOut>
      ) : null
    default:
      return <p className="text-sm text-muted-foreground">This lesson type is not shown in the preview.</p>
  }
}

function QuizCard({ title, detail, note, final }: { title: string; detail: string; note: string; final?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${final ? 'border-primary/40' : 'border-border bg-muted/20'}`}>
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h4 className="font-medium">{final ? `Final assessment · ${title}` : `Quiz · ${title}`}</h4>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  )
}

/** Read-only look at the version as a carer would go through it. Nothing is recorded. */
export function CoursePreviewDialog({ open, onOpenChange, course, version }: Props) {
  const sections = version.sections ?? []
  const quizzes = version.assessments ?? []
  const objectives = (version.learningObjectives ?? '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Preview as carer · v{version.versionNumber}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-6">
          <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Preview only. Nothing is saved and no carer progress is recorded.
          </p>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">{course.title}</h2>
            {course.estimatedDurationMinutes ? (
              <p className="text-xs text-muted-foreground">About {course.estimatedDurationMinutes} minutes</p>
            ) : null}
            {course.description || course.shortDescription ? (
              <RichTextHtml
                html={course.description || course.shortDescription || ''}
                className="prose prose-sm max-w-none dark:prose-invert"
              />
            ) : null}
          </div>
          {objectives.length ? (
            <div>
              <h3 className="mb-1 text-sm font-semibold">By the end you will be able to</h3>
              <ul className="list-disc space-y-0.5 pl-5 text-sm">
                {objectives.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lessons yet.</p>
          ) : (
            sections.map((section, sIndex) => (
              <section key={section.id} className="space-y-3">
                <h3 className="border-b border-border pb-1 text-sm font-semibold">
                  Module {sIndex + 1} · {section.title}
                </h3>
                {(section.contentItems ?? []).map(lesson => {
                  const Icon = lessonTypeInfo(lesson.contentType).icon
                  return (
                    <div key={lesson.id} className="space-y-2 rounded-lg border border-border p-4">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-medium">{lesson.title}</h4>
                        {lesson.isRequired === false ? (
                          <span className="text-xs text-muted-foreground">(optional)</span>
                        ) : null}
                      </div>
                      <LessonBody lesson={lesson} />
                      {lesson.completionRule === 'ACKNOWLEDGE' ? (
                        <Button size="sm" variant="outline" disabled>
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Mark as complete
                        </Button>
                      ) : null}
                    </div>
                  )
                })}
                {quizzes
                  .filter(q => q.sectionId === section.id)
                  .map(q => (
                    <QuizCard key={q.id} title={q.title} detail={`${q.questions?.length ?? 0} questions · pass ${q.passingScore}% · ${q.isRequired === false ? 'optional' : 'required'}`}
                      note="Opens when you finish this module's lessons" />
                  ))}
              </section>
            ))
          )}
          {quizzes
            .filter(q => !q.sectionId)
            .map(q => (
              <QuizCard key={q.id} final title={q.title} detail={`${q.questions?.length ?? 0} questions · pass ${q.passingScore}% · required`}
                note="Opens when you finish all modules" />
            ))}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
