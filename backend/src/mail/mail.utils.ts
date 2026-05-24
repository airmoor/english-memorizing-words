/**
 * Mask an email address for safe log output.
 *
 * Security rationale: full email addresses are personal data. They must not
 * appear in cloud logs, CI output, or monitoring dashboards. Masked form is
 * enough to correlate a log entry to a support request without exposing PII.
 *
 * Examples:
 *   anastasiia@gmail.com  →  a***@gmail.com
 *   jo@company.com        →  j***@company.com
 *   a@b.com               →  ***@b.com   (local part too short to safely expose)
 */
export function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return '***';

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex); // includes '@'

  // Expose only the first character when local part is long enough (> 2 chars).
  // Single-char and two-char locals are fully masked to avoid trivial reversal.
  const maskedLocal = local.length > 2 ? `${local[0]}***` : '***';
  return `${maskedLocal}${domain}`;
}

/**
 * Race a promise against a hard deadline.
 *
 * Timeout rationale: external HTTP providers (Resend, SendGrid, etc.) can
 * stall under load or during incidents. Without a deadline the Node event
 * loop keeps the request handler alive indefinitely, which exhausts
 * connection pool slots and degrades every concurrent request.
 * 8 seconds is generous for a single SMTP/API call while still bounding
 * the worst-case tail latency of an auth endpoint.
 *
 * The rejection propagates naturally into the caller's try/catch — no
 * special handling required beyond what already exists for provider errors.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Email provider timed out after ${ms}ms`)),
      ms,
    ),
  );
  return Promise.race([promise, timeout]);
}
