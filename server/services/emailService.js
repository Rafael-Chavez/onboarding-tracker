import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let activeTransporter = null;
let isEthereal = false;

/**
 * Get or initialize the nodemailer transporter dynamically on demand.
 */
async function getTransporter() {
  if (activeTransporter) {
    return activeTransporter;
  }

  const hasConfig = process.env.SMTP_USER && process.env.SMTP_PASS;

  if (hasConfig) {
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
    console.log('📧 Nodemailer transporter initialized with configured SMTP credentials.');
    return activeTransporter;
  } else {
    // Generate virtual Ethereal SMTP test account
    try {
      console.log('📧 SMTP credentials not configured. Generating virtual Ethereal test account...');
      const testAccount = await nodemailer.createTestAccount();
      activeTransporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      isEthereal = true;
      console.log(`📧 Virtual Ethereal SMTP account generated successfully.`);
      console.log(`  - User: ${testAccount.user}`);
      console.log(`  - Host: ${testAccount.smtp.host}:${testAccount.smtp.port}`);
      return activeTransporter;
    } catch (error) {
      console.error('❌ Failed to generate Ethereal SMTP test account:', error);
      throw error;
    }
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
      const tx = await getTransporter();
      await tx.verify();
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
      const tx = await getTransporter();

      const fromEmail = isEthereal ? tx.options.auth.user : (process.env.SMTP_USER || 'no-reply@deconetwork.com');

      const info = await tx.sendMail({
        from: `"Onboarding Tracker" <${fromEmail}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);
      console.log(`Accepted recipients: ${JSON.stringify(info.accepted || [])}`);
      console.log(`Rejected recipients: ${JSON.stringify(info.rejected || [])}`);

      let previewUrl = null;
      if (isEthereal) {
        previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`📧 Virtual Ethereal Email Preview URL: ${previewUrl}`);
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
