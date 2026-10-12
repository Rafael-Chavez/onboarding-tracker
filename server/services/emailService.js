import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let dynamicTransporter = null;
let etherealAccount = null;

async function getTransporter() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    if (!dynamicTransporter) {
      dynamicTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
    return dynamicTransporter;
  }

  // Fallback to Ethereal test account if real SMTP credentials are missing
  if (!dynamicTransporter) {
    try {
      etherealAccount = await nodemailer.createTestAccount();
      dynamicTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: etherealAccount.user,
          pass: etherealAccount.pass,
        },
      });
      console.log('📧 Created Ethereal test account:', etherealAccount.user);
    } catch (error) {
      console.error('Failed to create Ethereal test account:', error);
      throw error;
    }
  }

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
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('  - Ethereal Fallback: ACTIVE (Test account will be auto-generated)');
    }
  },

  /**
   * Verify SMTP connection health
   */
  async verifyConnection() {
    try {
      const transporter = await getTransporter();
      await transporter.verify();
      const isEthereal = !process.env.SMTP_USER || !process.env.SMTP_PASS;
      return {
        success: true,
        message: isEthereal
          ? `SMTP connection verified using Ethereal test account (${etherealAccount?.user})`
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

      const fromUser = process.env.SMTP_USER || etherealAccount?.user || 'test@ethereal.email';

      const info = await transporter.sendMail({
        from: `"Onboarding Tracker" <${fromUser}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);
      const previewUrl = nodemailer.getTestMessageUrl(info) || null;
      if (previewUrl) {
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
