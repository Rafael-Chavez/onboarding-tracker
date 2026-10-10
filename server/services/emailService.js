import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let dynamicTransporter = null;
let isEthereal = false;

async function getTransporter() {
  if (dynamicTransporter) {
    return { transporter: dynamicTransporter, isEthereal };
  }

  const hasCredentials = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

  if (hasCredentials) {
    dynamicTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    isEthereal = false;
    return { transporter: dynamicTransporter, isEthereal };
  }

  // Fallback: Create Ethereal test account if credentials are not configured
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log('📧 Ethereal SMTP Test Account created:', testAccount.user);
    dynamicTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    isEthereal = true;
    return { transporter: dynamicTransporter, isEthereal };
  } catch (error) {
    console.error('Failed to create Ethereal test account:', error);
    throw error;
  }
}

/**
 * Service to handle email sending using nodemailer
 */
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
      console.log('  - Notice: No custom SMTP credentials found. Will fall back to Nodemailer Ethereal test account for dev emails.');
    }
  },

  /**
   * Verify SMTP connection health
   */
  async verifyConnection() {
    try {
      const { transporter, isEthereal: ethereal } = await getTransporter();
      await transporter.verify();
      const modeText = ethereal ? 'Ethereal Test Account' : 'Custom SMTP';
      return { success: true, message: `SMTP connection verified successfully (${modeText})` };
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
      const { transporter, isEthereal: ethereal } = await getTransporter();

      const fromAddress = process.env.SMTP_USER || 'noreply@onboardingtracker.com';
      const info = await transporter.sendMail({
        from: `"Onboarding Tracker" <${fromAddress}>`,
        to,
        subject,
        text,
        html,
      });

      const previewUrl = ethereal ? nodemailer.getTestMessageUrl(info) : null;

      console.log('Message sent: %s', info.messageId);
      console.log('  Accepted recipients:', info.accepted);
      console.log('  Rejected recipients:', info.rejected);
      if (previewUrl) {
        console.log('  Preview URL:', previewUrl);
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
