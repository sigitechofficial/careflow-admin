import * as React from 'react'
import { useParams } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle2, Loader2, MailX } from 'lucide-react'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { useDocumentTitle } from '@/shared/lib/use-document-title'

/**
 * "Unsubscribe from all surveys" (the link in survey messages to people who have left or whose care ended).
 * No login. Nothing changes until they confirm, so an email scanner opening the link changes nothing.
 * Permanent: staff cannot undo it.
 */
export default function SurveyUnsubscribePage() {
  const { token = '' } = useParams({ strict: false }) as { token?: string }
  useDocumentTitle('Stop survey messages')
  const check = useQuery({
    queryKey: ['survey-unsubscribe', token],
    retry: false,
    queryFn: async () => (await apiJson<ApiEnvelope<{ valid: boolean; alreadyDone: boolean }>>(`/survey-unsubscribe/${encodeURIComponent(token)}`, { method: 'GET' })).data,
  })
  const confirm = useMutation({
    mutationFn: () => apiJson(`/survey-unsubscribe/${encodeURIComponent(token)}`, { method: 'POST' }),
  })
  const heading = React.useRef<HTMLHeadingElement>(null)
  const done = confirm.isSuccess || check.data?.alreadyDone
  React.useEffect(() => {
    if (done) heading.current?.focus()
  }, [done])

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-background">
      <main className="flex min-h-full items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm" data-testid="survey-unsubscribe">
          {check.isLoading ? (
            <p role="status" className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Checking the link…
            </p>
          ) : !check.data?.valid ? (
            <>
              <h1 className="text-lg font-semibold">This link is not valid</h1>
              <p className="mt-2 text-sm text-muted-foreground">Please contact the office if you would like to stop survey messages.</p>
            </>
          ) : done ? (
            <>
              <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-teal-600" aria-hidden />
              <h1 ref={heading} tabIndex={-1} className="text-lg font-semibold focus:outline-none">
                You will not be sent any more surveys
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">This applies to every survey, by email, text and post. Thank you.</p>
            </>
          ) : (
            <>
              <MailX className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
              <h1 className="text-lg font-semibold">Stop all survey messages?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We will never send you a survey again, in any way. Answers you have already given are kept.
              </p>
              <Button className="mt-5" disabled={confirm.isPending} onClick={() => confirm.mutate()}>
                Stop all survey messages
              </Button>
              {confirm.isError ? <p role="alert" className="mt-3 text-sm text-destructive">That did not work. Please try again.</p> : null}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
