import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import type { BulkGenerateVisitPlanScheduleResponse } from '@/features/scheduling/api/bulk-visit-plan-schedule.api'
import {
  BulkGenerateRotaResultPatternWarningBanner,
  BulkGenerateRotaResultRotaConflictBanner,
} from '@/features/scheduling/components/bulk-generate-rota/BulkGenerateRotaResultWarnings'
import { BulkGenerateRotaResultRowsTable } from '@/features/scheduling/components/bulk-generate-rota/BulkGenerateRotaResultRowsTable'
import { BulkGenerateRotaResultSummaryGrid } from '@/features/scheduling/components/bulk-generate-rota/BulkGenerateRotaResultSummaryGrid'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: BulkGenerateVisitPlanScheduleResponse | null
}

export function BulkGenerateRotaResultDialog({ open, onOpenChange, result }: Props) {
  if (!result) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Rota generation complete</DialogTitle>
          <DialogDescription>
            {result.fromDate} → {result.toDate}
            {result.backfillDays > 0
              ? ` · ${result.backfillDays} backfill day${result.backfillDays === 1 ? '' : 's'}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <BulkGenerateRotaResultSummaryGrid totals={result.totals} />
          <BulkGenerateRotaResultRotaConflictBanner totals={result.totals} />
          <BulkGenerateRotaResultPatternWarningBanner totals={result.totals} />
          <BulkGenerateRotaResultRowsTable results={result.results} />
        </DialogBody>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button asChild>
            <Link to="/scheduling/schedule-jobs">
              Open Schedule Jobs
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
