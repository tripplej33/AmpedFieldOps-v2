import { Component, ErrorInfo, ReactNode } from 'react'
import Button from './ui/Button'

interface Props {
  children: ReactNode
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
    window.location.href = '/'
  }

  public render() {
    if (this.state.hasError) {
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
