import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let activeTransporter = null;
let etherealAccount = null;

async function getTransporter() {
  if (activeTransporter) {
    return { transporter: activeTransporter, isEthereal: !!etherealAccount, fromEmail: process.env.SMTP_USER || etherealAccount?.user };
  }

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    activeTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return { transporter: activeTransporter, isEthereal: false, fromEmail: process.env.SMTP_USER };
  }

  // Fallback: create ethereal account for testing/dev if no real SMTP provided
  try {
    etherealAccount = await nodemailer.createTestAccount();
    console.log('📧 Created Ethereal Test Email Account:', etherealAccount.user);
    activeTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: etherealAccount.user,
        pass: etherealAccount.pass,
      },
    });
    return { transporter: activeTransporter, isEthereal: true, fromEmail: etherealAccount.user };
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
    console.log(`  - Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
    console.log(`  - Port: ${process.env.SMTP_PORT || '587'}`);
    console.log(`  - Secure: ${process.env.SMTP_SECURE === 'true'}`);
    console.log(`  - User present: ${!!process.env.SMTP_USER}`);
    console.log(`  - Pass present: ${!!process.env.SMTP_PASS}`);
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('  - Notice: SMTP_USER/SMTP_PASS missing. Ethereal SMTP fallback will be used for testing.');
    }
  },

  /**
   * Verify SMTP connection health
   */
  async verifyConnection() {
    try {
      const { transporter: trans, isEthereal } = await getTransporter();
      await trans.verify();
      return {
        success: true,
        message: isEthereal
          ? 'Ethereal Test SMTP connection verified successfully'
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
      const { transporter: trans, fromEmail } = await getTransporter();

      const info = await trans.sendMail({
        from: `"Onboarding Tracker" <${fromEmail}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('📧 Preview URL: %s', previewUrl);
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
