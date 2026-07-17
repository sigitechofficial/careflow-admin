import { Outlet } from '@tanstack/react-router'
import { CompanyBrandingPublicBootstrap } from '@/components/company/CompanyBrandingBootstrap'
import { CompanyBrandMark } from '@/components/company/CompanyBrandMark'

export function AuthLayout() {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto bg-muted/40 p-4 md:p-8">
      <CompanyBrandingPublicBootstrap />
      <div className="mb-8">
        <CompanyBrandMark />
      </div>
      <Outlet />
    </div>
  )
}
