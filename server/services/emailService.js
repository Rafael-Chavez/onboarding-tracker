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
   * Log configuration status (without sensitive data)
   */
  logConfigStatus() {
    console.log('--- Email Service Configuration ---');
    console.log('SMTP Host:', process.env.SMTP_HOST || 'smtp.gmail.com (default)');
    console.log('SMTP Port:', process.env.SMTP_PORT || '587 (default)');
    console.log('SMTP Secure:', process.env.SMTP_SECURE || 'false (default)');
    console.log('SMTP User:', process.env.SMTP_USER ? 'Configured (not shown)' : 'MISSING');
    console.log('SMTP Pass:', process.env.SMTP_PASS ? 'Configured (not shown)' : 'MISSING');
    console.log('------------------------------------');
  },

  /**
   * Send an email
   * @param {Object} options - Email options (to, subject, text, html)
   */
  async sendEmail({ to, subject, text, html }) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('Email Error: SMTP credentials not configured in environment variables.');
      return {
        success: false,
        error: 'Email service is not configured on the server. Please set SMTP_USER and SMTP_PASS.'
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
