import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  buildResetPasswordHtml,
  buildResetPasswordText,
} from '../mail/templates/reset-password.template';
import { maskEmail, withTimeout } from '../mail/mail.utils';

// Hard deadline for the delivery call, whichever transport is in use. Prevents
// a stalled provider from tying up connection slots and degrading auth endpoint
// response times.
const SEND_TIMEOUT_MS = 8_000;

const DEFAULT_SMTP_PORT = 587;

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly smtp: Transporter | null;
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

    // Transport selection, most specific first. SMTP is what the self-hosted
    // deployment uses (our own Postfix); Resend stays the default everywhere
    // else, including local development, so nothing changes without SMTP_* set.
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');

    if (smtpHost && smtpUser && smtpPassword) {
      const port = Number(
        this.configService.get<string>('SMTP_PORT') ?? DEFAULT_SMTP_PORT,
      );
      this.smtp = nodemailer.createTransport({
        host: smtpHost,
        port,
        // `secure` means implicit TLS (port 465). On 587 the connection starts
        // in the clear and is upgraded by STARTTLS, which `requireTLS` makes
        // mandatory — so this is never an unencrypted submission either way.
        secure: port === 465,
        requireTLS: port !== 465,
        auth: { user: smtpUser, pass: smtpPassword },
      });
      this.resend = null;
      this.logger.log(`Email transport: SMTP (${smtpHost}:${port})`);
      return;
    }

    this.smtp = null;

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

    const subject = 'Reset your Lexis password';
    const html = buildResetPasswordHtml(resetUrl);
    // Plain-text alternative: improves spam-filter scoring (multi-part MIME)
    // and ensures the flow works on text-only email clients.
    const text = buildResetPasswordText(resetUrl);

    if (this.smtp) {
      try {
        const info = await withTimeout(
          this.smtp.sendMail({ from: this.from, to: email, subject, html, text }),
          SEND_TIMEOUT_MS,
        );
        // messageId is an opaque identifier with no security value — safe to
        // log, and it is what correlates this send with the Postfix queue id.
        this.logger.log(
          `Password reset email dispatched for ${maskEmail(email)} — id: ${info.messageId}`,
        );
      } catch (err: unknown) {
        // Swallowed for the same reason as the Resend branch below: the auth
        // endpoint returns a generic 200 regardless of delivery outcome.
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Password reset email delivery failed for ${maskEmail(email)} — ${message}`,
        );
      }
      return;
    }

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
          subject,
          html,
          text,
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
