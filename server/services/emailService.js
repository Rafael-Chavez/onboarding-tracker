import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Service to handle email sending using nodemailer
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const EmailService = {
  /**
   * Send an email
   * @param {Object} options - Email options (to, subject, text, html)
   */
  async sendEmail({ to, subject, text, html }) {
    console.log(`[EmailService] Attempting to send email to: ${to}`);
    console.log(`[EmailService] Subject: ${subject}`);

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      const errorMsg = 'Email Error: SMTP credentials not configured in environment variables.';
      console.error(`[EmailService] ${errorMsg}`);
      return {
        success: false,
        error: 'Email service is not configured on the server. Please set SMTP_USER and SMTP_PASS.'
      };
    }

    try {
      // Verify connection before sending
      console.log('[EmailService] Verifying SMTP connection...');
      try {
        await transporter.verify();
        console.log('[EmailService] SMTP Connection verified successfully');
      } catch (verifyError) {
        console.error('[EmailService] SMTP Connection verification failed:', verifyError);
        return {
          success: false,
          error: `SMTP Connection failed: ${verifyError.message}`,
          details: verifyError
        };
      }

      const info = await transporter.sendMail({
        from: `"Onboarding Tracker" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('[EmailService] Message sent successfully: %s', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('[EmailService] Error sending email:', error);
      return {
        success: false,
        error: `Nodemailer error: ${error.message}`,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }
};
