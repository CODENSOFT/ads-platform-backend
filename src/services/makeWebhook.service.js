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
 * @returns {Promise<{ok: boolean, status?: number, bodyPreview?: string}>} - Webhook response details
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
  
  // Log URL and payload
  console.log('[MAKE] url:', webhookUrl);
  console.log('[MAKE] payload:', JSON.stringify(payload, null, 2));
  
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
    
    // Read response text safely (first 200 chars)
    let bodyPreview = '';
    try {
      const responseText = await response.text();
      bodyPreview = responseText.substring(0, 200);
    } catch (textError) {
      bodyPreview = '[Unable to read response body]';
    }
    
    // Log response status and body
    console.log('[MAKE] status:', response.status);
    console.log('[MAKE] body:', bodyPreview);
    
    // Return response details
    return {
      ok: response.ok,
      status: response.status,
      bodyPreview,
    };
  } catch (error) {
    // Clear timeout if still pending
    clearTimeout(timeoutId);
    
    // Log error but don't throw (don't crash the request)
    if (error.name === 'AbortError') {
      console.error('[MAKE] webhook request timed out after 8 seconds');
      return {
        ok: false,
        status: undefined,
        bodyPreview: 'Request timeout after 8 seconds',
      };
    } else {
      console.error('[MAKE] webhook request failed:', error.message);
      return {
        ok: false,
        status: undefined,
        bodyPreview: error.message || 'Unknown error',
      };
    }
  }
}
