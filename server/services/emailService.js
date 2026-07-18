import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let dynamicTransporter = null;
let isEtherealAccount = false;

/**
 * Helper to dynamically retrieve or initialize the transporter on demand.
 * If credentials are missing, it automatically falls back to generating
 * an Ethereal SMTP test account.
 */
async function getTransporter() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    if (!dynamicTransporter || isEtherealAccount) {
      dynamicTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      isEtherealAccount = false;
    }
    return { transporter: dynamicTransporter, isEthereal: false };
  }

  // Create Ethereal test account on demand
  if (!dynamicTransporter || !isEtherealAccount) {
    console.log('Generating Ethereal SMTP test account...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      dynamicTransporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      isEtherealAccount = true;

      // Update process.env with ethereal credentials so that verifyConnection uses them
      process.env.SMTP_HOST = testAccount.smtp.host;
      process.env.SMTP_PORT = testAccount.smtp.port.toString();
      process.env.SMTP_SECURE = testAccount.smtp.secure.toString();
      process.env.SMTP_USER = testAccount.user;
      process.env.SMTP_PASS = testAccount.pass;

      console.log('Ethereal test account generated successfully:', testAccount.user);
    } catch (error) {
      console.error('Failed to create Ethereal test account:', error);
      throw error;
    }
  }
  return { transporter: dynamicTransporter, isEthereal: true };
}

export const EmailService = {
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
      const { transporter } = await getTransporter();
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
      const { transporter, isEthereal } = await getTransporter();
      const fromEmail = process.env.SMTP_USER || 'test@ethereal.email';

      const info = await transporter.sendMail({
        from: `"Onboarding Tracker" <${fromEmail}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);

      // Log accepted/rejected recipients for visibility
      console.log('Accepted recipients:', info.accepted);
      if (info.rejected && info.rejected.length > 0) {
        console.log('Rejected recipients:', info.rejected);
      }

      let previewUrl = null;
      if (isEthereal) {
        previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('Ethereal Preview URL: %s', previewUrl);
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
