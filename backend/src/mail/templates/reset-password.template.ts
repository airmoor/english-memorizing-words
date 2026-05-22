const YEAR = new Date().getFullYear();

/**
 * HTML email for password reset.
 *
 * Security notes:
 *  - resetUrl contains the raw token; this function must only be called
 *    from within EmailService, never logged or exposed elsewhere.
 *  - Inline styles are intentional: many email clients (Gmail, Outlook)
 *    strip <style> blocks, so layout-critical rules must be inlined.
 *  - role="presentation" on the wrapper table suppresses screen-reader
 *    noise for layout-only elements.
 */
export function buildResetPasswordHtml(resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Reset your Lexis password</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    /* Reset */
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    /* Base */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                   Helvetica, Arial, sans-serif;
      background-color: #f4f5f9;
      color: #1a1a2e;
      -webkit-font-smoothing: antialiased;
    }
    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 16px !important; }
      .email-card { border-radius: 12px !important; }
      .email-body { padding: 28px 24px !important; }
      .email-footer { padding: 20px 24px !important; }
    }
  </style>
</head>
<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="background-color:#f4f5f9;">
    <tr>
      <td class="email-wrapper" style="padding:40px 16px;">

        <!-- Card -->
        <table role="presentation" class="email-card" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:520px;margin:0 auto;background:#ffffff;
                      border-radius:16px;overflow:hidden;
                      box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#818cf8 100%);
                       padding:32px 40px;text-align:center;">
              <p role="heading" aria-level="1"
                 style="font-size:26px;font-weight:700;color:#ffffff;
                        letter-spacing:-0.5px;margin:0;">
                Lexis<span style="opacity:0.7;">.</span>
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="email-body" style="padding:36px 40px;">
              <h1 style="font-size:20px;font-weight:700;color:#0f0f23;margin:0 0 12px;">
                Reset your password
              </h1>
              <p style="font-size:15px;line-height:1.6;color:#4b5563;margin:0 0 16px;">
                We received a request to reset the password for your Lexis account.
                Click the button below to choose a new password.
              </p>
              <p style="font-size:15px;line-height:1.6;color:#4b5563;margin:0 0 32px;">
                This link expires in <strong style="color:#1a1a2e;">30 minutes</strong>.
              </p>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0"
                     style="margin:0 auto 32px;">
                <tr>
                  <td style="border-radius:10px;
                             background:linear-gradient(135deg,#6366f1 0%,#818cf8 100%);">
                    <a href="${resetUrl}"
                       target="_blank"
                       rel="noopener noreferrer"
                       style="display:inline-block;padding:14px 36px;
                              color:#ffffff;text-decoration:none;
                              font-size:15px;font-weight:600;
                              letter-spacing:0.2px;border-radius:10px;
                              mso-padding-alt:14px 36px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Notice -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="background:#f8fafc;border:1px solid #e2e8f0;
                             border-radius:8px;padding:14px 16px;">
                    <p style="font-size:13px;line-height:1.5;color:#64748b;margin:0;">
                      <strong style="color:#475569;">Didn't request this?</strong>
                      You can safely ignore this email — your password will not change.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="email-footer"
                style="padding:20px 40px;border-top:1px solid #f1f5f9;
                       text-align:center;">
              <p style="font-size:12px;color:#94a3b8;margin:0;">
                &copy; ${YEAR} Lexis &mdash; This is an automated message, please do not reply.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Plain-text fallback for email clients that don't render HTML,
 * or users who prefer plain text. Includes the full reset URL so
 * the flow still works even without HTML rendering.
 *
 * Security note: resetUrl contains the raw token. Same handling rules
 * as the HTML version — only pass to email provider, never log.
 */
export function buildResetPasswordText(resetUrl: string): string {
  return `RESET YOUR LEXIS PASSWORD
=========================

We received a request to reset the password for your Lexis account.

Use the link below to choose a new password. It expires in 30 minutes.

  ${resetUrl}

If you didn't request this, you can safely ignore this email.
Your password will not change.

---
© ${YEAR} Lexis — Automated message, do not reply.`;
}
