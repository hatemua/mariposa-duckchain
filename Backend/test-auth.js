const fetch = require('node-fetch');

const API_URL = 'http://localhost:5001';

async function testAuth() {
  try {
    // Test user credentials
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Test123456!'
    };

    console.log('1. Attempting to register user...');
    
    // Try to register
    const registerResponse = await fetch(`${API_URL}/api/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });

    const registerData = await registerResponse.json();
    
    if (registerResponse.ok) {
      console.log('✅ User registered successfully');
      console.log('Token:', registerData.token);
    } else {
      console.log('Registration failed, trying to login with existing user...');
      
      // Try to login if user already exists
      const loginResponse = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password
        })
      });

      const loginData = await loginResponse.json();
      
      if (loginResponse.ok) {
        console.log('✅ Login successful');
        console.log('Token:', loginData.token);
        console.log('\n📋 Copy this token to use in the frontend:');
        console.log('----------------------------------------');
        console.log(loginData.token);
        console.log('----------------------------------------');
        console.log('\nTo use this token:');
        console.log('1. Open browser console (F12)');
        console.log('2. Run: localStorage.setItem("token", "' + loginData.token + '")');
        console.log('3. Refresh the page and try creating a pipeline');
      } else {
        console.log('❌ Login failed:', loginData.message);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAuth();