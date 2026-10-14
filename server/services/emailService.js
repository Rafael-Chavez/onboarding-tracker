import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let activeTransporter = null;
let isEthereal = false;

async function getTransporter() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    if (!activeTransporter || isEthereal) {
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
    }
    return { transporter: activeTransporter, from: process.env.SMTP_USER, isEthereal: false };
  }

  // Fallback to Ethereal account if no SMTP credentials provided
  if (!activeTransporter || !isEthereal) {
    console.log('📧 No SMTP credentials in .env - generating Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    activeTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    isEthereal = true;
    console.log(`📧 Ethereal test account created: ${testAccount.user}`);
  }

  return {
    transporter: activeTransporter,
    from: activeTransporter.options.auth.user,
    isEthereal: true
  };
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
      console.log('  - Notice: SMTP credentials not set. Ethereal SMTP test account will be used automatically.');
    }
  },

  /**
   * Verify SMTP connection health
   */
  async verifyConnection() {
    try {
      const { transporter, isEthereal, from } = await getTransporter();
      await transporter.verify();
      return {
        success: true,
        message: isEthereal
          ? `Ethereal test SMTP verified successfully (${from})`
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
      const { transporter, from, isEthereal } = await getTransporter();

      const info = await transporter.sendMail({
        from: `"Onboarding Tracker" <${from}>`,
        to,
        subject,
        text,
        html,
      });

      const previewUrl = isEthereal ? nodemailer.getTestMessageUrl(info) : null;

      console.log('Message sent: %s', info.messageId);
      if (previewUrl) {
        console.log('Preview URL: %s', previewUrl);
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
