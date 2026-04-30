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
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('Email Warning: SMTP credentials not configured. Email features will be disabled.');
      return false;
    }

    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified and ready to send emails');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection failed:', error.message);
      return false;
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
      console.log(`Attempting to send email to ${to}: ${subject}`);

      const info = await transporter.sendMail({
        from: `"Onboarding Tracker" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Email sent successfully: %s', info.messageId);
      if (info.rejected && info.rejected.length > 0) {
        console.warn('Recipients rejected:', info.rejected);
      }

      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      console.error('Error sending email:', error);
      // Log more detailed error information if available
      if (error.code) console.error('Error Code:', error.code);
      if (error.command) console.error('Error Command:', error.command);

      return {
        success: false,
        error: `Nodemailer error: ${error.message}`,
        code: error.code
      };
    }
  }
};
