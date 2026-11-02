import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let cachedTransporter = null;
let etherealAccount = null;

async function getTransporter() {
  if (cachedTransporter) {
    return { transporter: cachedTransporter, isTest: !!etherealAccount, fromEmail: process.env.SMTP_USER || etherealAccount?.user };
  }

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return { transporter: cachedTransporter, isTest: false, fromEmail: process.env.SMTP_USER };
  }

  // Fallback to Ethereal test account if credentials are not configured
  console.log('📧 SMTP credentials not found in env, creating Ethereal test account...');
  try {
    etherealAccount = await nodemailer.createTestAccount();
    console.log(`📧 Ethereal test account ready: ${etherealAccount.user}`);
    cachedTransporter = nodemailer.createTransport({
      host: etherealAccount.smtp.host,
      port: etherealAccount.smtp.port,
      secure: etherealAccount.smtp.secure,
      auth: {
        user: etherealAccount.user,
        pass: etherealAccount.pass,
      },
    });
    return { transporter: cachedTransporter, isTest: true, fromEmail: etherealAccount.user };
  } catch (err) {
    console.error('Failed to create Ethereal test account:', err);
    throw new Error('No SMTP credentials and failed to initialize test email account: ' + err.message);
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
      console.log('  - Notice: Operating with Ethereal SMTP test fallback for delivery.');
    }
  },

  /**
   * Verify SMTP connection health
   */
  async verifyConnection() {
    try {
      const { transporter, isTest, fromEmail } = await getTransporter();
      await transporter.verify();
      return {
        success: true,
        message: isTest
          ? `Connected to Ethereal SMTP test server (${fromEmail})`
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
      const { transporter, isTest, fromEmail } = await getTransporter();

      const info = await transporter.sendMail({
        from: `"Onboarding Tracker" <${fromEmail}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);
      console.log('Accepted recipients:', info.accepted);
      console.log('Rejected recipients:', info.rejected);

      const previewUrl = isTest ? nodemailer.getTestMessageUrl(info) : null;
      if (previewUrl) {
        console.log('📧 Ethereal message preview URL:', previewUrl);
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl,
        isTest,
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
