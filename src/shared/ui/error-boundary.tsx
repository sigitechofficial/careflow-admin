import * as React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/shared/ui/button'

type Props = {
  children: React.ReactNode
  title?: string
  description?: string
  onReset?: () => void
  fallbackClassName?: string
}

type State = {
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  private handleReset = () => {
    this.setState({ error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className={
            this.props.fallbackClassName ??
            'flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center'
          }
          role="alert"
        >
          <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {this.props.title ?? 'Something went wrong'}
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              {this.props.description ?? 'Try reloading this section. If the problem persists, refresh the page.'}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={this.handleReset}>
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
