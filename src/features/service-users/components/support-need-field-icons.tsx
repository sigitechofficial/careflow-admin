import { cn } from '@/shared/lib/utils'
import healthCrossHand from '@support_need/health-cross-hand.svg?raw'
import laundry from '@support_need/laundry.svg?raw'
import moneyPocket from '@support_need/money-pocket.svg?raw'
import sleepingPerson from '@support_need/sleeping-person.svg?raw'
import bookPencil from '@support_need/book-pencil.svg?raw'

export type SupportNeedIconId =
  | 'personalHygiene'
  | 'domesticSupport'
  | 'shoppingArrangements'
  | 'nightSupport'
  | 'supportOther'

const SUPPORT_NEED_ICONS: Record<SupportNeedIconId, { raw: string; viewBox: string }> = {
  personalHygiene: { raw: healthCrossHand, viewBox: '36 31 721 682' },
  domesticSupport: { raw: laundry, viewBox: '39 40 718 714' },
  shoppingArrangements: { raw: moneyPocket, viewBox: '32 42 496 709' },
  nightSupport: { raw: sleepingPerson, viewBox: '42 37 631 689' },
  supportOther: { raw: bookPencil, viewBox: '36 31 717 555' },
}

function prepareInlineSvg(raw: string, viewBox: string): string {
  return raw
    .replace(/<\?xml[^?]*\?>\s*/i, '')
    .replace(
      /<svg\b[^>]*>/i,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">`,
    )
}

export function SupportNeedIcon({ id, className }: { id: SupportNeedIconId; className?: string }) {
  const { raw, viewBox } = SUPPORT_NEED_ICONS[id]

  return (
    <span
      className={cn(
        'flex h-14 w-14 shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full',
        'sm:h-16 sm:w-16',
        className,
      )}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: prepareInlineSvg(raw, viewBox) }}
    />
  )
}
