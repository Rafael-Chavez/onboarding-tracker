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
    console.log('SMTP Config:', {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || '587',
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER ? '***' : 'MISSING',
      pass: process.env.SMTP_PASS ? '***' : 'MISSING'
    });

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return {
        success: false,
        error: 'SMTP credentials missing. Please set SMTP_USER and SMTP_PASS in .env'
      };
    }

    try {
      await transporter.verify();
      console.log('SMTP connection verified successfully!');
      return { success: true, message: 'SMTP connection verified' };
    } catch (error) {
      console.error('SMTP Verification failed:', error);
      return {
        success: false,
        error: `SMTP Verification failed: ${error.message}`,
        code: error.code,
        command: error.command
      };
    }
  },

  /**
   * Send an email
   * @param {Object} options - Email options (to, subject, text, html)
   */
  async sendEmail({ to, subject, text, html }) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('Email Error: SMTP credentials not configured.');
      return {
        success: false,
        error: 'Email service is not configured. Please set SMTP_USER and SMTP_PASS.'
      };
    }

    try {
      // Send the email
      const info = await transporter.sendMail({
        from: `"Onboarding Tracker" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Email sent successfully:', info.messageId);
      console.log('Full SMTP response:', info.response);

      if (info.rejected && info.rejected.length > 0) {
        console.warn('Some recipients were rejected:', info.rejected);
      }

      return {
        success: true,
        messageId: info.messageId,
        details: {
          response: info.response,
          rejected: info.rejected,
          envelope: info.envelope
        }
      };
    } catch (error) {
      console.error('Detailed Email Error:', {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode
      });

      return {
        success: false,
        error: `SMTP Error: ${error.message}`,
        details: {
          code: error.code,
          command: error.command,
          response: error.response
        }
      };
    }
  }
};
