# OpenTour — Auth Testing Guide

## Overview
This guide explains how to test the authentication flow without sending real emails.

## Quick Start

### 1. Start MailHog (Email Capture Server)
```bash
mailhog
```
- Web UI: http://localhost:8025
- SMTP: localhost:1025

### 2. Configure Supabase for Testing
In Supabase Dashboard → Project → Settings → Auth → SMTP Settings:
```
Host: localhost
Port: 1025
User: (empty)
Pass: (empty)
Admin Email: test@opentour.local
Sender Name: OpenTour Test
```

**Or disable email confirmation for faster testing:**
- Settings → Auth → Email confirmations: **OFF**

### 3. Run Test Scripts
```bash
# Test full magic link flow
npx tsx scripts/test-auth-flow.ts

# Test callback handler directly
npx tsx scripts/test-callback.ts
```

## Testing Workflow

### Full Flow Test
1. Start MailHog: `mailhog`
2. Run test: `npx tsx scripts/test-auth-flow.ts`
3. Check MailHog UI at http://localhost:8025
4. Copy magic link from captured email
5. Open link in browser to test callback

### Manual Test
1. Go to http://localhost:3000/nl/login
2. Enter test email (e.g., `test@opentour.local`)
3. Click "Stuur inloglink →"
4. Check MailHog for the email
4. Click magic link in MailHog
5. Should redirect to dashboard

## Test Scripts

### `scripts/test-auth-flow.ts`
- Simulates `signInWithOtp` call
- Checks MailHog for captured email
- Extracts magic link automatically
- Tests callback flow

### `scripts/test-callback.ts`
- Documents callback handler logic
- Shows how to test with real codes
- Provides mock test for development

## Supabase Configuration for Testing

### Option A: Use MailHog SMTP (Recommended)
```yaml
SMTP Host: localhost
SMTP Port: 1025
SMTP User: (empty)
SMTP Pass: (empty)
SMTP Admin Email: test@opentour.local
```

### Option B: Disable Email Confirmation
1. Supabase Dashboard → Settings → Auth
2. Turn OFF "Enable email confirmations"
3. Turn OFF "Enable email change confirmations"
4. Magic links will work but won't require clicking

### Option C: Use Ethereal Email (Online Testing)
```bash
npx tsx scripts/test-ethereal.ts
```
Creates a temporary email account for testing.

## Common Issues

### Rate Limiting (429)
- Wait 5 minutes between requests
- Use different email addresses
- Error message: "Wow Dechambeau, iets rustiger oké? Probeer het over 5 minuten opnieuw."

### Magic Link Not Working
- Check Supabase SMTP settings
- Verify redirect URL matches: `http://localhost:3000/auth/callback`
- Check MailHog UI for captured emails

### Callback Fails
- Check Supabase project URL and anon key
- Verify cookies are working (same-site issues)
- Check browser console for errors

## Environment Variables
Make sure `apps/web/.env.local` has:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_WORKER_URL=http://localhost:8787
```

## Useful Commands
```bash
# Start all services
npm run dev

# Start MailHog only
mailhog

# Run tests
npx tsx scripts/test-auth-flow.ts
npx tsx scripts/test-callback.ts

# View MailHog
open http://localhost:8025
```

## File Structure
```
scripts/
├── test-auth-flow.ts    # Full magic link test
├── test-callback.ts     # Callback handler test
└── import-egolf4u.ts    # Golf course import

apps/web/app/auth/callback/route.ts  # Callback handler
apps/web/app/[locale]/login/page.tsx  # Login page
```