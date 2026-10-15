import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let etherealAccount = null;
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

  // Fallback to Ethereal test account if SMTP credentials are missing
  if (!etherealAccount) {
    try {
      etherealAccount = await nodemailer.createTestAccount();
      console.log('📧 Ethereal test SMTP account created:', etherealAccount.user);
    } catch (err) {
      console.error('Failed to create Ethereal test account:', err);
    }
  }

  if (etherealAccount) {
    if (!dynamicTransporter) {
      dynamicTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: etherealAccount.user,
          pass: etherealAccount.pass,
        },
      });
    }
    return dynamicTransporter;
  }

  return null;
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
      console.log('  - Notice: Custom SMTP credentials not set. Falling back to dynamic Ethereal test account.');
    }
  },

  /**
   * Verify SMTP connection health
   */
  async verifyConnection() {
    try {
      const transporter = await getTransporter();
      if (!transporter) {
        return {
          success: false,
          error: 'SMTP credentials missing and unable to initialize test transporter.'
        };
      }

      await transporter.verify();
      const isEthereal = !process.env.SMTP_USER || !process.env.SMTP_PASS;
      return {
        success: true,
        message: isEthereal
          ? 'SMTP verified (using dynamic Ethereal test account)'
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
      if (!transporter) {
        return {
          success: false,
          error: 'Email service unavailable: SMTP transporter failed to initialize.'
        };
      }

      const fromAddress = process.env.SMTP_USER || (etherealAccount ? etherealAccount.user : 'noreply@onboardingtracker.com');

      const info = await transporter.sendMail({
        from: `"Onboarding Tracker" <${fromAddress}>`,
        to,
        subject,
        text,
        html,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);

      console.log('Message sent: %s', info.messageId);
      console.log('Accepted recipients:', info.accepted);
      console.log('Rejected recipients:', info.rejected);
      if (previewUrl) {
        console.log('Preview URL (Ethereal): %s', previewUrl);
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: previewUrl || null,
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
