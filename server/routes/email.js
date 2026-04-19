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
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: to, subject, body'
    });
  }

  try {
    const result = await EmailService.sendEmail({
      to,
      subject,
      text: body,
      html: html || body.replace(/\n/g, '<br>')
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Email sent successfully',
        messageId: result.messageId,
        response: result.response
      });
    } else {
      console.error('Email route: EmailService reported failure:', result.error);
      res.status(500).json({
        success: false,
        error: result.error,
        details: result
      });
    }
  } catch (error) {
    console.error('Email route error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;
