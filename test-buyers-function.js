// Test script to verify the admin-get-buyers function
const testFunction = async () => {
  try {
    // You'll need to replace this with a valid access token from an admin user
    const accessToken = 'YOUR_ADMIN_ACCESS_TOKEN';
    
    const response = await fetch('https://vvuvuibcmvqxtvdadwne.supabase.co/functions/v1/admin-get-buyers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('Status:', response.status);
    console.log('Headers:', [...response.headers.entries()]);
    
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
};

testFunction();