# Password Reset Email Configuration

This document explains how to configure password reset emails in the Supabase Dashboard for Jhakkas Learning.

## Student Password Reset

### Configuration Steps

1. Go to your Supabase project dashboard
2. Navigate to **Authentication → Emails → Templates**
3. Select the **"Reset password"** template
4. Update the following:

   **Subject:**
   ```
   Reset your Jhakkas Learning password
   ```

   **Body:**
   Keep the default template or customize it. The important part is to keep the button/link placeholder:
   ```
   {{ .ConfirmationURL }}
   ```

5. Click **Save changes**

### How It Works

- When a user clicks "Forgot Password", our frontend calls:
  ```typescript
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://www.jhakkaslearning.com/reset-password'
  })
  ```

- Supabase sends an email with a link to `{{ .ConfirmationURL }}`
- The link includes a recovery token and redirects to: `https://www.jhakkaslearning.com/reset-password`
- Our React app at `/reset-password` validates the recovery session and allows password update
- After successful reset, user is redirected to `/login`

### URL Configuration

Ensure your Supabase project has the correct URLs configured:

1. Go to **Authentication → URL Configuration**
2. Set:
   - **Site URL:** `https://www.jhakkaslearning.com`
   - **Redirect URLs:** Add:
     - `https://www.jhakkaslearning.com/reset-password`
     - `https://www.jhakkaslearning.com/*`

### Custom SMTP (Optional)

For better email deliverability and custom "From" addresses:

1. Go to **Settings → Auth → Email**
2. Enable "Custom SMTP"
3. Configure your SMTP provider (e.g., Resend, SendGrid, Mailgun)
4. Example Resend configuration:
   - SMTP Host: `smtp.resend.com`
   - Port: `587`
   - Username: `resend`
   - Password: Your Resend API key
   - From: `noreply@jhakkaslearning.com`

**Note:** Custom SMTP is not required for the password reset flow to work. The redirect URL is controlled by the `redirectTo` parameter in our frontend code.

## Parent Password Reset (OTP-based)

Parents use a different flow with OTP verification instead of email links.

### Flow Overview

1. Parent enters phone number on `/parent-forgot-password`
2. Backend generates 6-digit OTP and stores in `parent_password_resets` table
3. **Development:** OTP is returned in API response and shown in a toast
4. **Production:** OTP is sent via Twilio SMS
5. Parent enters OTP to verify
6. After verification, parent sets new password

### Twilio SMS Configuration (Production)

To enable SMS OTP in production:

1. Sign up for [Twilio](https://www.twilio.com/)
2. Get your credentials:
   - Account SID
   - Auth Token
   - Phone Number (e.g., +1234567890)
3. Add these to Supabase Edge Functions environment variables:
   - Go to **Settings → Edge Functions**
   - Add:
     - `TWILIO_ACCOUNT_SID`
     - `TWILIO_AUTH_TOKEN`
     - `TWILIO_FROM_NUMBER`
     - `NODE_ENV` = `production` (to enable SMS sending)

### Development Mode

By default, `NODE_ENV` is not set or is `development`:
- OTP is **not sent via SMS**
- OTP is returned in the API response as `otp_dev`
- Frontend displays OTP in a toast for testing
- Check browser console or edge function logs for OTP

### Edge Functions Involved

- `parent-send-otp`: Generates OTP and sends SMS (if production)
- `parent-verify-otp`: Validates OTP
- `parent-reset-password`: Updates parent password after verification

## Troubleshooting

### Student Reset Issues

**Problem:** Email says "Link invalid or expired"
- Check that `redirectTo` URL matches the actual deployed domain
- Verify URL Configuration in Supabase dashboard includes the redirect URL
- Check recovery token hasn't expired (default: 1 hour)

**Problem:** Redirect goes to wrong domain
- Ensure all `resetPasswordForEmail` calls use `window.location.origin` or explicit production URL
- Search codebase for any hardcoded Lovable preview URLs

### Parent Reset Issues

**Problem:** OTP not received in production
- Check Twilio credentials are correctly set in Edge Functions environment
- Verify `NODE_ENV=production` is set
- Check edge function logs for Twilio errors
- Verify phone number format: `+91` prefix for India

**Problem:** OTP not showing in development
- Check browser console for `[DEV] OTP:` log
- Check toast notification (duration: 10 seconds)
- Verify `NODE_ENV` is not set to `production`

## Testing

### Student Reset
1. Go to `/login`
2. Click "Forgot Password?"
3. Enter email and submit
4. Check email inbox
5. Click reset link → should land on `https://www.jhakkaslearning.com/reset-password`
6. Enter new password and confirm
7. Should redirect to `/login` after success

### Parent Reset (Development)
1. Go to `/parent-forgot-password`
2. Enter 10-digit phone
3. Click "Send OTP"
4. Note OTP from toast notification
5. Enter OTP and click "Verify OTP"
6. Enter new password and confirm
7. Should redirect to `/login` after success

### Parent Reset (Production)
- Same as above, but OTP arrives via SMS instead of toast
- No `otp_dev` in response
