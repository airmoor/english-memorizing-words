import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service';

jest.mock('nodemailer');
jest.mock('resend', () => ({ Resend: jest.fn(() => ({ emails: { send: jest.fn() } })) }));

const sendMail = jest.fn();

function configOf(env: Record<string, string>): ConfigService {
  return { get: (key: string) => env[key] } as unknown as ConfigService;
}

const SMTP_ENV = {
  FRONTEND_URL: 'https://dev.lexly.club',
  EMAIL_FROM: 'Lexis <noreply@lexly.club>',
  SMTP_HOST: 'mail.iaxx.ai',
  SMTP_USER: 'noreply@lexly.club',
  SMTP_PASSWORD: 'hunter2',
};

describe('EmailService transport selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendMail.mockResolvedValue({ messageId: '<abc@mail.iaxx.ai>' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
  });

  it('uses SMTP when host, user and password are all set', async () => {
    const svc = new EmailService(configOf(SMTP_ENV));

    expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
    const opts = (nodemailer.createTransport as jest.Mock).mock.calls[0][0];
    // Port 587 is submission-with-STARTTLS: not implicit TLS, but TLS required.
    expect(opts).toMatchObject({
      host: 'mail.iaxx.ai',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: 'noreply@lexly.club', pass: 'hunter2' },
    });

    await svc.sendPasswordResetEmail('anastasiia@gmail.com', 'tok');
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      from: 'Lexis <noreply@lexly.club>',
      to: 'anastasiia@gmail.com',
      subject: 'Reset your Lexis password',
    });
  });

  it('uses implicit TLS on port 465', () => {
    new EmailService(configOf({ ...SMTP_ENV, SMTP_PORT: '465' }));
    expect((nodemailer.createTransport as jest.Mock).mock.calls[0][0]).toMatchObject({
      port: 465,
      secure: true,
      requireTLS: false,
    });
  });

  it('falls back to Resend when SMTP is incomplete', () => {
    // Password missing — a half-configured SMTP must not silently disable email.
    new EmailService(
      configOf({
        FRONTEND_URL: 'https://dev.lexly.club',
        SMTP_HOST: 'mail.iaxx.ai',
        SMTP_USER: 'noreply@lexly.club',
        RESEND_API_KEY: 're_key',
      }),
    );
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('simulates delivery when neither transport is configured', async () => {
    const svc = new EmailService(configOf({ FRONTEND_URL: 'http://localhost:5173' }));
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    await svc.sendPasswordResetEmail('anastasiia@gmail.com', 'tok');

    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      '[DEV] Password reset email simulated for: a***@gmail.com',
    );
    log.mockRestore();
  });

  it('never logs the reset URL, the token or the raw address', async () => {
    const svc = new EmailService(configOf(SMTP_ENV));
    const lines: string[] = [];
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation((m) => {
      lines.push(String(m));
    });
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation((m) => {
      lines.push(String(m));
    });

    await svc.sendPasswordResetEmail('anastasiia@gmail.com', 'super-secret-token');

    const joined = lines.join('\n');
    expect(joined).not.toContain('super-secret-token');
    expect(joined).not.toContain('reset-password');
    expect(joined).not.toContain('anastasiia@gmail.com');
    expect(joined).toContain('a***@gmail.com');

    log.mockRestore();
    error.mockRestore();
  });

  it('swallows an SMTP failure so the auth endpoint stays generic', async () => {
    sendMail.mockRejectedValue(new Error('connection refused'));
    const svc = new EmailService(configOf(SMTP_ENV));
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await expect(
      svc.sendPasswordResetEmail('anastasiia@gmail.com', 'tok'),
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalled();

    error.mockRestore();
  });
});
