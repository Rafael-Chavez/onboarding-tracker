import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let activeTransporter = null;

export const EmailService = {
  /**
   * Get or create nodemailer transporter dynamically
   */
  async getTransporter() {
    if (activeTransporter) {
      return activeTransporter;
    }

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587');
    const secure = process.env.SMTP_SECURE === 'true';
    let user = process.env.SMTP_USER;
    let pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      console.log('Generating Ethereal SMTP test account dynamically...');
      try {
        const testAccount = await nodemailer.createTestAccount();
        user = testAccount.user;
        pass = testAccount.pass;
        activeTransporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user,
            pass
          }
        });
        console.log(`Generated Ethereal test account: user=${user}, pass=${pass}`);
        return activeTransporter;
      } catch (err) {
        console.error('Failed to generate Ethereal SMTP test account:', err);
        throw err;
      }
    }

    activeTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass
      }
    });
    return activeTransporter;
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
  },

  /**
   * Verify SMTP connection health
   */
  async verifyConnection() {
    try {
      const transport = await this.getTransporter();
      await transport.verify();
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
      const transport = await this.getTransporter();
      const fromUser = process.env.SMTP_USER || transport.options.auth.user;

      const info = await transport.sendMail({
        from: `"Onboarding Tracker" <${fromUser}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('Ethereal preview URL: %s', previewUrl);
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
