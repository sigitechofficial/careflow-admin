import { Construction } from 'lucide-react'
import { LoadingSpinner } from '@/shared/ui/page-elements'

export function EmployeeEditPlaceholderPanel({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center" role="status">
      <LoadingSpinner size="lg" />
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          This section is not available in CareAdmin yet. We are still building it to match the legacy employee profile.
        </p>
      </div>
      <Construction className="h-8 w-8 text-muted-foreground" aria-hidden />
    </div>
  )
}
