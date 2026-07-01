import { cn } from '@/shared/lib/utils'
import type { RoutineSlot } from '@/features/service-users/service-user-about-me'
import getUp from '@my_daily_routine/get-up.svg?raw'
import breakfast from '@my_daily_routine/breakfast.svg?raw'
import lunch from '@my_daily_routine/lunch.svg?raw'
import afternoon from '@my_daily_routine/afternoon.svg?raw'
import teaTime from '@my_daily_routine/tea-time.svg?raw'
import bedtime from '@my_daily_routine/bedtime.svg?raw'

const DAILY_ROUTINE_ICONS: Record<RoutineSlot, { raw: string; viewBox: string }> = {
  getUp: { raw: getUp, viewBox: '41 38 711 610' },
  breakfast: { raw: breakfast, viewBox: '40 42 686 652' },
  lunch: { raw: lunch, viewBox: '41 39 658 681' },
  afternoon: { raw: afternoon, viewBox: '31 -3 723 715' },
  teaTime: { raw: teaTime, viewBox: '33 -6 728 630' },
  bedtime: { raw: bedtime, viewBox: '30 30 732 681' },
}

function prepareInlineSvg(raw: string, viewBox: string): string {
  return raw
    .replace(/<\?xml[^?]*\?>\s*/i, '')
    .replace(
      /<svg\b[^>]*>/i,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">`,
    )
}

export function DailyRoutineIcon({ id, className }: { id: RoutineSlot; className?: string }) {
  const { raw, viewBox } = DAILY_ROUTINE_ICONS[id]

  return (
    <span
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full',
        className,
      )}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: prepareInlineSvg(raw, viewBox) }}
    />
  )
}
