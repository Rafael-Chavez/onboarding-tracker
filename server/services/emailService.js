import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter = null;
let isEthereal = false;
let transporterPromise = null;

async function getTransporter() {
  if (transporter) {
    return transporter;
  }
  if (transporterPromise) {
    return transporterPromise;
  }

  transporterPromise = (async () => {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
      console.log('📧 Initializing transporter with custom SMTP credentials...');
      transporter = nodemailer.createTransport({
        host: host || 'smtp.gmail.com',
        port,
        secure,
        auth: { user, pass }
      });
      isEthereal = false;
    } else {
      console.log('📧 No SMTP credentials in env. Generating Ethereal SMTP test account...');
      try {
        const testAccount = await nodemailer.createTestAccount();
        console.log('✨ Ethereal SMTP test account generated successfully:');
        console.log(`  - Host: ${testAccount.smtp.host}`);
        console.log(`  - Port: ${testAccount.smtp.port}`);
        console.log(`  - User: ${testAccount.user}`);
        console.log(`  - Pass: ${testAccount.pass}`);

        transporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        isEthereal = true;

        // Also update env so logConfigStatus can show them
        process.env.SMTP_HOST = testAccount.smtp.host;
        process.env.SMTP_PORT = testAccount.smtp.port.toString();
        process.env.SMTP_SECURE = testAccount.smtp.secure.toString();
        process.env.SMTP_USER = testAccount.user;
        process.env.SMTP_PASS = testAccount.pass;
      } catch (err) {
        console.error('Failed to generate Ethereal SMTP test account:', err);
        transporterPromise = null;
        throw err;
      }
    }
    return transporter;
  })();

  return transporterPromise;
}

export const EmailService = {
  /**
   * Log current SMTP configuration (omitting sensitive details unless Ethereal)
   */
  async logConfigStatus() {
    console.log('📧 Email Service Config Status:');
    try {
      await getTransporter();
      console.log(`  - Host: ${process.env.SMTP_HOST}`);
      console.log(`  - Port: ${process.env.SMTP_PORT}`);
      console.log(`  - Secure: ${process.env.SMTP_SECURE === 'true'}`);
      console.log(`  - User present: ${!!process.env.SMTP_USER}`);
      console.log(`  - Type: ${isEthereal ? 'Ethereal (Test Account)' : 'Custom SMTP'}`);
      if (isEthereal) {
        console.log(`  - Ethereal User: ${process.env.SMTP_USER}`);
      }
    } catch (error) {
      console.error('  - Error initializing email transporter:', error.message);
    }
  },

  /**
   * Verify SMTP connection health
   */
  async verifyConnection() {
    try {
      const activeTransporter = await getTransporter();
      await activeTransporter.verify();
      return {
        success: true,
        message: `SMTP connection verified successfully (${isEthereal ? 'Ethereal' : 'Custom'})`
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
      const activeTransporter = await getTransporter();

      const fromUser = process.env.SMTP_USER || 'onboarding-tracker@ethereal.email';
      const info = await activeTransporter.sendMail({
        from: `"Onboarding Tracker" <${fromUser}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);

      const result = {
        success: true,
        messageId: info.messageId,
        details: {
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response
        }
      };

      if (isEthereal) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`✉️ Ethereal Preview URL: ${previewUrl}`);
        result.previewUrl = previewUrl;
      }

      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: `Nodemailer error: ${error.message}` };
    }
  }
};
