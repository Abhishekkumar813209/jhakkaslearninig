const nodemailer = require('nodemailer');
const twilio = require('twilio');

class NotificationService {
  constructor() {
    // Email transporter setup
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // SMS client setup
    this.smsClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
      ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      : null;
  }

  /**
   * Send welcome email to new user
   * @param {string} email - User's email
   * @param {string} name - User's name
   */
  async sendWelcomeEmail(email, name) {
    try {
      const mailOptions = {
        from: `"LMS Platform" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Welcome to LMS Platform!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to LMS Platform, ${name}! 🎉</h2>
            <p>Thank you for joining our learning community. We're excited to have you on board!</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #334155; margin-top: 0;">What's next?</h3>
              <ul style="color: #64748b;">
                <li>Complete your profile setup</li>
                <li>Browse our course catalog</li>
                <li>Join your first course</li>
                <li>Connect with fellow learners</li>
              </ul>
            </div>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            
            <p style="color: #64748b; font-size: 14px;">
              Best regards,<br>
              The LMS Platform Team
            </p>
          </div>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
      console.log(`Welcome email sent to ${email}`);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   * @param {string} email - User's email
   * @param {string} resetToken - Password reset token
   */
  async sendPasswordResetEmail(email, resetToken) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: `"LMS Platform" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset Request',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Password Reset Request</h2>
            <p>You requested a password reset for your LMS Platform account.</p>
            
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #b91c1c;">
                <strong>Security Notice:</strong> If you didn't request this reset, please ignore this email.
              </p>
            </div>
            
            <a href="${resetUrl}" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Reset Password
            </a>
            
            <p>Or copy and paste this link in your browser:</p>
            <p style="background-color: #f8fafc; padding: 10px; border-radius: 4px; word-break: break-all;">
              ${resetUrl}
            </p>
            
            <p style="color: #64748b; font-size: 14px;">
              This link will expire in 10 minutes for security purposes.
            </p>
          </div>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw error;
    }
  }

  /**
   * Send test reminder email
   * @param {string} email - Student's email
   * @param {string} name - Student's name
   * @param {Object} test - Test details
   */
  async sendTestReminderEmail(email, name, test) {
    try {
      const testDate = new Date(test.startDate).toLocaleString();
      
      const mailOptions = {
        from: `"LMS Platform" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Reminder: ${test.title} - Starting Soon!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Test Reminder 📝</h2>
            <p>Hi ${name},</p>
            <p>This is a reminder that your test is starting soon!</p>
            
            <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0369a1; margin-top: 0;">${test.title}</h3>
              <p><strong>Start Time:</strong> ${testDate}</p>
              <p><strong>Duration:</strong> ${test.duration} minutes</p>
              <p><strong>Total Marks:</strong> ${test.totalMarks}</p>
            </div>
            
            <p>Make sure you're prepared and have a stable internet connection.</p>
            <p>Good luck! 🍀</p>
          </div>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send test reminder email:', error);
      throw error;
    }
  }

  /**
   * Send SMS notification
   * @param {string} phone - Phone number
   * @param {string} message - SMS message
   */
  async sendSMS(phone, message) {
    try {
      if (!this.smsClient) {
        throw new Error('SMS service not configured');
      }

      await this.smsClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });

      console.log(`SMS sent to ${phone}`);
    } catch (error) {
      console.error('Failed to send SMS:', error);
      throw error;
    }
  }

  /**
   * Send OTP via SMS
   * @param {string} phone - Phone number
   * @param {string} otp - OTP code
   */
  async sendOTPSMS(phone, otp) {
    const message = `Your LMS Platform verification code is: ${otp}. This code will expire in 5 minutes.`;
    return this.sendSMS(phone, message);
  }

  /**
   * Send bulk notification to multiple users
   * @param {Array} recipients - Array of {email, name} objects
   * @param {string} subject - Email subject
   * @param {string} htmlContent - Email HTML content
   */
  async sendBulkEmail(recipients, subject, htmlContent) {
    try {
      const promises = recipients.map(recipient => {
        const mailOptions = {
          from: `"LMS Platform" <${process.env.EMAIL_USER}>`,
          to: recipient.email,
          subject,
          html: htmlContent.replace('{{name}}', recipient.name)
        };
        
        return this.emailTransporter.sendMail(mailOptions);
      });

      await Promise.allSettled(promises);
      console.log(`Bulk email sent to ${recipients.length} recipients`);
    } catch (error) {
      console.error('Failed to send bulk email:', error);
      throw error;
    }
  }

  /**
   * Send course enrollment confirmation
   * @param {string} email - Student's email
   * @param {string} name - Student's name
   * @param {Object} course - Course details
   */
  async sendEnrollmentConfirmation(email, name, course) {
    try {
      const mailOptions = {
        from: `"LMS Platform" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Enrollment Confirmed: ${course.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Enrollment Confirmed! 🎓</h2>
            <p>Hi ${name},</p>
            <p>Congratulations! You've successfully enrolled in:</p>
            
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #065f46; margin-top: 0;">${course.title}</h3>
              <p><strong>Instructor:</strong> ${course.instructor}</p>
              <p><strong>Duration:</strong> ${course.totalDuration} minutes</p>
              <p><strong>Level:</strong> ${course.level}</p>
            </div>
            
            <p>You can now access all course materials and start learning!</p>
            
            <a href="${process.env.FRONTEND_URL}/courses/${course.id}" 
               style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Start Learning
            </a>
          </div>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send enrollment confirmation:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();