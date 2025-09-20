# Google OAuth Setup Issues

If you're seeing "accounts.google refused to connect" error, here's how to fix it:

## Option 1: Quick Fix - Use Email/Password Login
For immediate access, use the email/password login instead of Google OAuth.

## Option 2: Configure Google OAuth (for production)

To enable Google authentication, you need to:

1. **Go to Supabase Dashboard** → Authentication → Providers
2. **Enable Google Provider** and configure:
   - Get Google OAuth credentials from [Google Cloud Console](https://console.cloud.google.com/)
   - Add your domain to authorized origins
   - Set proper redirect URLs

3. **In Google Cloud Console:**
   - Add `https://qajmtfcphpncqwcrzphm.supabase.co` to authorized domains
   - Add redirect URL: `https://qajmtfcphpncqwcrzphm.supabase.co/auth/v1/callback`
   - For development, also add your Lovable preview URL

4. **Update Site URL in Supabase:**
   - Go to Authentication → URL Configuration
   - Set Site URL to your current domain
   - Add redirect URLs for both production and preview URLs

## Current Status
- ✅ Email/Password authentication works
- ✅ User registration works  
- ✅ Profile management works
- ⚠️ Google OAuth needs configuration

For now, please use email/password login while Google OAuth is being configured.