const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class AuthService {
  /**
   * Verify Google OAuth token
   * @param {string} token - Google OAuth token
   * @returns {Object|null} - User data from Google or null if invalid
   */
  async verifyGoogleToken(token) {
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      
      if (!payload) {
        return null;
      }

      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        emailVerified: payload.email_verified
      };
    } catch (error) {
      console.error('Google token verification error:', error);
      return null;
    }
  }

  /**
   * Generate a secure random token for password reset
   * @returns {string} - Random token
   */
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate OTP for phone verification
   * @returns {string} - 6-digit OTP
   */
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Hash password reset token
   * @param {string} token - Plain text token
   * @returns {string} - Hashed token
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} - Validation result
   */
  validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const score = [
      password.length >= minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar
    ].filter(Boolean).length;

    let strength = 'Very Weak';
    if (score >= 4) strength = 'Strong';
    else if (score >= 3) strength = 'Medium';
    else if (score >= 2) strength = 'Weak';

    return {
      isValid: score >= 3,
      strength,
      score,
      requirements: {
        minLength: password.length >= minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar
      }
    };
  }

  /**
   * Generate JWT refresh token
   * @returns {string} - Refresh token
   */
  generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Check if email domain is allowed
   * @param {string} email - Email to check
   * @returns {boolean} - Whether email domain is allowed
   */
  isEmailDomainAllowed(email) {
    const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS?.split(',') || [];
    
    if (allowedDomains.length === 0) {
      return true; // Allow all domains if none specified
    }

    const domain = email.split('@')[1];
    return allowedDomains.includes(domain);
  }

  /**
   * Rate limiting check for authentication attempts
   * @param {string} identifier - IP address or email
   * @param {string} type - Type of attempt (login, register, etc.)
   * @returns {Object} - Rate limit result
   */
  checkRateLimit(identifier, type = 'login') {
    // This is a simple in-memory implementation
    // In production, use Redis or database for persistence
    if (!this.attempts) {
      this.attempts = new Map();
    }

    const key = `${type}:${identifier}`;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = type === 'login' ? 5 : 3;

    if (!this.attempts.has(key)) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: maxAttempts - 1 };
    }

    const attempt = this.attempts.get(key);
    
    if (now > attempt.resetTime) {
      // Reset window
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: maxAttempts - 1 };
    }

    if (attempt.count >= maxAttempts) {
      return { 
        allowed: false, 
        remaining: 0, 
        resetTime: attempt.resetTime 
      };
    }

    attempt.count++;
    return { 
      allowed: true, 
      remaining: maxAttempts - attempt.count 
    };
  }

  /**
   * Clear rate limit for identifier
   * @param {string} identifier - IP address or email
   * @param {string} type - Type of attempt
   */
  clearRateLimit(identifier, type = 'login') {
    const key = `${type}:${identifier}`;
    if (this.attempts) {
      this.attempts.delete(key);
    }
  }
}

module.exports = new AuthService();