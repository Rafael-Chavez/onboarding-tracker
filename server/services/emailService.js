import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let cachedTransporter = null;
let isEthereal = false;

async function getTransporter() {
  if (cachedTransporter) {
    return { transporter: cachedTransporter, isEthereal };
  }

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    isEthereal = false;
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return { transporter: cachedTransporter, isEthereal };
  }

  // Fallback to dynamic Ethereal test account for testing & local development
  try {
    console.log('📧 SMTP credentials missing. Creating Ethereal SMTP test account...');
    const testAccount = await nodemailer.createTestAccount();
    isEthereal = true;
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`📧 Created Ethereal test account: ${testAccount.user}`);
    return { transporter: cachedTransporter, isEthereal };
  } catch (err) {
    console.error('Failed to create Ethereal test account:', err);
    throw new Error(`Could not initialize email transporter: ${err.message}`);
  }
}

export const EmailService = {
  /**
   * Log current SMTP configuration (omitting sensitive details)
   */
  logConfigStatus() {
    console.log('📧 Email Service Config Status:');
    console.log(`  - Host: ${process.env.SMTP_HOST || (process.env.SMTP_USER ? 'smtp.gmail.com' : 'smtp.ethereal.email (auto-fallback)')}`);
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
      const { transporter, isEthereal: usingEthereal } = await getTransporter();
      await transporter.verify();
      return {
        success: true,
        message: usingEthereal
          ? 'SMTP connection verified (using Ethereal test account)'
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
      const { transporter, isEthereal: usingEthereal } = await getTransporter();

      const fromAddress = process.env.SMTP_USER || 'onboarding-tracker@ethereal.email';
      const info = await transporter.sendMail({
        from: `"Onboarding Tracker" <${fromAddress}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);
      const previewUrl = usingEthereal ? nodemailer.getTestMessageUrl(info) : null;
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
