import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter = null;
let isEthereal = false;
let etherealAccount = null;

/**
 * Gets or dynamically initializes the SMTP transporter.
 * If credentials are not configured, generates an Ethereal SMTP test account on demand.
 */
async function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const hasCreds = process.env.SMTP_USER && process.env.SMTP_PASS;
  if (hasCreds) {
    console.log('Using configured SMTP credentials.');
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    isEthereal = false;
  } else {
    console.log('No SMTP credentials configured. Generating an Ethereal SMTP test account on demand...');
    try {
      etherealAccount = await nodemailer.createTestAccount();
      console.log('Ethereal SMTP test account generated successfully:');
      console.log(`  - User: ${etherealAccount.user}`);
      console.log(`  - Pass: ${etherealAccount.pass}`);

      transporter = nodemailer.createTransport({
        host: etherealAccount.smtp.host,
        port: etherealAccount.smtp.port,
        secure: etherealAccount.smtp.secure,
        auth: {
          user: etherealAccount.user,
          pass: etherealAccount.pass,
        },
      });
      isEthereal = true;
    } catch (error) {
      console.error('Failed to generate Ethereal SMTP test account:', error);
      throw error;
    }
  }

  return transporter;
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
      const statusMsg = isEthereal
        ? 'SMTP connection verified successfully (using Ethereal fallback)'
        : 'SMTP connection verified successfully';
      return { success: true, message: statusMsg };
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

      // Verify connection before sending
      const verify = await this.verifyConnection();
      if (!verify.success) {
        return verify;
      }

      const fromEmail = process.env.SMTP_USER || (etherealAccount ? etherealAccount.user : 'test@ethereal.email');

      const info = await activeTransporter.sendMail({
        from: `"Onboarding Tracker" <${fromEmail}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);
      console.log(`Accepted recipients: ${info.accepted?.join(', ') || 'none'}`);
      console.log(`Rejected recipients: ${info.rejected?.join(', ') || 'none'}`);

      let previewUrl = null;
      if (isEthereal) {
        previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`Ethereal Message Sent! Preview URL: ${previewUrl}`);
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl,
        details: {
          accepted: info.accepted || [],
          rejected: info.rejected || [],
          response: info.response || ''
        }
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: `Nodemailer error: ${error.message}` };
    }
  }
};
