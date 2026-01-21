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
 * Send payload to Make webhook with retry logic
 * @param {Object} payload - Payload to send to webhook
 * @returns {Promise<{ok: boolean, status: number|null, responsePreview: string, error: string|null}>} - Webhook response details
 */
export async function sendToMakeWebhook(payload) {
  const webhookUrl = getWebhookUrl();
  
  // Log sending
  console.log('[MAKE] sending ->', webhookUrl);
  console.log('[MAKE] payload ->', JSON.stringify(payload, null, 2));
  
  // Attempt to send (with retry)
  let lastError = null;
  let lastResult = null;
  
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      console.log(`[MAKE] retry attempt ${attempt + 1}/2`);
    }
    
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
      let responsePreview = '';
      try {
        const responseText = await response.text();
        responsePreview = responseText.substring(0, 200);
      } catch (textError) {
        responsePreview = '[Unable to read response body]';
      }
      
      // Log response status and preview
      console.log('[MAKE] status ->', response.status);
      console.log('[MAKE] responsePreview ->', responsePreview);
      
      // Return success result
      return {
        ok: response.ok,
        status: response.status,
        responsePreview,
        error: null,
      };
    } catch (error) {
      // Clear timeout if still pending
      clearTimeout(timeoutId);
      
      lastError = error;
      
      // Check if this is a retryable error
      const isRetryable = 
        error.name === 'AbortError' || // Timeout
        error.message?.includes('fetch failed') || // Network error
        error.message?.includes('network') ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT';
      
      // Log error
      if (error.name === 'AbortError') {
        console.error('[MAKE] error -> Request timeout after 8 seconds');
      } else {
        console.error('[MAKE] error ->', error.message || 'Unknown error');
      }
      
      // If not retryable or last attempt, return error
      if (!isRetryable || attempt === 1) {
        return {
          ok: false,
          status: null,
          responsePreview: '',
          error: error.message || 'Unknown error',
        };
      }
      
      // Wait a bit before retry (500ms)
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Should not reach here, but return error result
  return {
    ok: false,
    status: null,
    responsePreview: '',
    error: lastError?.message || 'Request failed after retries',
  };
}

/**
 * Send forgot password data to Make webhook (legacy function for backward compatibility)
 * @param {Object} params - Webhook parameters
 * @param {string} params.to - User email address
 * @param {string} params.name - User name (can be empty string)
 * @param {string} params.resetUrl - Password reset URL
 * @returns {Promise<{ok: boolean, status?: number, bodyPreview?: string}>} - Webhook response details
 * @deprecated Use sendToMakeWebhook with proper payload structure
 */
export async function sendForgotPasswordToMake({ to, name, resetUrl }) {
  const payload = {
    event: 'forgot_password',
    email: to,
    resetUrl: resetUrl ? resetUrl.trim() : '',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  };
  
  const result = await sendToMakeWebhook(payload);
  
  // Map to legacy format
  return {
    ok: result.ok,
    status: result.status,
    bodyPreview: result.responsePreview,
  };
}
