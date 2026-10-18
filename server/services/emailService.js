import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Service to handle email sending using nodemailer
 */
let customTransporter = null;

function initCustomTransporter() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    customTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
}

initCustomTransporter();

let etherealTransporter = null;

async function getTransporter() {
  // Re-check environment variables in case they were configured dynamically
  if (!customTransporter && process.env.SMTP_USER && process.env.SMTP_PASS) {
    initCustomTransporter();
  }

  if (customTransporter) {
    return { transporter: customTransporter, isEthereal: false };
  }

  if (!etherealTransporter) {
    try {
      console.log('📧 Creating Ethereal SMTP test account on demand...');
      const testAccount = await nodemailer.createTestAccount();
      etherealTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('✅ Ethereal SMTP test account created:', testAccount.user);
    } catch (error) {
      console.error('Failed to create Ethereal test account:', error);
      throw error;
    }
  }

  return { transporter: etherealTransporter, isEthereal: true };
}

export const EmailService = {
  /**
   * Log current SMTP configuration
   */
  logConfigStatus() {
    console.log('📧 Email Service Config Status:');
    console.log(`  - Host: ${process.env.SMTP_HOST || (process.env.SMTP_USER ? 'smtp.gmail.com' : 'Ethereal auto-fallback')}`);
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
      const { transporter, isEthereal } = await getTransporter();
      await transporter.verify();
      return {
        success: true,
        message: isEthereal
          ? 'Ethereal SMTP test connection verified successfully'
          : 'Custom SMTP connection verified successfully',
        isEthereal
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
      const { transporter, isEthereal } = await getTransporter();

      const fromAddress = process.env.SMTP_USER || 'onboarding-tracker@ethereal.email';
      const info = await transporter.sendMail({
        from: `"Onboarding Tracker" <${fromAddress}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);
      console.log('Accepted recipients:', info.accepted);
      console.log('Rejected recipients:', info.rejected);

      let previewUrl = null;
      if (isEthereal) {
        previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('🔗 Ethereal Preview URL:', previewUrl);
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl,
        isEthereal,
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
