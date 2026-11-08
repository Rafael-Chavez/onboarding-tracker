import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Service to handle email sending using nodemailer
 */
let cachedTransporter = null;
let isEthereal = false;
let etherealAccount = null;

async function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    isEthereal = false;
    return cachedTransporter;
  }

  // Fallback to Ethereal test account if credentials are not configured
  console.log('Creating Ethereal SMTP test account for development/testing...');
  try {
    etherealAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: etherealAccount.smtp.host,
      port: etherealAccount.smtp.port,
      secure: etherealAccount.smtp.secure,
      auth: {
        user: etherealAccount.user,
        pass: etherealAccount.pass,
      },
    });
    isEthereal = true;
    console.log('Ethereal test account initialized: %s', etherealAccount.user);
    return cachedTransporter;
  } catch (err) {
    console.error('Failed to create Ethereal test account:', err);
    throw err;
  }
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
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('  - Fallback: Ethereal test SMTP account will be auto-generated on first request');
    }
  },

  /**
   * Verify SMTP connection health
   */
  async verifyConnection() {
    try {
      const transporter = await getTransporter();
      await transporter.verify();
      const note = isEthereal ? ' (Ethereal test account)' : '';
      return { success: true, message: `SMTP connection verified successfully${note}` };
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
      const transporter = await getTransporter();

      const senderEmail = process.env.SMTP_USER || etherealAccount?.user || 'tracker@ethereal.email';
      const info = await transporter.sendMail({
        from: `"Onboarding Tracker" <${senderEmail}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);
      console.log('Accepted recipients: %s', info.accepted?.join(', ') || 'none');
      console.log('Rejected recipients: %s', info.rejected?.join(', ') || 'none');

      let previewUrl = null;
      if (isEthereal) {
        previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('Preview URL: %s', previewUrl);
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
