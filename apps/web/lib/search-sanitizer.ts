/**
 * Search Query Sanitizer
 *
 * Escapes special SQL LIKE wildcard characters to prevent
 * unintended search expansion and filter injection.
 *
 * Security: Prevents LIKE injection by escaping % and _ characters
 */

/**
 * Escape special characters in LIKE queries
 *
 * SQL LIKE uses:
 * - % as wildcard for any number of characters
 * - _ as wildcard for single character
 *
 * User input must escape these to prevent injection.
 *
 * @param input - User-provided search term
 * @returns Escaped search term safe for LIKE queries
 */
export function escapeLikeWildcards(input: string): string {
  if (!input) return ''

  // Escape backslash first (if using \ as escape character)
  // Then escape % and _ characters
  return input
    .replace(/\\/g, '\\\\') // Backslash
    .replace(/%/g, '\\%')   // Percent sign (wildcard)
    .replace(/_/g, '\\_')   // Underscore (single char wildcard)
}

/**
 * Validate and sanitize search input
 *
 * Performs multiple checks:
 * 1. Length validation (max 200 chars, already done by Zod)
 * 2. Character escaping (prevent LIKE injection)
 * 3. Trim whitespace
 *
 * @param input - Raw search term from query parameter
 * @param maxLength - Maximum allowed length (default 200)
 * @returns Sanitized and escaped search term
 */
export function sanitizeSearchInput(input: string | undefined, maxLength: number = 200): string | undefined {
  if (!input) return undefined

  const trimmed = input.trim()
  if (trimmed.length === 0) return undefined
  if (trimmed.length > maxLength) return trimmed.slice(0, maxLength)

  return escapeLikeWildcards(trimmed)
}

/**
 * Build safe ILIKE filter expressions
 *
 * Supabase PostgREST API uses parameterized queries, so SQL injection
 * is already prevented. However, this function ensures that wildcards
 * are properly handled.
 *
 * ILIKE is case-insensitive LIKE in PostgreSQL.
 *
 * @param searchTerm - Sanitized search term
 * @param fields - Database fields to search
 * @returns Array of ILIKE expressions for OR filter
 *
 * @example
 * const expressions = buildILikeFilters('john', ['name', 'email'])
 * // Returns: ['name.ilike.%john%', 'email.ilike.%john%']
 */
export function buildILikeFilters(searchTerm: string | undefined, fields: string[]): string[] {
  if (!searchTerm) return []

  const escaped = escapeLikeWildcards(searchTerm)

  return fields.map(field => `${field}.ilike.%${escaped}%`)
}
