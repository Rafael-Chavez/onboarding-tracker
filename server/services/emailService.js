import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let activeTransporter = null;
let isEthereal = false;

/**
 * Initialize or retrieve the transporter
 */
async function getTransporter() {
  if (activeTransporter) {
    return activeTransporter;
  }

  // If custom SMTP credentials are provided, use them
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
    isEthereal = false;
    return activeTransporter;
  }

  // Fallback to Ethereal SMTP test account
  try {
    console.log('Generating Ethereal SMTP test account credentials...');
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
    console.log('Created Ethereal SMTP Transporter:');
    console.log(`  - User: ${testAccount.user}`);
    console.log(`  - Pass: ${testAccount.pass}`);
    return activeTransporter;
  } catch (error) {
    console.error('Failed to generate Ethereal SMTP account:', error);
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
  },

  /**
   * Verify SMTP connection health
   */
  async verifyConnection() {
    try {
      const transporter = await getTransporter();
      await transporter.verify();
      return { success: true, message: 'SMTP connection verified successfully' };
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
      const sender = isEthereal ? transporter.options.auth.user : (process.env.SMTP_USER || 'no-reply@deconetwork.com');

      const info = await transporter.sendMail({
        from: `"Onboarding Tracker" <${sender}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);

      // Log accepted and rejected recipients for visibility
      console.log('Accepted recipients:', info.accepted);
      console.log('Rejected recipients:', info.rejected);

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
          response: info.response
        }
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: `Nodemailer error: ${error.message}` };
    }
  }
};
