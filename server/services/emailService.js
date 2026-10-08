import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Service to handle email sending using nodemailer
 */
let etherealTransporter = null;
let etherealUser = null;

async function getTransporter() {
  const hasCustomSmtp = process.env.SMTP_USER && process.env.SMTP_PASS;

  if (hasCustomSmtp) {
    const customTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return {
      transporter: customTransporter,
      fromAddress: process.env.SMTP_USER,
      isEthereal: false,
    };
  }

  // Fallback to Ethereal test account for dev/testing
  if (!etherealTransporter) {
    console.log('📧 No custom SMTP credentials found. Creating Ethereal SMTP test account...');
    const testAccount = await nodemailer.createTestAccount();
    etherealUser = testAccount.user;
    etherealTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`📧 Ethereal SMTP test account created: ${testAccount.user}`);
  }

  return {
    transporter: etherealTransporter,
    fromAddress: etherealUser,
    isEthereal: true,
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
  },

  /**
   * Verify SMTP connection health
   */
  async verifyConnection() {
    try {
      const { transporter, isEthereal } = await getTransporter();
      await transporter.verify();
      return {
        success: true,
        message: isEthereal
          ? 'Ethereal SMTP test connection verified successfully'
          : 'SMTP connection verified successfully',
        isEthereal
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
      const { transporter, fromAddress, isEthereal } = await getTransporter();

      const info = await transporter.sendMail({
        from: `"Onboarding Tracker" <${fromAddress}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);

      let previewUrl = null;
      if (isEthereal) {
        previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('Preview URL: %s', previewUrl);
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl,
        details: {
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response,
          isEthereal
        }
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: `Nodemailer error: ${error.message}` };
    }
  }
};
