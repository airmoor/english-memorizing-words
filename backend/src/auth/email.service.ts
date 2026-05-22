import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  buildResetPasswordHtml,
  buildResetPasswordText,
} from '../mail/templates/reset-password.template';

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

    // Fail fast on a malformed URL so we never silently build broken reset links.
    // new URL() throws on values like "localhost:5173" (missing scheme).
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
      // Warn at startup so the misconfiguration is visible without waiting for
      // the first reset request to reveal it.
      this.logger.warn(
        'RESEND_API_KEY is not set — password reset emails will be simulated (dev mode only)',
      );
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    // Build the reset URL here so neither the token nor the URL ever leaves
    // this method via a log. Template functions receive the URL but must not
    // log it — see JSDoc comments in the template file.
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    if (!this.resend) {
      // Dev mode: acknowledge the request without logging the token or URL.
      // Logs can end up in cloud logging, Docker output, or CI pipelines where
      // a raw reset token is a security liability.
      this.logger.log(`[DEV] Password reset email simulated for: ${email}`);
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'Reset your Lexis password',
        html: buildResetPasswordHtml(resetUrl),
        // Plain-text version for clients that don't render HTML and for
        // spam-filter scoring (multi-part MIME is more trustworthy).
        text: buildResetPasswordText(resetUrl),
      });
    } catch (err: unknown) {
      // Log the provider error without including the reset URL or token.
      // We intentionally swallow this exception rather than propagating it:
      //   - The auth endpoint always returns a generic 200 to prevent user
      //     enumeration, so a delivery failure must not change that contract.
      //   - An unhandled 500 here would still return the same generic message
      //     to the client, but would also log a stack trace that might contain
      //     the email address — swallowing gives us explicit control.
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Password reset email delivery failed for ${email} — provider error: ${message}`,
      );
    }
  }
}
