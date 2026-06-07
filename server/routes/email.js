import express from 'express';
import { EmailService } from '../services/emailService.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/email/send
 * Sends an email notification
 */
router.post('/send', verifyToken, async (req, res) => {
  const { to, subject, body, html } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
  }

  try {
    const result = await EmailService.sendEmail({
      to,
      subject,
      text: body,
      html: html || body.replace(/\n/g, '<br>')
    });

    if (result.success) {
      res.json({ success: true, message: 'Email sent successfully', messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Email route error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/email/verify
 * Verifies SMTP connection
 */
router.get('/verify', verifyToken, async (req, res) => {
  try {
    const result = await EmailService.verifyConnection();
    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Email verify route error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
