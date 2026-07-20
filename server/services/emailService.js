import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let activeTransporter = null;
let etherealAccount = null;

/**
 * Service to handle email sending using nodemailer with Ethereal SMTP fallback
 */
export const EmailService = {
  /**
   * Dynamically initializes the nodemailer transporter.
   * If credentials are provided, it uses them; otherwise, it sets up an Ethereal SMTP test account.
   */
  async getTransporter() {
    if (activeTransporter) {
      return activeTransporter;
    }

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      activeTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      return activeTransporter;
    }

    console.log('⚠️ No SMTP credentials configured. Creating an Ethereal SMTP test account fallback...');
    try {
      etherealAccount = await nodemailer.createTestAccount();
      activeTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: etherealAccount.user,
          pass: etherealAccount.pass,
        },
      });
      console.log('✅ Created Ethereal SMTP account:', etherealAccount.user);
      return activeTransporter;
    } catch (error) {
      console.error('Failed to create Ethereal test account:', error);
      throw error;
    }
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
      const transporter = await this.getTransporter();
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
      const transporter = await this.getTransporter();
      const fromEmail = process.env.SMTP_USER || (etherealAccount ? etherealAccount.user : 'test@ethereal.email');

      const info = await transporter.sendMail({
        from: `"Onboarding Tracker" <${fromEmail}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);
      const previewUrl = etherealAccount ? nodemailer.getTestMessageUrl(info) : null;
      if (previewUrl) {
        console.log('📧 Ethereal Preview URL:', previewUrl);
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
