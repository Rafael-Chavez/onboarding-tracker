import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let cachedTransporter = null;
let isEthereal = false;

async function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  // Check if credentials are provided in .env
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log('📧 Using custom SMTP configuration');
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

  // Fallback to auto-generated Ethereal SMTP test account
  console.log('📧 SMTP credentials not configured. Generating Ethereal test account...');
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log('📧 Generated Ethereal Test Account:', testAccount.user);
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
    return cachedTransporter;
  } catch (error) {
    console.error('❌ Failed to generate Ethereal SMTP test account:', error);
    throw error;
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
  },

  /**
   * Verify SMTP connection health
   */
  async verifyConnection() {
    try {
      const activeTransporter = await getTransporter();
      await activeTransporter.verify();
      return {
        success: true,
        message: isEthereal
          ? 'SMTP verified successfully (using Ethereal fallback)'
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
      const activeTransporter = await getTransporter();

      const fromAddress = isEthereal
        ? activeTransporter.options.auth.user
        : (process.env.SMTP_USER || 'noreply@onboardingtracker.com');

      const info = await activeTransporter.sendMail({
        from: `"Onboarding Tracker" <${fromAddress}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);

      const previewUrl = isEthereal ? nodemailer.getTestMessageUrl(info) : null;
      if (previewUrl) {
        console.log('📬 View Ethereal preview: %s', previewUrl);
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
