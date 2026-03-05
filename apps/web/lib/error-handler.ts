/**
 * Centralized Error Handling
 *
 * Provides safe error handling that prevents sensitive information leakage
 * while maintaining useful error messages for clients and logging for devs
 */

import { NextResponse } from "next/server"
import { z } from "zod"

/**
 * Custom API Error Class
 * Separates user-facing messages from internal error details
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public userMessage: string,
    public internalMessage: string,
    public errorCode?: string
  ) {
    super(userMessage)
    this.name = "ApiError"
  }
}

/**
 * Common API errors with pre-defined messages
 */
export const ApiErrors = {
  // 400 Bad Request
  VALIDATION_FAILED: (details?: string) =>
    new ApiError(
      400,
      "Invalid request. Please check your input.",
      `Validation failed: ${details || "Unknown error"}`,
      "VALIDATION_FAILED"
    ),

  INVALID_EMAIL: () =>
    new ApiError(
      400,
      "Invalid email address.",
      "Email validation failed",
      "INVALID_EMAIL"
    ),

  MISSING_REQUIRED_FIELD: (field: string) =>
    new ApiError(
      400,
      `Missing required field: ${field}`,
      `Required field not provided: ${field}`,
      "MISSING_FIELD"
    ),

  // 401 Unauthorized
  UNAUTHORIZED: () =>
    new ApiError(
      401,
      "Unauthorized. Please log in.",
      "User not authenticated",
      "UNAUTHORIZED"
    ),

  INVALID_TOKEN: () =>
    new ApiError(
      401,
      "Invalid or expired authentication token.",
      "JWT validation failed",
      "INVALID_TOKEN"
    ),

  // 403 Forbidden
  FORBIDDEN: () =>
    new ApiError(
      403,
      "You don't have permission to access this resource.",
      "Authorization check failed",
      "FORBIDDEN"
    ),

  INVALID_ORGANIZATION: () =>
    new ApiError(
      403,
      "You don't have access to this organization.",
      "Organization isolation check failed",
      "INVALID_ORG"
    ),

  // 404 Not Found
  NOT_FOUND: (resource: string = "Resource") =>
    new ApiError(
      404,
      `${resource} not found.`,
      `${resource} not found in database`,
      "NOT_FOUND"
    ),

  // 409 Conflict
  ALREADY_EXISTS: (resource: string) =>
    new ApiError(
      409,
      `${resource} already exists.`,
      `Duplicate ${resource}`,
      "ALREADY_EXISTS"
    ),

  // 429 Too Many Requests
  RATE_LIMITED: () =>
    new ApiError(
      429,
      "Too many requests. Please try again later.",
      "Rate limit exceeded",
      "RATE_LIMITED"
    ),

  // 500 Internal Server Error
  INTERNAL_ERROR: (internalDetails?: string) =>
    new ApiError(
      500,
      "An error occurred. Please try again later.",
      `Internal server error: ${internalDetails || "Unknown"}`,
      "INTERNAL_ERROR"
    ),

  DATABASE_ERROR: (internalDetails?: string) =>
    new ApiError(
      500,
      "Database operation failed. Please try again later.",
      `Database error: ${internalDetails}`,
      "DATABASE_ERROR"
    ),

  EXTERNAL_SERVICE_ERROR: (service: string) =>
    new ApiError(
      503,
      `${service} service is temporarily unavailable.`,
      `External service error: ${service}`,
      "SERVICE_UNAVAILABLE"
    ),
}

/**
 * Return structured field-level validation errors from a ZodError
 * so the frontend can display them per field
 */
export function validationErrorResponse(zodError: z.ZodError): NextResponse {
  const fieldErrors = zodError.flatten().fieldErrors
  const errors: Record<string, string> = {}
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages && messages.length > 0) {
      errors[key] = messages[0]
    }
  }
  return NextResponse.json(
    { error: 'Por favor verifica los datos ingresados.', fieldErrors: errors },
    { status: 400 }
  )
}

/**
 * Handle API errors and return safe response
 * Logs full error details internally, returns safe message to client
 */
export function handleApiError(error: any, context?: string): NextResponse {
  // Log full error details internally
  if (error instanceof ApiError) {
    console.error(`[${error.statusCode}] ${context || "API Error"}`, {
      userMessage: error.userMessage,
      internalMessage: error.internalMessage,
      errorCode: error.errorCode,
      stack: error.stack,
    })

    return NextResponse.json(
      {
        error: error.userMessage,
        code: error.errorCode,
      },
      { status: error.statusCode }
    )
  }

  // Handle Supabase errors
  if (error?.code === "PGRST116") {
    console.error(`[404] ${context || "Not Found"}`, {
      internalMessage: error.message,
      code: error.code,
    })
    return NextResponse.json(
      { error: "Resource not found." },
      { status: 404 }
    )
  }

  if (error?.code === "23505") {
    // Unique constraint violation
    console.error(`[409] ${context || "Conflict"}`, {
      internalMessage: error.message,
      code: error.code,
    })
    return NextResponse.json(
      { error: "This resource already exists." },
      { status: 409 }
    )
  }

  // Generic error handling
  console.error(
    `[500] ${context || "Unhandled Error"}`,
    {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    },
    error instanceof Error ? error : JSON.stringify(error)
  )

  // Always return generic message to client
  return NextResponse.json(
    { error: "An error occurred. Please try again later." },
    { status: 500 }
  )
}

/**
 * Validate required fields in request body
 * Returns early if validation fails
 */
export function validateRequired(
  data: Record<string, any>,
  requiredFields: string[]
): ApiError | null {
  for (const field of requiredFields) {
    if (!data[field]) {
      return ApiErrors.MISSING_REQUIRED_FIELD(field)
    }
  }
  return null
}

/**
 * Type guard for ApiError
 */
export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError
}

/**
 * Safe error response wrapper for try-catch blocks
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<{ success: true; data: T } | { success: false; error: ApiError }> {
  try {
    const data = await fn()
    return { success: true, data }
  } catch (error) {
    console.error(`[Error] ${context || "Operation failed"}`, error)

    if (isApiError(error)) {
      return { success: false, error }
    }

    return {
      success: false,
      error: ApiErrors.INTERNAL_ERROR(
        error instanceof Error ? error.message : "Unknown error"
      ),
    }
  }
}
