import fetch from 'node-fetch';

async function testProxy() {
  try {
    console.log('Testing proxy...');
    
    // Test health endpoint
    const healthResponse = await fetch('http://localhost:10000/health');
    console.log('Health check:', healthResponse.status, await healthResponse.text());
    
    // Test API proxy
    const apiResponse = await fetch('http://localhost:10000/api/public/providers');
    console.log('API proxy test:', apiResponse.status);
    
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      console.log('API response keys:', Object.keys(data));
    } else {
      console.log('API error:', await apiResponse.text());
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testProxy(); 