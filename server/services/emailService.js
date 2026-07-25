import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let activeTransporter = null;
let etherealAccount = null;

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
   * Get active transporter, creating or falling back to Ethereal if needed
   */
  async getTransporter() {
    const hasCustomCreds = process.env.SMTP_USER && process.env.SMTP_PASS;

    if (hasCustomCreds) {
      if (!activeTransporter || activeTransporter._isEthereal) {
        console.log('📧 Initializing custom SMTP transporter...');
        activeTransporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        activeTransporter._isEthereal = false;
        activeTransporter._user = process.env.SMTP_USER;
      }
    } else {
      if (!activeTransporter || !activeTransporter._isEthereal) {
        console.log('📧 Custom SMTP credentials not found. Generating Ethereal SMTP test account...');
        etherealAccount = await nodemailer.createTestAccount();
        console.log(`📧 Generated Ethereal account: ${etherealAccount.user}`);
        activeTransporter = nodemailer.createTransport({
          host: etherealAccount.smtp.host,
          port: etherealAccount.smtp.port,
          secure: etherealAccount.smtp.secure,
          auth: {
            user: etherealAccount.user,
            pass: etherealAccount.pass,
          },
        });
        activeTransporter._isEthereal = true;
        activeTransporter._user = etherealAccount.user;
      }
    }

    return activeTransporter;
  },

  /**
   * Verify SMTP connection health
   */
  async verifyConnection() {
    try {
      const tx = await this.getTransporter();
      await tx.verify();
      return {
        success: true,
        message: tx._isEthereal
          ? `SMTP connection verified successfully (using Ethereal fallback: ${tx._user})`
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
      const tx = await this.getTransporter();
      const fromEmail = tx._isEthereal ? tx._user : (process.env.SMTP_USER || 'noreply@onboardingtracker.com');

      const info = await tx.sendMail({
        from: `"Onboarding Tracker" <${fromEmail}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);

      const previewUrl = tx._isEthereal ? nodemailer.getTestMessageUrl(info) : null;
      if (previewUrl) {
        console.log('Ethereal Preview URL: %s', previewUrl);
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
