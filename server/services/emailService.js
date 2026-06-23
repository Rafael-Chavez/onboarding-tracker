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
   * Log SMTP configuration status (without sensitive data)
   */
  logConfigStatus() {
    console.log('--- SMTP Configuration Status ---');
    console.log(`Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
    console.log(`Port: ${process.env.SMTP_PORT || '587'}`);
    console.log(`Secure: ${process.env.SMTP_SECURE === 'true'}`);
    console.log(`User configured: ${!!process.env.SMTP_USER}`);
    console.log(`Pass configured: ${!!process.env.SMTP_PASS}`);
    console.log('---------------------------------');
  },

  /**
   * Send an email
   * @param {Object} options - Email options (to, subject, text, html)
   */
  async sendEmail({ to, subject, text, html }) {
    this.logConfigStatus();

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
        console.log('Verifying SMTP connection...');
        await transporter.verify();
        console.log('SMTP connection verified successfully.');
      } catch (verifyError) {
        console.error('SMTP Connection verification failed:', verifyError);
        return {
          success: false,
          error: `SMTP Connection failed: ${verifyError.message}`,
          code: verifyError.code,
          command: verifyError.command
        };
      }

      console.log(`Attempting to send email to: ${to}`);
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
          envelope: info.envelope,
          response: info.response
        }
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        error: `Nodemailer error: ${error.message}`,
        details: error
      };
    }
  }
};
