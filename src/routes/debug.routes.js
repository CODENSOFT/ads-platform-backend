import express from 'express';
import { sendForgotPasswordToMake } from '../services/makeWebhook.service.js';

const router = express.Router();

/**
 * @route   POST /api/debug/make-webhook
 * @desc    Test Make webhook (development only)
 * @access  Public (development only)
 * @body    { to, name, resetUrl }
 */
router.post('/make-webhook', async (req, res) => {
  try {
    const { to, name, resetUrl } = req.body;

    // Validate required fields
    if (!to || !resetUrl) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to and resetUrl are required',
      });
    }

    // Send to Make webhook
    const result = await sendForgotPasswordToMake({
      to,
      name: name || '',
      resetUrl,
    });

    // Return result
    res.status(200).json({
      success: true,
      status: result.status,
      bodyPreview: result.bodyPreview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

export default router;
