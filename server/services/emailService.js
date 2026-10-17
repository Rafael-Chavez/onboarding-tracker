import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let activeTransporter = null;
let activeSenderEmail = null;

/**
 * Service to handle email sending using nodemailer
 */
export const EmailService = {
  /**
   * Get or initialize nodemailer transporter
   */
  async getTransporter() {
    if (activeTransporter) {
      return { transporter: activeTransporter, senderEmail: activeSenderEmail };
    }

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      activeSenderEmail = process.env.SMTP_USER;
      activeTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      console.log('📧 No SMTP credentials in environment. Generating Ethereal test account...');
      const testAccount = await nodemailer.createTestAccount();
      console.log(`📧 Ethereal test account created: ${testAccount.user}`);
      activeSenderEmail = testAccount.user;
      activeTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    return { transporter: activeTransporter, senderEmail: activeSenderEmail };
  },

  /**
   * Log current SMTP configuration (omitting sensitive details)
   */
  logConfigStatus() {
    console.log('📧 Email Service Config Status:');
    console.log(`  - Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
    console.log(`  - Port: ${process.env.SMTP_PORT || '587'}`);
    console.log(`  - Secure: ${process.env.SMTP_SECURE === 'true'}`);
    console.log(`  - User present: ${!!process.env.SMTP_USER}`);
    console.log(`  - Pass present: ${!!process.env.SMTP_PASS}`);
  },

  /**
   * Verify SMTP connection health
   */
  async verifyConnection() {
    try {
      const { transporter } = await this.getTransporter();
      await transporter.verify();
      return { success: true, message: 'SMTP connection verified successfully' };
    } catch (error) {
      console.error('SMTP Verification Error:', error);
      return {
        success: false,
        error: `SMTP Verification failed: ${error.message}`
      };
    }
  },

  /**
   * Send an email
   * @param {Object} options - Email options (to, subject, text, html)
   */
  async sendEmail({ to, subject, text, html }) {
    try {
      const { transporter, senderEmail } = await this.getTransporter();

      const info = await transporter.sendMail({
        from: `"Onboarding Tracker" <${senderEmail}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);
      console.log('Accepted recipients: %o', info.accepted);
      console.log('Rejected recipients: %o', info.rejected);

      const previewUrl = nodemailer.getTestMessageUrl(info) || null;
      if (previewUrl) {
        console.log('📧 Ethereal Preview URL: %s', previewUrl);
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl,
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
