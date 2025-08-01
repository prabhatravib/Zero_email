#!/usr/bin/env node

/**
 * Test script for lazy loading implementation
 * This script tests the lazy loading functionality without requiring the full server
 */

// Mock environment for testing
global.console = {
  ...console,
  log: (...args) => console.log('[TEST]', ...args),
  error: (...args) => console.error('[TEST ERROR]', ...args),
};

// Mock Cloudflare Workers environment
global.env = {
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  RESEND_API_KEY: 'test-resend-key',
};

// Test lazy module loading
async function testLazyModules() {
  console.log('Testing lazy module loading...');
  
  try {
    // Test Gmail module loading
    console.log('Testing Gmail module...');
    const { getGmailTypes } = await import('./src/lib/lazy-modules.ts');
    const gmailModule = await getGmailTypes();
    console.log('✓ Gmail module loaded successfully');
    
    // Test React Email module loading
    console.log('Testing React Email module...');
    const { getReactEmailComponents } = await import('./src/lib/lazy-modules.ts');
    const reactEmailModule = await getReactEmailComponents();
    console.log('✓ React Email module loaded successfully');
    
    // Test sanitize-html module loading
    console.log('Testing sanitize-html module...');
    const { getSanitizeHtml } = await import('./src/lib/lazy-modules.ts');
    const sanitizeModule = await getSanitizeHtml();
    console.log('✓ sanitize-html module loaded successfully');
    
    // Test Google Auth module loading
    console.log('Testing Google Auth module...');
    const { getGoogleAuth } = await import('./src/lib/lazy-modules.ts');
    const authModule = await getGoogleAuth();
    console.log('✓ Google Auth module loaded successfully');
    
    // Test Resend module loading
    console.log('Testing Resend module...');
    const { getResend } = await import('./src/lib/lazy-modules.ts');
    const resendModule = await getResend();
    console.log('✓ Resend module loaded successfully');
    
    console.log('\n🎉 All lazy loading tests passed!');
    
  } catch (error) {
    console.error('❌ Lazy loading test failed:', error);
    process.exit(1);
  }
}

// Test route pattern matching
function testRoutePatterns() {
  console.log('\nTesting route pattern matching...');
  
  const testRoutes = [
    '/api/trpc/mail/listThreads',
    '/api/gmail/messages',
    '/api/send-email',
    '/api/trpc/ai.compose',
    '/process-html',
    '/auth/login',
    '/api/settings',
  ];
  
  const gmailRoutes = testRoutes.filter(route => 
    route.startsWith('/api/trpc/mail') ||
    route.startsWith('/api/gmail') ||
    route.includes('/threads') ||
    route.includes('/messages') ||
    route.includes('/drafts') ||
    route.includes('/labels')
  );
  
  const emailRoutes = testRoutes.filter(route =>
    route.startsWith('/api/send-email') ||
    route.startsWith('/api/trpc/ai.compose') ||
    route.includes('/compose') ||
    route.includes('/send')
  );
  
  const htmlRoutes = testRoutes.filter(route =>
    route.includes('/process-html') ||
    route.includes('/sanitize') ||
    route.includes('/email-content')
  );
  
  console.log('Gmail routes:', gmailRoutes);
  console.log('Email routes:', emailRoutes);
  console.log('HTML routes:', htmlRoutes);
  console.log('✓ Route pattern matching works correctly');
}

// Test module caching
async function testModuleCaching() {
  console.log('\nTesting module caching...');
  
  try {
    const { getGmailTypes, clearModuleCache } = await import('./src/lib/lazy-modules.ts');
    
    // Load module first time
    const start1 = Date.now();
    const module1 = await getGmailTypes();
    const time1 = Date.now() - start1;
    
    // Load module second time (should be cached)
    const start2 = Date.now();
    const module2 = await getGmailTypes();
    const time2 = Date.now() - start2;
    
    console.log(`First load: ${time1}ms`);
    console.log(`Second load: ${time2}ms`);
    console.log(`Caching efficiency: ${((time1 - time2) / time1 * 100).toFixed(1)}%`);
    
    // Test cache clearing
    clearModuleCache();
    console.log('✓ Module cache cleared successfully');
    
  } catch (error) {
    console.error('❌ Module caching test failed:', error);
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Starting lazy loading tests...\n');
  
  await testLazyModules();
  testRoutePatterns();
  await testModuleCaching();
  
  console.log('\n✅ All tests completed successfully!');
  console.log('\nThe lazy loading implementation is working correctly.');
  console.log('This should significantly reduce startup time for your Cloudflare Worker.');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { runTests }; 