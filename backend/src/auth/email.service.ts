import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  buildResetPasswordHtml,
  buildResetPasswordText,
} from '../mail/templates/reset-password.template';
import { maskEmail, withTimeout } from '../mail/mail.utils';

// Hard deadline for the Resend API call. Prevents a stalled provider from
// tying up connection slots and degrading auth endpoint response times.
const SEND_TIMEOUT_MS = 8_000;

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    const rawFrontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';

    // Fail fast on a malformed URL so we never silently build broken reset
    // links. new URL() throws on values like "localhost:5173" (no scheme).
    try {
      new URL(rawFrontendUrl);
    } catch {
      throw new Error(
        `EmailService: FRONTEND_URL "${rawFrontendUrl}" is not a valid URL. ` +
          'It must include a scheme, e.g. https://app.example.com or http://localhost:5173.',
      );
    }

    this.frontendUrl = rawFrontendUrl;
    this.from =
      this.configService.get<string>('EMAIL_FROM') ?? 'Lexis <noreply@lexis.app>';

    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.resend = null;
      // Warn at startup — surfaces misconfiguration before the first request.
      this.logger.warn(
        'RESEND_API_KEY is not set — password reset emails will be simulated (dev mode only)',
      );
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    // Use the URL API instead of string concatenation to:
    //   - normalise trailing slashes in FRONTEND_URL (avoids double-slash paths)
    //   - encode the token as a query param safely (searchParams handles
    //     percent-encoding, protecting against malformed or adversarial tokens)
    const url = new URL('/reset-password', this.frontendUrl);
    url.searchParams.set('token', token);
    const resetUrl = url.toString();

    // From this point on, resetUrl must never appear in a log statement.
    // It contains the raw token, which grants one-time password-reset access.

    if (!this.resend) {
      // Dev fallback: log only the masked address — never the token or URL.
      // Raw tokens in logs are a supply-chain risk: cloud logging agents,
      // Docker log drivers, and CI systems can forward them to third parties.
      this.logger.log(
        `[DEV] Password reset email simulated for: ${maskEmail(email)}`,
      );
      return;
    }

    try {
      const { data, error } = await withTimeout(
        this.resend.emails.send({
          from: this.from,
          to: email,
          subject: 'Reset your Lexis password',
          html: buildResetPasswordHtml(resetUrl),
          // Plain-text alternative: improves spam-filter scoring (multi-part
          // MIME) and ensures the flow works on text-only email clients.
          text: buildResetPasswordText(resetUrl),
        }),
        SEND_TIMEOUT_MS,
      );

      if (error) {
        // Resend returns structured errors as { data: null, error: ErrorResponse }
        // rather than always throwing. Treat this path the same as a thrown
        // exception so delivery failures are consistently swallowed.
        this.logger.error(
          `Password reset delivery failed for ${maskEmail(email)} — ` +
            `provider: ${error.name} ${error.message}`,
        );
        return;
      }

      // Log the provider message ID for delivery traceability (e.g. for
      // support lookups in the Resend dashboard). ID is an opaque string
      // with no security value — safe to log.
      this.logger.log(
        `Password reset email dispatched for ${maskEmail(email)} — id: ${data?.id}`,
      );
    } catch (err: unknown) {
      // Catches both provider exceptions and the timeout rejection from
      // withTimeout(). Swallowed intentionally:
      //   - The auth endpoint contract is a generic 200 regardless of
      //     delivery outcome (prevents user enumeration via timing/errors).
      //   - Propagating a 500 here would not help the user but could expose
      //     internal error details in unexpected environments.
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Password reset email delivery failed for ${maskEmail(email)} — ${message}`,
      );
    }
  }
}
