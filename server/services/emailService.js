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
   * Log configuration status on startup
   */
  logConfigStatus() {
    const hasUser = !!process.env.SMTP_USER;
    const hasPass = !!process.env.SMTP_PASS;
    console.log('📧 Email Service Configuration Status:');
    console.log(`   - Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
    console.log(`   - Port: ${process.env.SMTP_PORT || '587'}`);
    console.log(`   - Secure: ${process.env.SMTP_SECURE || 'false'}`);
    console.log(`   - User: ${hasUser ? '✅ Configured' : '❌ MISSING'}`);
    console.log(`   - Pass: ${hasPass ? '✅ Configured' : '❌ MISSING'}`);
  },

  /**
   * Verify SMTP connection
   */
  async verifyConnection() {
    try {
      await transporter.verify();
      return { success: true, message: 'SMTP connection verified successfully' };
    } catch (error) {
      console.error('SMTP Verification Error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send an email
   * @param {Object} options - Email options (to, subject, text, html)
   */
  async sendEmail({ to, subject, text, html }) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      const error = 'Email Error: SMTP credentials (SMTP_USER/SMTP_PASS) not configured.';
      console.error(error);
      return {
        success: false,
        error: 'Email service is not configured on the server. Please check environment variables.'
      };
    }

    try {
      console.log(`Attempting to send email to ${to}...`);
      const info = await transporter.sendMail({
        from: `"Onboarding Tracker" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Email sent successfully: %s', info.messageId);
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
      console.error('Nodemailer sendMail Error:', error);
      return { success: false, error: `Nodemailer error: ${error.message}` };
    }
  }
};
