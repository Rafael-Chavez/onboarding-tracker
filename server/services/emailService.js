import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let dynamicTransporter = null;

async function getTransporter() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  if (dynamicTransporter) {
    return dynamicTransporter;
  }

  console.log('Generating Ethereal SMTP test account...');
  const testAccount = await nodemailer.createTestAccount();

  // Set SMTP env variables for consistent reuse/logging
  process.env.SMTP_HOST = testAccount.smtp.host;
  process.env.SMTP_PORT = testAccount.smtp.port.toString();
  process.env.SMTP_SECURE = testAccount.smtp.secure.toString();
  process.env.SMTP_USER = testAccount.user;
  process.env.SMTP_PASS = testAccount.pass;

  console.log(`Ethereal SMTP Account Created:
    - Host: ${process.env.SMTP_HOST}
    - Port: ${process.env.SMTP_PORT}
    - User: ${process.env.SMTP_USER}
  `);

  dynamicTransporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  return dynamicTransporter;
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
      const activeTransporter = await getTransporter();
      await activeTransporter.verify();
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
      const activeTransporter = await getTransporter();

      // Verify connection before sending
      const verify = await this.verifyConnection();
      if (!verify.success) {
        return verify;
      }

      const info = await activeTransporter.sendMail({
        from: `"Onboarding Tracker" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);

      // Get Ethereal message URL if available
      const previewUrl = nodemailer.getTestMessageUrl(info) || null;
      if (previewUrl) {
        console.log('Ethereal Sent Email Preview URL: %s', previewUrl);
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
