/**
 * Gestion centralisée des erreurs de l'application
 */

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
    // Maintient la stack trace pour le débogage
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      details: this.details,
    }
  }
}

/**
 * Erreurs spécifiques par domaine
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, message, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(401, message, 'AUTHENTICATION_ERROR')
    this.name = 'AuthenticationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(429, message, 'RATE_LIMIT_ERROR')
    this.name = 'RateLimitError'
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, details?: any) {
    super(502, `External service error: ${service} - ${message}`, 'EXTERNAL_SERVICE_ERROR', details)
    this.name = 'ExternalServiceError'
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(500, message, 'INTERNAL_SERVER_ERROR', details)
    this.name = 'InternalServerError'
  }
}

/**
 * Helper pour créer une réponse d'erreur Next.js
 */
export function createErrorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode })
  }

  // Erreur inconnue
  const internalError = new InternalServerError(
    'An unexpected error occurred',
    process.env.NODE_ENV === 'development' ? { originalError: String(error) } : undefined
  )

  return NextResponse.json(internalError.toJSON(), { status: 500 })
}

// Import NextResponse pour le type
import { NextResponse } from 'next/server'

