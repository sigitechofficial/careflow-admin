import { ClipboardList } from 'lucide-react'
import { StandardIconImage } from '@/shared/ui/standard-icon-image'
import { cn } from '@/shared/lib/utils'

/** Care plan tile â€” matches Care 20:20 Figma inactive care plan cards (node 354-10508). */
export function CarePlanCard({
  title,
  pictureUrl,
  onOpen,
}: {
  title: string
  pictureUrl?: string | null
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex min-h-[4.75rem] w-full flex-col items-stretch rounded border border-[#c5cdd6] bg-white p-2 text-left shadow-[0_1px_2px_rgba(15,23,42,0.06)]',
        'transition-[border-color,box-shadow] hover:border-[#0d9488] hover:shadow-[0_2px_6px_rgba(13,148,136,0.15)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]/40',
      )}
      data-testid={`care-plan-card-${title.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <div className="flex flex-1 items-center gap-2.5">
        <div className="flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center">
          {pictureUrl ? (
            <StandardIconImage
              src={pictureUrl}
              label={title}
              className="h-[3.25rem] w-[3.25rem]"
              imgClassName="h-[3.25rem] w-[3.25rem]"
            />
          ) : (
            <ClipboardList
              className="h-9 w-9 text-[#94a3b8] group-hover:text-[#0d9488]"
              strokeWidth={1.25}
            />
          )}
        </div>
        <p className="flex-1 text-[13px] font-normal leading-snug text-[#1e293b]">{title}</p>
      </div>
    </button>
  )
}
