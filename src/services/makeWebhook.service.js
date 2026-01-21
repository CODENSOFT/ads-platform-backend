/**
 * Make webhook service
 * Sends data to Make.com webhooks for automation
 */

/**
 * Get webhook URL from environment or use default
 * @returns {string} Webhook URL
 */
const getWebhookUrl = () => {
  const url = process.env.MAKE_WEBHOOK_URL || 'https://hook.eu1.make.com/yo9vi9yfkn7x406g6dcjghjmimpjpy12';
  
  if (!process.env.MAKE_WEBHOOK_URL) {
    console.warn('[MAKE] MAKE_WEBHOOK_URL not set, using default webhook URL');
  }
  
  return url;
};

/**
 * Send forgot password data to Make webhook
 * @param {Object} params - Webhook parameters
 * @param {string} params.to - User email address
 * @param {string} params.name - User name (can be empty string)
 * @param {string} params.resetUrl - Password reset URL
 * @returns {Promise<void>} - Resolves when webhook is sent (or fails silently)
 */
export async function sendForgotPasswordToMake({ to, name, resetUrl }) {
  const webhookUrl = getWebhookUrl();
  
  // Normalize resetUrl (trim)
  const normalizedResetUrl = resetUrl ? resetUrl.trim() : '';
  
  // Normalize name (use empty string if not provided)
  const normalizedName = name || '';
  
  // Build payload
  const payload = {
    to,
    name: normalizedName,
    resetUrl: normalizedResetUrl,
  };
  
  // Log attempt
  console.log('[MAKE] sending forgot-password webhook to:', to);
  
  // Create AbortController for timeout (8 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  
  try {
    // Send POST request to webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    
    // Clear timeout
    clearTimeout(timeoutId);
    
    // Log response status
    console.log('[MAKE] response:', response.status);
    
    // If non-2xx status, log error but don't throw
    if (!response.ok) {
      console.error('[MAKE] webhook returned non-2xx status:', response.status, response.statusText);
    }
  } catch (error) {
    // Clear timeout if still pending
    clearTimeout(timeoutId);
    
    // Log error but don't throw (don't crash the request)
    if (error.name === 'AbortError') {
      console.error('[MAKE] webhook request timed out after 8 seconds');
    } else {
      console.error('[MAKE] webhook request failed:', error.message);
    }
  }
}
