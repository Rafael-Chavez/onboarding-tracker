import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let cachedTransporter = null;
let isEthereal = false;

async function getTransporter() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    if (!cachedTransporter || isEthereal) {
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
    }
    return cachedTransporter;
  }

  // Fallback to Ethereal test account if credentials are missing
  if (!cachedTransporter || !isEthereal) {
    try {
      console.log('Generating Ethereal SMTP test account for email delivery...');
      const testAccount = await nodemailer.createTestAccount();
      cachedTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      isEthereal = true;
      console.log(`Ethereal SMTP test account created: ${testAccount.user}`);
    } catch (err) {
      console.error('Failed to create Ethereal SMTP account:', err);
      throw err;
    }
  }

  return cachedTransporter;
}

export const EmailService = {
  /**
   * Log current SMTP configuration
   */
  logConfigStatus() {
    console.log('📧 Email Service Config Status:');
    console.log(`  - Host: ${process.env.SMTP_HOST || (isEthereal ? 'smtp.ethereal.email' : 'smtp.gmail.com')}`);
    console.log(`  - Port: ${process.env.SMTP_PORT || '587'}`);
    console.log(`  - Secure: ${process.env.SMTP_SECURE === 'true'}`);
    console.log(`  - User present: ${!!process.env.SMTP_USER}`);
    console.log(`  - Pass present: ${!!process.env.SMTP_PASS}`);
    if (!process.env.SMTP_USER) {
      console.log('  - Note: Custom SMTP credentials not found. Automated Ethereal test account will be generated on demand.');
    }
  },

  /**
   * Verify SMTP connection health
   */
  async verifyConnection() {
    try {
      const transporter = await getTransporter();
      await transporter.verify();
      return {
        success: true,
        message: isEthereal
          ? 'Ethereal SMTP test account connected successfully'
          : 'SMTP connection verified successfully'
      };
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
      const fromUser = process.env.SMTP_USER || transporter.options?.auth?.user || 'no-reply@onboardingtracker.local';

      const info = await transporter.sendMail({
        from: `"Onboarding Tracker" <${fromUser}>`,
        to,
        subject,
        text,
        html,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info) || null;

      console.log('Message sent: %s', info.messageId);
      if (previewUrl) {
        console.log('Ethereal Email Preview URL: %s', previewUrl);
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
