import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let etherealTransporter = null;

const getTransporter = async () => {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      transporter: nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }),
      fromEmail: process.env.SMTP_USER,
      isEthereal: false,
    };
  }

  if (!etherealTransporter) {
    console.log('📧 Custom SMTP credentials not configured. Initializing Ethereal test account...');
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
    console.log(`📧 Ethereal test account initialized: ${testAccount.user}`);
  }

  return {
    transporter: etherealTransporter,
    fromEmail: etherealTransporter.options.auth.user,
    isEthereal: true,
  };
};

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
      console.log('  - Fallback: Ethereal SMTP test account (auto-initialized on demand)');
    }
  },

  /**
   * Verify SMTP connection health
   */
  async verifyConnection() {
    try {
      const { transporter, isEthereal } = await getTransporter();
      await transporter.verify();
      const message = isEthereal
        ? 'Ethereal SMTP test connection verified successfully (Development/Test Mode)'
        : 'SMTP connection verified successfully';
      return { success: true, message, isEthereal };
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
      const { transporter, fromEmail, isEthereal } = await getTransporter();

      const info = await transporter.sendMail({
        from: `"Onboarding Tracker" <${fromEmail}>`,
        to,
        subject,
        text,
        html,
      });

      const previewUrl = isEthereal ? nodemailer.getTestMessageUrl(info) : null;

      console.log('Message sent: %s', info.messageId);
      if (previewUrl) {
        console.log('📧 View Ethereal Sent Email Preview: %s', previewUrl);
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
