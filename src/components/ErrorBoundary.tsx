import { Component, ErrorInfo, ReactNode } from 'react'
import Button from './ui/Button'

interface Props {
  children: ReactNode
  compact?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/app/dashboard'
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.compact) {
        return (
          <div className="min-h-[400px] flex items-center justify-center bg-card-dark/60 border border-border-dark rounded-2xl p-8 my-4 text-center">
            <div className="max-w-md w-full">
              <span className="material-symbols-outlined text-6xl text-red-500 mb-3">
                error
              </span>
              <h2 className="text-xl font-bold text-white mb-2">View encountered an error</h2>
              <p className="text-text-muted text-xs mb-5">
                {this.state.error?.message || 'An unexpected rendering error occurred in this view.'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button onClick={() => this.setState({ hasError: false, error: null })} variant="secondary">
                  Try Again
                </Button>
                <Button onClick={this.handleReset} variant="primary">
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </div>
        )
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background-dark p-4">
          <div className="max-w-md w-full text-center">
            <span className="material-symbols-outlined text-8xl text-red-500 mb-4">
              error
            </span>
            <h1 className="text-3xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-text-muted mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={this.handleReset} variant="primary">
              Return to Dashboard
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
