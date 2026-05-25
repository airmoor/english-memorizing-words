import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * A single flattened validation error with a human-readable path.
 * Sent to the client in the 400 response body under `validationErrors`.
 *
 * The frontend uses `path` and `constraint` to reconstruct user-friendly
 * messages (e.g. group maxLength violations by count) without exposing raw
 * class-validator paths directly in the UI.
 */
export interface FlatValidationError {
  /** Dot/bracket path from the root DTO. Example: "words[3].word" */
  path: string;
  /** class-validator constraint name. Example: "maxLength", "isUUID" */
  constraint: string;
  /**
   * Raw class-validator message — for server-side logging only.
   * The frontend never renders this directly.
   */
  message: string;
}

// ── Flatten helper ────────────────────────────────────────────────────────────

/**
 * Recursively flatten a nested `ValidationError[]` into a flat array.
 *
 * class-validator represents nested DTO errors as a tree:
 *   root property → children → leaf constraints
 *
 * Array indices are formatted as bracket notation: words[0].word
 * Object properties use dot notation: settings.duplicateMode
 */
function flatten(errors: ValidationError[], parent = ''): FlatValidationError[] {
  const result: FlatValidationError[] = [];

  for (const error of errors) {
    // Build the path segment for this node
    const isIndex = /^\d+$/.test(error.property);
    const path = parent
      ? isIndex
        ? `${parent}[${error.property}]`
        : `${parent}.${error.property}`
      : error.property;

    // Leaf: record each constraint violation
    if (error.constraints) {
      for (const [constraint, message] of Object.entries(error.constraints)) {
        result.push({ path, constraint, message });
      }
    }

    // Recurse into children (nested DTOs / array items)
    if (error.children && error.children.length > 0) {
      result.push(...flatten(error.children, path));
    }
  }

  return result;
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Custom `exceptionFactory` for NestJS `ValidationPipe`.
 *
 * Instead of the default array-of-strings message format (which exposes raw
 * class-validator paths like "words.1.word must be shorter than…"), this
 * returns a structured `BadRequestException` whose body includes:
 *
 *   {
 *     statusCode: 400,
 *     error: 'Validation Error',
 *     validationErrors: FlatValidationError[]
 *   }
 *
 * The frontend parses `validationErrors` and renders user-friendly summaries.
 */
export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  const flat = flatten(errors);

  // Summary message — generic, intentionally vague (details are in validationErrors)
  const message =
    flat.length === 1
      ? 'One field failed validation.'
      : `${flat.length} fields failed validation.`;

  return new BadRequestException({
    statusCode: 400,
    error: 'Validation Error',
    message,
    validationErrors: flat,
  });
}
