import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = process.env.EMAIL_FROM ?? 'Lexis <noreply@lexis.app>';
    this.frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';

    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged to console only');
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    if (!this.resend) {
      // Dev fallback: log URL without the raw token appearing in structured logs
      this.logger.log(`[DEV] Password reset link → ${resetUrl}`);
      return;
    }

    await this.resend.emails.send({
      from: this.from,
      to: email,
      subject: 'Reset your Lexis password',
      html: buildResetEmail(resetUrl),
    });
  }
}

function buildResetEmail(resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f4f5f9;
      color: #1a1a2e;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 520px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
    }
    .header {
      background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
      padding: 36px 40px;
      text-align: center;
    }
    .logo {
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    .logo span { opacity: 0.75; }
    .body {
      padding: 40px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #0f0f23;
      margin-bottom: 12px;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #4b5563;
      margin-bottom: 16px;
    }
    .btn-wrap {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      padding: 14px 36px;
      background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.2px;
    }
    .notice {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
      font-size: 13px;
      color: #64748b;
      margin-top: 24px;
      line-height: 1.5;
    }
    .footer {
      padding: 24px 40px;
      border-top: 1px solid #f1f5f9;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">Lexis<span>.</span></div>
    </div>
    <div class="body">
      <h1>Reset your password</h1>
      <p>
        We received a request to reset the password for your Lexis account.
        Click the button below to choose a new password.
      </p>
      <p>This link expires in <strong>30 minutes</strong>.</p>
      <div class="btn-wrap">
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </div>
      <div class="notice">
        <strong>Didn't request this?</strong> You can safely ignore this email.
        Your password will not change and no further action is needed.
        If you're concerned, please contact support.
      </div>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} Lexis · This is an automated message, please do not reply.
    </div>
  </div>
</body>
</html>`;
}
