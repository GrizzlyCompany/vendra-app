// Test script to check if the resend-email function is working
async function testResendFunction() {
  try {
    const response = await fetch('https://vvuvuibcmvqxtvdadwne.supabase.co/functions/v1/resend-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: You might need to add an Authorization header with your Supabase anon key
        // 'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY'
      },
      body: JSON.stringify({
        title: "Test Report",
        description: "This is a test report from the test script",
        category: "bug",
        userEmail: "test@example.com",
        userName: "Test User",
        userId: "user-123"
      })
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
  } catch (error) {
    console.error('Error testing function:', error);
  }
}

// Run the test
testResendFunction();