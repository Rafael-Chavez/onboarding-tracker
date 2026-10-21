import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter = null;
let isEtherealGenerated = false;

/**
 * Lazily initialize and return the transporter.
 * If credentials are not configured in environment variables, automatically
 * generate an Ethereal SMTP test account.
 */
async function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const hasCredentials = process.env.SMTP_USER && process.env.SMTP_PASS;

  if (hasCredentials) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('✅ Custom SMTP transporter initialized successfully.');
  } else {
    console.warn('⚠️ SMTP credentials not found. Generating an Ethereal SMTP test account on demand...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      // Save credentials in environment variables for logging and reference
      process.env.SMTP_HOST = testAccount.smtp.host;
      process.env.SMTP_PORT = String(testAccount.smtp.port);
      process.env.SMTP_SECURE = String(testAccount.smtp.secure);
      process.env.SMTP_USER = testAccount.user;
      process.env.SMTP_PASS = testAccount.pass;
      isEtherealGenerated = true;

      console.log('✅ Ethereal SMTP test account generated successfully:', testAccount.user);
    } catch (error) {
      console.error('❌ Failed to generate Ethereal SMTP test account:', error);
      throw error;
    }
  }

  return transporter;
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
      // Get the transporter dynamically
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
      console.log('Accepted recipients:', info.accepted);
      console.log('Rejected recipients:', info.rejected);

      const isEthereal = isEtherealGenerated || process.env.SMTP_HOST?.includes('ethereal.email');
      const previewUrl = isEthereal ? nodemailer.getTestMessageUrl(info) : null;
      if (previewUrl) {
        console.log('✉️ Ethereal Preview URL: %s', previewUrl);
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
