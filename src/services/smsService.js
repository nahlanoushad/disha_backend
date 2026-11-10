/**
 * SMS Notification Service
 * Supports Twilio and Fast2SMS when credentials are provided in environment variables.
 * Fails safely and reports skipped/unavailable when credentials are not configured.
 * Does not fabricate delivery results.
 */

/**
 * Validates and normalizes phone number to E.164 (+91XXXXXXXXXX)
 * Accepts standard 10-digit Indian numbers with optional +91, 91, or 0 prefix.
 */
export const validateAndFormatPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return null;
  const cleaned = phone.trim().replace(/[\s\-\(\)]/g, '');
  const match = cleaned.match(/^(\+91|91|0)?([6-9]\d{9})$/);
  if (!match) return null;
  return `+91${match[2]}`;
};

export const smsService = {
  /**
   * Check if any supported SMS provider is configured via environment variables
   */
  isConfigured() {
    const hasTwilio = Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    );
    const hasFast2Sms = Boolean(process.env.FAST2SMS_API_KEY);
    return hasTwilio || hasFast2Sms;
  },

  /**
   * Return the active provider name or null
   */
  getProviderName() {
    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    ) {
      return 'Twilio';
    }
    if (process.env.FAST2SMS_API_KEY) {
      return 'Fast2SMS';
    }
    return null;
  },

  /**
   * Send an SMS notification
   * @param {string} toPhoneNumber - Destination phone number
   * @param {string} message - Message text
   * @param {object} options - Options including mock/test flags
   */
  async sendSms(toPhoneNumber, message, options = {}) {
    const formattedPhone = validateAndFormatPhoneNumber(toPhoneNumber);

    if (!formattedPhone) {
      return {
        success: false,
        status: 'failed',
        reason: 'INVALID_PHONE_NUMBER',
        error: `Invalid phone number format: '${toPhoneNumber}'. Must be a valid 10-digit mobile number.`
      };
    }

    // Guard: Prevent sending real SMS during automated tests
    if (options.mock === true || process.env.NODE_ENV === 'test') {
      return {
        success: options.mockSuccess !== false,
        status: options.mockSuccess !== false ? 'sent' : 'failed',
        provider: this.getProviderName() || 'MockProvider',
        reason: options.mockSuccess !== false ? 'MOCK_DELIVERED' : (options.mockReason || 'MOCK_FAILED'),
        isMock: true
      };
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        status: 'skipped',
        reason: 'PROVIDER_NOT_CONFIGURED',
        error: 'SMS provider credentials (TWILIO or FAST2SMS) are not configured in environment.'
      };
    }

    const provider = this.getProviderName();

    try {
      if (provider === 'Twilio') {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_PHONE_NUMBER;

        const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;
        const bodyParams = new URLSearchParams({
          To: formattedPhone,
          From: fromNumber,
          Body: message
        });

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: bodyParams.toString()
          }
        );

        const data = await response.json();

        if (response.ok && data.sid) {
          return {
            success: true,
            status: 'sent',
            provider: 'Twilio',
            messageId: data.sid
          };
        }

        return {
          success: false,
          status: 'failed',
          provider: 'Twilio',
          error: data.message || `Twilio HTTP ${response.status}`
        };
      }

      if (provider === 'Fast2SMS') {
        const apiKey = process.env.FAST2SMS_API_KEY;
        const tenDigit = formattedPhone.slice(-10);

        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            route: 'q',
            message: message,
            flash: 0,
            numbers: tenDigit
          })
        });

        const data = await response.json();

        if (response.ok && data.return === true) {
          return {
            success: true,
            status: 'sent',
            provider: 'Fast2SMS',
            requestId: data.request_id
          };
        }

        return {
          success: false,
          status: 'failed',
          provider: 'Fast2SMS',
          error: data.message || `Fast2SMS HTTP ${response.status}`
        };
      }
    } catch (err) {
      console.error('[SMS Service] Network or API error:', err.message);
      return {
        success: false,
        status: 'failed',
        provider,
        error: err.message
      };
    }

    return {
      success: false,
      status: 'failed',
      reason: 'UNKNOWN_PROVIDER'
    };
  }
};

export default smsService;
