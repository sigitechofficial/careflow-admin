import { Outlet } from '@tanstack/react-router'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-muted/40 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="mb-8 flex items-center gap-2 text-foreground">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
          CA
        </div>
        <span className="font-display text-lg font-semibold tracking-tight">CareAdmin</span>
      </div>
      <Outlet />
    </div>
  )
}
