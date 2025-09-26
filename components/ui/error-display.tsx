"use client"

import { AlertTriangle, RefreshCw, X, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export interface ErrorInfo {
  message: string
  type: string
  retryable?: boolean
}

interface ErrorDisplayProps {
  error: ErrorInfo
  onRetry?: () => void
  onDismiss?: () => void
  isRetrying?: boolean
  className?: string
}

export function ErrorDisplay({ error, onRetry, onDismiss, isRetrying = false, className }: ErrorDisplayProps) {
  const isApiOrBillingIssue = error.type === 'API_KEY_MISSING' || error.type === 'BILLING_ISSUE'
  const canRetry = error.retryable && !isApiOrBillingIssue && onRetry

  const getErrorIcon = () => {
    if (isApiOrBillingIssue) return <AlertTriangle className="h-5 w-5 text-destructive" />
    return <AlertTriangle className="h-5 w-5 text-yellow-500" />
  }

  const getErrorTitle = () => {
    switch (error.type) {
      case 'API_KEY_MISSING':
        return 'Configuration Error'
      case 'BILLING_ISSUE':
        return 'Service Unavailable'
      case 'RATE_LIMIT':
        return 'Rate Limit Exceeded'
      case 'NETWORK_ERROR':
        return 'Connection Error'
      case 'GENERATION_FAILED':
        return 'Generation Failed'
      default:
        return 'Error Occurred'
    }
  }

  const getErrorDescription = () => {
    switch (error.type) {
      case 'API_KEY_MISSING':
        return 'The AI service is not properly configured. Please contact support.'
      case 'BILLING_ISSUE':
        return 'The AI service is temporarily unavailable due to billing issues. Please try again later.'
      case 'RATE_LIMIT':
        return 'Too many requests have been made. Please wait a moment before trying again.'
      case 'NETWORK_ERROR':
        return 'Unable to connect to the AI service. Please check your internet connection.'
      case 'GENERATION_FAILED':
        return 'The AI failed to generate content. This might be temporary.'
      default:
        return 'An unexpected error occurred.'
    }
  }

  return (
    <Card className={`border-destructive/20 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getErrorIcon()}
            <CardTitle className="text-lg">{getErrorTitle()}</CardTitle>
          </div>
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>{getErrorDescription()}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Alert className="mb-4">
          <AlertDescription className="text-sm">
            {error.message}
          </AlertDescription>
        </Alert>
        
        {canRetry && (
          <div className="flex gap-2">
            <Button 
              onClick={onRetry} 
              disabled={isRetrying}
              variant="outline"
              size="sm"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </>
              )}
            </Button>
          </div>
        )}
        
        {!canRetry && error.retryable && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              This error might be temporary. Please try creating a new story in a few minutes.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

interface WarningDisplayProps {
  message: string
  details?: string[]
  onDismiss?: () => void
  className?: string
}

export function WarningDisplay({ message, details, onDismiss, className }: WarningDisplayProps) {
  return (
    <Alert className={`border-yellow-200 bg-yellow-50 ${className}`}>
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <div className="flex items-start justify-between w-full">
        <div className="flex-1">
          <AlertDescription className="text-yellow-800 font-medium mb-1">
            {message}
          </AlertDescription>
          {details && details.length > 0 && (
            <div className="text-sm text-yellow-700 mt-2">
              <ul className="list-disc list-inside space-y-1">
                {details.map((detail, index) => (
                  <li key={index}>{detail}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss} className="ml-2 h-6 w-6 p-0">
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </Alert>
  )
}