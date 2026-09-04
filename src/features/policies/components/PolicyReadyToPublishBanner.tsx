import { Button } from '@/shared/ui/button'

export function PolicyReadyToPublishBanner({
  canPublish,
  pending,
  onPublish,
}: {
  canPublish: boolean
  pending?: boolean
  onPublish: () => void
}) {
  return (
    <section
      className="flex flex-col gap-3 rounded-lg border border-success/30 bg-success/10 p-4 sm:flex-row sm:items-center sm:justify-between"
      data-testid="policy-ready-to-publish"
    >
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold text-success">Ready to publish</p>
        <p className="text-sm text-foreground/80">
          This policy has been approved and is ready to be made available to staff.
        </p>
      </div>
      {canPublish ? (
        <Button
          type="button"
          variant="success"
          size="default"
          className="shrink-0"
          disabled={pending}
          onClick={onPublish}
        >
          Publish policy
        </Button>
      ) : null}
    </section>
  )
}
