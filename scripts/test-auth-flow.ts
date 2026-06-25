#!/usr/bin/env tsx
/**
 * OpenTour — Test auth flow without sending real emails
 * 
 * Usage:
 *   npx tsx scripts/test-auth-flow.ts
 * 
 * This script simulates the magic link flow by:
 * 1. Starting a local email server (MailHog)
 * 2. Using MailHog's SMTP for Supabase
 * 3. Capturing and displaying the magic link
 */

import { createClient } from '@supabase/supabase-js';
import { resolve } from 'path';

// Load .env.local
const dotenv = await import('dotenv');
dotenv.config({ path: resolve(process.cwd(), 'apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in apps/web/.env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testMagicLink() {
  // Use a test email that MailHog will capture
  const testEmail = `test-${Date.now()}@opentour.local`;
  const redirectUrl = 'http://localhost:3000/auth/callback';

  console.log(`📧 Testing magic link for: ${testEmail}`);
  console.log(`🔗 Redirect URL: ${redirectUrl}\n`);

  // Step 1: Request magic link
  const { data, error } = await supabase.auth.signInWithOtp({
    email: testEmail,
    options: {
      emailRedirectTo: redirectUrl,
      shouldCreateUser: true,
    },
  });

  if (error) {
    console.error('❌ Failed to send magic link:', error.message);
    return;
  }

  console.log('✅ Magic link requested successfully');
  console.log('📬 Check MailHog at http://localhost:8025 for the email\n');

  // Step 2: Wait a bit and check MailHog for the email
  console.log('⏳ Waiting for email to arrive in MailHog...');
  await new Promise(r => setTimeout(r, 3000));

  // Step 3: Fetch the magic link from MailHog
  try {
    const mailhogResponse = await fetch('http://localhost:8025/api/v2/messages');
    if (mailhogResponse.ok) {
      const mailhogData = await mailhogResponse.json();
      
      // Find the email for our test address
      const messages = mailhogData.items || [];
      const ourMessage = messages.find((msg: any) => 
        msg.To && msg.To.some((to: any) => to.Mailbox + '@' + to.Domain === testEmail)
      );

      if (ourMessage) {
        console.log('📧 Found email in MailHog!');
        
        // Extract the magic link from the email body
        const body = ourMessage.Content.Body;
        const linkMatch = body.match(/https:\/\/[^\s]+\/auth\/callback\?code=[^\s"'>]+/);
        
        if (linkMatch) {
          const magicLink = linkMatch[0];
          console.log('\n🔗 MAGIC LINK FOUND:');
          console.log(magicLink);
          console.log('\n📋 Copy this link and open it in your browser to complete login callback handler to test the callback flow');
          
          // Test the callback
          await testCallback(magicLink);
        } else {
          console.log('⚠️  Could not extract magic link from email body');
          console.log('Email body:', body.substring(0, 500) + '...');
        }
      } else {
        console.log('⚠️  No email found for', testEmail, 'yet. Check MailHog UI at http://localhost:8025');
      }
    }
  } catch (e) {
    console.log('⚠️  Could not connect to MailHog. Make sure it\'s running on port 8025');
  }
}

async function testCallback(magicLink: string) {
  console.log('\n🧪 Testing callback flow...');
  
  // Extract the code from the magic link
  const url = new URL(magicLink);
  const code = url.searchParams.get('code');
  
  if (!code) {
    console.log('❌ No code found in magic link');
    return;
  }

  // Call the callback endpoint
  try {
    const callbackUrl = `http://localhost:3000/auth/callback?code=${code}`;
    const response = await fetch(callbackUrl, { redirect: 'manual' });
    
    console.log('📡 Callback response status:', response.status);
    console.log('📡 Callback response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.redirected) {
      console.log('✅ Redirected to:', response.url);
    }
  } catch (e) {
    console.log('⚠️  Callback test failed:', (e as Error).message);
  }
}

async function testDirectCallback() {
  console.log('\n🔄 Testing direct callback with a test code...');
  console.log('Note: This will fail if you don\'t have a valid Supabase session');
  
  // This is just for reference - you'd need a real code from Supabase
  const testCode = 'test-code-from-supabase';
  const callbackUrl = `http://localhost:3000/auth/callback?code=${testCode}`;
  
  console.log('Test URL:', callbackUrl);
  console.log('(Replace with actual code from magic link to test properly)');
}

async function main() {
  console.log('🧪 OpenTour Auth Flow Test\n');
  console.log('=' .repeat(50));
  
  await testMagicLink();
  await testDirectCallback();
  
  console.log('\n' + '=' .repeat(50));
  console.log('📋 TESTING TIPS:');
  console.log('1. Start MailHog: mailhog');
  console.log('2. View emails: http://localhost:8025');
  console.log('3. Configure Supabase to use MailHog SMTP:');
  console.log('   - Host: localhost');
  console.log('   - Port: 1025');
  console.log('   - No auth needed');
  console.log('4. Disable email confirmation in Supabase for faster testing');
}

main().catch(console.error);