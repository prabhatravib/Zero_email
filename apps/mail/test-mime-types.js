import fetch from 'node-fetch';

async function testMimeTypes() {
  const baseUrl = 'http://localhost:10000';
  
  console.log('🧪 Testing MIME types...\n');
  
  const testFiles = [
    '/assets/js/index-BdQq_4o_.js',
    '/assets/js/auth-client--QQw4C84.js',
    '/assets/css/root-BPY9nz6C.css',
    '/assets/js/mail-CzPSD08R.js'
  ];
  
  for (const file of testFiles) {
    try {
      const response = await fetch(`${baseUrl}${file}`);
      const contentType = response.headers.get('content-type');
      
      console.log(`📁 ${file}`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${contentType}`);
      
      // Check if MIME type is correct
      if (file.endsWith('.js') && contentType?.includes('application/javascript')) {
        console.log('   ✅ JavaScript MIME type correct');
      } else if (file.endsWith('.css') && contentType?.includes('text/css')) {
        console.log('   ✅ CSS MIME type correct');
      } else {
        console.log('   ❌ MIME type incorrect');
      }
      console.log('');
      
    } catch (error) {
      console.log(`❌ Failed to test ${file}: ${error.message}\n`);
    }
  }
  
  console.log('🎯 MIME type test completed!');
}

// Wait a bit for server to start, then test
setTimeout(testMimeTypes, 2000); 