import { Transform, TransformFnParams } from 'class-transformer';

/**
 * Escapes HTML special characters to prevent XSS attacks
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Trims whitespace from the beginning and end of a string
 */
function trim(value: string): string {
  return value.trim();
}

/**
 * Decorator to sanitize string input (escape HTML, trim whitespace)
 * Usage: @Sanitize() on string properties
 *
 * @example
 * class CreateGroupDto {
 *   @Sanitize()
 *   @IsString()
 *   name: string;
 * }
 */
export function Sanitize(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams): unknown => {
    if (typeof value === 'string') {
      // First trim whitespace, then escape HTML
      return escapeHtml(trim(value));
    }
    // Return non-string values as-is (numbers, booleans, null, undefined, etc.)
    return value;
  });
}
