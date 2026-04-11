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
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      const missing = [];
      if (!process.env.SMTP_USER) missing.push('SMTP_USER');
      if (!process.env.SMTP_PASS) missing.push('SMTP_PASS');

      console.error(`Email Error: Missing configuration: ${missing.join(', ')}`);
      return {
        success: false,
        error: `Email service is not configured on the server. Missing: ${missing.join(', ')}`
      };
    }

    try {
      // Verify connection before sending
      try {
        await transporter.verify();
      } catch (verifyError) {
        console.error('SMTP Connection verification failed:', verifyError);
        return { success: false, error: `SMTP Connection failed: ${verifyError.message}` };
      }

      const info = await transporter.sendMail({
        from: `"Onboarding Tracker" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: `Nodemailer error: ${error.message}` };
    }
  }
};
