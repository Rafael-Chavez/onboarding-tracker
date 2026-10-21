import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let activeTransporter = null;
let activeConfig = null;

/**
 * Service to handle email sending using nodemailer
 */
export const EmailService = {
  /**
   * Get or initialize transporter
   */
  async getTransporter() {
    const customUser = process.env.SMTP_USER;
    const customPass = process.env.SMTP_PASS;

    if (customUser && customPass) {
      const configKey = `${process.env.SMTP_HOST || 'smtp.gmail.com'}-${process.env.SMTP_PORT || '587'}-${process.env.SMTP_SECURE === 'true'}-${customUser}`;
      if (activeTransporter && activeConfig === configKey) {
        return activeTransporter;
      }

      console.log('Initializing custom SMTP Transporter...');
      activeTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: customUser,
          pass: customPass,
        },
      });
      activeConfig = configKey;
      return activeTransporter;
    }

    // No custom credentials, fallback to Ethereal
    if (activeTransporter && activeConfig === 'ethereal') {
      return activeTransporter;
    }

    console.log('No custom SMTP credentials found. Creating auto-generated Ethereal SMTP test account...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      console.log('Ethereal Test Account Created:');
      console.log(`  - User: ${testAccount.user}`);
      console.log(`  - Pass: [REDACTED]`);
      console.log(`  - Web:  ${testAccount.web}`);

      activeTransporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      activeConfig = 'ethereal';
      return activeTransporter;
    } catch (error) {
      console.error('Failed to create Ethereal SMTP test account:', error);
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
      const transporterInstance = await this.getTransporter();
      await transporterInstance.verify();
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
      const transporterInstance = await this.getTransporter();
      const fromUser = process.env.SMTP_USER || transporterInstance.options.auth.user;

      const info = await transporterInstance.sendMail({
        from: `"Onboarding Tracker" <${fromUser}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);
      console.log('Accepted recipients:', info.accepted);
      console.log('Rejected recipients:', info.rejected);

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('Ethereal preview URL: %s', previewUrl);
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
