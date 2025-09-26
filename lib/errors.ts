export enum ErrorType {
  API_KEY_MISSING = 'API_KEY_MISSING',
  BILLING_ISSUE = 'BILLING_ISSUE',
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  GENERATION_FAILED = 'GENERATION_FAILED',
  PARSING_ERROR = 'PARSING_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface GenerationError extends Error {
  type: ErrorType
  retryable: boolean
  originalError?: Error
}

export class GenerationError extends Error implements GenerationError {
  constructor(message: string, type: ErrorType, retryable: boolean = false, originalError?: Error) {
    super(message)
    this.name = 'GenerationError'
    this.type = type
    this.retryable = retryable
    this.originalError = originalError
  }
}

export function classifyError(error: any): GenerationError {
  const message = error?.message || error?.toString() || 'Unknown error occurred'
  
  // API Key issues
  if (message.includes('API key') || message.includes('authentication') || message.includes('unauthorized')) {
    return new GenerationError('API key is missing or invalid', ErrorType.API_KEY_MISSING, false, error)
  }
  
  // Billing/quota issues
  if (message.includes('quota') || message.includes('billing') || message.includes('payment') || 
      message.includes('exceeded') || message.includes('limit') || error?.status === 429) {
    return new GenerationError('API quota exceeded or billing issue', ErrorType.BILLING_ISSUE, false, error)
  }
  
  // Rate limiting (different from quota - usually temporary)
  if (message.includes('rate limit') || message.includes('too many requests') || error?.status === 429) {
    return new GenerationError('Rate limit exceeded, please try again later', ErrorType.RATE_LIMIT, true, error)
  }
  
  // Network errors
  if (message.includes('network') || message.includes('connection') || message.includes('timeout') ||
      error?.code === 'ECONNRESET' || error?.code === 'ENOTFOUND' || error?.code === 'ETIMEDOUT') {
    return new GenerationError('Network connection error', ErrorType.NETWORK_ERROR, true, error)
  }
  
  // Generation specific errors
  if (message.includes('No image data returned') || message.includes('generation failed')) {
    return new GenerationError('Content generation failed', ErrorType.GENERATION_FAILED, true, error)
  }
  
  // JSON parsing errors
  if (message.includes('JSON') || message.includes('parse') || error instanceof SyntaxError) {
    return new GenerationError('Failed to parse generated content', ErrorType.PARSING_ERROR, true, error)
  }
  
  // Database errors
  if (message.includes('database') || message.includes('MongoDB') || message.includes('connection')) {
    return new GenerationError('Database error', ErrorType.DATABASE_ERROR, true, error)
  }
  
  // Default to unknown retryable error
  return new GenerationError(message, ErrorType.UNKNOWN_ERROR, true, error)
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 1,
  delayMs: number = 1000
): Promise<T> {
  let lastError: GenerationError
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = classifyError(error)
      
      // Don't retry non-retryable errors
      if (!lastError.retryable) {
        throw lastError
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw lastError
      }
      
      // Wait before retrying
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }
  
  throw lastError!
}