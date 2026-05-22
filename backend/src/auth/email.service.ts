import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    // TODO: integrate real email provider (SendGrid, Resend, etc.)
    this.logger.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
  }
}
