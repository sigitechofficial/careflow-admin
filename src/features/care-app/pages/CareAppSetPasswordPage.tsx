import { CompanyBrandingPublicBootstrap } from '@/components/company/CompanyBrandingBootstrap'
import { CompanyBrandMark } from '@/components/company/CompanyBrandMark'
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage'

/** Public /app/set-password: a carer chooses their Care app password from the emailed link (same look as sign-in). */
export default function CareAppSetPasswordPage() {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto bg-muted/40 p-4 md:p-8">
      <CompanyBrandingPublicBootstrap />
      <div className="mb-8">
        <CompanyBrandMark />
      </div>
      <ResetPasswordPage variant="app" />
    </div>
  )
}
