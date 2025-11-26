# Supabase Email Branding Configuration

This document provides instructions for configuring Supabase email templates to match Jhakkas Learning branding.

## Email Template Configuration

### Access Email Templates

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to: **Authentication** → **Email Templates**

---

## Reset Password Email Template

### Configuration Settings

**From Name:** `Jhakkas Learning`

**Subject:** `Reset Your Jhakkas Password`

**Email Body (HTML):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Jhakkas Learning</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #667eea; margin-top: 0;">Reset Your Password</h2>
    
    <p>Hello!</p>
    
    <p>We received a request to reset your password for your Jhakkas Learning account. Click the button below to create a new password:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
    </div>
    
    <p style="color: #666; font-size: 14px;">If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.</p>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 1 hour for security reasons.</p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="color: #999; font-size: 12px; text-align: center;">
      Jhakkas Learning - Empowering Students with Quality Education<br>
      © 2025 Jhakkas. All rights reserved.
    </p>
  </div>
</body>
</html>
```

---

## Confirm Signup Email Template

**From Name:** `Jhakkas Learning`

**Subject:** `Welcome to Jhakkas - Confirm Your Email`

**Email Body (HTML):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Confirm Your Email</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Jhakkas!</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #667eea; margin-top: 0;">Confirm Your Email Address</h2>
    
    <p>Hello!</p>
    
    <p>Thank you for joining Jhakkas Learning! To complete your registration and start your learning journey, please confirm your email address:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Confirm Email</a>
    </div>
    
    <p style="color: #666; font-size: 14px;">If you didn't create a Jhakkas account, you can safely ignore this email.</p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="color: #999; font-size: 12px; text-align: center;">
      Jhakkas Learning - Empowering Students with Quality Education<br>
      © 2025 Jhakkas. All rights reserved.
    </p>
  </div>
</body>
</html>
```

---

## URL Configuration

### Site URL

Set your production site URL in:
**Authentication** → **URL Configuration** → **Site URL**

```
https://www.jhakkaslearning.com
```

### Redirect URLs

Add the following URLs to the allowed redirect URLs list:
**Authentication** → **URL Configuration** → **Redirect URLs**

```
https://www.jhakkaslearning.com/reset-password
https://www.jhakkaslearning.com/*
```

For development/preview:
```
https://[your-preview-url].lovable.app/reset-password
https://[your-preview-url].lovable.app/*
```

---

## Optional: Custom SMTP Configuration

For better deliverability and complete branding control, configure custom SMTP:

### Settings

Navigate to: **Project Settings** → **Authentication** → **SMTP Settings**

**Sender Email:** `no-reply@jhakkaslearning.com`  
**Sender Name:** `Jhakkas Learning`

### Recommended SMTP Providers

- **SendGrid** (recommended for reliability)
- **AWS SES** (cost-effective for high volume)
- **Mailgun**
- **Postmark**

### SMTP Configuration Example (SendGrid)

```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: [Your SendGrid API Key]
```

---

## Testing

After configuration:

1. Test password reset flow:
   - Go to `/login`
   - Click "Forgot Password"
   - Enter email
   - Check inbox for branded email
   - Click reset link → should redirect to `/reset-password`

2. Test signup confirmation (if email confirmation is enabled):
   - Create new account at `/register`
   - Check inbox for welcome email
   - Confirm email link should work correctly

---

## Important Notes

- The `{{ .ConfirmationURL }}` placeholder is automatically replaced by Supabase with the actual reset/confirmation link
- Email templates support Go template syntax
- Always test emails in development before going to production
- Keep email HTML simple to ensure compatibility across all email clients
- Monitor email delivery rates in Supabase dashboard

---

## Support

For issues with email configuration:
- Supabase Docs: https://supabase.com/docs/guides/auth/auth-email-templates
- Jhakkas Support: support@jhakkaslearning.com
