import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter = null;
let isEthereal = false;
let testAccount = null;

/**
 * Helper to initialize or retrieve existing transporter
 */
async function getTransporter() {
  if (transporter) {
    return { transporter, isEthereal, testAccount };
  }

  // Check if standard SMTP credentials are provided
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
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
    return { transporter, isEthereal, testAccount: null };
  }

  // Fallback to Ethereal SMTP test account in development / testing environments
  try {
    console.log('📧 No SMTP credentials configured. Generating Ethereal test account...');
    testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    isEthereal = true;
    console.log(`📧 Ethereal test account initialized: ${testAccount.user}`);
    return { transporter, isEthereal, testAccount };
  } catch (error) {
    console.error('Failed to create Ethereal test account:', error);
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
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('  - Mode: Test mode with Ethereal email fallback enabled');
    }
  },

  /**
   * Verify SMTP connection health
   */
  async verifyConnection() {
    try {
      const { transporter: currentTransporter, isEthereal: usingEthereal, testAccount: acc } = await getTransporter();
      await currentTransporter.verify();
      return {
        success: true,
        message: usingEthereal
          ? `SMTP connection verified (Test mode using Ethereal: ${acc?.user})`
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
      const { transporter: currentTransporter, isEthereal: usingEthereal, testAccount: acc } = await getTransporter();

      const senderEmail = process.env.SMTP_USER || acc?.user || 'onboarding-tracker@example.com';
      const info = await currentTransporter.sendMail({
        from: `"Onboarding Tracker" <${senderEmail}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Accepted recipients:', info.accepted);
      console.log('Rejected recipients:', info.rejected);
      console.log('Message sent: %s', info.messageId);

      let previewUrl = null;
      if (usingEthereal) {
        previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('📧 Preview URL: %s', previewUrl);
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl,
        isTestMode: usingEthereal,
        details: {
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response
        }
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: `Email sending error: ${error.message}` };
    }
  }
};
