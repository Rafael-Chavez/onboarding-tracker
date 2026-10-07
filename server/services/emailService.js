import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let dynamicTransporter = null;
let isEthereal = false;

async function getTransporter() {
  if (dynamicTransporter) {
    return dynamicTransporter;
  }

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    isEthereal = false;
    dynamicTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return dynamicTransporter;
  }

  // Create Ethereal test account if credentials are not configured
  console.log('📧 SMTP credentials not found in env. Initializing Ethereal SMTP test account...');
  try {
    const testAccount = await nodemailer.createTestAccount();
    isEthereal = true;
    dynamicTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`📧 Ethereal test account created: ${testAccount.user}`);
    return dynamicTransporter;
  } catch (err) {
    console.error('Failed to create Ethereal test account:', err);
    throw err;
  }
}

export const EmailService = {
  /**
   * Log current SMTP configuration (omitting sensitive details)
   */
  logConfigStatus() {
    console.log('📧 Email Service Config Status:');
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      console.log(`  - Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
      console.log(`  - Port: ${process.env.SMTP_PORT || '587'}`);
      console.log(`  - Secure: ${process.env.SMTP_SECURE === 'true'}`);
      console.log(`  - User: ${process.env.SMTP_USER}`);
    } else {
      console.log('  - SMTP Credentials: Not set in .env (Ethereal test account will be created on demand)');
    }
  },

  /**
   * Verify SMTP connection health
   */
  async verifyConnection() {
    try {
      const transporter = await getTransporter();
      await transporter.verify();
      const modeMessage = isEthereal
        ? 'SMTP connection verified (using Ethereal test account)'
        : 'SMTP connection verified successfully';
      return { success: true, message: modeMessage };
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
      const fromAddr = isEthereal
        ? `"Onboarding Tracker Test" <${transporter.options.auth.user}>`
        : `"Onboarding Tracker" <${process.env.SMTP_USER}>`;

      const info = await transporter.sendMail({
        from: fromAddr,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);

      let previewUrl = null;
      if (isEthereal) {
        previewUrl = nodemailer.getTestMessageUrl(info);
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
