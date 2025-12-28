// ============================================
// AUTHENTICATION SYSTEM - FRONTEND
// ============================================

const API_URL = 'http://localhost:5000';

// Utility: Store authentication data
function storeAuthData(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  console.log('✓ Auth data stored:', { username: user.username, hasToken: !!token });
}

// Utility: Clear authentication data
function clearAuthData() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  console.log('✓ Auth data cleared');
}

// Utility: Show error message
function showError(elementId, message) {
  const errorDiv = document.getElementById(elementId);
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
  }
}

// Utility: Hide error message
function hideError(elementId) {
  const errorDiv = document.getElementById(elementId);
  if (errorDiv) {
    errorDiv.classList.add('hidden');
  }
}

// Utility: Show success message
function showSuccess(elementId, message) {
  const successDiv = document.getElementById(elementId);
  if (successDiv) {
    successDiv.textContent = message;
    successDiv.classList.remove('hidden');
  }
}

// ============================================
// LOGIN HANDLER
// ============================================
async function handleLogin(email, password) {
  console.log('→ Login attempt for:', email);
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Validate response
    if (!data.token || !data.user) {
      throw new Error('Invalid server response');
    }

    // Store authentication data
    storeAuthData(data.token, data.user);
    
    console.log('✓ Login successful');
    console.log('Token stored in localStorage:', localStorage.getItem('token') ? 'YES' : 'NO');
    console.log('User stored in localStorage:', localStorage.getItem('user') ? 'YES' : 'NO');
    
    // Small delay to ensure localStorage is written
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Redirect to dashboard
    console.log('→ Redirecting to dashboard...');
    window.location.href = '/dashboard';
    
  } catch (error) {
    console.error('✗ Login error:', error.message);
    throw error;
  }
}

// ============================================
// SIGNUP HANDLER
// ============================================
async function handleSignup(username, email, password) {
  console.log('→ Signup attempt for:', username, email);
  
  try {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Signup failed');
    }

    // Validate response
    if (!data.token || !data.user) {
      throw new Error('Invalid server response');
    }

    // Store authentication data
    storeAuthData(data.token, data.user);
    
    console.log('✓ Signup successful');
    
    // Show success and redirect
    showSuccess('successMessage', 'Account created successfully! Redirecting...');
    
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1000);
    
  } catch (error) {
    console.error('✗ Signup error:', error.message);
    throw error;
  }
}

// ============================================
// INITIALIZE AUTH PAGES
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('→ Auth system initialized');

  // Handle OAuth callback
  const urlParams = new URLSearchParams(window.location.search);
  const tokenParam = urlParams.get('token');
  if (tokenParam) {
    localStorage.setItem('token', tokenParam);
    window.location.href = '/dashboard';
    return;
  }

  // Setup Login Form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    console.log('→ Login form detected');
    
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Bootstrap validation
      if (!loginForm.checkValidity()) {
        e.stopPropagation();
        loginForm.classList.add('was-validated');
        return;
      }
      
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      
      hideError('errorMessage');
      
      try {
        await handleLogin(email, password);
      } catch (error) {
        showError('errorMessage', error.message);
      }
    });
  }

  // Setup Signup Form
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    console.log('→ Signup form detected');
    
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Bootstrap validation
      if (!signupForm.checkValidity()) {
        e.stopPropagation();
        signupForm.classList.add('was-validated');
        return;
      }
      
      const username = document.getElementById('username').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      
      hideError('errorMessage');
      
      try {
        await handleSignup(username, email, password);
      } catch (error) {
        showError('errorMessage', error.message);
      }
    });
  }
});

