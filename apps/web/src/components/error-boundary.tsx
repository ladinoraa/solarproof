'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

interface SectionErrorBoundaryProps {
  sectionName: string
  children: ReactNode
}

interface SectionErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
  state: SectionErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error, {
      extra: {
        section: this.props.sectionName,
        componentStack: info.componentStack,
      },
    })
    console.error(`Dashboard section error: ${this.props.sectionName}`, error, info)
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950/50">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-600 dark:text-red-300" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {this.props.sectionName} failed to load.
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            An unexpected error occurred in this section. Please try again.
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Retry section
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

interface GlobalErrorBoundaryProps {
  children: ReactNode
}

export class GlobalErrorBoundary extends Component<GlobalErrorBoundaryProps, SectionErrorBoundaryState> {
  state: SectionErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error, {
      extra: {
        type: 'global',
        componentStack: info.componentStack,
      },
    })
    console.error('Global application error:', error, info)
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center bg-gray-50 dark:bg-gray-950">
          <AlertTriangle className="h-12 w-12 text-red-500" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Something went wrong</h1>
          <p className="max-w-md text-gray-600 dark:text-gray-400">
            A critical error occurred in the application. We have been notified and are looking into it.
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="rounded-lg bg-yellow-400 px-6 py-3 font-semibold text-gray-900 transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
          >
            Try to recover
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
