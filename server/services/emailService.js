import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let activeTransporter = null;
let etherealAccount = null;

export const EmailService = {
  /**
   * Dynamically fetch or initialize transporter
   */
  async getTransporter() {
    if (activeTransporter) {
      return { transporter: activeTransporter, isEthereal: !!etherealAccount, etherealAccount };
    }

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
      console.log('📬 Initializing transporter with user-configured SMTP credentials...');
      activeTransporter = nodemailer.createTransport({
        host: host || 'smtp.gmail.com',
        port: parseInt(port || '587'),
        secure,
        auth: { user, pass },
      });
      return { transporter: activeTransporter, isEthereal: false };
    }

    // No SMTP credentials configured. Let's automatically generate an Ethereal SMTP test account!
    console.log('🤖 SMTP credentials not configured. Automatically generating Ethereal SMTP test account...');
    try {
      etherealAccount = await nodemailer.createTestAccount();
      console.log('✨ Ethereal SMTP test account generated successfully:');
      console.log(`  - User: ${etherealAccount.user}`);
      console.log(`  - Pass: ${etherealAccount.pass}`);

      activeTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: etherealAccount.user,
          pass: etherealAccount.pass,
        },
      });
      return { transporter: activeTransporter, isEthereal: true, etherealAccount };
    } catch (err) {
      console.error('❌ Failed to generate Ethereal SMTP test account:', err);
      throw err;
    }
  },

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
      console.log('  - Status: Dynamic Ethereal fallback enabled (will initialize on first send/verify)');
    } else {
      console.log('  - Status: Custom SMTP credentials configured');
    }
  },

  /**
   * Verify SMTP connection health
   */
  async verifyConnection() {
    try {
      const { transporter, isEthereal, etherealAccount } = await this.getTransporter();
      await transporter.verify();

      let message = 'SMTP connection verified successfully';
      if (isEthereal) {
        message = `SMTP connection verified successfully using Ethereal fallback account (${etherealAccount.user})`;
      }
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
      const { transporter, isEthereal, etherealAccount } = await this.getTransporter();

      // Verify connection before sending
      const verify = await this.verifyConnection();
      if (!verify.success) {
        return verify;
      }

      const fromAddress = isEthereal ? etherealAccount.user : (process.env.SMTP_USER || 'noreply@onboardingtracker.com');
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
        console.log('✉️ Ethereal Preview URL: %s', previewUrl);
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
