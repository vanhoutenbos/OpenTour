#!/usr/bin/env tsx
/**
 * OpenTour — Test callback flow directly
 * 
 * Usage:
 *   npx tsx scripts/test-callback.ts
 * 
 * This tests the callback handler by simulating the redirect from Supabase.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

async function testCallbackHandler() {
  console.log('🧪 Testing callback handler directly...');
  
  // This is a simplified test - in reality you'd need a valid code from Supabase
  // For now, we'll just show how the callback works
  
  console.log('\n📋 How the callback flow works:');
  console.log('1. User clicks magic link in email');
  console.log('2. Supabase redirects to: /auth/callback?code=xxx&token_hash=yyy&type=email');
  console.log('3. Callback route exchanges code for session');
  console.log('4. Redirects to /nl/dashboard');
  
  console.log('\n🔧 To test manually:');
  console.log('1. Get a real magic link (from MailHog or real email)');
  console.log('2. Extract the "code" parameter');
  console.log('3. Visit: http://localhost:3000/auth/callback?code=YOUR_CODE');
  
  console.log('\n📝 Callback route logic (apps/web/app/auth/callback/route.ts):');
  console.log('- Handles PKCE flow (code parameter)');
  console.log('- Handles OTP flow (token_hash + type parameters)');
  console.log('- Uses Supabase SSR client with cookies');
  console.log('- Redirects to /nl/dashboard on success');
  console.log('- Redirects to /nl/login?error=auth on failure');
}

async function testWithRealCode() {
  console.log('\n🧪 If you have a real code from Supabase:');
  console.log('1. Copy the code from the magic link URL');
  console.log('2. Run this test with the code');
  console.log('3. Check if session is created properly');
}

// Mock test for development
async function mockTest() {
  console.log('\n🎭 Mock test (no real Supabase call):');
  console.log('Simulating successful callback...');
  console.log('✅ Would redirect to: http://localhost:3000/nl/dashboard');
  console.log('✅ Session cookie would be set');
  console.log('✅ User would be logged in');
}

async function main() {
  console.log('🧪 OpenTour Callback Test\n');
  console.log('=' .repeat(50));
  
  await testCallbackHandler();
  await testWithRealCode();
  await mockTest();
  
  console.log('\n' + '=' .repeat(50));
  console.log('📋 NEXT STEPS:');
  console.log('1. Configure Supabase to use MailHog SMTP (localhost:1025)');
  console.log('2. Run: npx tsx scripts/test-auth-flow.ts');
  console.log('3. Check MailHog at http://localhost:8025');
  console.log('4. Copy magic link and test callback');
}

main().catch(console.error);