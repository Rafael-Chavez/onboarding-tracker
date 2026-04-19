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
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || '587',
      secure: process.env.SMTP_SECURE,
      user: process.env.SMTP_USER ? '********' : 'NOT SET',
      pass: process.env.SMTP_PASS ? '********' : 'NOT SET',
    };

    console.log('Email Service: Attempting to send email with config:', smtpConfig);

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
        console.log('Email Service: Verifying SMTP connection...');
        await transporter.verify();
        console.log('Email Service: SMTP connection verified successfully.');
      } catch (verifyError) {
        console.error('Email Service: SMTP Connection verification failed:', verifyError);
        return {
          success: false,
          error: `SMTP Connection failed: ${verifyError.message}`,
          code: verifyError.code,
          command: verifyError.command
        };
      }

      console.log(`Email Service: Sending mail to ${to}...`);
      const info = await transporter.sendMail({
        from: `"Onboarding Tracker" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Email Service: Message sent successfully. MessageId: %s', info.messageId);
      console.log('Email Service: Full nodemailer response:', info);

      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      console.error('Email Service: Error sending email:', error);
      return {
        success: false,
        error: `Nodemailer error: ${error.message}`,
        code: error.code,
        command: error.command,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }
};
