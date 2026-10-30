import { Link } from '@tanstack/react-router'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { CARER_NO_CONTRACTED_HOURS_CODE, useCarerHoursStopStore } from '@/store/carer-hours-stop.store'

/**
 * Shown instead of a toast when a carer can't be given visits or hours: no contracted weekly
 * hours, or above their maximum weekly hours (Settings → Dom Rules doesn't allow it).
 */
export function CarerHoursStopDialog() {
  const stop = useCarerHoursStopStore(s => s.stop)
  const close = useCarerHoursStopStore(s => s.close)
  const noHours = stop?.code === CARER_NO_CONTRACTED_HOURS_CODE
  return (
    <AlertDialog open={stop != null} onOpenChange={o => !o && close()}>
      <AlertDialogContent className="max-w-lg" data-testid="carer-hours-stop-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {noHours ? 'Set the carer’s weekly hours first' : 'Above the carer’s maximum weekly hours'}
          </AlertDialogTitle>
          <AlertDialogDescription>{stop?.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Close
          </Button>
          {stop?.employeeId ? (
            <Button asChild onClick={close}>
              <Link
                to="/employee/$employeeId/edit"
                params={{ employeeId: stop.employeeId }}
                search={{ tab: 'employment' }}
              >
                {noHours ? 'Set weekly hours' : 'Open working hours'}
              </Link>
            </Button>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
