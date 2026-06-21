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
   * Verify SMTP connection
   */
  async verifyConnection() {
    console.log('Verifying SMTP connection...');
    console.log('SMTP Host:', process.env.SMTP_HOST || 'smtp.gmail.com');
    console.log('SMTP Port:', process.env.SMTP_PORT || '587');
    console.log('SMTP User:', process.env.SMTP_USER ? 'Configured' : 'MISSING');
    console.log('SMTP Pass:', process.env.SMTP_PASS ? 'Configured' : 'MISSING');

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return {
        success: false,
        error: 'SMTP credentials missing (SMTP_USER/SMTP_PASS)'
      };
    }

    try {
      await transporter.verify();
      console.log('✅ SMTP Connection verified successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ SMTP Connection verification failed:', error);
      return { success: false, error: error.message };
    }
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
      const verification = await this.verifyConnection();
      if (!verification.success) {
        return { success: false, error: `SMTP Verification failed: ${verification.error}` };
      }

      console.log(`Sending email to: ${to} | Subject: ${subject}`);
      const info = await transporter.sendMail({
        from: `"Onboarding Tracker" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);
      return {
        success: true,
        messageId: info.messageId,
        details: {
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response
        }
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: `Nodemailer error: ${error.message}` };
    }
  }
};
