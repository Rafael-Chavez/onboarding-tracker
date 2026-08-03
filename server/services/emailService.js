import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let activeTransporter = null;
let isEthereal = false;
let etherealAccount = null;

async function getTransporter() {
  if (activeTransporter) {
    return activeTransporter;
  }

  // Check if SMTP credentials are set
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log('📧 Initializing transporter with user-provided SMTP credentials...');
    activeTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    isEthereal = false;
    return activeTransporter;
  }

  // Fallback to dynamic Ethereal SMTP test account
  console.log('📧 No SMTP credentials configured. Creating virtual Ethereal SMTP test account...');
  try {
    etherealAccount = await nodemailer.createTestAccount();
    activeTransporter = nodemailer.createTransport({
      host: etherealAccount.smtp.host,
      port: etherealAccount.smtp.port,
      secure: etherealAccount.smtp.secure,
      auth: {
        user: etherealAccount.user,
        pass: etherealAccount.pass,
      },
    });
    isEthereal = true;
    console.log('📧 Created Ethereal SMTP Test Account successfully:', etherealAccount.user);
    return activeTransporter;
  } catch (error) {
    console.error('📧 Failed to create Ethereal SMTP Test Account:', error);
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
    console.log('  - Dynamic Fallback: Ethereal test account will be generated on-demand if credentials are not configured.');
  },

  /**
   * Verify SMTP connection health
   */
  async verifyConnection() {
    try {
      const tx = await getTransporter();
      await tx.verify();
      return {
        success: true,
        message: isEthereal
          ? `SMTP connection verified successfully (Virtual Ethereal Account: ${etherealAccount.user})`
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
      const tx = await getTransporter();

      // Verify connection before sending
      const verify = await this.verifyConnection();
      if (!verify.success) {
        return verify;
      }

      const fromUser = process.env.SMTP_USER || (etherealAccount ? etherealAccount.user : 'no-reply@example.com');
      const info = await tx.sendMail({
        from: `"Onboarding Tracker" <${fromUser}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);

      let previewUrl = null;
      if (isEthereal) {
        previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('📧 Ethereal Preview URL:', previewUrl);
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
